// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.20;

import {IERC7579Execution, IERC7579Module, MODULE_TYPE_EXECUTOR} from "../erc7579/IERC7579.sol";
import {Execution, ExecutionLib} from "../erc7579/ExecutionLib.sol";
import {ModeLib} from "../erc7579/ModeLib.sol";
import {Allocation} from "../blocks/types/Allocation.sol";
import {IBlock} from "../blocks/interfaces/IBlock.sol";
import {IRebalancePolicy} from "../blocks/interfaces/IRebalancePolicy.sol";
import {IReadings} from "../blocks/interfaces/IReadings.sol";
import {Bps} from "../libraries/Bps.sol";
import {SafeCast} from "../libraries/SafeCast.sol";
import {Holdings, Portfolio} from "../pricing/Portfolio.sol";
import {PoolPricing} from "../pricing/PoolPricing.sol";
import {Stock} from "../registry/StockTypes.sol";
import {StockRegistry} from "../registry/StockRegistry.sol";
import {Limits} from "../rules/RuleTypes.sol";
import {RuleIds} from "../rules/RuleIds.sol";
import {VaultMath} from "../vault/VaultMath.sol";
import {Trade, Trades} from "./Trades.sol";

/// @title StrategyExecutor
/// @notice An executor module for an ERC-7579 account: it runs a strategy. It asks the strategy's blocks what the account should hold, works out the
/// trades that get it there from what it holds, and has the account make them. Whoever calls `rebalance` chooses only the moment: what is traded is
/// worked out here, from the blocks and the readings.
/// @dev The account's TradeGuard (a hook) checks every call this makes before the account runs it, so even a bug here cannot make a trade the guard's
/// limits do not allow. The keeper, the key the app uses to ask for a rebalance, can only ask for this one thing, and the owner can take its key
/// away at once or let it expire.
contract StrategyExecutor is IERC7579Module {
    /// @dev What one account runs, set when the module is installed in it
    struct Config {
        address owner;
        IBlock strategy;
        IReadings readings;
        // 0 means a rebalance is always due; otherwise it says when (RebalanceBlock does)
        IRebalancePolicy policy;
        address keeper;
        uint64 keeperUntil;
        // From the rules placed onchain; a rule placed off-chain leaves its limit open
        Limits limits;
        address[] stocks;
    }

    /// @notice The smallest trade worth making, in USDC: $1
    uint256 public constant MIN_TRADE = 1e6;
    /// @notice The most stocks a vault may hold, set when the executor is deployed
    uint256 public immutable mostStocks;

    StockRegistry public immutable registry;
    address public immutable usdc;
    /// @notice The Reactive callback proxy of this chain: the only address that may ask for a rebalance on a Reactive contract's behalf. Zero when
    /// the chain has no Reactive, and then only the owner and the keeper can ask.
    address public immutable callbackProxy;

    mapping(address account => Config) private configs;
    mapping(address account => uint256) public lastRebalancedAt;

    event Rebalanced(address indexed account, uint256 trades, uint256 total);
    event KeeperChanged(address indexed account, address indexed keeper, uint64 until);

    error NotInstalled(address account);
    error AlreadyInstalled(address account);
    error NoOwner();
    error NoStrategyOrReadings();
    error StockCountOutOfRange(uint256 count, uint256 most);
    error NotOwner();
    error NeedsAStock();
    error NotAllowedToAsk(address caller);
    error NotTheCallbackProxy(address caller);
    error NotTheOwnersReactiveContract(address rvmId);
    error StockNotAllowed(address stock);
    error EmptyAccount();
    error NotDue();
    error NothingToDo();

    constructor(StockRegistry registry_, uint256 mostStocks_, address callbackProxy_) {
        if (mostStocks_ == 0) revert NeedsAStock();
        mostStocks = mostStocks_;
        callbackProxy = callbackProxy_;
        registry = registry_;
        usdc = registry_.usdc();
    }

    // ------------------------------------------------------------------------------------------------------------------------ module
    function onInstall(bytes calldata data) external {
        if (configs[msg.sender].owner != address(0)) revert AlreadyInstalled(msg.sender);
        Config memory config = abi.decode(data, (Config));

        if (config.owner == address(0)) revert NoOwner();
        if (address(config.strategy) == address(0) || address(config.readings) == address(0)) {
            revert NoStrategyOrReadings();
        }
        if (config.stocks.length == 0 || config.stocks.length > mostStocks) {
            revert StockCountOutOfRange(config.stocks.length, mostStocks);
        }
        for (uint256 i = 0; i < config.stocks.length; i++) {
            registry.stockOf(config.stocks[i]);
        }
        configs[msg.sender] = config;
    }

    function onUninstall(bytes calldata) external {
        delete configs[msg.sender];
        delete lastRebalancedAt[msg.sender];
    }

    // ------------------------------------------------------------------------------------------------------------------------ identity
    function name() external pure returns (string memory) {
        return "sandworm.strategy-executor";
    }

    function version() external pure returns (string memory) {
        return "0.1.0";
    }

    /// @notice Whether this module is installed in the account, and set up for it
    function isInitialized(address account) external view returns (bool) {
        return configs[account].owner != address(0);
    }

    function isModuleType(uint256 moduleTypeId) external pure returns (bool) {
        return moduleTypeId == MODULE_TYPE_EXECUTOR;
    }

    function configOf(address account) external view returns (Config memory) {
        return configs[account];
    }

    // ------------------------------------------------------------------------------------------------------------------------ the keeper
    /// @notice The owner gives the key the app uses to ask for rebalances, until a time. One key at a time.
    function setKeeper(address account, address keeper, uint64 until) external {
        Config storage config = _configOf(account);
        if (msg.sender != config.owner) revert NotOwner();
        config.keeper = keeper;
        config.keeperUntil = until;
        emit KeeperChanged(account, keeper, until);
    }

    function revokeKeeper(address account) external {
        Config storage config = _configOf(account);
        if (msg.sender != config.owner) revert NotOwner();
        config.keeper = address(0);
        config.keeperUntil = 0;
        emit KeeperChanged(account, address(0), 0);
    }

    // ------------------------------------------------------------------------------------------------------------------------ running it
    /// @notice What the account holds and what the strategy wants it to hold, as shares in basis points. The app reads this before it asks for a
    /// rebalance, to check the rules it keeps off-chain against what is about to be done.
    function preview(address account) external view returns (Allocation[] memory current, Allocation[] memory target) {
        Config storage config = _configOf(account);
        Holdings memory holdings = _holdings(account, config);
        uint256[] memory targetValues = _targetValues(config, holdings);
        return
            (
                _toAllocations(config, holdings.values, holdings.total),
                _toAllocations(config, targetValues, holdings.total)
            );
    }

    /// @notice Trades the account toward what the strategy wants, if it is due. The caller is the keeper, or the owner.
    function rebalance(address account) external {
        Config storage config = _configOf(account);
        _requireMayAsk(config);
        _rebalance(account, config);
    }

    /// @notice The same, asked for by the account owner's Reactive contract through the Reactive callback proxy, when a cron event or a price event
    /// says it is time. `rvmId` is filled in by the Reactive Network with the owner of the Reactive contract, whatever the payload says, so only a
    /// Reactive contract the account's owner deployed can ask.
    function rebalanceFromReactive(address rvmId, address account) external {
        if (callbackProxy == address(0) || msg.sender != callbackProxy) revert NotTheCallbackProxy(msg.sender);
        Config storage config = _configOf(account);
        if (rvmId != config.owner) revert NotTheOwnersReactiveContract(rvmId);
        _rebalance(account, config);
    }

    function _rebalance(address account, Config storage config) private {
        Holdings memory holdings = _holdings(account, config);
        uint256[] memory targetValues = _targetValues(config, holdings);
        _requireDue(account, config, holdings, targetValues);

        Trade[] memory trades = _plan(config, holdings, targetValues);
        if (trades.length == 0) revert NothingToDo();

        lastRebalancedAt[account] = block.timestamp;
        IERC7579Execution(account)
            .executeFromExecutor(_batchMode(), ExecutionLib.encodeBatch(Trades.calls(trades, account)));
        emit Rebalanced(account, trades.length, holdings.total);
    }

    function _requireMayAsk(Config storage config) private view {
        if (msg.sender == config.owner) return;
        // A keeper's key runs out at a time, and a validator nudging the clock by seconds changes nothing
        // forge-lint: disable-next-line(block-timestamp)
        bool isKeeper = msg.sender == config.keeper && block.timestamp <= config.keeperUntil;
        if (!isKeeper) revert NotAllowedToAsk(msg.sender);
    }

    /// @dev Whether the strategy's policy says it is time, from what is held and what is wanted. No policy means always.
    function _requireDue(
        address account,
        Config storage config,
        Holdings memory holdings,
        uint256[] memory targetValues
    ) private view {
        if (address(config.policy) == address(0)) return;
        Allocation[] memory current = _toAllocations(config, holdings.values, holdings.total);
        Allocation[] memory target = _toAllocations(config, targetValues, holdings.total);
        if (!config.policy.shouldRebalance(current, target, lastRebalancedAt[account])) revert NotDue();
    }

    // ------------------------------------------------------------------------------------------------------------------------ the plan
    function _holdings(address account, Config storage config) private view returns (Holdings memory holdings) {
        holdings = Portfolio.read(registry, account, config.stocks);
        if (holdings.total == 0) revert EmptyAccount();
    }

    /// @dev What each stock should be worth: the strategy's share of what the budget lets it invest, but no more than the max weight allows, less a
    /// slippage's width so that a trade's fees cannot carry a stock past its share
    function _targetValues(Config storage config, Holdings memory holdings)
        private
        view
        returns (uint256[] memory values)
    {
        Allocation[] memory wanted = config.strategy.evaluate(config.readings);
        values = new uint256[](config.stocks.length);

        Limits memory limits = config.limits;
        uint256 invested = _min(holdings.total, limits.budget);
        // One division, last, so nothing is lost to rounding on the way
        uint256 mostPerStock = (holdings.total * limits.maxWeightBps * (Bps.DENOMINATOR - limits.maxSlippageBps))
            / (Bps.DENOMINATOR * Bps.DENOMINATOR);

        for (uint256 i = 0; i < wanted.length; i++) {
            uint256 value = Bps.portion(invested, wanted[i].weightBps);
            values[_indexOf(config, wanted[i].stock)] = _min(value, mostPerStock);
        }
    }

    /// @dev Sells first, to make the USDC the buys use, then buys
    function _plan(Config storage config, Holdings memory holdings, uint256[] memory targetValues)
        private
        view
        returns (Trade[] memory)
    {
        (Trade[] memory sells, uint256 proceeds) = _sells(config, holdings, targetValues);
        Trade[] memory buys = _buys(config, holdings, targetValues, holdings.usdcBalance + proceeds);
        return Trades.concat(sells, buys);
    }

    /// @dev Every stock worth more than it should be is sold down to its target. Returns the least those sales bring in.
    function _sells(Config storage config, Holdings memory holdings, uint256[] memory targetValues)
        private
        view
        returns (Trade[] memory, uint256 proceeds)
    {
        Trade[] memory trades = new Trade[](holdings.stocks.length);
        uint256 count;
        for (uint256 i = 0; i < holdings.stocks.length; i++) {
            if (holdings.values[i] <= targetValues[i] + MIN_TRADE) continue;
            trades[count] = _sellTrade(config, holdings, i, targetValues[i]);
            proceeds += trades[count].minOut;
            count++;
        }
        return (Trades.first(trades, count), proceeds);
    }

    /// @dev Every stock worth less than it should be is bought up toward its target, as far as there is USDC for and the pool allows: a stock far
    /// from its share gets there over more than one rebalance.
    function _buys(
        Config storage config,
        Holdings memory holdings,
        uint256[] memory targetValues,
        uint256 usdcAvailable
    ) private view returns (Trade[] memory) {
        Trade[] memory trades = new Trade[](holdings.stocks.length);
        uint256 count;
        for (uint256 i = 0; i < holdings.stocks.length; i++) {
            if (targetValues[i] <= holdings.values[i] + MIN_TRADE) continue;

            uint256 usdcIn = _buySize(config, holdings.stocks[i], targetValues[i] - holdings.values[i], usdcAvailable);
            if (usdcIn < MIN_TRADE) continue;

            trades[count++] = _buyTrade(config, holdings.stocks[i], usdcIn);
            usdcAvailable -= usdcIn;
        }
        return Trades.first(trades, count);
    }

    function _sellTrade(Config storage config, Holdings memory holdings, uint256 i, uint256 targetValue)
        private
        view
        returns (Trade memory)
    {
        Stock memory stock = holdings.stocks[i];
        // Sell all of a stock that is no longer wanted; otherwise the part that is over
        uint256 amount = targetValue == 0
            ? holdings.held[i]
            : (holdings.held[i] * (holdings.values[i] - targetValue)) / holdings.values[i];
        uint256 expected = VaultMath.usdcValue(amount, PoolPricing.trustedPrice(stock), stock.usdcIsToken0);
        return Trade(stock, stock.token, usdc, amount, Bps.lessSlippage(expected, config.limits.maxSlippageBps));
    }

    function _buyTrade(Config storage config, Stock memory stock, uint256 usdcIn) private view returns (Trade memory) {
        uint256 expected = VaultMath.stockFor(usdcIn, PoolPricing.trustedPrice(stock), stock.usdcIsToken0);
        return Trade(stock, usdc, stock.token, usdcIn, Bps.lessSlippage(expected, config.limits.maxSlippageBps));
    }

    /// @dev What may be spent on a stock: what is wanted, no more than there is, and no more than the pool's depth allows. Nothing, if the pool is
    /// shallower than the rule says.
    function _buySize(Config storage config, Stock memory stock, uint256 wanted, uint256 available)
        private
        view
        returns (uint256)
    {
        uint160 sqrtPrice = PoolPricing.trustedPrice(stock);
        uint256 depth = PoolPricing.depthOf(usdc, stock, sqrtPrice);
        if (depth < config.limits.minPoolDepth) return 0;

        uint256 mostForOneBuy = Bps.portion(depth, config.limits.maxTradeOfDepthBps);
        return _min(_min(wanted, available), mostForOneBuy);
    }

    // ------------------------------------------------------------------------------------------------------------------------ helpers
    /// @dev Shares in basis points of the account's value, for the stocks held or wanted
    function _toAllocations(Config storage config, uint256[] memory values, uint256 total)
        private
        view
        returns (Allocation[] memory list)
    {
        uint256 count;
        for (uint256 i = 0; i < values.length; i++) {
            if (values[i] != 0) count++;
        }

        list = new Allocation[](count);
        uint256 next;
        for (uint256 i = 0; i < values.length; i++) {
            if (values[i] == 0) continue;
            list[next++] = Allocation(config.stocks[i], SafeCast.toUint16(Bps.shareOf(values[i], total)));
        }
    }

    function _indexOf(Config storage config, address stock) private view returns (uint256) {
        for (uint256 i = 0; i < config.stocks.length; i++) {
            if (config.stocks[i] == stock) return i;
        }
        revert StockNotAllowed(stock);
    }

    function _configOf(address account) private view returns (Config storage config) {
        config = configs[account];
        if (config.owner == address(0)) revert NotInstalled(account);
    }

    function _batchMode() private pure returns (bytes32) {
        return ModeLib.encode(ModeLib.CALLTYPE_BATCH, ModeLib.EXECTYPE_DEFAULT);
    }

    function _min(uint256 a, uint256 b) private pure returns (uint256) {
        return a < b ? a : b;
    }
}

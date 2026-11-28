// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.20;

import {IERC7579Execution, IERC7579Hook, MODULE_TYPE_HOOK} from "../erc7579/IERC7579.sol";
import {Execution, ExecutionLib} from "../erc7579/ExecutionLib.sol";
import {ModeLib} from "../erc7579/ModeLib.sol";
import {IERC20Minimal} from "../interfaces/IERC20Minimal.sol";
import {ISlipstreamRouter} from "../interfaces/ISlipstreamRouter.sol";
import {Bps} from "../libraries/Bps.sol";
import {Holdings, Portfolio} from "../pricing/Portfolio.sol";
import {PoolPricing} from "../pricing/PoolPricing.sol";
import {Stock} from "../registry/StockTypes.sol";
import {StockRegistry} from "../registry/StockRegistry.sol";
import {IRulePlugin, SwapCheck} from "../rules/IRulePlugin.sol";
import {VaultMath} from "../vault/VaultMath.sol";
import {IGuardErrors} from "./IGuardErrors.sol";

/// @title TradeGuard
/// @notice A hook module for an ERC-7579 account. Whatever an executor module asks the account to do, this checks it first. It holds the structural
/// safety, the same for every vault: only an approval or a swap, of an allowed stock for USDC, through that stock's own router, paid to the account,
/// at a price within a fixed ceiling of fair, and no permission left open afterwards. Every other rule is a module (`IRulePlugin`) attached to the
/// vault, which judges the swap and the portfolio against its own value: a vault has a rule onchain exactly when its module is attached.
/// @dev Zyfai's gateway, for stocks (docs.zyf.ai/docs/product/control/proxy): the agent proposes, and an onchain check of the address, the function
/// and the parameters decides. A compromised executor, or a buggy one, can then lose at most what these checks let a trade lose.
///
/// The owner is never limited: a call the account got from its owner goes through, so the owner can always take their money out. This is only for
/// executors. It can only say no: it moves nothing and holds nothing.
contract TradeGuard is IERC7579Hook, IGuardErrors {
    /// @dev What one account is guarded with, set when the guard is installed in it
    struct Config {
        address owner;
        // The stocks this account may trade, out of those the registry lists
        address[] stocks;
        // The rule modules attached to it, each given its value when the guard was installed
        address[] plugins;
    }

    /// @dev What `preCheck` hands to `postCheck` when an executor's calls were checked, so the portfolio is checked after them
    bytes private constant CHECK_AFTER = hex"01";

    /// @notice The loosest slippage any vault accepts, whatever its rules say: a rule module can only be stricter
    uint16 public constant MAX_SLIPPAGE_CEILING_BPS = 200;
    /// @notice The most one buy may be of its pool's depth, whatever its rules say: a rule module can only be stricter
    uint16 public constant MAX_TRADE_OF_DEPTH_CEILING_BPS = 1000;
    uint256 public constant MOST_PLUGINS = 8;
    /// @notice The most stocks a vault may hold, set when the guard is deployed: a different suite of modules can allow more or fewer
    uint256 public immutable mostStocks;

    StockRegistry public immutable registry;
    address public immutable usdc;

    mapping(address account => Config) private configs;

    constructor(StockRegistry registry_, uint256 mostStocks_) {
        if (mostStocks_ == 0) revert NeedsAStock();
        mostStocks = mostStocks_;
        registry = registry_;
        usdc = registry_.usdc();
    }

    // ------------------------------------------------------------------------------------------------------------------------ module
    /// @param data `abi.encode(Config, uint256[] values, bytes[] extra)`: the config, and for each rule module the value and anything else it is
    /// attached with
    function onInstall(bytes calldata data) external {
        if (configs[msg.sender].owner != address(0)) revert AlreadyInstalled(msg.sender);
        (Config memory config, uint256[] memory values, bytes[] memory extra) =
            abi.decode(data, (Config, uint256[], bytes[]));

        _checkConfig(config, values.length, extra.length);
        configs[msg.sender] = config;
        for (uint256 i = 0; i < config.plugins.length; i++) {
            IRulePlugin(config.plugins[i]).configure(msg.sender, values[i], extra[i]);
        }
    }

    function onUninstall(bytes calldata) external {
        address[] storage plugins = configs[msg.sender].plugins;
        for (uint256 i = 0; i < plugins.length; i++) {
            IRulePlugin(plugins[i]).clear(msg.sender);
        }
        delete configs[msg.sender];
    }

    function name() external pure returns (string memory) {
        return "sandworm.trade-guard";
    }

    function version() external pure returns (string memory) {
        return "0.2.0";
    }

    /// @notice Whether this module is installed in the account, and set up for it
    function isInitialized(address account) external view returns (bool) {
        return configs[account].owner != address(0);
    }

    function isModuleType(uint256 moduleTypeId) external pure returns (bool) {
        return moduleTypeId == MODULE_TYPE_HOOK;
    }

    function configOf(address account) external view returns (Config memory) {
        return configs[account];
    }

    function _checkConfig(Config memory config, uint256 valueCount, uint256 extraCount) private view {
        if (config.owner == address(0)) revert NoOwner();
        if (config.stocks.length == 0 || config.stocks.length > mostStocks) {
            revert StockCountOutOfRange(config.stocks.length, mostStocks);
        }
        if (config.plugins.length > MOST_PLUGINS) revert TooManyRules(config.plugins.length, MOST_PLUGINS);
        if (config.plugins.length != valueCount || config.plugins.length != extraCount) {
            revert ValueForEachRule();
        }
        for (uint256 i = 0; i < config.stocks.length; i++) {
            registry.stockOf(config.stocks[i]); // reverts for one that is not listed
        }
    }

    // ------------------------------------------------------------------------------------------------------------------------ the checks
    /// @dev Called by the account before every execution. An executor's calls are each checked; the owner's are not.
    function preCheck(address msgSender, uint256, bytes calldata msgData) external view returns (bytes memory) {
        Config storage config = configs[msg.sender];
        if (config.owner == address(0)) revert NotInstalled(msg.sender);
        if (msgSender == config.owner) return "";

        Execution[] memory calls = _batchFrom(msgData);
        for (uint256 i = 0; i < calls.length; i++) {
            _checkCall(msg.sender, config, calls[i]);
        }
        return CHECK_AFTER;
    }

    /// @dev Called by the account after every execution. After an executor's, no router is left with a permission to take anything, and each rule
    /// module is satisfied with what the account holds.
    function postCheck(bytes calldata hookData) external view {
        if (hookData.length == 0) return;
        Config storage config = configs[msg.sender];

        Holdings memory holdings = Portfolio.read(registry, msg.sender, config.stocks);
        _checkNoPermissionLeft(holdings);
        for (uint256 i = 0; i < config.plugins.length; i++) {
            IRulePlugin(config.plugins[i]).checkPortfolio(msg.sender, holdings);
        }
    }

    /// @dev The batch an executor asked the account to run, if it asked in the one way allowed
    function _batchFrom(bytes calldata msgData) private pure returns (Execution[] memory) {
        if (bytes4(msgData[:4]) != IERC7579Execution.executeFromExecutor.selector) {
            revert NotAnExecution();
        }
        (bytes32 mode, bytes memory executionCalldata) = abi.decode(msgData[4:], (bytes32, bytes));

        // A try mode would let a failed step be passed over without anyone knowing
        bool isBatch = ModeLib.callTypeOf(mode) == ModeLib.CALLTYPE_BATCH;
        bool revertsOnFailure = ModeLib.execTypeOf(mode) == ModeLib.EXECTYPE_DEFAULT;
        if (!isBatch || !revertsOnFailure) revert NotARevertingBatch();

        return ExecutionLib.decodeBatch(executionCalldata);
    }

    function _checkCall(address account, Config storage config, Execution memory call) private view {
        if (call.value != 0) revert NoNativeValue();
        bytes4 selector = bytes4(call.callData);

        if (selector == IERC20Minimal.approve.selector) return _checkApprove(config, call);
        if (selector == ISlipstreamRouter.exactInputSingle.selector) return _checkSwap(account, config, call);
        revert NotAnApprovalOrSwap();
    }

    /// @dev An approval is for a router of an allowed stock, of USDC or that stock. Its size is not checked here, as a batch sells before it buys and
    /// the USDC a buy spends may not be held until the sale has run: what is checked is that none is left over afterwards (`postCheck`).
    function _checkApprove(Config storage config, Execution memory call) private view {
        (address spender,) = abi.decode(_arguments(call.callData), (address, uint256));

        for (uint256 i = 0; i < config.stocks.length; i++) {
            Stock memory stock = registry.stockOf(config.stocks[i]);
            if (spender != stock.router) continue;
            if (call.target == usdc || call.target == stock.token) return;
        }
        revert ApprovalNotAllowed();
    }

    /// @dev A swap is of USDC for an allowed stock or back, through that stock's router, paid to the account. What it is worth is judged by the
    /// ceilings here and by each rule module attached.
    function _checkSwap(address account, Config storage config, Execution memory call) private view {
        ISlipstreamRouter.ExactInputSingleParams memory swap =
            abi.decode(_arguments(call.callData), (ISlipstreamRouter.ExactInputSingleParams));
        if (swap.recipient != account) revert SwapPaidToSomeoneElse();

        bool isBuy = swap.tokenIn == usdc;
        address token = isBuy ? swap.tokenOut : swap.tokenIn;
        if (!isBuy && swap.tokenOut != usdc) revert SwapNotAgainstUsdc();
        if (!_isAllowed(config, token)) revert StockNotTradable(token);

        Stock memory stock = registry.stockOf(token);
        if (call.target != stock.router || swap.tickSpacing != stock.tickSpacing) {
            revert WrongRouterOrPool(token);
        }

        SwapCheck memory check = _describe(account, stock, swap, isBuy);
        _checkCeilings(check);
        for (uint256 i = 0; i < config.plugins.length; i++) {
            IRulePlugin(config.plugins[i]).checkSwap(check);
        }
    }

    /// @dev What the rule modules are told about a swap: what it is worth at the pool's trusted price, and how deep the pool is, for a buy
    function _describe(
        address account,
        Stock memory stock,
        ISlipstreamRouter.ExactInputSingleParams memory swap,
        bool isBuy
    ) private view returns (SwapCheck memory check) {
        uint160 sqrtPrice = PoolPricing.trustedPrice(stock);
        check.account = account;
        check.stock = stock;
        check.isBuy = isBuy;
        check.amountIn = swap.amountIn;
        check.minOut = swap.amountOutMinimum;
        check.expectedOut = isBuy
            ? VaultMath.stockFor(swap.amountIn, sqrtPrice, stock.usdcIsToken0)
            : VaultMath.usdcValue(swap.amountIn, sqrtPrice, stock.usdcIsToken0);
        check.poolDepth = isBuy ? PoolPricing.depthOf(usdc, stock, sqrtPrice) : 0;
    }

    /// @dev The same for every vault: a swap may not take a price worse than the ceiling, nor a buy be more than the ceiling of its pool
    function _checkCeilings(SwapCheck memory check) private pure {
        uint256 floor = Bps.lessSlippage(check.expectedOut, MAX_SLIPPAGE_CEILING_BPS);
        if (check.minOut < floor) revert SlippageTooLoose(check.stock.token, check.minOut, floor);

        if (!check.isBuy) return;
        uint256 most = Bps.portion(check.poolDepth, MAX_TRADE_OF_DEPTH_CEILING_BPS);
        if (check.amountIn > most) revert TradeTooLarge(check.stock.token, check.amountIn, most);
    }

    /// @dev A permission left open is the one way an approval could be used later, outside a checked trade, so none may be left
    function _checkNoPermissionLeft(Holdings memory holdings) private view {
        for (uint256 i = 0; i < holdings.stocks.length; i++) {
            Stock memory stock = holdings.stocks[i];
            _checkNoAllowance(usdc, stock.router);
            _checkNoAllowance(stock.token, stock.router);
        }
    }

    function _checkNoAllowance(address token, address spender) private view {
        if (IERC20Minimal(token).allowance(msg.sender, spender) != 0) revert AllowanceLeft(token, spender);
    }

    function _isAllowed(Config storage config, address token) private view returns (bool) {
        for (uint256 i = 0; i < config.stocks.length; i++) {
            if (config.stocks[i] == token) return true;
        }
        return false;
    }

    /// @dev A call's data without its 4-byte selector
    function _arguments(bytes memory data) private pure returns (bytes memory out) {
        out = new bytes(data.length - 4);
        for (uint256 i = 0; i < out.length; i++) {
            out[i] = data[i + 4];
        }
    }
}

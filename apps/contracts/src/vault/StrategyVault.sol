// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.20;

import {AbstractCallback} from "reactive-lib/abstract-base/AbstractCallback.sol";

import {IERC20Minimal} from "../interfaces/IERC20Minimal.sol";
import {ICLPool} from "../interfaces/ICLPool.sol";
import {ISlipstreamRouter} from "../interfaces/ISlipstreamRouter.sol";
import {SafeToken} from "../libraries/SafeToken.sol";
import {VaultMath} from "./VaultMath.sol";

/// @notice One strategy's money: USDC and the tokenized stocks it was researched for, with the strategy's rules written into the contract. Nothing
/// that moves the money can break a rule, whoever asks. See docs/vault.md for the design and what it does not do.
/// @dev Personal vault. The person who deploys it is the owner and may always take everything out; the rules limit what automation (the
/// executor, and the reactive stop) can do, never the owner. The rules are fixed at deployment. UNAUDITED: the deposit ceiling below is what
/// bounds the loss until it has been.
contract StrategyVault is AbstractCallback {
    using SafeToken for IERC20Minimal;

    // ------------------------------------------------------------------------------------------------------------------------ types

    /// @dev The strategy's rules, as the app has them (apps/web/src/lib/rules/spec.ts). A percentage is in basis points (2500 is 25%), and 0 for a
    /// rule that is optional means it is off.
    struct Rules {
        uint256 budget; // most USDC the vault's value may be made up to by deposits ("never put in more than")
        uint16 maxWeightBps; // most one stock may be of the vault's value, after a buy
        uint256 minPoolDepth; // least USDC a stock's pool must hold to be traded
        uint16 maxSlippageBps; // how far below the price a trade may land
        uint16 stopLossBps; // sell a stock that has fallen this far below what was paid for it
        uint16 takeProfitBps; // sell a stock that has risen this far above what was paid for it
        uint16 portfolioStopBps; // sell everything when the vault has fallen this far from its high
        uint32 pauseSeconds; // how long to stay in cash after the portfolio stop
        bool approvalRequired; // buys and sells wait for the owner's OK (exits never do)
    }

    struct StockSetup {
        address token;
        address pool;
        address router;
        int24 tickSpacing;
    }

    struct Stock {
        IERC20Minimal token;
        ICLPool pool;
        ISlipstreamRouter router;
        int24 tickSpacing;
        bool usdcIsToken0;
        bool isListed;
    }

    // ------------------------------------------------------------------------------------------------------------------------ limits
    // Ceilings no rule can go past, whatever the person chose.

    uint256 public constant DEPOSIT_CEILING = 1_000e6; // USDC, until this has been audited
    uint16 public constant MAX_SLIPPAGE_CEILING_BPS = 200;
    uint256 public constant MAX_STOCKS = 6;
    uint256 public constant MAX_TRADE_OF_DEPTH_BPS = 100; // one trade may be at most 1% of the pool's depth
    uint256 public constant MIN_TRADE = 1e6; // $1
    uint32 public constant TWAP_WINDOW = 30 minutes;
    uint256 public constant MAX_TICK_GAP = 200; // about 2%: how far the price may be from its recent average before it is not trusted
    uint32 public constant MAX_PAUSE = 365 days;
    uint256 private constant BPS = 10_000;

    // ------------------------------------------------------------------------------------------------------------------------ state

    event Deposited(uint256 amount);
    event Withdrawn(address indexed token, uint256 amount);
    event Bought(address indexed stock, uint256 usdcSpent, uint256 stockReceived);
    event Sold(address indexed stock, uint256 stockSold, uint256 usdcReceived);
    event StopLossHit(address indexed stock, uint256 value, uint256 cost);
    event TakeProfitHit(address indexed stock, uint256 value, uint256 cost);
    event PortfolioStopHit(uint256 value, uint256 high, uint256 pausedUntil);
    event TradeApproved(bytes32 indexed id);
    event ExecutorChanged(address indexed executor);

    error NotOwner();
    error NotOwnerOrExecutor();
    error NotExecutor();
    error Reentered();
    error NotListed(address token);
    error OverBudget(uint256 valueAfter, uint256 budget);
    error TradeTooSmall();
    error TradeTooLarge(uint256 amount, uint256 most);
    error PoolTooShallow(uint256 depth, uint256 least);
    error SlippageTooLoose(uint256 minOut, uint256 floor);
    error OverWeight(uint256 weightBps, uint256 most);
    error Paused(uint256 until);
    error NotApproved(bytes32 id);
    error PriceOutOfLine(address stock);
    error ConditionNotMet();
    error NothingToSell();
    error BadRules(string why);
    error BadStock(address token, string why);

    IERC20Minimal public immutable usdc;
    address public immutable owner;
    address public executor;
    Rules public rules;

    address[] public stockList;
    mapping(address => Stock) private stocks;

    /// @notice What the stock a vault holds cost, in USDC: the basis a stop-loss and a take-profit are measured from
    mapping(address => uint256) public costBasis;
    /// @notice The most the vault has been worth since it began, less what was taken out: what the portfolio stop is measured from
    uint256 public highWatermark;
    uint256 public pausedUntil;
    mapping(bytes32 => uint256) public approvals;
    bool private locked;

    // ------------------------------------------------------------------------------------------------------------------------ setup

    /// @param callbackSender The Reactive callback proxy of this chain, the only address that may trigger an exit on the owner's reactive contract's behalf
    constructor(
        address callbackSender,
        address usdc_,
        address executor_,
        Rules memory rules_,
        StockSetup[] memory setups
    ) payable AbstractCallback(callbackSender) {
        owner = msg.sender;
        usdc = IERC20Minimal(usdc_);
        executor = executor_;
        _checkRules(rules_);
        rules = rules_;

        if (setups.length == 0 || setups.length > MAX_STOCKS) revert BadRules("Between 1 and 6 stocks");
        for (uint256 i = 0; i < setups.length; i++) {
            _listStock(setups[i]);
        }
        emit ExecutorChanged(executor_);
    }

    function _checkRules(Rules memory r) private pure {
        if (r.budget == 0 || r.budget > DEPOSIT_CEILING) revert BadRules("Budget is zero or over the ceiling");
        if (r.maxWeightBps == 0 || r.maxWeightBps > BPS) revert BadRules("Max weight is 0 to 100%");
        if (r.maxSlippageBps == 0 || r.maxSlippageBps > MAX_SLIPPAGE_CEILING_BPS) {
            revert BadRules("Slippage is over the ceiling");
        }
        if (r.stopLossBps >= BPS || r.portfolioStopBps >= BPS) revert BadRules("A stop of 100% or more never fires");
        if (r.pauseSeconds > MAX_PAUSE) revert BadRules("Pause is over a year");
    }

    /// @dev A stock is listed only if everything the vault will rely on about its pool checks out now: the pool is of this token and USDC, the router
    /// is the one that trades that pool's factory, and the pool has enough history for the average price
    function _listStock(StockSetup memory setup) private {
        if (stocks[setup.token].isListed) revert BadStock(setup.token, "Listed twice");

        ICLPool pool = ICLPool(setup.pool);
        address token0 = pool.token0();
        address token1 = pool.token1();
        bool usdcIsToken0 = token0 == address(usdc);
        if (!(usdcIsToken0 && token1 == setup.token) && !(token1 == address(usdc) && token0 == setup.token)) {
            revert BadStock(setup.token, "Pool is not this stock against USDC");
        }
        if (ISlipstreamRouter(setup.router).factory() != pool.factory()) {
            revert BadStock(setup.token, "Router is not for this pool's factory");
        }
        if (pool.tickSpacing() != setup.tickSpacing) revert BadStock(setup.token, "Wrong tick spacing");

        stocks[setup.token] = Stock({
            token: IERC20Minimal(setup.token),
            pool: pool,
            router: ISlipstreamRouter(setup.router),
            tickSpacing: setup.tickSpacing,
            usdcIsToken0: usdcIsToken0,
            isListed: true
        });
        stockList.push(setup.token);
        // Reverts if the pool can't give an average over the window
        _price(stocks[setup.token]);
    }

    // ------------------------------------------------------------------------------------------------------------------------ access

    modifier onlyOwner() {
        if (msg.sender != owner) revert NotOwner();
        _;
    }

    modifier onlyExecutor() {
        if (msg.sender != executor) revert NotExecutor();
        _;
    }

    modifier onlyOwnerOrExecutor() {
        if (msg.sender != owner && msg.sender != executor) revert NotOwnerOrExecutor();
        _;
    }

    modifier nonReentrant() {
        if (locked) revert Reentered();
        locked = true;
        _;
        locked = false;
    }

    // ------------------------------------------------------------------------------------------------------------------------ owner

    /// @notice Puts USDC in. Refused if it would make the vault worth more than the budget.
    function deposit(uint256 amount) external onlyOwner nonReentrant {
        uint256 valueAfter = totalValue() + amount;
        if (valueAfter > rules.budget) revert OverBudget(valueAfter, rules.budget);
        usdc.safeTransferFrom(msg.sender, address(this), amount);
        highWatermark += amount;
        emit Deposited(amount);
    }

    /// @notice Takes USDC out. Always allowed, and it needs no price.
    function withdrawUsdc(uint256 amount) external onlyOwner nonReentrant {
        highWatermark -= _min(highWatermark, amount);
        usdc.safeTransfer(owner, amount);
        emit Withdrawn(address(usdc), amount);
    }

    /// @notice Takes some of a stock out. Always allowed, and it needs no price: the stock's cost leaves with it.
    function withdrawStock(address token, uint256 amount) external onlyOwner nonReentrant {
        Stock storage stock = _listed(token);
        uint256 held = stock.token.balanceOf(address(this));
        uint256 costLeaving = held == 0 ? 0 : (costBasis[token] * _min(amount, held)) / held;
        costBasis[token] -= costLeaving;
        highWatermark -= _min(highWatermark, costLeaving);
        stock.token.safeTransfer(owner, amount);
        emit Withdrawn(token, amount);
    }

    /// @notice Gets back any other token sent here by mistake. USDC and the listed stocks go through the withdrawals above.
    function rescue(address token, uint256 amount) external onlyOwner nonReentrant {
        require(token != address(usdc) && !stocks[token].isListed, "Use the withdrawals");
        IERC20Minimal(token).safeTransfer(owner, amount);
    }

    function setExecutor(address executor_) external onlyOwner {
        executor = executor_;
        emit ExecutorChanged(executor_);
    }

    /// @notice The OK for one trade, when the rules ask for it. `side` is 0 for a buy and 1 for a sell; `amount` is USDC for a buy and stock for a sell.
    function approveTrade(uint8 side, address stock, uint256 amount) external onlyOwner {
        bytes32 id = tradeId(side, stock, amount);
        approvals[id] += 1;
        emit TradeApproved(id);
    }

    function tradeId(uint8 side, address stock, uint256 amount) public pure returns (bytes32) {
        return keccak256(abi.encode(side, stock, amount));
    }

    // ------------------------------------------------------------------------------------------------------------------------ trading

    /// @notice Buys a stock with USDC, if every rule allows it
    function buy(address token, uint256 usdcIn, uint256 minOut) external onlyExecutor nonReentrant {
        // forge-lint: disable-next-line(block-timestamp)
        if (block.timestamp < pausedUntil) revert Paused(pausedUntil);
        Stock storage stock = _listed(token);
        if (usdcIn < MIN_TRADE) revert TradeTooSmall();
        _useApproval(0, token, usdcIn);

        uint160 sqrtPrice = _price(stock);
        _checkDepthAndSize(stock, usdcIn, sqrtPrice);
        _checkSlippage(minOut, VaultMath.stockFor(usdcIn, sqrtPrice, stock.usdcIsToken0));

        uint256 received = _swap(stock, address(usdc), token, usdcIn, minOut);
        costBasis[token] += usdcIn;

        uint256 total = totalValue();
        uint256 weight = (_stockValue(stock) * BPS) / total;
        if (weight > rules.maxWeightBps) revert OverWeight(weight, rules.maxWeightBps);
        highWatermark = _max(highWatermark, total);
        emit Bought(token, usdcIn, received);
    }

    /// @notice Sells some of a stock for USDC
    function sell(address token, uint256 amount, uint256 minOut) external onlyExecutor nonReentrant {
        Stock storage stock = _listed(token);
        _useApproval(1, token, amount);
        _sellChecked(stock, amount, minOut);
    }

    // ------------------------------------------------------------------------------------------------------------------------ exits
    // An exit is allowed only while its condition holds, and the vault checks that itself from the pool's average price. Whoever triggers it
    // (the reactive contract, the executor, or the owner) can therefore not make it sell when it should not. Exits never wait for an OK.

    /// @notice Called by the owner's reactive contract through the Reactive callback proxy
    function triggerStockExit(address rvmId, address token)
        external
        authorizedSenderOnly
        rvmIdOnly(rvmId)
        nonReentrant
    {
        _exitStock(_listed(token));
    }

    /// @notice Called by the owner's reactive contract through the Reactive callback proxy
    function triggerPortfolioStop(address rvmId) external authorizedSenderOnly rvmIdOnly(rvmId) nonReentrant {
        _exitAll();
    }

    /// @notice The same exit, for the owner or executor to call when the reactive contract is not around
    function exitStock(address token) external onlyOwnerOrExecutor nonReentrant {
        _exitStock(_listed(token));
    }

    function exitAll() external onlyOwnerOrExecutor nonReentrant {
        _exitAll();
    }

    /// @notice Records a new high, if the vault is worth more than it has been. Anyone may call it.
    function poke() external {
        highWatermark = _max(highWatermark, totalValue());
    }

    function _exitStock(Stock storage stock) private {
        address token = address(stock.token);
        uint256 held = stock.token.balanceOf(address(this));
        uint256 cost = costBasis[token];
        if (held == 0 || cost == 0) revert NothingToSell();

        uint256 value = _stockValue(stock);
        bool isStopLoss = rules.stopLossBps != 0 && value * BPS <= cost * (BPS - rules.stopLossBps);
        bool isTakeProfit = rules.takeProfitBps != 0 && value * BPS >= cost * (BPS + rules.takeProfitBps);
        if (!isStopLoss && !isTakeProfit) revert ConditionNotMet();

        if (isStopLoss) emit StopLossHit(token, value, cost);
        else emit TakeProfitHit(token, value, cost);
        _sellAll(stock);
    }

    function _exitAll() private {
        if (rules.portfolioStopBps == 0) revert ConditionNotMet();
        uint256 total = totalValue();
        uint256 high = highWatermark;
        if (high == 0 || total * BPS > high * (BPS - rules.portfolioStopBps)) revert ConditionNotMet();

        for (uint256 i = 0; i < stockList.length; i++) {
            Stock storage stock = stocks[stockList[i]];
            if (stock.token.balanceOf(address(this)) != 0) _sellAll(stock);
        }

        pausedUntil = block.timestamp + rules.pauseSeconds;
        // In cash, the vault's high starts again from what it has left
        highWatermark = usdc.balanceOf(address(this));
        emit PortfolioStopHit(total, high, pausedUntil);
    }

    // ------------------------------------------------------------------------------------------------------------------------ views

    /// @notice What the vault is worth: its USDC plus its stocks at the pools' prices. Reverts if a pool's price is not to be trusted.
    function totalValue() public view returns (uint256 total) {
        total = usdc.balanceOf(address(this));
        for (uint256 i = 0; i < stockList.length; i++) {
            total += _stockValue(stocks[stockList[i]]);
        }
    }

    function stockValue(address token) external view returns (uint256) {
        return _stockValue(_listedView(token));
    }

    function stockCount() external view returns (uint256) {
        return stockList.length;
    }

    // ------------------------------------------------------------------------------------------------------------------------ internals

    function _listed(address token) private view returns (Stock storage stock) {
        stock = stocks[token];
        if (!stock.isListed) revert NotListed(token);
    }

    function _listedView(address token) private view returns (Stock storage stock) {
        stock = _listed(token);
    }

    function _useApproval(uint8 side, address token, uint256 amount) private {
        if (!rules.approvalRequired) return;
        bytes32 id = tradeId(side, token, amount);
        if (approvals[id] == 0) revert NotApproved(id);
        approvals[id] -= 1;
    }

    /// @dev The pool's price, trusted only while it is close to its own recent average. A trade that moves the price a long way inside one
    /// transaction (to make a rule pass) is a trade this refuses.
    function _price(Stock storage stock) private view returns (uint160 sqrtPriceX96) {
        int24 tick;
        (sqrtPriceX96, tick,,,,) = stock.pool.slot0();

        uint32[] memory ago = new uint32[](2);
        ago[0] = TWAP_WINDOW;
        ago[1] = 0;
        (int56[] memory cumulatives,) = stock.pool.observe(ago);

        int24 average = VaultMath.averageTick(cumulatives[0], cumulatives[1], TWAP_WINDOW);
        if (VaultMath.distance(tick, average) > MAX_TICK_GAP) revert PriceOutOfLine(address(stock.token));
    }

    function _stockValue(Stock storage stock) private view returns (uint256) {
        uint256 held = stock.token.balanceOf(address(this));
        if (held == 0) return 0;
        return VaultMath.usdcValue(held, _price(stock), stock.usdcIsToken0);
    }

    /// @dev How much USDC a pool holds, both sides counted: the stock side at the pool's price
    function _depth(Stock storage stock, uint160 sqrtPrice) private view returns (uint256) {
        uint256 usdcSide = usdc.balanceOf(address(stock.pool));
        uint256 stockSide = stock.token.balanceOf(address(stock.pool));
        return usdcSide + VaultMath.usdcValue(stockSide, sqrtPrice, stock.usdcIsToken0);
    }

    function _checkDepthAndSize(Stock storage stock, uint256 usdcIn, uint160 sqrtPrice) private view {
        uint256 depth = _depth(stock, sqrtPrice);
        if (depth < rules.minPoolDepth) revert PoolTooShallow(depth, rules.minPoolDepth);
        uint256 most = (depth * MAX_TRADE_OF_DEPTH_BPS) / BPS;
        if (usdcIn > most) revert TradeTooLarge(usdcIn, most);
    }

    function _checkSlippage(uint256 minOut, uint256 expected) private view {
        uint256 floor = (expected * (BPS - rules.maxSlippageBps)) / BPS;
        if (minOut < floor) revert SlippageTooLoose(minOut, floor);
    }

    function _sellAll(Stock storage stock) private {
        uint256 held = stock.token.balanceOf(address(this));
        uint160 sqrtPrice = _price(stock);
        uint256 floor = (VaultMath.usdcValue(held, sqrtPrice, stock.usdcIsToken0) * (BPS - rules.maxSlippageBps)) / BPS;
        _sellChecked(stock, held, floor);
    }

    function _sellChecked(Stock storage stock, uint256 amount, uint256 minOut) private {
        address token = address(stock.token);
        uint256 held = stock.token.balanceOf(address(this));
        if (amount == 0 || held == 0) revert NothingToSell();

        uint160 sqrtPrice = _price(stock);
        _checkSlippage(minOut, VaultMath.usdcValue(amount, sqrtPrice, stock.usdcIsToken0));

        uint256 costLeaving = (costBasis[token] * _min(amount, held)) / held;
        uint256 received = _swap(stock, token, address(usdc), amount, minOut);
        costBasis[token] -= costLeaving;
        emit Sold(token, amount, received);
    }

    function _swap(Stock storage stock, address tokenIn, address tokenOut, uint256 amountIn, uint256 minOut)
        private
        returns (uint256)
    {
        IERC20Minimal(tokenIn).safeApprove(address(stock.router), amountIn);
        uint256 out = stock.router
            .exactInputSingle(
                ISlipstreamRouter.ExactInputSingleParams({
                    tokenIn: tokenIn,
                    tokenOut: tokenOut,
                    tickSpacing: stock.tickSpacing,
                    recipient: address(this),
                    deadline: block.timestamp,
                    amountIn: amountIn,
                    amountOutMinimum: minOut,
                    sqrtPriceLimitX96: 0
                })
            );
        IERC20Minimal(tokenIn).safeApprove(address(stock.router), 0);
        return out;
    }

    function _min(uint256 a, uint256 b) private pure returns (uint256) {
        return a < b ? a : b;
    }

    function _max(uint256 a, uint256 b) private pure returns (uint256) {
        return a > b ? a : b;
    }
}

// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.20;

import {IndexWeighting, Indicator} from "../blocks/types/Enums.sol";
import {Channels} from "../blocks/Channels.sol";
import {IReadings} from "../blocks/interfaces/IReadings.sol";
import {IERC20Minimal} from "../interfaces/IERC20Minimal.sol";
import {ISlipstreamRouter} from "../interfaces/ISlipstreamRouter.sol";
import {Bps} from "../libraries/Bps.sol";
import {SafeCast} from "../libraries/SafeCast.sol";
import {SafeToken} from "../libraries/SafeToken.sol";
import {IndexDeposits} from "./IndexDeposits.sol";
import {IndexSettings} from "./IndexTypes.sol";
import {PoolPricing} from "../pricing/PoolPricing.sol";
import {StockRegistry} from "../registry/StockRegistry.sol";
import {Stock} from "../registry/StockTypes.sol";
import {VaultMath} from "../vault/VaultMath.sol";

/// @notice An index: a collection of up to 5,000 stocks, held together, that is also one token.
///   As a holder   it owns the real stocks, and keeps them at their weights by rounds a keeper runs a page at a time.
///   As a token    it is an ERC-20: whoever owns a share owns a part of every stock, and can leave with it at any moment.
/// A strategy holds it like any one token (`AssetBlock` with this index's address): the strategy owns one token; the index owns the stocks. It is not
/// a block itself, and has no part in a strategy's rules.
/// You make your own with the stocks you want and one of the ways to weight them (see `IndexWeighting`): an equal-weight S&P 500, a liquidity-weighted
/// one, a market-cap one. The index works its weights out itself, in every round, from the stocks' own pools or from the readings, so no one posts
/// them and no one can post wrong ones.
///
/// Top N: given a `topN` of N, the stocks the index lists are only the ones it may pick from, and it holds the N with the highest scores,
/// weighted by those scores (the 500 largest by market cap, weighted by market cap, is an S&P 500). Which N is a rule and not a choice: a round is
/// started with the score of the Nth stock, the keeper works it out by reading `scoreOf`, and the round checks it against what it counts while it
/// values (`_isCutoffRight`), so a wrong one only stops the round. A stock that falls below the cutoff is sold out over the next rounds, and one
/// that rises above it is bought. Stocks tied at the cutoff are all in.
///
/// @dev The strategy vault holds at most 6 stocks because every check in it loops over them. This is the other design: one transaction never touches
/// more than a page. A round is three walks down the list of stocks, each in as many transactions as the keeper likes:
///   Valuing  add up what the index holds, what every stock is to be given, and price the deposits that are waiting
///   Selling  sell what is over its target, so there is cash
///   Buying   buy what is under its target, with that cash
/// Everything a trade can do is limited by the registry (only listed stocks, in their own pool and router), the pool's price (it must be close to its
/// own half-hour average), a ceiling on slippage and a ceiling on how much of a pool one trade may be. So the keeper decides when, never what.
/// A stock whose pool is too shallow, or whose price cannot be trusted, is given nothing, and what it would have had goes to the others. A stock the
/// curator has dropped is sold out over the next rounds. UNAUDITED: `DEPOSIT_CEILING` is what bounds the loss until it has been.
contract Index is IndexDeposits {
    using SafeToken for IERC20Minimal;

    enum Phase {
        Idle,
        Valuing,
        Selling,
        Buying
    }

    /// @notice A person leaving with their part of every stock. A list of thousands cannot be paid in one transaction, so it is paid in pages; only one
    /// redemption is open at a time, so that what each page pays is a share of what the index held when it began.
    struct Redemption {
        address person;
        // The shares that were given up, and the shares there were before that
        uint256 shares;
        uint256 supply;
        // How far down the list of stocks the person has been paid
        uint256 paidTo;
        bool isOpen;
    }

    uint256 public constant MAX_STOCKS = 5_000;
    uint16 public constant MAX_SLIPPAGE_CEILING_BPS = 200;
    /// @dev One trade may be at most 1% of its pool's depth, as in the vault. An index too big for a pool gets there over several rounds.
    uint256 public constant MAX_TRADE_OF_DEPTH_BPS = 100;
    uint256 public constant MIN_TRADE = 1e6;
    /// @dev How long a round may stay open before anyone can close it, so a stock whose price cannot be read does not lock the index
    uint256 public constant ROUND_TIMEOUT = 1 days;
    /// @dev The window of the volatility an inverse index reads, the one the app posts
    uint16 public constant VOLATILITY_WINDOW = 60;
    uint256 private constant INVERSE_ONE = 1e30;

    // What the index was made with. Set once, in `initialize`, because an index is a clone of one shared copy and a clone has no constructor of its own.
    StockRegistry public registry;
    IReadings public readings;
    // These four and the flag share a slot
    IndexWeighting public weighting;
    uint16 public cashBps;
    uint16 public maxSlippageBps;
    uint16 public driftBps;
    uint16 public topN;
    bool private isInitialized;
    uint256 public minPoolDepth;
    uint256 public roundInterval;

    address public curator;
    address public keeper;

    address[] private stocks;
    mapping(address => bool) public isStock;
    mapping(address => uint256) private positionOf;
    /// @notice A stock the curator has taken out of the index: it is given nothing, and is sold out over the next rounds
    mapping(address => bool) public isDropped;
    /// @notice The number the curator gave a stock in a `Custom` index. It is only worth something next to the others: a stock is given its number over
    /// all of them.
    mapping(address => uint256) public customWeight;

    Redemption public redemption;

    Phase public phase;
    /// @notice How far down the list the round is, in the phase it is in
    uint256 public cursor;
    uint256 public roundStartedAt;
    uint256 public lastRoundAt;
    uint256 private roundEpoch;
    uint256 private valueSum;
    /// @notice What every stock's score added up to in this round: a stock is given its score over this
    uint256 public scoreSum;
    /// @notice What the index was worth when the last round valued it, before the deposits that round priced
    uint256 public roundValue;
    /// @notice What the targets of this round are shares of: the index's value with the deposits that came in
    uint256 public tradeBase;
    /// @notice With a `topN`, the score of the Nth stock this round was started with: a stock scoring less is given nothing
    uint256 public roundCutoff;
    // What the valuing counted, to check the cutoff: the stocks scoring at least the cutoff, and the ones scoring more than it
    uint256 private countAtCutoff;
    uint256 private countAboveCutoff;

    event StocksAdded(uint256 count);
    event StockDropped(address indexed token);
    event StockRemoved(address indexed token);
    event CustomWeightSet(address indexed token, uint256 weight);
    event CuratorChanged(address indexed curator);
    event KeeperChanged(address indexed keeper);
    event RoundStarted(uint256 indexed epoch);
    event Valued(uint256 value, uint256 deposits, uint256 rate);
    event RoundDone();
    event RoundAborted();
    event CutoffRejected(uint256 cutoff, uint256 atCutoff, uint256 above);
    event Bought(address indexed token, uint256 usdcSpent, uint256 stockReceived);
    event Sold(address indexed token, uint256 stockSold, uint256 usdcReceived);
    event PriceSkipped(address indexed token);
    event TradeFailed(address indexed token);
    event RedemptionOpened(address indexed person, uint256 shares);
    event RedemptionPaid(address indexed person, uint256 paidTo);
    event Redeemed(address indexed person, uint256 shares);
    event PayoutSkipped(address indexed token);

    error NotCurator();
    error NotKeeper();
    error NotIdle(Phase phase);
    error RedemptionIsOpen();
    error NoRedemption();
    error NoRound();
    error TooSoon(uint256 at);
    error RoundNotStale(uint256 at);
    error NotListed(address token);
    error AlreadyInIndex(address token);
    error NotDropped(address token);
    error NotACustomIndex();
    error NotInIndex(address token);
    error LengthMismatch();
    error TooManyStocks();
    error StillHeld(address token);
    error ZeroAmount();
    error NoCurator();
    error NoKeeper();
    error SlippageOverCeiling();
    error DriftOrCashTooHigh();
    error NeedsReadings();
    error AlreadyInitialized();
    error TopNeedsRanking();
    error TopTooBig();
    error NeedsCutoff();
    error NoTopN();

    modifier onlyCurator() {
        if (msg.sender != curator) revert NotCurator();
        _;
    }

    modifier onlyKeeper() {
        if (msg.sender != keeper) revert NotKeeper();
        _;
    }

    /// @dev No round and no redemption in progress: the stock list and the holdings are not being walked
    modifier onlyIdle() {
        if (phase != Phase.Idle) revert NotIdle(phase);
        if (redemption.isOpen) revert RedemptionIsOpen();
        _;
    }

    /// @dev The shared copy that every index is a clone of is locked at once, so that no one can set it up and use it
    constructor() {
        isInitialized = true;
    }

    /// @notice Sets an index up, once. The factory does it in the same transaction that makes the clone.
    /// @param customWeights For a `Custom` index, a number for each of the first stocks, in the same order; empty for any other
    function initialize(
        StockRegistry registry_,
        IndexSettings memory settings,
        address[] memory first,
        uint256[] memory customWeights
    ) external {
        if (isInitialized) revert AlreadyInitialized();
        isInitialized = true;

        if (settings.curator == address(0)) revert NoCurator();
        if (settings.maxSlippageBps == 0 || settings.maxSlippageBps > MAX_SLIPPAGE_CEILING_BPS) {
            revert SlippageOverCeiling();
        }
        if (settings.driftBps > Bps.DENOMINATOR || settings.cashBps >= Bps.DENOMINATOR) revert DriftOrCashTooHigh();
        bool needsReadings = settings.weighting == IndexWeighting.MarketCap || settings.weighting == IndexWeighting.Inverse;
        if (needsReadings && address(settings.readings) == address(0)) revert NeedsReadings();
        if (settings.topN > MAX_STOCKS) revert TopTooBig();
        bool hasNoRanking = settings.weighting == IndexWeighting.Equal || settings.weighting == IndexWeighting.Custom;
        if (settings.topN != 0 && hasNoRanking) revert TopNeedsRanking();

        _setNameAndSymbol(settings.name, settings.symbol);
        usdc = IERC20Minimal(registry_.usdc());
        registry = registry_;
        readings = settings.readings;
        weighting = settings.weighting;
        topN = settings.topN;
        cashBps = settings.cashBps;
        maxSlippageBps = settings.maxSlippageBps;
        minPoolDepth = settings.minPoolDepth;
        driftBps = settings.driftBps;
        roundInterval = settings.roundInterval;
        curator = settings.curator;
        keeper = settings.keeper == address(0) ? settings.curator : settings.keeper;

        _addStocks(first);
        _setFirstCustomWeights(first, customWeights);
    }

    /// @dev A `Custom` index is made with a number for each of its stocks, so it is never left with a moment when it holds nothing: the weights come
    /// with it. Any other kind has no use for them, and being given some is a mistake worth refusing.
    function _setFirstCustomWeights(address[] memory first, uint256[] memory customWeights) private {
        if (weighting != IndexWeighting.Custom) {
            if (customWeights.length != 0) revert NotACustomIndex();
            return;
        }
        if (customWeights.length != first.length) revert LengthMismatch();
        for (uint256 i = 0; i < first.length; i++) {
            customWeight[first[i]] = customWeights[i];
            emit CustomWeightSet(first[i], customWeights[i]);
        }
    }

    // ------------------------------------------------------------------------------------------------------------------------ the stocks

    /// @notice Puts stocks in the index. They are given a share from the next round.
    function addStocks(address[] calldata tokens) external onlyCurator onlyIdle {
        _addStocks(tokens);
    }

    /// @notice Gives stocks their numbers in a `Custom` index. Numbers are relative, so only their sizes next to each other count; zero gives a stock
    /// nothing, and the stock is sold down over the next rounds. A stock not given a number keeps the one it had.
    function setCustomWeights(address[] calldata tokens, uint256[] calldata weights) external onlyCurator onlyIdle {
        if (weighting != IndexWeighting.Custom) revert NotACustomIndex();
        if (tokens.length != weights.length) revert LengthMismatch();
        for (uint256 i = 0; i < tokens.length; i++) {
            if (!isStock[tokens[i]]) revert NotInIndex(tokens[i]);
            customWeight[tokens[i]] = weights[i];
            emit CustomWeightSet(tokens[i], weights[i]);
        }
    }

    /// @notice Takes stocks out of the index's weights: each is sold out over the next rounds, and can be removed once it has been
    function dropStocks(address[] calldata tokens) external onlyCurator onlyIdle {
        for (uint256 i = 0; i < tokens.length; i++) {
            if (!isStock[tokens[i]]) revert NotListed(tokens[i]);
            isDropped[tokens[i]] = true;
            emit StockDropped(tokens[i]);
        }
    }

    /// @notice Takes a dropped stock off the list once it has been sold out, so rounds stop looking at it
    function removeStock(address token) external onlyCurator onlyIdle {
        if (!isStock[token]) revert NotListed(token);
        if (!isDropped[token]) revert NotDropped(token);
        if (IERC20Minimal(token).balanceOf(address(this)) != 0) revert StillHeld(token);

        // The last stock takes its place, so nothing is shifted
        uint256 position = positionOf[token];
        address last = stocks[stocks.length - 1];
        stocks[position] = last;
        positionOf[last] = position;
        stocks.pop();
        delete positionOf[token];
        delete isStock[token];
        delete isDropped[token];
        emit StockRemoved(token);
    }

    function setCurator(address curator_) external onlyCurator {
        if (curator_ == address(0)) revert NoCurator();
        curator = curator_;
        emit CuratorChanged(curator_);
    }

    function setKeeper(address keeper_) external onlyCurator {
        if (keeper_ == address(0)) revert NoKeeper();
        keeper = keeper_;
        emit KeeperChanged(keeper_);
    }

    function stockCount() external view returns (uint256) {
        return stocks.length;
    }

    function stockAt(uint256 position) external view returns (address) {
        return stocks[position];
    }

    /// @notice The trusted price of a stock's pool; reverts when it cannot be trusted. Public so that a round can skip a stock instead of failing: a
    /// call to itself is the only way to catch a revert. The stock is handed in, so the registry is not asked for it a second time.
    function priceOfStock(Stock calldata stock) external view returns (uint160) {
        return PoolPricing.trustedPrice(stock);
    }

    /// @notice A stock's score: what it is ranked by, and weighted by, before the top N cutoff. In an index with no `topN` its share of the index
    /// is this over `totalScore`; with a `topN`, a stock below `roundCutoff` is given nothing. Zero for a stock that is dropped, whose pool is too
    /// shallow, whose price cannot be trusted, or that has no reading. The keeper reads these to find the cutoff to start a round with.
    function scoreOf(address token) external view returns (uint256) {
        return _scoreOfToken(registry.find(token));
    }

    /// @notice The scores of `count` stocks from `from`, added up. Add the pages to get the whole: a walk down thousands of stocks is more than one
    /// call may cost, even a read.
    function totalScore(uint256 from, uint256 count) external view returns (uint256 sum) {
        uint256 end = from + count;
        uint256 length = stocks.length;
        if (end > length) end = length;
        for (uint256 i = from; i < end; i++) {
            sum += _scoreOfToken(registry.find(stocks[i]));
        }
    }

    function _scoreOfToken(Stock memory stock) private view returns (uint256) {
        if (!stock.isListed) return 0;
        (bool isPriced, uint160 price) = _tryPrice(stock);
        if (!isPriced) return 0;
        return _rankOf(stock, PoolPricing.depthOf(address(usdc), stock, price));
    }

    function _addStocks(address[] memory tokens) private {
        for (uint256 i = 0; i < tokens.length; i++) {
            address token = tokens[i];
            if (!registry.isListed(token)) revert NotListed(token);
            if (isStock[token]) revert AlreadyInIndex(token);
            if (stocks.length >= MAX_STOCKS) revert TooManyStocks();
            isStock[token] = true;
            positionOf[token] = stocks.length;
            stocks.push(token);
        }
        emit StocksAdded(tokens.length);
    }

    // ------------------------------------------------------------------------------------------------------------------------ what a stock is given

    /// @dev A stock's score. What the index gives a stock is the index's value, less the cash it keeps, times this over every score. With a `topN`, a stock
    /// below the round's cutoff has none: it is out of the top N.
    function _scoreOf(Stock memory stock, uint256 depth) private view returns (uint256) {
        uint256 rank = _rankOf(stock, depth);
        return rank < roundCutoff ? 0 : rank;
    }

    /// @dev What a stock is ranked by, before the cutoff
    function _rankOf(Stock memory stock, uint256 depth) private view returns (uint256) {
        if (isDropped[stock.token]) return 0;
        if (depth < minPoolDepth) return 0;

        if (weighting == IndexWeighting.Equal) return 1;
        if (weighting == IndexWeighting.Liquidity) return depth;
        if (weighting == IndexWeighting.MarketCap) return _read(Channels.indicator(Indicator.MarketCap, 0, stock.token));
        if (weighting == IndexWeighting.Custom) return customWeight[stock.token];
        uint256 volatility = _read(Channels.indicator(Indicator.Volatility, VOLATILITY_WINDOW, stock.token));
        return volatility == 0 ? 0 : INVERSE_ONE / volatility;
    }

    /// @dev A reading that is not set, or not above zero, gives a stock nothing, and never stops the round
    function _read(bytes32 channel) private view returns (uint256) {
        (bool isSet, int256 value) = readings.tryRead(channel);
        return isSet && value > 0 ? SafeCast.abs(value) : 0;
    }

    function _targetOf(Stock memory stock, uint256 depth) private view returns (uint256) {
        if (scoreSum == 0) return 0;
        uint256 invested = Bps.portion(tradeBase, Bps.DENOMINATOR - cashBps);
        return (invested * _scoreOf(stock, depth)) / scoreSum;
    }

    // ------------------------------------------------------------------------------------------------------------------------ rounds

    /// @notice Opens a round. What was asked to be deposited until now is priced by it.
    function startRound() external onlyKeeper onlyIdle {
        if (topN != 0) revert NeedsCutoff();
        _startRound(0);
    }

    /// @notice Opens a round of an index with a `topN`, with the score of its Nth stock. A cutoff that is not that score is found out by the valuing, which stops the
    /// round and leaves the index as it was, so the keeper decides when and never which stocks.
    function startRound(uint256 cutoff) external onlyKeeper onlyIdle {
        if (topN == 0) revert NoTopN();
        if (cutoff == 0) revert ZeroAmount();
        _startRound(cutoff);
    }

    function _startRound(uint256 cutoff) private {
        // forge-lint: disable-next-line(block-timestamp)
        if (block.timestamp < lastRoundAt + roundInterval) revert TooSoon(lastRoundAt + roundInterval);

        roundEpoch = _closeEpoch();
        phase = Phase.Valuing;
        cursor = 0;
        valueSum = 0;
        scoreSum = 0;
        roundCutoff = cutoff;
        countAtCutoff = 0;
        countAboveCutoff = 0;
        roundStartedAt = block.timestamp;
        emit RoundStarted(roundEpoch);
    }

    /// @notice Walks the next `count` stocks of the round, and moves to the next phase at the end of the list. Called until the round is done.
    function step(uint256 count) external onlyKeeper nonReentrant {
        if (phase == Phase.Idle) revert NoRound();
        if (count == 0) revert ZeroAmount();

        uint256 length = stocks.length;
        uint256 end = cursor + count;
        if (end > length) end = length;

        if (phase == Phase.Valuing) _value(end);
        else if (phase == Phase.Selling) _sellDown(end);
        else _buyUp(end);

        cursor = end;
        if (cursor == length) _nextPhase();
    }

    /// @notice Closes a round that has been open too long. Anyone may: a stock whose price cannot be read must not lock the index.
    function abortRound() external {
        if (phase == Phase.Idle) revert NoRound();
        // forge-lint: disable-next-line(block-timestamp)
        if (block.timestamp < roundStartedAt + ROUND_TIMEOUT) revert RoundNotStale(roundStartedAt + ROUND_TIMEOUT);

        phase = Phase.Idle;
        cursor = 0;
        emit RoundAborted();
    }

    function _nextPhase() private {
        cursor = 0;
        if (phase == Phase.Valuing) {
            if (!_isCutoffRight()) {
                // Nothing has been traded yet, so the round is simply dropped and the keeper may start it again with another cutoff
                phase = Phase.Idle;
                emit CutoffRejected(roundCutoff, countAtCutoff, countAboveCutoff);
                emit RoundAborted();
                return;
            }
            _finishValuing();
            phase = Phase.Selling;
        } else if (phase == Phase.Selling) {
            phase = Phase.Buying;
        } else {
            phase = Phase.Idle;
            lastRoundAt = block.timestamp;
            emit RoundDone();
        }
    }

    // ------------------------------------------------------------------------------------------------------------------------ valuing

    function _value(uint256 end) private {
        for (uint256 i = cursor; i < end; i++) {
            address token = stocks[i];
            Stock memory stock = registry.find(token);
            uint256 held = IERC20Minimal(token).balanceOf(address(this));
            if (!stock.isListed) {
                // A stock held and no longer listed cannot be priced, and an index valued without it would sell shares too cheap
                if (held > 0) revert NotListed(token);
                continue;
            }
            _valueOne(stock, held);
        }
    }

    /// @dev A price that cannot be trusted stops the round for a stock the index holds, since the index's value would be short of it. For one it does
    /// not hold, it only means the stock is given nothing.
    function _valueOne(Stock memory stock, uint256 held) private {
        bool isPriced;
        uint160 price;
        if (held > 0) {
            price = PoolPricing.trustedPrice(stock);
            isPriced = true;
            valueSum += VaultMath.usdcValue(held, price, stock.usdcIsToken0);
        } else {
            (isPriced, price) = _tryPrice(stock);
        }
        if (!isPriced) return;

        uint256 rank = _rankOf(stock, PoolPricing.depthOf(address(usdc), stock, price));
        if (topN != 0) _count(rank);
        if (rank >= roundCutoff) scoreSum += rank;
    }

    /// @dev What `_isCutoffRight` checks the cutoff against
    function _count(uint256 rank) private {
        if (rank >= roundCutoff) countAtCutoff++;
        if (rank > roundCutoff) countAboveCutoff++;
    }

    /// @dev The cutoff is right when it is the score of the Nth stock: at least N stocks score as much as it, and fewer than N score more. When there
    /// are fewer than N stocks with a score, every one is in, and the cutoff is the lowest a score can be.
    function _isCutoffRight() private view returns (bool) {
        if (topN == 0) return true;
        bool isNth = countAtCutoff >= topN && countAboveCutoff < topN;
        bool isEveryoneIn = roundCutoff == 1 && countAtCutoff <= topN;
        return isNth || isEveryoneIn;
    }

    function _finishValuing() private {
        uint256 cash = usdc.balanceOf(address(this)) - pendingUsdc;
        roundValue = cash + valueSum;
        uint256 deposits = _priceDeposits(roundEpoch, roundValue);
        tradeBase = roundValue + deposits;
        emit Valued(roundValue, deposits, epochRate[roundEpoch]);
    }

    // ------------------------------------------------------------------------------------------------------------------------ trading

    function _sellDown(uint256 end) private {
        for (uint256 i = cursor; i < end; i++) {
            address token = stocks[i];
            uint256 held = IERC20Minimal(token).balanceOf(address(this));
            if (held == 0) continue;
            Stock memory stock = registry.find(token);
            if (!stock.isListed) continue;
            (bool isPriced, uint160 price) = _tryPrice(stock);
            if (!isPriced) {
                emit PriceSkipped(token);
                continue;
            }
            _sellOne(stock, held, price);
        }
    }

    function _buyUp(uint256 end) private {
        for (uint256 i = cursor; i < end; i++) {
            address token = stocks[i];
            if (isDropped[token]) continue;
            Stock memory stock = registry.find(token);
            if (!stock.isListed) continue;
            (bool isPriced, uint160 price) = _tryPrice(stock);
            if (!isPriced) {
                emit PriceSkipped(token);
                continue;
            }
            _buyOne(stock, price);
        }
    }

    function _sellOne(Stock memory stock, uint256 held, uint160 price) private {
        uint256 amountIn = _toSell(stock, held, price);
        if (amountIn == 0) return;

        uint256 expectedOut = VaultMath.usdcValue(amountIn, price, stock.usdcIsToken0);
        uint256 minOut = Bps.lessSlippage(expectedOut, maxSlippageBps);
        (bool isDone, uint256 received) = _swap(stock, stock.token, address(usdc), amountIn, minOut);
        if (isDone) emit Sold(stock.token, amountIn, received);
        else emit TradeFailed(stock.token);
    }

    function _buyOne(Stock memory stock, uint160 price) private {
        uint256 spend = _toSpend(stock, price);
        if (spend == 0) return;

        uint256 expectedOut = VaultMath.stockFor(spend, price, stock.usdcIsToken0);
        uint256 minOut = Bps.lessSlippage(expectedOut, maxSlippageBps);
        (bool isDone, uint256 received) = _swap(stock, address(usdc), stock.token, spend, minOut);
        if (isDone) emit Bought(stock.token, spend, received);
        else emit TradeFailed(stock.token);
    }

    /// @dev How much of the stock to sell now: none when it is at its target, or near enough; all of it when it is to be sold out and the pool can
    /// take it; otherwise what takes it to its target, or the most the pool may be asked for
    function _toSell(Stock memory stock, uint256 held, uint160 price) private view returns (uint256) {
        uint256 depth = PoolPricing.depthOf(address(usdc), stock, price);
        uint256 current = VaultMath.usdcValue(held, price, stock.usdcIsToken0);
        uint256 target = _targetOf(stock, depth);
        if (current <= target) return 0;

        uint256 excess = current - target;
        if (!_isWorthTrading(excess, target)) return 0;

        uint256 most = _mostOfPool(depth);
        if (target == 0 && excess <= most) return held;
        uint256 amountIn = VaultMath.stockFor(_least(excess, most), price, stock.usdcIsToken0);
        return _least(amountIn, held);
    }

    /// @dev How much USDC to spend on the stock now: none when it is at its target, or near enough; otherwise what takes it there, within the cash
    /// there is and what the pool may be asked for
    function _toSpend(Stock memory stock, uint160 price) private view returns (uint256) {
        uint256 depth = PoolPricing.depthOf(address(usdc), stock, price);
        uint256 held = IERC20Minimal(stock.token).balanceOf(address(this));
        uint256 current = VaultMath.usdcValue(held, price, stock.usdcIsToken0);
        uint256 target = _targetOf(stock, depth);
        if (current >= target) return 0;

        uint256 shortfall = target - current;
        if (!_isWorthTrading(shortfall, target)) return 0;

        uint256 spend = _least(shortfall, _mostOfPool(depth));
        spend = _least(spend, usdc.balanceOf(address(this)) - pendingUsdc);
        return spend < MIN_TRADE ? 0 : spend;
    }

    /// @dev A swap that the router refuses is not an error: the stock is left as it is until the next round, so one bad pool cannot stop the rest
    function _swap(Stock memory stock, address tokenIn, address tokenOut, uint256 amountIn, uint256 minOut)
        private
        returns (bool isDone, uint256 amountOut)
    {
        // A token that refuses the approval (paused, or built to) is a failed trade and not a failed round: otherwise one such stock, held and
        // unsellable, would stop every round of the index for good
        if (!_tryCall(tokenIn, abi.encodeCall(IERC20Minimal.approve, (stock.router, amountIn)))) return (false, 0);
        ISlipstreamRouter.ExactInputSingleParams memory params = ISlipstreamRouter.ExactInputSingleParams({
            tokenIn: tokenIn,
            tokenOut: tokenOut,
            tickSpacing: stock.tickSpacing,
            recipient: address(this),
            deadline: block.timestamp,
            amountIn: amountIn,
            amountOutMinimum: minOut,
            sqrtPriceLimitX96: 0
        });
        try ISlipstreamRouter(stock.router).exactInputSingle(params) returns (uint256 out) {
            isDone = true;
            amountOut = out;
        } catch {}
        _tryCall(tokenIn, abi.encodeCall(IERC20Minimal.approve, (stock.router, 0)));
    }

    function _tryPrice(Stock memory stock) private view returns (bool isPriced, uint160 price) {
        try this.priceOfStock(stock) returns (uint160 trusted) {
            return (true, trusted);
        } catch {
            return (false, 0);
        }
    }

    /// @dev A stock sold out is sold whatever the size. Any other is left alone when it is too near its target to be worth the fee.
    function _isWorthTrading(uint256 gap, uint256 target) private view returns (bool) {
        if (target == 0) return gap > 0;
        if (gap < MIN_TRADE) return false;
        return gap * Bps.DENOMINATOR >= target * driftBps;
    }

    function _mostOfPool(uint256 depth) private pure returns (uint256) {
        return Bps.portion(depth, MAX_TRADE_OF_DEPTH_BPS);
    }

    function _least(uint256 a, uint256 b) private pure returns (uint256) {
        return a < b ? a : b;
    }

    // ------------------------------------------------------------------------------------------------------------------------ leaving

    /// @notice Gives up shares for their part of everything the index holds: the cash, and a part of each stock. No price is needed, so it works whatever
    /// the market is doing, and it cannot be refused. Pays the cash and the first `count` stocks; anyone can pay the rest with `payRedemption`.
    /// @dev Not while a round is open, since the round is working from what the index held when it began, and not while another redemption is open.
    function redeem(uint256 shares, uint256 count) external nonReentrant onlyIdle {
        if (shares == 0 || count == 0) revert ZeroAmount();

        uint256 supply = totalSupply;
        _burn(msg.sender, shares);
        redemption = Redemption(msg.sender, shares, supply, 0, true);
        emit RedemptionOpened(msg.sender, shares);

        uint256 cash = usdc.balanceOf(address(this)) - pendingUsdc;
        usdc.safeTransfer(msg.sender, (cash * shares) / supply);
        _payStocks(count);
    }

    /// @notice Pays the next `count` stocks of the open redemption to the person who opened it. Anyone may call it, so a person who stops half way
    /// cannot keep the index shut.
    function payRedemption(uint256 count) external nonReentrant {
        if (!redemption.isOpen) revert NoRedemption();
        if (count == 0) revert ZeroAmount();
        _payStocks(count);
    }

    function _payStocks(uint256 count) private {
        Redemption memory open = redemption;
        uint256 length = stocks.length;
        uint256 end = open.paidTo + count;
        if (end > length) end = length;

        for (uint256 i = open.paidTo; i < end; i++) {
            address token = stocks[i];
            uint256 part = (IERC20Minimal(token).balanceOf(address(this)) * open.shares) / open.supply;
            if (part > 0 && !_tryTransfer(token, open.person, part)) emit PayoutSkipped(token);
        }

        redemption.paidTo = end;
        emit RedemptionPaid(open.person, end);
        if (end == length) {
            delete redemption;
            emit Redeemed(open.person, open.shares);
        }
    }

    /// @dev A stock that will not be sent (a token that blocks an address, or one that was paused) is skipped, so one bad token cannot hold every
    /// other holder's exit. What was not sent stays in the index.
    function _tryTransfer(address token, address to, uint256 amount) private returns (bool) {
        return _tryCall(token, abi.encodeCall(IERC20Minimal.transfer, (to, amount)));
    }

    /// @dev A token call that says whether it worked, and never reverts. A token that answers with nothing (USDT-style) counts as having said yes.
    function _tryCall(address token, bytes memory data) private returns (bool) {
        (bool isDone, bytes memory answer) = token.call(data);
        return isDone && (answer.length == 0 || abi.decode(answer, (bool)));
    }
}

// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.20;

import {Bps} from "../libraries/Bps.sol";
import {SafeCast} from "../libraries/SafeCast.sol";

/// @title SignalBoard
/// @notice A small oracle for what only the app can work out: a number for a channel (a share's price, an indicator) or the stocks and weights a
/// strategy should hold. The app's executor posts them; a reactive contract watches the events and asks a vault to act; the vault checks what
/// it was told against this board before it does anything. See README.md in this folder for the design and what it does not do.
/// @dev Personal deployment, like the vault: whoever deploys it is the owner, and may change the publisher or switch a signal off. The board
/// only keeps what was posted and refuses what is stale, out of order, too far from the last value, or badly formed; it never moves money. A
/// vault must still enforce its own rules on whatever it is told, because the publisher can be wrong.
contract SignalBoard {
    // ------------------------------------------------------------------------------------------------------------------------ types
    /// @dev The last value posted to a channel. `seq` counts the values, so a consumer can tell one is newer than the one it has.
    struct Value {
        int256 value;
        uint64 asOf;
        uint64 seq;
    }

    /// @dev What is kept of the last targets posted for a vault; the stocks and weights themselves are in the event, and `hash` stands for them.
    struct Targets {
        uint64 seq;
        uint64 asOf;
        uint64 expiresAt;
        bytes32 hash;
    }

    // ------------------------------------------------------------------------------------------------------------------------ limits
    /// @notice The same ceiling as the vault's: more stocks than this cannot be held, so none can be asked for
    uint256 public constant MAX_STOCKS = 6;
    /// @notice How far ahead of this chain's clock a signal may claim to be from
    uint64 public constant MAX_FUTURE_SKEW = 5 minutes;
    /// @notice The longest a set of targets can be trusted for, from when it was worked out. After that a new one has to be posted.
    uint64 public constant MAX_VALIDITY = 7 days;

    // ------------------------------------------------------------------------------------------------------------------------ state
    address public immutable owner;
    address public publisher;

    mapping(bytes32 channel => Value) public latestValue;
    /// @notice The most a channel's value may move in one post, in basis points of the last value. 0 means no limit.
    mapping(bytes32 channel => uint16) public maxMoveBps;
    mapping(address vault => Targets) public latestTargets;

    // ------------------------------------------------------------------------------------------------------------------------ events
    event PublisherChanged(address indexed publisher);
    event MaxMoveChanged(bytes32 indexed channel, uint16 bps);
    /// @param evidence A hash of what the number was worked out from (a data snapshot, a notebook), so it can be audited afterwards
    event ValuePosted(bytes32 indexed channel, uint64 indexed seq, int256 value, uint64 asOf, bytes32 evidence);
    /// @dev The whole list is in the event, so a reactive contract has it without reading anything. `vault` is a topic to subscribe by.
    event TargetsPosted(
        address indexed vault,
        uint64 indexed seq,
        address[] stocks,
        uint16[] weightsBps,
        uint64 asOf,
        uint64 expiresAt,
        bytes32 evidence
    );
    /// @notice The owner stopped trusting a vault's targets, so a vault must not act on them
    event TargetsRevoked(address indexed vault, uint64 indexed seq);

    // ------------------------------------------------------------------------------------------------------------------------ errors
    error NotOwner();
    error NotPublisher();
    error ZeroAddress();
    error NotNewer(uint64 asOf, uint64 last);
    error FromTheFuture(uint64 asOf, uint256 now_);
    error MoveTooLarge(int256 from, int256 to, uint16 mostBps);
    error AlreadyExpired(uint256 expiresAt);
    error ValidForTooLong(uint256 expiresAt, uint256 latest);
    error WeightForEachStock();
    error TooManyStocks(uint256 count, uint256 most);
    error ZeroStock();
    error WeightOfZero(address stock);
    error StockTwice(address stock);
    error WeightsOver100(uint256 total);
    error Stale(uint64 asOf, uint64 mostAge);
    error NothingPosted();

    // ------------------------------------------------------------------------------------------------------------------------ setup
    modifier onlyOwner() {
        if (msg.sender != owner) revert NotOwner();
        _;
    }

    modifier onlyPublisher() {
        if (msg.sender != publisher) revert NotPublisher();
        _;
    }

    constructor(address publisher_) {
        if (publisher_ == address(0)) revert ZeroAddress();
        owner = msg.sender;
        publisher = publisher_;
        emit PublisherChanged(publisher_);
    }

    // ------------------------------------------------------------------------------------------------------------------------ owner
    function setPublisher(address publisher_) external onlyOwner {
        if (publisher_ == address(0)) revert ZeroAddress();
        publisher = publisher_;
        emit PublisherChanged(publisher_);
    }

    /// @notice Limits how far one post may move a channel's value, so one wrong number cannot swing it. 0 turns the limit off.
    function setMaxMove(bytes32 channel, uint16 bps) external onlyOwner {
        maxMoveBps[channel] = bps;
        emit MaxMoveChanged(channel, bps);
    }

    /// @notice Stops a vault's targets being trusted, at once. A vault checks `targetsAreCurrent`, so it will refuse them from here.
    function revokeTargets(address vault) external onlyOwner {
        Targets storage targets = latestTargets[vault];
        if (targets.seq == 0) revert NothingPosted();
        // forge-lint: disable-next-line(unsafe-typecast)
        targets.expiresAt = uint64(block.timestamp);
        emit TargetsRevoked(vault, targets.seq);
    }

    // ------------------------------------------------------------------------------------------------------------------------ publisher
    /// @notice Posts a number to a channel. It must be newer than the last, no later than this chain's clock allows, and within the channel's
    /// move limit of the last value.
    function postValue(bytes32 channel, int256 value, uint64 asOf, bytes32 evidence) external onlyPublisher {
        Value storage last = latestValue[channel];
        _checkTime(asOf, last.asOf);
        if (last.seq != 0) _checkMove(channel, last.value, value);

        uint64 seq = last.seq + 1;
        latestValue[channel] = Value({value: value, asOf: asOf, seq: seq});
        emit ValuePosted(channel, seq, value, asOf, evidence);
    }

    /// @notice Posts the stocks a vault should hold and the share of its value for each, in basis points. What is left over is cash, so the
    /// weights may add up to less than 10,000 and an empty list means all cash. They are good until `expiresAt`.
    function postTargets(
        address vault,
        address[] calldata stocks,
        uint16[] calldata weightsBps,
        uint64 asOf,
        uint64 expiresAt,
        bytes32 evidence
    ) external onlyPublisher {
        if (vault == address(0)) revert ZeroAddress();
        Targets storage last = latestTargets[vault];
        _checkTime(asOf, last.asOf);
        _checkTargets(stocks, weightsBps);
        // Times here are minutes and days, and a validator nudging the clock by seconds changes nothing
        // forge-lint: disable-next-line(block-timestamp)
        if (expiresAt <= block.timestamp) revert AlreadyExpired(expiresAt);
        if (expiresAt > uint256(asOf) + MAX_VALIDITY) revert ValidForTooLong(expiresAt, uint256(asOf) + MAX_VALIDITY);

        uint64 seq = last.seq + 1;
        latestTargets[vault] =
            Targets({seq: seq, asOf: asOf, expiresAt: expiresAt, hash: targetsHash(stocks, weightsBps)});
        emit TargetsPosted(vault, seq, stocks, weightsBps, asOf, expiresAt, evidence);
    }

    // ------------------------------------------------------------------------------------------------------------------------ for consumers
    /// @notice The identity of a channel, from what it measures and what it is measured for: `channelId("price", "METAc")`
    function channelId(string calldata kind, string calldata symbol) external pure returns (bytes32) {
        return keccak256(abi.encode(kind, symbol));
    }

    /// @notice What stands for a list of stocks and weights: the same on the board and in a vault that checks them
    function targetsHash(address[] calldata stocks, uint16[] calldata weightsBps) public pure returns (bytes32) {
        return keccak256(abi.encode(stocks, weightsBps));
    }

    /// @notice A channel's value, as long as it is no older than `mostAge` seconds; otherwise it reverts, so a stale number is never used by accident
    function valueIfFresh(bytes32 channel, uint64 mostAge) external view returns (int256) {
        Value memory last = latestValue[channel];
        if (last.seq == 0) revert NothingPosted();
        // Times here are minutes and days, and a validator nudging the clock by seconds changes nothing
        // forge-lint: disable-next-line(block-timestamp)
        if (block.timestamp > uint256(last.asOf) + mostAge) revert Stale(last.asOf, mostAge);
        return last.value;
    }

    /// @notice Whether what a vault was told by a reactive contract is what the board holds now: the newest targets, not expired, not revoked.
    /// A vault calls this with the seq and the stocks and weights it received, and acts only if it says true.
    function targetsAreCurrent(address vault, uint64 seq, address[] calldata stocks, uint16[] calldata weightsBps)
        external
        view
        returns (bool)
    {
        Targets memory last = latestTargets[vault];
        // forge-lint: disable-next-line(block-timestamp)
        return last.seq != 0 && last.seq == seq && block.timestamp < last.expiresAt
            && last.hash == targetsHash(stocks, weightsBps);
    }

    // ------------------------------------------------------------------------------------------------------------------------ checks
    function _checkTime(uint64 asOf, uint64 lastAsOf) private view {
        if (asOf <= lastAsOf) revert NotNewer(asOf, lastAsOf);
        // Times here are minutes and days, and a validator nudging the clock by seconds changes nothing
        // forge-lint: disable-next-line(block-timestamp)
        if (asOf > block.timestamp + MAX_FUTURE_SKEW) revert FromTheFuture(asOf, block.timestamp);
    }

    function _checkMove(bytes32 channel, int256 from, int256 to) private view {
        uint16 most = maxMoveBps[channel];
        if (most == 0 || from == 0) return;
        uint256 moved = SafeCast.distance(from, to);
        uint256 allowed = Bps.portion(SafeCast.abs(from), most);
        if (moved > allowed) revert MoveTooLarge(from, to, most);
    }

    function _checkTargets(address[] calldata stocks, uint16[] calldata weightsBps) private pure {
        if (stocks.length != weightsBps.length) revert WeightForEachStock();
        if (stocks.length > MAX_STOCKS) revert TooManyStocks(stocks.length, MAX_STOCKS);

        uint256 total;
        for (uint256 i = 0; i < stocks.length; i++) {
            if (stocks[i] == address(0)) revert ZeroStock();
            if (weightsBps[i] == 0) revert WeightOfZero(stocks[i]);
            for (uint256 j = 0; j < i; j++) {
                if (stocks[j] == stocks[i]) revert StockTwice(stocks[i]);
            }
            total += weightsBps[i];
        }
        if (total > Bps.DENOMINATOR) revert WeightsOver100(total);
    }
}

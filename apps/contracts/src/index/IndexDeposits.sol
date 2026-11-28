// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.20;

import {IERC20Minimal} from "../interfaces/IERC20Minimal.sol";
import {SafeToken} from "../libraries/SafeToken.sol";
import {IndexShares} from "./IndexShares.sol";

/// @notice How money gets into the index: a deposit waits in a queue and is turned into shares when the next round has valued the index.
/// @dev Pricing a share needs the value of every stock the index holds, which is one price read for each of up to 500. That cannot be done inside a
/// person's deposit, so deposits are asked for, and settled by a round at the value that round worked out (the shape of ERC-7540). Until then the
/// USDC is `pendingUsdc`: held by the index but not part of what a round values or trades.
abstract contract IndexDeposits is IndexShares {
    using SafeToken for IERC20Minimal;

    /// @notice Until the contracts have been audited, no more than this goes in over the index's life, as in `StrategyVault`
    uint256 public constant DEPOSIT_CEILING = 1_000e6;
    uint256 public constant MIN_DEPOSIT = 1e6;
    /// @dev Shares per USDC, scaled by this. An index that is empty starts at one share for each unit of USDC.
    uint256 internal constant RATE_ONE = 1e18;
    /// @dev Counted as already in the index when a share is priced, so someone who gives money to an empty index cannot make the next deposit
    /// round down to nothing
    uint256 internal constant VIRTUAL = 1e6;

    IERC20Minimal public usdc;

    /// @notice The epoch deposits are being collected in now. A round closes it and opens the next.
    uint256 public currentEpoch;
    /// @notice The first epoch whose deposits have not been turned into shares
    uint256 public nextToConvert;
    /// @notice USDC that has been asked to come in and is not yet shares: never counted in the index's value, never traded
    uint256 public pendingUsdc;
    uint256 public totalDeposited;

    mapping(uint256 epoch => uint256) public epochDeposits;
    mapping(uint256 epoch => mapping(address person => uint256)) public deposited;
    /// @notice Shares for each USDC of an epoch's deposits, scaled by 1e18; zero until a round has priced the epoch
    mapping(uint256 epoch => uint256) public epochRate;

    event DepositRequested(uint256 indexed epoch, address indexed person, uint256 amount);
    event DepositCancelled(uint256 indexed epoch, address indexed person, uint256 amount);
    event Claimed(uint256 indexed epoch, address indexed person, uint256 shares);

    error DepositTooSmall();
    error OverTheCeiling(uint256 total, uint256 ceiling);
    error NotPriced(uint256 epoch);
    error AlreadyPriced(uint256 epoch);
    error NothingDeposited();
    error BadRate();


    /// @notice Puts USDC in the queue for the epoch being collected. It becomes shares, at the price that epoch's round works out, once `claim` is open.
    function requestDeposit(uint256 amount) external nonReentrant {
        if (amount < MIN_DEPOSIT) revert DepositTooSmall();
        if (totalDeposited + amount > DEPOSIT_CEILING) revert OverTheCeiling(totalDeposited + amount, DEPOSIT_CEILING);

        totalDeposited += amount;
        pendingUsdc += amount;
        epochDeposits[currentEpoch] += amount;
        deposited[currentEpoch][msg.sender] += amount;
        usdc.safeTransferFrom(msg.sender, address(this), amount);
        emit DepositRequested(currentEpoch, msg.sender, amount);
    }

    /// @notice Takes back USDC that has not been priced yet, from any epoch, so a round that never finishes cannot keep anyone's money
    function cancelDeposit(uint256 epoch, uint256 amount) external nonReentrant {
        if (epochRate[epoch] != 0) revert AlreadyPriced(epoch);
        if (amount == 0 || deposited[epoch][msg.sender] < amount) revert NothingDeposited();

        deposited[epoch][msg.sender] -= amount;
        epochDeposits[epoch] -= amount;
        pendingUsdc -= amount;
        totalDeposited -= amount;
        usdc.safeTransfer(msg.sender, amount);
        emit DepositCancelled(epoch, msg.sender, amount);
    }

    /// @notice Takes the shares a priced epoch's deposit bought
    function claim(uint256 epoch) external nonReentrant {
        uint256 rate = epochRate[epoch];
        if (rate == 0) revert NotPriced(epoch);
        uint256 amount = deposited[epoch][msg.sender];
        if (amount == 0) revert NothingDeposited();

        delete deposited[epoch][msg.sender];
        uint256 shares = (amount * rate) / RATE_ONE;
        _move(address(this), msg.sender, shares);
        emit Claimed(epoch, msg.sender, shares);
    }

    /// @dev Closes the epoch being collected, so what comes in from now on waits for the next round. Returns the one that was closed.
    function _closeEpoch() internal returns (uint256 closed) {
        closed = currentEpoch;
        currentEpoch = closed + 1;
    }

    /// @dev Prices every epoch up to `closed` that has not been priced (one that an aborted round left behind comes along with this one), and
    /// makes their shares. The shares wait in the index until each person claims, so the share count is right for the next price at once.
    /// @param assets What the index is worth now, USDC and stocks, without the deposits waiting
    /// @return converted The USDC that stopped waiting and is now the index's
    function _priceDeposits(uint256 closed, uint256 assets) internal returns (uint256 converted) {
        uint256 rate = ((totalSupply + VIRTUAL) * RATE_ONE) / (assets + VIRTUAL);
        if (rate == 0) revert BadRate();

        for (uint256 epoch = nextToConvert; epoch <= closed; epoch++) {
            epochRate[epoch] = rate;
            converted += epochDeposits[epoch];
        }
        nextToConvert = closed + 1;
        if (converted == 0) return 0;

        pendingUsdc -= converted;
        _mint(address(this), (converted * rate) / RATE_ONE);
    }
}

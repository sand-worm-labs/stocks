// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.20;

/// @notice Why a block, or the maths under one, refuses what it was made with. Shared, because the blocks refuse the same few things.

// A stock, child or condition that is the zero address
error NoStock();
// An address that is not an index the factory made
error NotAnIndex(address token);
error NoChild();
error NoCondition();
error NeedsTwoConditions();
error NeedsAllThree();

// A list that must have at least one and at most `most`
error CountOutOfRange(uint256 count, uint256 most);

// A group's shares and channels
error ShareForEachChild();
error ShareOfZero();
error SharesOver100();
error ChannelForEachChild();
error UseEqualGroup();

// A filter
error ScoreChannelForEachStock();
error WeightChannelForEachStock();
error PickOutOfRange();
error StockTwice();

// A quorum, and a rebalance
error NeededOutOfRange();
error DriftOver100();

// The weighting maths
error VolatilityNotAboveZero();
error ValueBelowZero();
error AllValuesZero();

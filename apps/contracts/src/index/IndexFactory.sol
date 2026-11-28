// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.20;

import {Index} from "./Index.sol";
import {Clones} from "../libraries/Clones.sol";
import {StockRegistry} from "../registry/StockRegistry.sol";
import {IndexSettings} from "./IndexTypes.sol";

/// @notice Where anyone makes an index of their own: pick the stocks and a way to weight them, and get one token for the lot. Money put into the index is
/// turned into those stocks by its rounds, and a share is a claim on every one of them.
/// @dev All the indexes trade through the same `StockRegistry`, so a stock can only be in an index if the registry's curator has listed it, in its own
/// pool and router. The person who makes an index is its curator, and its keeper unless they name another.
/// An index is a clone of one shared `Index`, so making one costs a few thousand gas and not the 22 KB of the contract, and `Index` may grow
/// without this contract, which only has to carry the clone, ever coming near the size limit.
contract IndexFactory {
    StockRegistry public immutable registry;
    /// @notice The one copy of the index every index is a clone of. It is locked, and only ever read.
    address public immutable implementation;
    address[] private indexes;
    mapping(address creator => address[]) private madeBy;
    /// @notice Whether this factory made an address: what lets anything that takes an index trust that it is one, and not something dressed as one
    mapping(address => bool) public isIndex;

    event IndexCreated(address indexed index, address indexed curator, address indexed keeper, string name, string symbol);

    error NoStocks();

    constructor(StockRegistry registry_) {
        registry = registry_;
        implementation = address(new Index());
    }

    /// @param settings What the index is made with. Its curator is the caller whatever it says; its keeper is the caller when it is zero.
    /// @param stocks The stocks it starts with, listed in the registry. More can be added later by the curator, a batch at a time: an index of
    /// thousands is made in several of them.
    /// @param customWeights For a `Custom` index, the number for each of those stocks, in the same order (300 and 100 are three quarters and a quarter).
    /// Empty for any other kind of index.
    function create(IndexSettings memory settings, address[] calldata stocks, uint256[] calldata customWeights)
        external
        returns (Index index)
    {
        if (stocks.length == 0) revert NoStocks();
        settings.curator = msg.sender;
        if (settings.keeper == address(0)) settings.keeper = msg.sender;

        index = Index(Clones.clone(implementation));
        index.initialize(registry, settings, stocks, customWeights);

        indexes.push(address(index));
        isIndex[address(index)] = true;
        madeBy[msg.sender].push(address(index));
        emit IndexCreated(address(index), msg.sender, settings.keeper, settings.name, settings.symbol);
    }

    function count() external view returns (uint256) {
        return indexes.length;
    }

    function indexAt(uint256 position) external view returns (address) {
        return indexes[position];
    }

    function madeByOf(address creator) external view returns (address[] memory) {
        return madeBy[creator];
    }
}

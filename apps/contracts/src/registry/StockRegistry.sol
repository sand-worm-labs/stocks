// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.20;

import {Stock, StockSetup} from "./StockTypes.sol";
import {PoolPricing} from "../pricing/PoolPricing.sol";
import {ICLPool} from "../interfaces/ICLPool.sol";
import {ISlipstreamRouter} from "../interfaces/ISlipstreamRouter.sol";

/// @title StockRegistry
/// @notice The stocks that may be traded, with the pool and router to trade each in. A curator lists them, and every module checks a trade against
/// this list: a strategy that names some other token, a pool that is not the stock's, or a router that is not that pool's, is refused.
/// @dev Zyfai's target registry, as it applies here (docs.zyf.ai/docs/product/control/proxy): the part an attacker would swap is the token, the
/// pool and the router, so those are what is pinned. A stock is listed only if everything a module will rely on about it checks out at the time, and
/// a stock can be unlisted without anyone's vault being redeployed.
contract StockRegistry {
    address public immutable usdc;
    address public curator;

    mapping(address token => Stock) private stocks;
    address[] private tokens;

    event Listed(address indexed token, address indexed pool, address router);
    event Unlisted(address indexed token);
    event CuratorChanged(address indexed curator);

    error NotCurator();
    error NeedsTokenAndCurator();
    error NoCurator();
    error AlreadyListed(address token);
    error NotListed(address token);
    error PoolIsNotThisStock(address token);
    error RouterIsNotForThisPool(address token);
    error WrongTickSpacing(address token, int24 given, int24 actual);

    modifier onlyCurator() {
        if (msg.sender != curator) revert NotCurator();
        _;
    }

    constructor(address usdc_, address curator_) {
        if (usdc_ == address(0) || curator_ == address(0)) revert NeedsTokenAndCurator();
        usdc = usdc_;
        curator = curator_;
        emit CuratorChanged(curator_);
    }

    function setCurator(address curator_) external onlyCurator {
        if (curator_ == address(0)) revert NoCurator();
        curator = curator_;
        emit CuratorChanged(curator_);
    }

    function list(StockSetup calldata setup) external onlyCurator {
        if (stocks[setup.token].isListed) revert AlreadyListed(setup.token);

        ICLPool pool = ICLPool(setup.pool);
        address token0 = pool.token0();
        address token1 = pool.token1();
        bool usdcIsToken0 = token0 == usdc;
        if (!(usdcIsToken0 && token1 == setup.token) && !(token1 == usdc && token0 == setup.token)) {
            revert PoolIsNotThisStock(setup.token);
        }
        if (ISlipstreamRouter(setup.router).factory() != pool.factory()) {
            revert RouterIsNotForThisPool(setup.token);
        }
        if (pool.tickSpacing() != setup.tickSpacing) revert WrongTickSpacing(setup.token, setup.tickSpacing, pool.tickSpacing());

        Stock memory stock = Stock(setup.token, setup.pool, setup.router, setup.tickSpacing, usdcIsToken0, true);
        // Reverts if the pool can't give an average over the window
        PoolPricing.trustedPrice(stock);

        stocks[setup.token] = stock;
        tokens.push(setup.token);
        emit Listed(setup.token, setup.pool, setup.router);
    }

    function unlist(address token) external onlyCurator {
        if (!stocks[token].isListed) revert NotListed(token);
        delete stocks[token];
        for (uint256 i = 0; i < tokens.length; i++) {
            if (tokens[i] == token) {
                tokens[i] = tokens[tokens.length - 1];
                tokens.pop();
                break;
            }
        }
        emit Unlisted(token);
    }

    function isListed(address token) external view returns (bool) {
        return stocks[token].isListed;
    }

    /// @notice A listed stock; reverts for one that is not, so nothing is ever traded on a blank
    function stockOf(address token) external view returns (Stock memory stock) {
        stock = stocks[token];
        if (!stock.isListed) revert NotListed(token);
    }

    /// @notice A stock as the registry keeps it, or a blank with `isListed` false for one that is not listed. One call where `isListed` and `stockOf`
    /// would be two, for whoever walks a long list.
    function find(address token) external view returns (Stock memory) {
        return stocks[token];
    }

    function all() external view returns (address[] memory) {
        return tokens;
    }
}

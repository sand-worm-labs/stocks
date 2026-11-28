// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.20;

import {
    IERC7579AccountConfig,
    IERC7579Execution,
    IERC7579Hook,
    IERC7579Module,
    IERC7579ModuleConfig,
    MODULE_TYPE_EXECUTOR,
    MODULE_TYPE_HOOK
} from "../erc7579/IERC7579.sol";
import {IERC7484} from "../erc7579/IERC7484.sol";
import {Execution, ExecutionLib} from "../erc7579/ExecutionLib.sol";
import {ModeLib} from "../erc7579/ModeLib.sol";

/// @notice A module an account is created with, installed as the account is made, so it never exists without its guard
struct ModuleInit {
    uint256 moduleTypeId;
    address module;
    bytes initData;
}

/// @title StrategyAccount
/// @notice A reference ERC-7579 account for a strategy's money: it holds USDC and stocks, runs what its owner or an installed executor asks, and
/// calls an installed hook before and after every execution.
/// @dev For simulated stocks and test networks. It is NOT audited and is not meant to hold real funds: production should use an audited account
/// that follows the same standard (Safe with the Safe7579 adapter, as Zyfai does, or Nexus), and every module in this suite will work in it, since
/// they are written to the standard's interfaces.
///
/// What it leaves out of the standard, on purpose:
///  - ERC-4337. The owner calls it directly, where the standard has the entry point or the account itself do so. A validator module and
///    `executeUserOp` are the next step, and they are what would let gas be sponsored.
///  - Validators and fallback handlers: `supportsModule` says false for them.
///  - More than one hook: there is one slot. A hook multiplexer is how to have more.
///
/// What it adds, so that no module can lock the owner out of their money:
///  - `emergencyWithdraw` does not go through the hook.
///  - `forceUninstall` removes a module without calling it, for a module that reverts when it is told it is being removed.
contract StrategyAccount is IERC7579Execution, IERC7579AccountConfig, IERC7579ModuleConfig {
    address public immutable owner;
    /// @notice The module registry (ERC-7484) every module is checked against when it is installed, as Rhinestone's RegistryHook does. None when it is zero.
    IERC7484 public immutable registry;
    address public hook;

    mapping(uint256 moduleTypeId => mapping(address module => bool)) private installed;
    bool private locked;

    error NotOwner();
    error NoOwner();
    error NotExecutor();
    error UnsupportedMode(bytes32 mode);
    error UnsupportedModuleType(uint256 moduleTypeId);
    error AlreadyInstalled(uint256 moduleTypeId, address module);
    error NotInstalled(uint256 moduleTypeId, address module);
    error HookSlotTaken(address hook);
    error NotThisModuleType(address module, uint256 moduleTypeId);
    error ExecutionFailed(uint256 index, bytes reason);
    error Reentered();
    error TransferFailed();

    event TryFailed(uint256 index, bytes reason);

    constructor(address owner_, ModuleInit[] memory modules, IERC7484 registry_) {
        if (owner_ == address(0)) revert NoOwner();
        owner = owner_;
        registry = registry_;
        for (uint256 i = 0; i < modules.length; i++) {
            _install(modules[i].moduleTypeId, modules[i].module, modules[i].initData);
        }
    }

    receive() external payable {}

    // ------------------------------------------------------------------------------------------------------------------------ access
    modifier onlyOwner() {
        if (msg.sender != owner) revert NotOwner();
        _;
    }

    modifier onlyExecutorModule() {
        if (!installed[MODULE_TYPE_EXECUTOR][msg.sender]) revert NotExecutor();
        _;
    }

    modifier nonReentrant() {
        if (locked) revert Reentered();
        locked = true;
        _;
        locked = false;
    }

    /// @dev What the standard asks: the hook sees every execution before and after, and can refuse it by reverting
    modifier hooked() {
        address hook_ = hook;
        bytes memory hookData;
        // The functions that use this are not payable, so there is never a value to tell the hook about
        if (hook_ != address(0)) hookData = IERC7579Hook(hook_).preCheck(msg.sender, 0, msg.data);
        _;
        if (hook_ != address(0)) IERC7579Hook(hook_).postCheck(hookData);
    }

    // ------------------------------------------------------------------------------------------------------------------------ execution
    function execute(bytes32 mode, bytes calldata executionCalldata) external onlyOwner nonReentrant hooked {
        _execute(mode, executionCalldata);
    }

    function executeFromExecutor(bytes32 mode, bytes calldata executionCalldata)
        external
        onlyExecutorModule
        nonReentrant
        hooked
        returns (bytes[] memory returnData)
    {
        returnData = _execute(mode, executionCalldata);
    }

    function _execute(bytes32 mode, bytes calldata executionCalldata) private returns (bytes[] memory returnData) {
        if (!supportsExecutionMode(mode)) revert UnsupportedMode(mode);
        bool isTry = ModeLib.execTypeOf(mode) == ModeLib.EXECTYPE_TRY;

        if (ModeLib.callTypeOf(mode) == ModeLib.CALLTYPE_SINGLE) {
            (address target, uint256 value, bytes calldata data) = ExecutionLib.decodeSingle(executionCalldata);
            returnData = new bytes[](1);
            returnData[0] = _call(0, target, value, data, isTry);
            return returnData;
        }

        Execution[] memory executions = ExecutionLib.decodeBatch(executionCalldata);
        returnData = new bytes[](executions.length);
        for (uint256 i = 0; i < executions.length; i++) {
            returnData[i] = _call(i, executions[i].target, executions[i].value, executions[i].callData, isTry);
        }
    }

    function _call(uint256 index, address target, uint256 value, bytes memory data, bool isTry)
        private
        returns (bytes memory)
    {
        (bool ok, bytes memory result) = target.call{value: value}(data);
        if (ok) return result;
        if (!isTry) revert ExecutionFailed(index, result);
        emit TryFailed(index, result);
        return result;
    }

    // ------------------------------------------------------------------------------------------------------------------------ config
    function accountId() external pure returns (string memory) {
        return "sandworm.strategy-account.0.1.0";
    }

    function supportsExecutionMode(bytes32 mode) public pure returns (bool) {
        bytes1 callType = ModeLib.callTypeOf(mode);
        bytes1 execType = ModeLib.execTypeOf(mode);
        bool isKnownCall = callType == ModeLib.CALLTYPE_SINGLE || callType == ModeLib.CALLTYPE_BATCH;
        bool isKnownExec = execType == ModeLib.EXECTYPE_DEFAULT || execType == ModeLib.EXECTYPE_TRY;
        return isKnownCall && isKnownExec;
    }

    function supportsModule(uint256 moduleTypeId) public pure returns (bool) {
        return moduleTypeId == MODULE_TYPE_EXECUTOR || moduleTypeId == MODULE_TYPE_HOOK;
    }

    function installModule(uint256 moduleTypeId, address module, bytes calldata initData)
        external
        onlyOwner
        nonReentrant
    {
        _install(moduleTypeId, module, initData);
    }

    function _install(uint256 moduleTypeId, address module, bytes memory initData) private {
        if (!supportsModule(moduleTypeId)) revert UnsupportedModuleType(moduleTypeId);
        if (installed[moduleTypeId][module]) revert AlreadyInstalled(moduleTypeId, module);
        // A module nobody trusted has no business in an account that holds money: the registry reverts for one that is not attested to
        if (address(registry) != address(0)) registry.checkForAccount(address(this), module, moduleTypeId);
        if (!IERC7579Module(module).isModuleType(moduleTypeId)) revert NotThisModuleType(module, moduleTypeId);
        if (moduleTypeId == MODULE_TYPE_HOOK) {
            if (hook != address(0)) revert HookSlotTaken(hook);
            hook = module;
        }

        installed[moduleTypeId][module] = true;
        IERC7579Module(module).onInstall(initData);
        emit ModuleInstalled(moduleTypeId, module);
    }

    function uninstallModule(uint256 moduleTypeId, address module, bytes calldata deInitData)
        external
        onlyOwner
        nonReentrant
    {
        _remove(moduleTypeId, module);
        IERC7579Module(module).onUninstall(deInitData);
        emit ModuleUninstalled(moduleTypeId, module);
    }

    /// @notice Removes a module without telling it, for one that reverts when it is told it is being removed. Not part of the standard: the way out
    /// if a module has gone wrong, so that no module can hold the account.
    function forceUninstall(uint256 moduleTypeId, address module) external onlyOwner nonReentrant {
        _remove(moduleTypeId, module);
        emit ModuleUninstalled(moduleTypeId, module);
    }

    function isModuleInstalled(uint256 moduleTypeId, address module, bytes calldata) external view returns (bool) {
        return installed[moduleTypeId][module];
    }

    function _remove(uint256 moduleTypeId, address module) private {
        if (!installed[moduleTypeId][module]) revert NotInstalled(moduleTypeId, module);
        installed[moduleTypeId][module] = false;
        if (moduleTypeId == MODULE_TYPE_HOOK) hook = address(0);
    }

    // ------------------------------------------------------------------------------------------------------------------------ the owner's way out
    /// @notice Takes a token out to the owner, with no hook and no price. A module cannot stop it.
    function emergencyWithdraw(address token, uint256 amount) external onlyOwner nonReentrant {
        (bool ok, bytes memory result) = token.call(abi.encodeWithSignature("transfer(address,uint256)", owner, amount));
        if (!ok || (result.length != 0 && !abi.decode(result, (bool)))) revert TransferFailed();
    }

    function emergencyWithdrawNative(uint256 amount) external onlyOwner nonReentrant {
        (bool ok,) = owner.call{value: amount}("");
        if (!ok) revert TransferFailed();
    }

    // ------------------------------------------------------------------------------------------------------------------------ ERC-1271
    /// @notice The owner's signature, from an account that is a plain key. A validator module is what would let other schemes in.
    function isValidSignature(bytes32 hash, bytes calldata signature) external view returns (bytes4) {
        if (signature.length != 65) return 0xffffffff;
        bytes32 r = bytes32(signature[0:32]);
        bytes32 s = bytes32(signature[32:64]);
        uint8 v = uint8(signature[64]);
        // Refuses the second, malleable form of a signature
        if (uint256(s) > 0x7FFFFFFFFFFFFFFFFFFFFFFFFFFFFFFF5D576E7357A4501DDFE92F46681B20A0) return 0xffffffff;
        address signer = ecrecover(hash, v, r, s);
        return signer != address(0) && signer == owner ? bytes4(0x1626ba7e) : bytes4(0xffffffff);
    }
}

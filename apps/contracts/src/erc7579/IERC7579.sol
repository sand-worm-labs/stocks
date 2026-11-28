// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.20;

// The interfaces of ERC-7579 (https://eips.ethereum.org/EIPS/eip-7579), as the standard writes them, for the parts this suite uses: an account that
// executes, installs modules and calls hooks, and the modules (executors and hooks) that are installed in it. Anything written against these works
// in any account that follows the standard.

uint256 constant MODULE_TYPE_VALIDATOR = 1;
uint256 constant MODULE_TYPE_EXECUTOR = 2;
uint256 constant MODULE_TYPE_FALLBACK = 3;
uint256 constant MODULE_TYPE_HOOK = 4;

interface IERC7579Execution {
    function execute(bytes32 mode, bytes calldata executionCalldata) external;

    function executeFromExecutor(bytes32 mode, bytes calldata executionCalldata)
        external
        returns (bytes[] memory returnData);
}

interface IERC7579AccountConfig {
    function accountId() external view returns (string memory accountImplementationId);

    function supportsExecutionMode(bytes32 encodedMode) external view returns (bool);

    function supportsModule(uint256 moduleTypeId) external view returns (bool);
}

interface IERC7579ModuleConfig {
    event ModuleInstalled(uint256 moduleTypeId, address module);
    event ModuleUninstalled(uint256 moduleTypeId, address module);

    function installModule(uint256 moduleTypeId, address module, bytes calldata initData) external;

    function uninstallModule(uint256 moduleTypeId, address module, bytes calldata deInitData) external;

    function isModuleInstalled(uint256 moduleTypeId, address module, bytes calldata additionalContext)
        external
        view
        returns (bool);
}

interface IERC7579Module {
    /// @dev Called by the account when it installs the module. `msg.sender` is the account.
    function onInstall(bytes calldata data) external;

    function onUninstall(bytes calldata data) external;

    function isModuleType(uint256 moduleTypeId) external view returns (bool);
}

interface IERC7579Hook is IERC7579Module {
    /// @notice Called before every execution. Reverting refuses it. What is returned is handed to `postCheck`.
    function preCheck(address msgSender, uint256 value, bytes calldata msgData) external returns (bytes memory hookData);

    /// @notice Called after every execution. Reverting undoes it.
    function postCheck(bytes calldata hookData) external;
}

// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.20;

import {IERC7484} from "../erc7579/IERC7484.sol";
import {MODULE_TYPE_EXECUTOR, MODULE_TYPE_HOOK} from "../erc7579/IERC7579.sol";
import {ModuleInit, StrategyAccount} from "../account/StrategyAccount.sol";
import {IBlock} from "../blocks/interfaces/IBlock.sol";
import {IRebalancePolicy} from "../blocks/interfaces/IRebalancePolicy.sol";
import {IReadings} from "../blocks/interfaces/IReadings.sol";
import {StrategyExecutor} from "../executors/StrategyExecutor.sol";
import {TradeGuard} from "../guards/TradeGuard.sol";
import {StockRegistry} from "../registry/StockRegistry.sol";
import {IRulePlugin} from "../rules/IRulePlugin.sol";
import {RuleBook} from "../rules/RuleBook.sol";
import {RuleIds} from "../rules/RuleIds.sol";
import {Limits, Placement, Rule} from "../rules/RuleTypes.sol";

/// @notice What a person gives to make a vault
struct VaultParams {
    // The strategy: a block tree, and where its numbers come from
    IBlock strategy;
    IReadings readings;
    // When to rebalance; 0 for whenever it is asked
    IRebalancePolicy policy;
    // The key the app uses to ask for rebalances, and until when
    address keeper;
    uint64 keeperUntil;
    // The stocks it may hold: each must be on the registry
    address[] stocks;
    // Its rules, each placed onchain, off-chain or both
    Rule[] rules;
    // More modules to install in it: a trigger, a different kind of guard. Their `initData` is the owner's to get right.
    ModuleInit[] extraModules;
    // More rule modules than the factory knows, of kinds of rule of its own. A rule of one of their kinds can then be placed onchain.
    IRulePlugin[] extraRulePlugins;
}

/// @title StrategyVaultFactory
/// @notice Makes a person's vault: an ERC-7579 account with a strategy executor and a trade guard installed, and the rule modules attached that the
/// vault's rules ask for. A vault is deployed with its rules, each placed onchain (its module is attached, and refuses what breaks it whoever asks),
/// off-chain (the app keeps it), or both. All of it is written into the vault's record, so what the app promises can be read next to what the chain
/// guarantees.
/// @dev The person who calls it is the vault's owner. It is a personal deployment, like the others in this suite: nobody makes a vault for someone else.
contract StrategyVaultFactory {
    /// @dev A rule module with the value it is attached with
    struct Attachment {
        IRulePlugin plugin;
        uint256 value;
        bytes data;
    }

    StockRegistry public immutable registry;
    StrategyExecutor public immutable executor;
    TradeGuard public immutable guard;
    /// @notice The module registry (ERC-7484) every vault checks its modules against; none when it is zero
    IERC7484 public immutable moduleRegistry;
    IRulePlugin[] private rulePlugins;

    /// @notice What stands for the rules a vault was made with (`RuleBook.hashOf`), so the rules shown for a vault can be checked against it
    mapping(address account => bytes32) public rulesHashOf;

    /// @dev The whole rule set is in the event, with where each is kept: the vault's record of what is promised and what is guaranteed
    event VaultCreated(
        address indexed account, address indexed owner, address strategy, bytes32 rulesHash, Rule[] rules
    );

    /// @param rulePlugins_ The rule modules this factory knows, which every vault it makes may use
    constructor(
        StockRegistry registry_,
        StrategyExecutor executor_,
        TradeGuard guard_,
        IERC7484 moduleRegistry_,
        IRulePlugin[] memory rulePlugins_
    ) {
        registry = registry_;
        executor = executor_;
        guard = guard_;
        moduleRegistry = moduleRegistry_;
        for (uint256 i = 0; i < rulePlugins_.length; i++) {
            rulePlugins.push(rulePlugins_[i]);
        }
    }

    function knownRulePlugins() external view returns (IRulePlugin[] memory) {
        return rulePlugins;
    }

    function create(VaultParams calldata params) external returns (address account) {
        Rule[] memory rules = params.rules;
        IRulePlugin[] memory plugins = _allPlugins(params);
        RuleBook.check(rules, _kindsOf(plugins));
        Limits memory limits = RuleBook.limitsOf(rules);

        ModuleInit[] memory modules = _modules(params);
        modules[0] = ModuleInit(MODULE_TYPE_EXECUTOR, address(executor), abi.encode(_executorConfig(params, limits)));
        modules[1] = ModuleInit(MODULE_TYPE_HOOK, address(guard), _guardInstall(params, _attachments(rules, plugins)));

        account = address(new StrategyAccount(msg.sender, modules, moduleRegistry));
        bytes32 rulesHash = RuleBook.hashOf(rules);
        rulesHashOf[account] = rulesHash;
        emit VaultCreated(account, msg.sender, address(params.strategy), rulesHash, rules);
    }

    // ------------------------------------------------------------------------------------------------------------------------ which rules are onchain
    /// @dev The rule modules this vault may use: the ones the factory knows and the ones the owner brought
    function _allPlugins(VaultParams calldata params) private view returns (IRulePlugin[] memory all) {
        all = new IRulePlugin[](rulePlugins.length + params.extraRulePlugins.length);
        for (uint256 i = 0; i < rulePlugins.length; i++) {
            all[i] = rulePlugins[i];
        }
        for (uint256 i = 0; i < params.extraRulePlugins.length; i++) {
            all[rulePlugins.length + i] = params.extraRulePlugins[i];
        }
    }

    /// @dev What a rule may be placed onchain as: the kind of each rule module. A budget is the executor's own, as what it invests.
    function _kindsOf(IRulePlugin[] memory plugins) private view returns (bytes32[] memory kinds) {
        kinds = new bytes32[](plugins.length + 1);
        for (uint256 i = 0; i < plugins.length; i++) {
            kinds[i] = plugins[i].kind();
        }
        kinds[plugins.length] = RuleIds.BUDGET;
    }

    /// @dev The modules to attach, with their values. A rule placed onchain or on both attaches its module with the rule's value. A module that is
    /// on by default (the slippage and the size of a trade, which keep a vault safe whether or not it was asked to) is attached with its default
    /// when the rule is off-chain or not given. Any other module is left off.
    function _attachments(Rule[] memory rules, IRulePlugin[] memory plugins)
        private
        view
        returns (Attachment[] memory)
    {
        Attachment[] memory found = new Attachment[](plugins.length);
        uint256 count;
        for (uint256 i = 0; i < plugins.length; i++) {
            (bool isAttached, Attachment memory attachment) = _attachmentFor(rules, plugins[i]);
            if (isAttached) found[count++] = attachment;
        }

        Attachment[] memory trimmed = new Attachment[](count);
        for (uint256 i = 0; i < count; i++) {
            trimmed[i] = found[i];
        }
        return trimmed;
    }

    function _attachmentFor(Rule[] memory rules, IRulePlugin plugin)
        private
        view
        returns (bool, Attachment memory attachment)
    {
        bytes32 kind = plugin.kind();
        for (uint256 i = 0; i < rules.length; i++) {
            if (rules[i].kind != kind || rules[i].placement == Placement.OffChain) continue;
            return (true, Attachment(plugin, rules[i].value, rules[i].data));
        }
        (bool isOnByDefault, uint256 value) = plugin.defaultValue();
        return (isOnByDefault, Attachment(plugin, value, ""));
    }

    // ------------------------------------------------------------------------------------------------------------------------ what each module is given
    /// @dev The executor and the guard first, then whatever else the owner asked for
    function _modules(VaultParams calldata params) private pure returns (ModuleInit[] memory modules) {
        modules = new ModuleInit[](2 + params.extraModules.length);
        for (uint256 i = 0; i < params.extraModules.length; i++) {
            modules[2 + i] = params.extraModules[i];
        }
    }

    function _executorConfig(VaultParams calldata params, Limits memory limits)
        private
        view
        returns (StrategyExecutor.Config memory)
    {
        return StrategyExecutor.Config({
            owner: msg.sender,
            strategy: params.strategy,
            readings: params.readings,
            policy: params.policy,
            keeper: params.keeper,
            keeperUntil: params.keeperUntil,
            limits: limits,
            stocks: params.stocks
        });
    }

    /// @dev What the guard is installed with: its config, and for each rule module attached the value it is given
    function _guardInstall(VaultParams calldata params, Attachment[] memory attachments)
        private
        view
        returns (bytes memory)
    {
        address[] memory plugins = new address[](attachments.length);
        uint256[] memory values = new uint256[](attachments.length);
        bytes[] memory extra = new bytes[](attachments.length);
        for (uint256 i = 0; i < attachments.length; i++) {
            plugins[i] = address(attachments[i].plugin);
            values[i] = attachments[i].value;
            extra[i] = attachments[i].data;
        }
        return
            abi.encode(TradeGuard.Config({owner: msg.sender, stocks: params.stocks, plugins: plugins}), values, extra);
    }
}

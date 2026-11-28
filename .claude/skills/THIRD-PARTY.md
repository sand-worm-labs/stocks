# Third-party skills

Copied here as they were on 2026-11-28, read first, and not run. They are other people's instructions, so read a skill again before updating it.

| Skill | From | Commit | Notes |
|---|---|---|---|
| solidity-auditor | github.com/pashov/skills | eacfc09 | Makes one read-only request to raw.githubusercontent.com for the author's VERSION file on each run |
| audit-prep-assistant, code-maturity-assessor, guidelines-advisor, secure-workflow-guide, token-integration-analyzer | github.com/trailofbits/skills (plugins/building-secure-contracts) | 149d7b2 | Chain-agnostic; this plugin's scanners for Solana, Cairo, Cosmos, Algorand, Substrate and TON were left out |
| entry-point-analyzer | github.com/trailofbits/skills (plugins/entry-point-analyzer) | 149d7b2 | |
| foundry-solidity | github.com/tenequm/skills (archive/) | b5aee0f | Archived upstream, so it may be out of date. Its examples read PRIVATE_KEY from the environment: never broadcast without asking. |

Not added: github.com/Archethect/sc-auditor. It needs its own Node MCP server (Slither, Aderyn, Echidna, Medusa, Halmos) and its skill pre-approves Bash, Write and Edit.

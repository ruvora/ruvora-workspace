# RUVORA Workspace

A runnable, local project gateway for finding context, preparing work, observing product operations, and reviewing cleanup and transfer. It is a CLI and stdio MCP plugin source package. There is no web server, new work scheduler, native thread creation, or telemetry.

**This is a local implementation with capability gates, not a released native integration.** Work dispatch is an explicit contract simulation. Cleanup uses the existing pinned ThreadFold fixture engine. Transfer inspects the existing ThreadPort synthetic format. Native Hub execution, archive/restore, navigation and session export/import are blocked.

The two original designs in `docs/source/` are unchanged byte-for-byte. Their SHA-256 values and the exact inspected component source files are recorded in [workspace-lock.json](workspace-lock.json). See the [implementation appendix](docs/IMPLEMENTATION_APPENDIX.md), [한국어 사용법](docs/USAGE_KO.md), and [verification record](docs/VERIFICATION.md).

## Run locally

Requires Node.js 24+ on PATH; recorded validation used macOS 15.5 arm64 and Node 24.19.0. No npm packages are required:

```sh
git clone https://github.com/ruvora/ruvora-workspace.git
cd ruvora-workspace
RUVORA_NODE=node
"$RUVORA_NODE" bin/workspace.mjs inspect
"$RUVORA_NODE" bin/workspace.mjs capabilities
```

The default inspection is read-only, including on a fresh project. It does not select an identity, create an index, create state, or start work. The demo writes synthetic records to a temporary directory, reuses the existing Fold/Port modules, exercises response-loss recovery and archive/restore, prints its actual results, and removes that temporary directory.

Integration tests and the demo expect these sibling checkouts, matching the lock's source hashes: `../codex-threadgraph`, `../threadfold`, `../threadport`. They are read/imported only. Tests never run the sibling test suites or invoke their live daemons. A missing or changed module is a reported failure, not silently skipped. Core inspection needs none of these modules.

For integration tests and the fixture demo, prepare the matching sibling revisions from the parent directory:

```sh
cd ..
git clone https://github.com/ruvora/codex-threadgraph.git codex-threadgraph
git -C codex-threadgraph checkout a2fc8a646f29f2625dba54c2db2865364eb359b1
git clone https://github.com/ruvora/codex-threadfold.git threadfold
git -C threadfold checkout 08814a357b01d7b70885eb20bb9daec65ffb9c98
git clone https://github.com/ruvora/codex-threadport.git threadport
git -C threadport checkout 2ef99c14bc396203657865b744ca24de4823cac8
cd ruvora-workspace
"$RUVORA_NODE" --test --test-reporter=tap
"$RUVORA_NODE" scripts/demo.mjs
```

For existing checkouts, inspect local changes before switching revisions instead of cloning duplicates. These revisions match the Graph/Fold/Port file hashes in the lock. The lock also preserves historical inspection paths and a Hub snapshot; it is not a promise that current Hub main matches that snapshot. Native Hub dispatch is still unsupported. See [post-repair acceptance](docs/POST_REPAIR_ACCEPTANCE_2026-09-06.md) for the dated verification. Set `RUVORA_NODE` to an absolute executable path if needed on your machine.

## Select a project

Use a host-issued canonical identity when integrating an actual host. Do not derive identity from a display name or merge projects by path similarity. This standalone configuration is an explicit local binding, not proof of host identity.

```sh
"$RUVORA_NODE" bin/workspace.mjs --project /absolute/project init \
  '{"mode":"production","profile":{"hostId":"local","canonicalProjectId":"my-project-id","displayName":"My project","branch":"main"}}'
"$RUVORA_NODE" bin/workspace.mjs --project /absolute/project inspect
```

Initialization resolves the selected directory and stores `.ruvora-workspace/config.json` there. Repeating identical initialization is safe; changing identity, path or mode is rejected. There is no automatic migration or fixture-to-production promotion. Keep fixture projects in separate temporary directories.

Optional initialization fields:

```json
{
  "graph": {
    "database": "/absolute/quiescent-published-snapshot.sqlite",
    "scopeId": "explicit-graph-scope",
    "hostId": "local",
    "canonicalProjectId": "my-project-id"
  },
  "foldRoot": "/absolute/threadfold",
  "portRoot": "/absolute/threadport"
}
```

Graph supports schema 4, at most 16 MiB, and one explicitly mapped published scope. It uses SQLite's immutable read-only URI. Files with WAL, SHM or journal sidecars are refused; do not point it at a live database. Obtain a consistent published snapshot through the owning product's supported procedure. Workspace does not checkpoint, copy, migrate or repair that database. Source changes during the read reject the observation. Branch applicability absent from published evidence blocks context selection; it is never guessed.

Fold/Port modules are optional, loaded only from local configuration after checking all pinned source hashes. There is no tool argument for arbitrary module loading or endpoint forwarding. The lock records inspected working-tree bytes as well as HEAD; a commit alone does not describe uncommitted source. Modules are not bundled in this development package and are never automatically upgraded, installed, started or disabled.

## Use the gateway

```sh
"$RUVORA_NODE" bin/workspace.mjs call workspace_graph_read '{}'
"$RUVORA_NODE" bin/workspace.mjs call workspace_prepare_workflow \
  '{"intent":"work","request":"Implement the selected change","requestId":"request-001","followupCleanup":true}'
"$RUVORA_NODE" bin/workspace.mjs call workspace_get_workflow '{"workflowId":"ID_FROM_PREPARE"}'
```

Use the returned IDs, not example IDs. `workspace_hub_dispatch` accepts that workflow ID. Production dispatch currently returns `HUB_DISPATCH_UNSUPPORTED`. Preparing records local metadata only. Reuse the same request ID and workflow on retries. A different request with the same ID is rejected. Read operations never dispatch or refresh Graph.

The fixture demo shows the complete context → dispatch → manual cleanup preview → coverage review → approved archive → separately approved restore journey. The fixture Hub is a contract double; it runs no model or worker. Fixture approval issuance is available only in the programmatic test/demo harness, never in CLI/MCP. A boolean approval or invented receipt cannot authorize archive. Host approval and atomic native cleanup remain unavailable.

`workspace_port_preview` takes a project-relative `localPath` and optionally a prepared transfer `workflowId` to retain its inspection as a ReviewCard. It reuses Port's bounded, non-extracting package validator. Synthetic validity never implies native transfer, trusted source identity, secret detection or execution permission.

All tools and their closed schemas are in [src/tools.mjs](src/tools.mjs). Natural-language routing is supplied by the local skill; no heuristic parser converts an ambiguous sentence into a write operation. A cleanup-only prepared ticket explains how to choose a completed work item; the resulting cleanup review belongs to that work item's ticket.

## MCP / plugin

```sh
CODEX_MCP_NODE_PATH="$RUVORA_NODE" RUVORA_PROJECT_ROOT=/absolute/project ./bin/launch-mcp
```

Stdio uses newline-delimited JSON-RPC, supports initialization and a static tool list, and rejects messages larger than 1 MiB. Stdout contains only protocol messages. The launcher uses `CODEX_MCP_NODE_PATH`, then PATH, then this pilot's known runtime path. Configure a runtime path on another machine. MCP is not a public network endpoint and exposes no shell or arbitrary URL proxy.

`.codex-plugin/plugin.json`, `.mcp.json` and `skills/ruvora-workspace/SKILL.md` passed structural validation. Marketplace registration, native host loading and in-app interaction have **not** been tested or installed by this work. A fresh installed host must receive the selected project root explicitly. There are no verified native links or embedded panels; the Korean text report is the fallback experience.

## Storage and recovery

- Workspace stores only its profile, selected evidence references/digests, workflow requests, product operation references, observations and review references. Full source conversations are not collected by default.
- JSON writes use fsync and atomic rename under one exclusive local writer lock. Files default to 0600 and new directories to 0700. Existing unsafe symlink paths are rejected. This is not an encrypted store or a defense against a malicious same-user process racing filesystem operations.
- Hub dispatch records an intent and stable key before calling the adapter. Retry/restart queries the existing operation. Unknown outcomes remain `attention`; there is no blind replay.
- Fold apply retains its key before invoking Fold. Retry with the same key reconciles Fold's operation. Preview has no upstream idempotency contract: an interrupted unknown preview stays blocked for inspection instead of creating duplicate plans. Stale writer locks require checking that the recorded process is gone and inspecting operation state before manual recovery. Workspace never steals locks.
- Followup previews require another explicit interaction. There is no background event subscription or continuation promise. Cancelling a future stage does not roll back successful work. Running-work interruption is a separate fixture-only action.
- Uninstall/disconnect stops only this gateway connection. Retain `.ruvora-workspace` and all product stores. There are no removal hooks, data deletion hooks, daemon shutdown calls, or automatic standalone-plugin changes.

## Release gates

Live Hub reuse requires authenticated peer/instance identity, exact capabilities, durable idempotency lookup and Hub-owned context snapshot validation. Native cleanup additionally requires trusted scoped receipts, atomic effect revalidation across all Turn starters, and authoritative reconciliation. Port requires independent-history G0 and cross-PC/account/app G3. Native panel/navigation, clean installation, coexistence with a standalone writer, reconnect/migration and active-work uninstall E2E remain unverified. See the appendix for the concrete minimum contracts and acceptance mapping.

# ColeMei fork contract

This repository tracks `huilang-me/CF-Server-Monitor` as `upstream`. Production
deploys only reviewed commits from this fork's `main`.

## Ownership boundary

- `src/fork/` owns backend latency profiles, schema-v3 normalization, and the
  schema-v3 latency contract.
- `src/frontend/fork/` owns frontend latency helpers.
- `test/fork-*.js` protects the fork contract and the small hooks in upstream
  files.
- `public/install.sh` is the one deliberate merge hotspot because the embedded
  shell agent owns collection and reporting. Keep its fork diff limited to
  config schema, target iteration, and the latency payload.

The final profile is `melbourne-global-v1`: MEL, MYS, TYO, USW, and CN. CN is
an Alibaba Cloud Beijing cross-border reachability reference, not a China-wide
or carrier-average measurement.

## Data contract

- Agent config schema: `3`
- Agent metrics: `latency_profile` plus a `latency` object keyed by target
- History storage: `latency_profile` plus `latency_json`
- UI: target metadata drives labels and datasets; no fixed regional columns

The production contract has no CT/CU/CM/BD compatibility fields or adapter.
Agents may make one unprofiled bootstrap report before applying dynamic
configuration; subsequent reports use schema v3.

The fork's production-supported probe is the standard Linux/systemd agent in
`public/install.sh`. The retained upstream Alpine, OpenWrt, macOS, and Windows
installers have not yet been ported to this fork's latency contract and must not
be offered or deployed until they are migrated and covered by the same tests.

## Upstream sync

1. Start from a clean fork `main`; fetch both remotes.
2. Review `main..upstream/main`, especially database, update handler, frontend
   history, and `public/install.sh`.
3. Merge upstream on a dedicated branch. Resolve upstream behavior first, then
   reapply the small fork hooks.
4. Run `npm run test:agent-config`, `npm run test:fork`, shell syntax checks for
   both installer and embedded agent, and `npm run build:frontend`.
5. Deploy to the isolated staging Worker/D1 and validate bootstrap plus
   schema-v3 reports before any production change.

Never resolve `public/install.sh` with an unconditional `--ours`: upstream
agent fixes must be reviewed and retained where they do not violate schema v3.

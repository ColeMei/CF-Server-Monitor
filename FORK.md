# ColeMei fork contract

This repository tracks `huilang-me/CF-Server-Monitor` as `upstream`. Production
deploys only reviewed commits from this fork's `main`.

## Ownership boundary

- `src/fork/` owns backend latency profiles, schema-v3 normalization, and the
  temporary legacy adapter.
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

The migration bridge accepts v1.3 reports through
`src/fork/legacyLatencyAdapter.js`. It never writes legacy CT/CU/CM/BD values
into the schema-v3 columns. Delete the adapter and legacy columns/hooks after
all probes run schema v3.

## Upstream sync

1. Start from a clean fork `main`; fetch both remotes.
2. Review `main..upstream/main`, especially database, update handler, frontend
   history, and `public/install.sh`.
3. Merge upstream on a dedicated branch. Resolve upstream behavior first, then
   reapply the small fork hooks.
4. Run `npm run test:agent-config`, `npm run test:fork`, shell syntax checks for
   both installer and embedded agent, and `npm run build:frontend`.
5. Deploy to the isolated staging Worker/D1 and send both a legacy report and a
   schema-v3 report before any production change.

Never resolve `public/install.sh` with an unconditional `--ours`: upstream
agent fixes must be reviewed and retained where they do not violate schema v3.


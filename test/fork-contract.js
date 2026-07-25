import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { dirname } from 'node:path';

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const read = async (path) => readFile(resolve(repoRoot, path), 'utf8');

const installer = await read('public/install.sh');
assert.match(installer, /^AGENT_VERSION="1\.4\.0"$/m);
assert.match(installer, /-H "X-Agent-Config-Schema: 3"/);
assert.match(installer, /latency_profile/);
assert.match(installer, /latency_targets/);

const metricsLine = installer.split('\n').find(line => (
  line.includes('"cpu":"$CPU"') && line.includes('"latency_profile"')
));
assert.ok(metricsLine, 'fork agent metrics payload is missing');
assert.match(metricsLine, /"latency":\$LATENCY_JSON/);
assert.doesNotMatch(metricsLine, /"ping_(ct|cu|cm|bd)"/);
assert.doesNotMatch(metricsLine, /"loss_(ct|cu|cm|bd)"/);

const agentConfig = await read('src/utils/agentConfig.js');
assert.match(agentConfig, /LATENCY_CONFIG_SCHEMA_VERSION/);
assert.match(agentConfig, /encodeAgentLatencyTargets/);
assert.doesNotMatch(agentConfig, /`&custom_(ct|cu|cm|bd)=/);

const schema = await read('src/database/schema.js');
assert.match(schema, /latency_profile TEXT DEFAULT ''/);
assert.match(schema, /latency_json TEXT DEFAULT ''/);

const latencyMetrics = await read('src/fork/latencyMetrics.js');
assert.doesNotMatch(latencyMetrics, /legacyLatencyAdapter|allowLegacy|readLegacyLatency/);

for (const path of [
  'public/install.sh',
  'src/database/schema.js',
  'src/database/updateDatabase.js',
  'src/handlers/admin.js',
  'src/index.js',
  'src/utils/metrics.js',
  'src/utils/agentConfig.js',
  'src/utils/settings.js',
  'src/frontend/views/admin/index.vue',
  'src/frontend/views/admin/components/CopyCommandModal.vue',
  'src/frontend/views/admin/components/EditServerModal.vue',
  'src/frontend/views/admin/components/SettingsPanel.vue'
]) {
  const source = await read(path);
  assert.doesNotMatch(
    source,
    /legacyLatencyAdapter|allowLegacy|custom_(ct|cu|cm|bd)|ping_(ct|cu|cm|bd)|loss_(ct|cu|cm|bd)|\b(CT|CU|CM|BD)_NODE\b/,
    `${path} retains the retired CT/CU/CM/BD latency contract`
  );
}

console.log('fork boundary contract tests passed');

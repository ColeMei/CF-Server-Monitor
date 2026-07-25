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
assert.match(latencyMetrics, /from '\.\/legacyLatencyAdapter\.js'/);
assert.match(latencyMetrics, /allowLegacy \? readLegacyLatency\(record\) : null/);

for (const path of [
  'src/database/schema.js',
  'src/index.js',
  'src/utils/metrics.js',
  'src/utils/agentConfig.js',
  'src/utils/settings.js'
]) {
  const source = await read(path);
  assert.doesNotMatch(
    source,
    /legacyLatencyAdapter/,
    `${path} bypasses the removable legacy adapter boundary`
  );
}

console.log('fork boundary contract tests passed');


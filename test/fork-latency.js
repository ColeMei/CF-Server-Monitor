import assert from 'node:assert/strict';
import {
  DEFAULT_LATENCY_PROFILE_ID,
  DEFAULT_LATENCY_TARGETS,
  DEFAULT_LATENCY_TARGETS_JSON,
  encodeAgentLatencyTargets,
  normalizeLatencyTargets,
  resolveLatencyProfile
} from '../src/fork/latencyProfile.js';
import {
  decorateLatencyRecord,
  latencyForStorage,
  readLatencySnapshot
} from '../src/fork/latencyMetrics.js';

assert.equal(DEFAULT_LATENCY_PROFILE_ID, 'melbourne-global-v1');
assert.deepEqual(DEFAULT_LATENCY_TARGETS.map(target => target.key), ['mel', 'mys', 'tyo', 'usw', 'cn']);
assert.equal(
  encodeAgentLatencyTargets(DEFAULT_LATENCY_TARGETS),
  'mel:s3.ap-southeast-4.amazonaws.com:443,mys:s3.ap-southeast-5.amazonaws.com:443,tyo:s3.ap-northeast-1.amazonaws.com:443,usw:s3.us-west-2.amazonaws.com:443,cn:oss-cn-beijing.aliyuncs.com:443'
);
assert.deepEqual(normalizeLatencyTargets(DEFAULT_LATENCY_TARGETS_JSON), DEFAULT_LATENCY_TARGETS);
assert.equal(resolveLatencyProfile({ latency_profile: '../bad' }).id, DEFAULT_LATENCY_PROFILE_ID);

const metrics = {
  latency_profile: DEFAULT_LATENCY_PROFILE_ID,
  latency: {
    mel: { rtt_ms: '25.4', loss_pct: '0' },
    mys: { rtt_ms: 124, loss_pct: 2 },
    tyo: { rtt_ms: 187, loss_pct: 101 },
    usw: { rtt_ms: 198, loss_pct: -1 },
    cn: { rtt_ms: null, loss_pct: 100 }
  }
};
const stored = latencyForStorage(metrics);
assert.equal(stored.profileId, DEFAULT_LATENCY_PROFILE_ID);
assert.deepEqual(JSON.parse(stored.latencyJson), {
  mel: { rtt_ms: 25, loss_pct: 0 },
  mys: { rtt_ms: 124, loss_pct: 2 },
  tyo: { rtt_ms: 187, loss_pct: 100 },
  usw: { rtt_ms: 198, loss_pct: 0 },
  cn: { rtt_ms: null, loss_pct: 100 }
});

const snapshot = readLatencySnapshot({
  latency_profile: stored.profileId,
  latency_json: stored.latencyJson
});
assert.equal(snapshot.profileId, DEFAULT_LATENCY_PROFILE_ID);
assert.equal(snapshot.targets.length, 5);
assert.equal(snapshot.latency.mel.rtt_ms, 25);

const legacy = decorateLatencyRecord({
  ping_ct: 30,
  ping_cu: 40,
  ping_cm: null,
  ping_bd: 50,
  loss_ct: 0,
  loss_cu: 1,
  loss_cm: 100,
  loss_bd: null
});
assert.equal(legacy.latency_profile, 'legacy-cn-carriers-v2');
assert.deepEqual(legacy.latency_targets.map(target => target.key), ['ct', 'cu', 'cm', 'bd']);
assert.equal(legacy.latency.ct.rtt_ms, 30);

assert.deepEqual(latencyForStorage({ ping_ct: 30, loss_ct: 0 }), {
  profileId: '',
  latencyJson: ''
});
assert.equal(readLatencySnapshot({ ping_ct: 30 }, null, false), null);

console.log('fork latency tests passed');

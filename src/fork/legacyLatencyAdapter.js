const LEGACY_PROFILE_ID = 'legacy-cn-carriers-v2';
const LEGACY_TARGETS = Object.freeze([
  Object.freeze({ key: 'ct', label: 'CT', description: 'China Telecom legacy target' }),
  Object.freeze({ key: 'cu', label: 'CU', description: 'China Unicom legacy target' }),
  Object.freeze({ key: 'cm', label: 'CM', description: 'China Mobile legacy target' }),
  Object.freeze({ key: 'bd', label: 'BD', description: 'Baidu legacy target' })
]);

function normalizeRtt(value) {
  if (value === '' || value === null || value === undefined) return null;
  const number = Number(value);
  return Number.isFinite(number) && number > 0 ? Math.round(number) : null;
}

function normalizeLoss(value) {
  if (value === '' || value === null || value === undefined) return null;
  const number = Number(value);
  if (!Number.isFinite(number)) return null;
  return Math.max(0, Math.min(100, Math.round(number)));
}

// Temporary migration bridge. Chunk 8D deletes this module and its single caller.
export function readLegacyLatency(record) {
  if (!record || typeof record !== 'object') return null;

  const hasLegacyField = LEGACY_TARGETS.some(target => (
    Object.prototype.hasOwnProperty.call(record, `ping_${target.key}`) ||
    Object.prototype.hasOwnProperty.call(record, `loss_${target.key}`)
  ));
  if (!hasLegacyField) return null;

  const latency = {};
  for (const target of LEGACY_TARGETS) {
    latency[target.key] = {
      rtt_ms: normalizeRtt(record[`ping_${target.key}`]),
      loss_pct: normalizeLoss(record[`loss_${target.key}`])
    };
  }

  return {
    profileId: LEGACY_PROFILE_ID,
    targets: LEGACY_TARGETS.map(target => ({ ...target })),
    latency
  };
}


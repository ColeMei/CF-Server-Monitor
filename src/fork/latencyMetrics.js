import { resolveLatencyProfile } from './latencyProfile.js';

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

function parseLatency(value) {
  if (value && typeof value === 'object' && !Array.isArray(value)) return value;
  if (typeof value !== 'string' || !value.trim()) return null;
  try {
    const parsed = JSON.parse(value);
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : null;
  } catch (_) {
    return null;
  }
}

export function normalizeLatencyMeasurements(value, targets) {
  const raw = parseLatency(value);
  if (!raw) return null;
  if (!targets.some(target => Object.prototype.hasOwnProperty.call(raw, target.key))) {
    return null;
  }

  const latency = {};
  for (const target of targets) {
    const measurement = raw[target.key];
    if (!measurement || typeof measurement !== 'object') {
      latency[target.key] = { rtt_ms: null, loss_pct: null };
      continue;
    }
    latency[target.key] = {
      rtt_ms: normalizeRtt(measurement.rtt_ms),
      loss_pct: normalizeLoss(measurement.loss_pct)
    };
  }
  return latency;
}

export function latencyForStorage(metrics, settings = null) {
  const profile = resolveLatencyProfile(settings);
  const requestedProfile = String(metrics?.latency_profile || profile.id).trim().toLowerCase();
  if (requestedProfile !== profile.id) {
    return { profileId: '', latencyJson: '' };
  }

  const latency = normalizeLatencyMeasurements(metrics?.latency, profile.targets);
  if (!latency) return { profileId: '', latencyJson: '' };

  return {
    profileId: profile.id,
    latencyJson: JSON.stringify(latency)
  };
}

export function readLatencySnapshot(record, settings = null) {
  if (!record || typeof record !== 'object') return null;

  const profile = resolveLatencyProfile(settings);
  const storedProfile = String(record.latency_profile || '').trim().toLowerCase();
  const latency = normalizeLatencyMeasurements(
    record.latency ?? record.latency_json,
    profile.targets
  );

  if (latency && (!storedProfile || storedProfile === profile.id)) {
    return {
      profileId: storedProfile || profile.id,
      targets: profile.targets.map(target => ({ ...target })),
      latency
    };
  }

  return null;
}

export function decorateLatencyRecord(record, settings = null) {
  if (!record || typeof record !== 'object') return record;
  const snapshot = readLatencySnapshot(record, settings);
  if (!snapshot) return record;
  const decorated = {
    ...record,
    latency_profile: snapshot.profileId,
    latency_targets: snapshot.targets,
    latency: snapshot.latency
  };
  delete decorated.latency_json;
  return decorated;
}

export function applyLatencySnapshot(target, record, settings = null) {
  const snapshot = readLatencySnapshot(record, settings || target);
  if (!snapshot) return;
  target.latency_profile = snapshot.profileId;
  target.latency_targets = snapshot.targets;
  target.latency = snapshot.latency;
}

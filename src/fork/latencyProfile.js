export const LATENCY_CONFIG_SCHEMA_VERSION = 3;
export const DEFAULT_LATENCY_PROFILE_ID = 'melbourne-global-v1';

const TARGET_KEY_PATTERN = /^[a-z][a-z0-9_-]{0,15}$/;
const PROFILE_ID_PATTERN = /^[a-z0-9][a-z0-9_-]{0,63}$/;
const HOST_PATTERN = /^[a-z0-9](?:[a-z0-9.-]*[a-z0-9])?$/;

export const DEFAULT_LATENCY_TARGETS = Object.freeze([
  Object.freeze({
    key: 'mel',
    label: 'MEL',
    host: 's3.ap-southeast-4.amazonaws.com',
    port: 443,
    description: 'AWS Asia Pacific (Melbourne)'
  }),
  Object.freeze({
    key: 'mys',
    label: 'MYS',
    host: 's3.ap-southeast-5.amazonaws.com',
    port: 443,
    description: 'AWS Asia Pacific (Malaysia)'
  }),
  Object.freeze({
    key: 'tyo',
    label: 'TYO',
    host: 's3.ap-northeast-1.amazonaws.com',
    port: 443,
    description: 'AWS Asia Pacific (Tokyo)'
  }),
  Object.freeze({
    key: 'usw',
    label: 'USW',
    host: 's3.us-west-2.amazonaws.com',
    port: 443,
    description: 'AWS US West (Oregon)'
  }),
  Object.freeze({
    key: 'cn',
    label: 'CN',
    host: 'oss-cn-beijing.aliyuncs.com',
    port: 443,
    description: 'Alibaba Cloud OSS Beijing cross-border reference'
  })
]);

export const DEFAULT_LATENCY_TARGETS_JSON = JSON.stringify(DEFAULT_LATENCY_TARGETS);

function parseTargetInput(value) {
  if (Array.isArray(value)) return value;
  if (typeof value !== 'string' || !value.trim()) return null;
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed : null;
  } catch (_) {
    return null;
  }
}

function normalizeTarget(target) {
  if (!target || typeof target !== 'object') return null;

  const key = String(target.key || '').trim().toLowerCase();
  const label = String(target.label || key).trim().toUpperCase();
  const host = String(target.host || '').trim().toLowerCase();
  const port = Number(target.port ?? 443);
  const description = String(target.description || '').trim().slice(0, 160);

  if (!TARGET_KEY_PATTERN.test(key)) return null;
  if (!label || label.length > 12) return null;
  if (!HOST_PATTERN.test(host) || host.length > 253 || host.includes('..')) return null;
  if (!Number.isInteger(port) || port < 1 || port > 65535) return null;

  return { key, label, host, port, description };
}

export function normalizeLatencyTargets(value, fallback = DEFAULT_LATENCY_TARGETS) {
  const parsed = parseTargetInput(value);
  if (!parsed || parsed.length === 0 || parsed.length > 12) {
    return fallback.map(target => ({ ...target }));
  }

  const normalized = parsed.map(normalizeTarget);
  if (normalized.some(target => target === null)) {
    return fallback.map(target => ({ ...target }));
  }

  const keys = new Set(normalized.map(target => target.key));
  if (keys.size !== normalized.length) {
    return fallback.map(target => ({ ...target }));
  }

  return normalized;
}

export function resolveLatencyProfile(settings = null) {
  const requestedId = String(settings?.latency_profile || '').trim().toLowerCase();
  const id = PROFILE_ID_PATTERN.test(requestedId)
    ? requestedId
    : DEFAULT_LATENCY_PROFILE_ID;
  const targets = normalizeLatencyTargets(settings?.latency_targets);
  return { id, targets };
}

export function resolveServerLatencyProfile(server = null, settings = null) {
  return resolveLatencyProfile({
    latency_profile: server?.latency_profile || settings?.latency_profile,
    latency_targets: server?.latency_targets || settings?.latency_targets
  });
}

export function encodeAgentLatencyTargets(targets) {
  return normalizeLatencyTargets(targets)
    .map(target => `${target.key}:${target.host}:${target.port}`)
    .join(',');
}

export function publicLatencyTargets(targets) {
  return normalizeLatencyTargets(targets).map(target => ({ ...target }));
}

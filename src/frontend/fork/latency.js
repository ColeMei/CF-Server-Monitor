export const LATENCY_COLORS = Object.freeze([
  '#00d4aa',
  '#ffb870',
  '#4da6ff',
  '#b392f0',
  '#f778ba',
  '#39d2c0'
]);

export function getLatencyTargets(record) {
  if (!record || !Array.isArray(record.latency_targets)) return [];
  return record.latency_targets.filter(target => (
    target &&
    typeof target.key === 'string' &&
    typeof target.label === 'string'
  ));
}

export function getLatencyMeasurement(record, targetKey) {
  const measurement = record?.latency?.[targetKey];
  return measurement && typeof measurement === 'object' ? measurement : {};
}

export function getLatencyColor(index) {
  return LATENCY_COLORS[index % LATENCY_COLORS.length];
}

export function isLatencyRttValid(value) {
  if (value === null || value === undefined || value === '' || value === '0') return false;
  const number = Number(value);
  return Number.isFinite(number) && number > 0;
}

export function isLatencyLossValid(value) {
  if (value === null || value === undefined || value === '') return false;
  return Number.isFinite(Number(value));
}


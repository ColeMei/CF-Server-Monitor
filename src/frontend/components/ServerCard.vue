<template>
  <router-link :to="to" class="server-card" :data-region="regionCode">
    <div class="server-card-header">
      <div class="server-identity">
        <span v-if="regionCode && regionCode !== 'xx'" class="country-os-icons">
          <img class="flag-img" :src="getPublicAssetUrl('flags/' + regionCode + '.svg')" :alt="regionCode">
          <OsIcon :os="server.os" />
        </span>
        <span v-else class="country-os-icons">
          <span class="flag-fallback">🏳️</span>
          <OsIcon :os="server.os" />
        </span>
        <span class="server-name">{{ server.name }}</span>
      </div>
      <span class="status-label" :style="{ color: statusColor, borderColor: statusColor }">{{ statusText }}</span>
    </div>
    <div class="server-meta">
      <div class="card-meta">
        <div v-if="sysConfig.show_price && server.price" class="card-meta-item">💰 {{ server.price }}</div>
        <div v-if="sysConfig.show_expire && server.expire_date" class="card-meta-item">📅 <span :class="{ 'expired': isExpired }">{{ expireText }}</span></div>
      </div>
      <div class="card-badges">
        <span v-for="(tag, index) in tagList" :key="tag" :class="['badge', 'badge-tag', tagColorClass(index)]">{{ tag }}</span>
        <span v-if="server.ip_v4 === '1' && server.ip_v6 === '1'" class="badge badge badge-v4-v6">IPv4/6</span>
        <template v-else>
          <span v-if="server.ip_v4 === '1'" class="badge badge-v4">IPv4</span>
          <span v-if="server.ip_v6 === '1'" class="badge badge-v6">IPv6</span>
        </template>
      </div>
    </div>
    <div class="server-stats">
      <div class="stat-row">
        <span class="stat-key">CPU</span>
        <div class="stat-bar-container">
          <div class="stat-bar-fill" :style="{ width: cpuPercent + '%', background: 'var(--accent-cyan)' }"></div>
        </div>
        <span class="stat-value">{{ cpuPercent }}%</span>
      </div>
      <div class="stat-row">
        <span class="stat-key">RAM</span>
        <div class="stat-bar-container">
          <div class="stat-bar-fill" :style="{ width: ramPercent + '%', background: 'var(--accent-purple)' }"></div>
        </div>
        <span class="stat-value">{{ ramPercent }}%</span>
      </div>
      <div class="stat-row">
        <span class="stat-key">DISK</span>
        <div class="stat-bar-container">
          <div class="stat-bar-fill" :style="{ width: diskPercent + '%', background: 'var(--accent-green)' }"></div>
        </div>
        <span class="stat-value">{{ diskPercent }}%</span>
      </div>
      <div class="stat-row" v-if="sysConfig.show_tf && server.traffic_limit">
        <span class="stat-key">USE</span>
        <div class="stat-bar-container">
          <div class="stat-bar-fill" :style="{ width: Math.min(100, parseFloat(trafficUsagePercent)) + '%', background: 'var(--accent-blue)' }"></div>
        </div>
        <span class="stat-value">{{ trafficUsagePercent }}%</span>
      </div>
      <div class="stat-row">
        <span class="stat-key">NET</span>
        <span class="net-down">▼ {{ netInSpeed }}/s</span>
        <span class="net-up">▲ {{ netOutSpeed }}/s</span>
      </div>
      <div class="stat-row">
        <span class="stat-key">TRF</span>
        <span class="net-down">▼ {{ totalRx }}</span>
        <span class="net-up">▲ {{ totalTx }}</span>
        <span v-if="sysConfig.show_tf && server.traffic_limit" class="stat-limit">/ 📦 {{ formatBytes(server.traffic_limit * 1024 * 1024 * 1024) }}</span>
      </div>
      <div v-if="sysConfig.show_time" class="stat-row stat-time-row">
        <span class="stat-key">TIME</span>
        <span class="stat-time-value">{{ dataTimeText }}</span>
      </div>
    </div>
    <div class="ping-panel">
      <div v-for="target in latencyTargets" :key="target.key" class="ping-item" :title="target.description || target.host || target.label">
        <span class="ping-label">{{ target.label }}</span>
        <span class="ping-value" :style="{ color: getPingColor(latencyRtt(target.key)) }">
          {{ !isLatencyRttValid(latencyRtt(target.key)) ? trans.timeout : latencyRtt(target.key) + 'ms' }}
        </span>
      </div>
    </div>
  </router-link>
</template>

<script setup>
import { computed } from 'vue'
import OsIcon from './OsIcon.vue'
import { formatBytes, getFlagRegionCode, getTrafficUsagePercent, isServerOnline } from '../utils/api'
import { getPublicAssetUrl } from '../utils/config'
import { useTranslation } from '../utils/i18n'
import { PING } from '../utils/constants'
import { normalizeTimestamp, formatDateTime } from '../utils/time.js'
import {
  getLatencyMeasurement,
  getLatencyTargets,
  isLatencyRttValid
} from '../fork/latency.js'

const props = defineProps({
  server: {
    type: Object,
    required: true
  },
  sysConfig: {
    type: Object,
    default: () => ({
      show_price: true,
      show_expire: true,
      show_tf: true,
      show_time: true
    })
  },
  to: {
    type: String,
    default: ''
  }
})

const trans = useTranslation()
const latencyTargets = computed(() => getLatencyTargets(props.server))
const latencyRtt = (targetKey) => getLatencyMeasurement(props.server, targetKey).rtt_ms

const currentTime = computed(() => {
  const ts = Number(props.server.current_timestamp)
  if (Number.isFinite(ts) && ts > 0) {
    return ts < 10000000000 ? ts * 1000 : ts
  }
  return Date.now()
})

const regionCode = computed(() => getFlagRegionCode(props.server.region))

const isOnline = computed(() => isServerOnline(props.server, currentTime.value))

const statusColor = computed(() => isOnline.value ? 'var(--accent-green)' : 'var(--accent-red)')
const statusText = computed(() => isOnline.value ? trans.value.online : trans.value.offline)

const cpuPercent = computed(() => parseFloat(props.server.cpu || 0).toFixed(1))
const ramPercent = computed(() => {
  if (props.server.ram_total > 0) {
    return ((props.server.ram_used / props.server.ram_total) * 100).toFixed(2)
  }
  return '0.00'
})
const diskPercent = computed(() => {
  if (props.server.disk_total > 0) {
    return ((props.server.disk_used / props.server.disk_total) * 100).toFixed(2)
  }
  return '0.00'
})

const trafficUsagePercent = computed(() => getTrafficUsagePercent(props.server))
const tagList = computed(() => String(props.server.tags || '')
  .split(',')
  .map(tag => tag.trim())
  .filter(Boolean)
)
const tagColorClass = (index) => `tag-color-${index % 6}`

const netInSpeed = computed(() => formatBytes(props.server.net_in_speed))
const netOutSpeed = computed(() => formatBytes(props.server.net_out_speed))
const totalRx = computed(() => formatBytes(props.server.net_rx_monthly))
const totalTx = computed(() => formatBytes(props.server.net_tx_monthly))

const dataTimeText = computed(() => {
  const reportTimestamp = normalizeTimestamp(props.server.report_timestamp ?? props.server.last_updated)
  if (!isOnline.value) return formatDateTime(reportTimestamp)

  const displayTimestamp = normalizeTimestamp(
    props.server.display_timestamp ?? props.server.sample_timestamp ?? props.server.timestamp ?? reportTimestamp
  )
  const sampleTimestamp = normalizeTimestamp(
    props.server.sample_timestamp ?? props.server.timestamp ?? displayTimestamp
  )
  const lagSeconds = displayTimestamp && sampleTimestamp
    ? Math.max(0, Math.floor((displayTimestamp - sampleTimestamp) / 1000))
    : 0
  return `${formatDateTime(sampleTimestamp)}${lagSeconds > 0 ? ` (+${lagSeconds}s)` : ''}`
})

const isExpired = computed(() => {
  const expTime = new Date(props.server.expire_date).getTime()
  return !isNaN(expTime) && expTime < currentTime.value
})

const expireText = computed(() => {
  const expTime = new Date(props.server.expire_date).getTime()
  if (isNaN(expTime)) return ''
  const diff = expTime - currentTime.value
  const days = Math.ceil(diff / (1000 * 3600 * 24))
  return days > 0 ? `${days}${trans.value.expireDays}` : trans.value.expired
})

const getPingColor = (ping) => {
  if (!isLatencyRttValid(ping)) return 'var(--accent-red)'
  const val = parseInt(ping)
  if (val < PING.GOOD_THRESHOLD) return 'var(--accent-green)'
  if (val < PING.WARNING_THRESHOLD) return 'var(--accent-yellow)'
  return 'var(--accent-red)'
}
</script>

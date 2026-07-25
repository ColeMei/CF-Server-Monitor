<template>
  <div id="copyModal" class="modal-overlay" :class="{ active: show }">
    <div class="modal-dialog">
      <div class="modal-header">
        <div class="modal-title">{{ currentServerName }}</div>
        <button class="modal-close" @click="$emit('close')">✕</button>
      </div>

      <div class="form-row">
        <div class="form-group flex-1">
          <label class="form-label">{{ trans.collectInterval }}</label>
          <div class="flex items-center gap-2">
            <input type="text" readonly :value="collectInterval" class="form-input">
          </div>
        </div>
        <div class="form-group flex-1">
          <label class="form-label">{{ trans.reportInterval }}</label>
          <div class="flex items-center gap-2">
            <input type="text" readonly :value="reportInterval" class="form-input">
          </div>
        </div>
        <div class="form-group flex-1">
          <label class="form-label">{{ trans.trafficResetDay }}</label>
          <div class="flex items-center gap-2">
            <input type="text" readonly :value="resetDay" class="form-input">
          </div>
        </div>
      </div>

      <div class="form-row">
        <div class="form-group flex-1">
          <label class="form-label">{{ trans.rxCorrection }} (GB)</label>
          <input type="number" name="rx_correction" autocomplete="off" :value="rxCorrection" class="form-input" placeholder="0" min="0" step="1" readonly>
        </div>
        <div class="form-group flex-1">
          <label class="form-label">{{ trans.txCorrection }} (GB)</label>
          <input type="number" name="tx_correction" autocomplete="off" :value="txCorrection" class="form-input" placeholder="0" min="0" step="1" readonly>
        </div>
      </div>

      <div class="form-group">
        <label class="form-label">{{ trans.installCommand }}</label>
        <div class="cmd-input-wrapper" :class="{ copied: copiedCmd }">
          <span class="cmd-prompt">$</span>
          <input type="text" readonly :value="installCommand" class="cmd-input flex-1">
        </div>
      </div>

      <div class="modal-footer flex-justify-between">
        <div class="flex items-center gap-2">
          <button @click="$emit('copy-cmd')" class="btn btn-primary">{{ copiedCmd ? '✅ ' + trans.copied : '📋 ' + trans.copy }}</button> <button @click="$emit('open-edit-from-copy')" class="btn btn-blue">✏️ {{ trans.edit }}</button>
        </div>
        <button @click="$emit('close')" class="btn">{{ trans.cancel }}</button>
      </div>
    </div>
  </div>
</template>

<script setup>
defineProps({
  trans: { type: Object, required: true },
  show: { type: Boolean, default: false },
  currentServerName: { type: String, default: '' },
  collectInterval: { type: [Number, String], default: 0 },
  reportInterval: { type: [Number, String], default: 60 },
  resetDay: { type: [Number, String], default: 1 },
  rxCorrection: { type: [Number, String], default: '' },
  txCorrection: { type: [Number, String], default: '' },
  installCommand: { type: String, default: '' },
  copiedCmd: { type: Boolean, default: false }
})

defineEmits(['close', 'copy-cmd', 'open-edit-from-copy'])
</script>

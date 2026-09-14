<script setup>
import { onMounted, onUnmounted, ref } from 'vue'
import { useRoute } from 'vue-router'
import { Html5Qrcode } from 'html5-qrcode'
import api from '../api'

const route = useRoute()
const auditId = route.params.id

const assets = ref([])
const audit = ref(null)
const scannedCount = ref(0)
const totalCount = ref(0)
const percentage = ref(0)
const isLoading = ref(true)
const loadError = ref('')
const cameraError = ref('')
const feedback = ref(null)
const isUpdatingStatus = ref(false)
const canManageAudits = (() => {
  try {
    return JSON.parse(localStorage.getItem('user') || '{}').role === 'ADMIN'
  } catch {
    return false
  }
})()

let html5QrCode = null
let feedbackTimer = null
const processedUuids = new Set()

async function fetchExpectedAssets() {
  isLoading.value = true
  loadError.value = ''

  try {
    const { data } = await api.get(`/audits/${auditId}/assets`)
    audit.value = data.session
    assets.value = data.assets
    scannedCount.value = data.scannedCount
    totalCount.value = data.totalCount
    percentage.value = data.percentage
    assets.value.filter((asset) => asset.isScanned).forEach((asset) => processedUuids.add(asset.uuid))
  } catch (err) {
    loadError.value = 'Failed to load expected assets for this audit.'
  } finally {
    isLoading.value = false
  }
}

function extractUuid(scannedText) {
  try {
    const url = new URL(scannedText)
    const segments = url.pathname.split('/').filter(Boolean)
    return segments[segments.length - 1]
  } catch {
    const segments = scannedText.split('/').filter(Boolean)
    return segments[segments.length - 1]
  }
}

function showFeedback(type, text) {
  feedback.value = { type, text }
  clearTimeout(feedbackTimer)
  feedbackTimer = setTimeout(() => {
    feedback.value = null
  }, 2500)
}

function sortScannedToTop() {
  assets.value = [...assets.value].sort((a, b) => Number(b.isScanned) - Number(a.isScanned))
}

async function onScanSuccess(decodedText) {
  const uuid = extractUuid(decodedText)
  if (!uuid || processedUuids.has(uuid)) return
  processedUuids.add(uuid)

  try {
    await api.post(`/audits/${auditId}/scan`, { uuid })

    const asset = assets.value.find((item) => item.uuid === uuid)
    if (asset) {
      asset.isScanned = true
      sortScannedToTop()
      scannedCount.value += 1
      percentage.value = totalCount.value ? Math.round((scannedCount.value / totalCount.value) * 100) : 0
      showFeedback('success', `Scanned: ${asset.name ?? asset.serialNumber ?? uuid}`)
    } else {
      showFeedback('success', 'Scan recorded.')
    }

    if (navigator.vibrate) {
      navigator.vibrate([100, 50, 100])
    }
  } catch (err) {
    processedUuids.delete(uuid)
    showFeedback('error', err.response?.data?.error || 'Failed to record scan.')
  }
}

async function updateAuditStatus(action) {
  isUpdatingStatus.value = true

  try {
    const { data } = await api.post(`/audits/${auditId}/${action}`)
    audit.value = { ...audit.value, ...data }
    showFeedback('success', action === 'complete' ? 'Audit closed.' : 'Audit reopened.')
    if (action === 'complete') await stopScanner()
    if (action === 'reopen') {
      await fetchExpectedAssets()
      await startScanner()
    }
  } catch (err) {
    showFeedback('error', err.response?.data?.error || 'Failed to update audit status.')
  } finally {
    isUpdatingStatus.value = false
  }
}

async function stopScanner() {
  if (!html5QrCode) return

  try {
    await html5QrCode.stop()
    html5QrCode.clear()
  } catch {
    // Scanner was never started or already stopped.
  } finally {
    html5QrCode = null
  }
}

function onScanFailure() {
  // Fires continuously while no QR code is in frame — nothing to do.
}

async function startScanner() {
  if (audit.value?.status === 'COMPLETED') return
  html5QrCode = new Html5Qrcode('qr-reader')

  try {
    await html5QrCode.start(
      { facingMode: 'environment' },
      { fps: 10, qrbox: { width: 250, height: 250 } },
      onScanSuccess,
      onScanFailure,
    )
  } catch (err) {
    cameraError.value = 'Unable to access the camera. Check permissions and try again.'
  }
}

onMounted(async () => {
  await fetchExpectedAssets()
  await startScanner()
})

onUnmounted(async () => {
  clearTimeout(feedbackTimer)
  await stopScanner()
})
</script>

<template>
  <div class="flex h-dvh flex-col bg-slate-100">
    <div class="relative h-[40%] shrink-0 bg-black">
      <div id="qr-reader" class="h-full w-full"></div>
      <p
        v-if="cameraError"
        class="absolute inset-x-0 top-0 bg-red-600 px-3 py-2 text-center text-sm text-white"
      >
        {{ cameraError }}
      </p>
    </div>

    <div class="h-[60%] flex-1 overflow-y-auto p-4">
      <div class="mb-3 flex items-start justify-between gap-3">
        <div>
          <h1 class="text-lg font-semibold text-slate-900">{{ audit?.name || 'Audit' }}</h1>
          <p class="text-sm text-slate-500">
            {{ audit?.targetLocation || 'All locations' }} · {{ scannedCount }} / {{ totalCount }} scanned
          </p>
        </div>
        <span class="text-2xl font-bold text-indigo-600">{{ percentage }}%</span>
      </div>

      <div class="mb-4 h-2 overflow-hidden rounded-full bg-slate-200" role="progressbar" :aria-valuenow="percentage" aria-valuemin="0" aria-valuemax="100">
        <div class="h-full rounded-full bg-indigo-600 transition-all" :style="{ width: `${percentage}%` }"></div>
      </div>

      <div v-if="canManageAudits" class="mb-4 flex gap-2">
        <button
          v-if="audit?.status !== 'COMPLETED'"
          type="button"
          :disabled="isUpdatingStatus"
          class="rounded-lg bg-indigo-600 px-3 py-2 text-sm font-medium text-white disabled:opacity-60"
          @click="updateAuditStatus('complete')"
        >
          Leltár lezárása
        </button>
        <button
          v-else
          type="button"
          :disabled="isUpdatingStatus"
          class="rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 disabled:opacity-60"
          @click="updateAuditStatus('reopen')"
        >
          Leltár újranyitása
        </button>
      </div>

      <p
        v-if="feedback"
        class="mb-3 rounded-lg px-3 py-2 text-sm font-medium"
        :class="feedback.type === 'success' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'"
      >
        {{ feedback.text }}
      </p>

      <p v-if="loadError" class="mb-3 text-sm text-red-600">{{ loadError }}</p>
      <p v-else-if="isLoading" class="text-sm text-slate-500">Loading expected assets…</p>

      <ul v-else class="space-y-2">
        <li
          v-for="asset in assets"
          :key="asset.id"
          class="flex items-center justify-between rounded-lg border px-3 py-2"
          :class="asset.isScanned ? 'border-green-200 bg-green-50' : 'border-slate-200 bg-white'"
        >
          <div>
            <p class="font-medium text-slate-900">{{ asset.name || 'Unknown asset' }}</p>
            <p class="text-xs text-slate-500">
              {{ asset.serialNumber || 'No serial' }} · {{ asset.location || 'No location' }}
            </p>
          </div>
          <span v-if="asset.isScanned" class="text-sm font-semibold text-green-600">Scanned</span>
        </li>

        <li v-if="!assets.length" class="py-6 text-center text-sm text-slate-500">
          No expected assets for this audit.
        </li>
      </ul>
    </div>
  </div>
</template>

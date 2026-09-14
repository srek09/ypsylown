<script setup>
import { onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import api from '../api'

const router = useRouter()

const audits = ref([])
const isLoading = ref(true)
const error = ref('')

const isModalOpen = ref(false)
const isSubmitting = ref(false)
const modalError = ref('')
const name = ref('')
const targetLocation = ref('')

async function fetchAudits() {
  isLoading.value = true
  error.value = ''

  try {
    const { data } = await api.get('/audits')
    audits.value = data
  } catch (err) {
    error.value = 'Nem sikerült betölteni a leltárakat.'
    console.error(err.response)
  } finally {
    isLoading.value = false
  }
}

function statusBadgeClass(status) {
  switch (status) {
    case 'IN_PROGRESS':
      return 'bg-amber-50 text-amber-700 ring-amber-600/20'
    case 'COMPLETED':
      return 'bg-emerald-50 text-emerald-700 ring-emerald-600/20'
    default:
      return 'bg-slate-50 text-slate-700 ring-slate-600/20'
  }
}

function statusLabel(status) {
  switch (status) {
    case 'IN_PROGRESS':
      return 'Folyamatban'
    case 'COMPLETED':
      return 'Lezárva'
    default:
      return status
  }
}

function goToScan(audit) {
  router.push(`/audits/${audit.id}/scan`)
}

function openModal() {
  modalError.value = ''
  name.value = ''
  targetLocation.value = ''
  isModalOpen.value = true
}

function closeModal() {
  isModalOpen.value = false
}

async function handleCreateAudit() {
  isSubmitting.value = true
  modalError.value = ''

  try {
    const { data } = await api.post('/audits', {
      name: name.value,
      targetLocation: targetLocation.value,
    })

    closeModal()
    router.push(`/audits/${data.id}/scan`)
  } catch (err) {
    modalError.value = 'Nem sikerült létrehozni a leltárt.'
    console.error(err.response)
  } finally {
    isSubmitting.value = false
  }
}

onMounted(fetchAudits)
</script>

<template>
  <div>
    <div class="mb-4 flex items-center justify-between">
      <h1 class="text-xl font-semibold text-slate-900">Leltárak</h1>
      <button
        type="button"
        class="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white shadow-sm transition-colors hover:bg-indigo-500 disabled:cursor-not-allowed disabled:opacity-60"
        @click="openModal"
      >
        Új leltár indítása
      </button>
    </div>

    <p v-if="error" class="mb-4 text-sm text-red-600">{{ error }}</p>

    <div v-if="isLoading" class="text-sm text-slate-500">Leltárak betöltése…</div>

    <div v-else class="overflow-x-auto rounded-lg border border-slate-200 bg-white shadow-sm">
      <table class="min-w-full divide-y divide-slate-200 text-sm">
        <thead class="bg-slate-50">
          <tr>
            <th scope="col" class="px-4 py-3 text-left font-medium text-slate-500">Név</th>
            <th scope="col" class="px-4 py-3 text-left font-medium text-slate-500">Helyszín</th>
            <th scope="col" class="px-4 py-3 text-left font-medium text-slate-500">Státusz</th>
            <th scope="col" class="px-4 py-3 text-left font-medium text-slate-500">Teljesítés</th>
            <th scope="col" class="px-4 py-3 text-left font-medium text-slate-500">
              Létrehozva
            </th>
            <th scope="col" class="px-4 py-3 text-left font-medium text-slate-500">Műveletek</th>
          </tr>
        </thead>
        <tbody class="divide-y divide-slate-200">
          <tr v-for="audit in audits" :key="audit.id" class="hover:bg-slate-50">
            <td class="px-4 py-3 font-medium text-slate-900">{{ audit.name }}</td>
            <td class="px-4 py-3 text-slate-600">{{ audit.targetLocation || '—' }}</td>
            <td class="px-4 py-3">
              <span
                class="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset"
                :class="statusBadgeClass(audit.status)"
              >
                {{ statusLabel(audit.status) }}
              </span>
            </td>
            <td class="px-4 py-3 text-slate-600">
              {{ audit.finalPercentage == null ? 'Folyamatban' : `${audit.finalPercentage}%` }}
            </td>
            <td class="px-4 py-3 text-slate-600">
              {{ new Date(audit.createdAt).toLocaleString('hu-HU') }}
            </td>
            <td class="px-4 py-3">
              <button
                type="button"
                class="rounded-md border border-slate-300 px-2 py-1 text-xs font-medium text-slate-700 hover:bg-slate-100"
                @click="goToScan(audit)"
              >
                Szkennelés
              </button>
            </td>
          </tr>
          <tr v-if="!audits.length">
            <td colspan="6" class="px-4 py-6 text-center text-slate-500">
              Nincs megjeleníthető leltár.
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <div
      v-if="isModalOpen"
      class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4"
      @click.self="closeModal"
    >
      <div class="w-full max-w-md rounded-xl bg-white p-6 shadow-xl">
        <h2 class="mb-4 text-lg font-semibold text-slate-900">Új leltár indítása</h2>
        <form class="space-y-4" @submit.prevent="handleCreateAudit">
          <div>
            <label for="audit-name" class="mb-1.5 block text-sm font-medium text-slate-700">
              Név
            </label>
            <input
              id="audit-name"
              v-model="name"
              type="text"
              required
              class="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/30"
            />
          </div>

          <div>
            <label
              for="audit-target-location"
              class="mb-1.5 block text-sm font-medium text-slate-700"
            >
              Cél helyszín
            </label>
            <input
              id="audit-target-location"
              v-model="targetLocation"
              type="text"
              
              class="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/30"
            />
          </div>

          <p v-if="modalError" class="text-sm text-red-600">{{ modalError }}</p>

          <div class="flex justify-end gap-2 pt-2">
            <button
              type="button"
              class="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100"
              @click="closeModal"
            >
              Mégse
            </button>
            <button
              type="submit"
              :disabled="isSubmitting"
              class="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-indigo-500 disabled:cursor-not-allowed disabled:opacity-60"
            >
              Indítás
            </button>
          </div>
        </form>
      </div>
    </div>
  </div>
</template>

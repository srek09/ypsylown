<script setup>
import { computed, onMounted, ref } from 'vue'
import QRCode from 'qrcode.vue'
import api from '../api'

const assets = ref([])
const isLoading = ref(true)
const error = ref('')
const isModalOpen = ref(false)
const isSubmitting = ref(false)
const modalError = ref('')
const searchQuery = ref('')
const collapsedCategories = ref(new Set())
const selectedAssetIds = ref(new Set())
const isQrSelectionMode = ref(false)
const isPrintViewOpen = ref(false)
const form = ref({ category: '', name: '', description: '', serialNumber: '', location: '', status: 'AVAILABLE' })
const canManageAssets = (() => {
	try {
		return JSON.parse(localStorage.getItem('user') || '{}').role === 'ADMIN'
	} catch {
		return false
	}
})()

const statusOptions = [
	{ value: 'AVAILABLE', label: 'Elérhető' },
	{ value: 'IN_USE', label: 'Használatban' },
	{ value: 'MAINTENANCE', label: 'Karbantartás alatt' },
	{ value: 'MISSING', label: 'Hiányzik' },
]

function statusLabel(status) {
	return statusOptions.find((option) => option.value === status)?.label || status
}

function statusClass(status) {
	return {
		AVAILABLE: 'bg-emerald-50 text-emerald-700 ring-emerald-600/20',
		IN_USE: 'bg-blue-50 text-blue-700 ring-blue-600/20',
		MAINTENANCE: 'bg-amber-50 text-amber-700 ring-amber-600/20',
		MISSING: 'bg-red-50 text-red-700 ring-red-600/20',
	}[status] || 'bg-slate-50 text-slate-700 ring-slate-600/20'
}

const groupedAssets = computed(() => {
	const query = searchQuery.value.trim().toLocaleLowerCase('hu-HU')
	const groups = new Map()

	for (const asset of assets.value) {
		const searchableText = [asset.name, asset.category, asset.description, asset.serialNumber, asset.location]
			.filter(Boolean)
			.join(' ')
			.toLocaleLowerCase('hu-HU')

		if (query && !searchableText.includes(query)) continue

		const category = asset.category?.trim() || 'Egyéb'
		if (!groups.has(category)) groups.set(category, [])
		groups.get(category).push(asset)
	}

	return [...groups.entries()]
		.sort(([categoryA], [categoryB]) => categoryA.localeCompare(categoryB, 'hu'))
		.map(([category, categoryAssets]) => ({ category, assets: categoryAssets }))
})

const selectedAssets = computed(() => assets.value.filter((asset) => selectedAssetIds.value.has(asset.id)))
const allAssetsSelected = computed(() => assets.value.length > 0 && selectedAssets.value.length === assets.value.length)

function isCategorySelected(group) {
	return group.assets.length > 0 && group.assets.every((asset) => selectedAssetIds.value.has(asset.id))
}

function isCategoryPartiallySelected(group) {
	const selectedCount = group.assets.filter((asset) => selectedAssetIds.value.has(asset.id)).length
	return selectedCount > 0 && selectedCount < group.assets.length
}

function toggleAssetSelection(assetId) {
	const next = new Set(selectedAssetIds.value)
	if (next.has(assetId)) next.delete(assetId)
	else next.add(assetId)
	selectedAssetIds.value = next
}

function toggleCategorySelection(group) {
	const next = new Set(selectedAssetIds.value)
	const shouldSelect = !isCategorySelected(group)
	for (const asset of group.assets) {
		if (shouldSelect) next.add(asset.id)
		else next.delete(asset.id)
	}
	selectedAssetIds.value = next
}

function toggleAllSelection() {
	selectedAssetIds.value = allAssetsSelected.value
		? new Set()
		: new Set(assets.value.map((asset) => asset.id))
}

function startQrSelection() {
	isQrSelectionMode.value = true
	selectedAssetIds.value = new Set()
}

function cancelQrSelection() {
	isQrSelectionMode.value = false
	selectedAssetIds.value = new Set()
}

function openPrintView() {
	if (!selectedAssets.value.length) return
	isPrintViewOpen.value = true
}

function closePrintView() {
	isPrintViewOpen.value = false
}

function printSelectedQrs() {
	window.print()
}

function toggleCategory(category) {
	const next = new Set(collapsedCategories.value)
	if (next.has(category)) next.delete(category)
	else next.add(category)
	collapsedCategories.value = next
}

async function fetchAssets() {
	isLoading.value = true
	error.value = ''

	try {
		const { data } = await api.get('/assets')
		assets.value = data
	} catch (err) {
		error.value = 'Nem sikerült betölteni az eszközöket.'
		console.error(err)
	} finally {
		isLoading.value = false
	}
}

function openModal() {
	form.value = { category: '', name: '', description: '', serialNumber: '', location: '', status: 'AVAILABLE' }
	modalError.value = ''
	isModalOpen.value = true
}

function closeModal() {
	if (!isSubmitting.value) isModalOpen.value = false
}

async function handleCreateAsset() {
	isSubmitting.value = true
	modalError.value = ''

	try {
		const { data } = await api.post('/assets', form.value)
		assets.value.unshift(data.asset)
		closeModal()
	} catch (err) {
		modalError.value = err.response?.status === 400
			? 'Ellenőrizze a megadott adatokat.'
			: 'Nem sikerült rögzíteni az eszközt.'
		console.error(err)
	} finally {
		isSubmitting.value = false
	}
}

onMounted(fetchAssets)
</script>

<template>
	<div class="asset-page-shell w-full">
		<div class="mb-4 flex items-center justify-between">
			<h1 class="text-xl font-semibold text-slate-900">Eszközök</h1>
			<div class="flex items-center gap-2">
			<button
				type="button"
				class="rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-100"
				@click="isQrSelectionMode ? cancelQrSelection() : startQrSelection()"
			>
				<span aria-hidden="true" class="mr-1">▣</span>{{ isQrSelectionMode ? 'Kijelölés bezárása' : 'QR-kódok nyomtatása' }}
			</button>
			<button
				v-if="canManageAssets"
				type="button"
				class="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white shadow-sm transition-colors hover:bg-indigo-500 disabled:cursor-not-allowed disabled:opacity-60"
				@click="openModal"
			>
				<span aria-hidden="true" class="mr-1 text-lg leading-none">+</span>
				Új eszköz rögzítése
			</button>
			</div>
		</div>

		<div v-if="!isLoading" class="mb-4 rounded-lg border border-slate-200 bg-white p-3 shadow-sm">
			<label for="asset-search" class="sr-only">Eszközök keresése</label>
			<div class="relative">
				<span aria-hidden="true" class="pointer-events-none absolute inset-y-0 left-3 flex items-center text-slate-400">⌕</span>
				<input id="asset-search" v-model="searchQuery" type="search" autocomplete="off" placeholder="Keresés név, kategória, sorozatszám vagy helyszín alapján…" class="w-full rounded-lg border border-slate-300 py-2.5 pl-9 pr-3 text-sm text-slate-900 shadow-sm outline-none placeholder:text-slate-400 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/30" />
			</div>
		</div>

		<p v-if="error" class="mb-4 text-sm text-red-600">{{ error }}</p>
		<div v-if="isLoading" class="rounded-lg border border-slate-200 bg-white p-6 text-sm text-slate-500 shadow-sm">
			Eszközök betöltése…
		</div>
		<div v-else class="space-y-3">
			<div v-if="isQrSelectionMode" class="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-indigo-100 bg-indigo-50 px-4 py-3 text-sm text-indigo-900">
				<label class="flex cursor-pointer items-center gap-2 font-medium"><input type="checkbox" :checked="allAssetsSelected" class="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500" @change="toggleAllSelection" /> Összes eszköz kijelölése</label>
				<div class="flex items-center gap-2"><span>{{ selectedAssets.length }} kijelölve</span><button type="button" :disabled="!selectedAssets.length" class="rounded-lg bg-indigo-600 px-3 py-1.5 font-medium text-white disabled:cursor-not-allowed disabled:opacity-50" @click="openPrintView">Nyomtatási nézet</button></div>
			</div>
			<div v-for="group in groupedAssets" :key="group.category" class="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
				<div class="flex items-center gap-3 bg-slate-50 px-4 py-3 hover:bg-slate-100">
					<input v-if="isQrSelectionMode" type="checkbox" :checked="isCategorySelected(group)" :indeterminate="isCategoryPartiallySelected(group)" :aria-label="`${group.category} kategória kijelölése`" class="h-4 w-4 shrink-0 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500" @change="toggleCategorySelection(group)" />
					<button type="button" class="flex min-w-0 flex-1 items-center justify-between text-left" :aria-expanded="!collapsedCategories.has(group.category)" @click="toggleCategory(group.category)">
						<span class="flex items-center gap-2 font-semibold text-slate-900"><span aria-hidden="true" class="inline-block text-xs text-slate-500 transition-transform" :class="collapsedCategories.has(group.category) ? '' : 'rotate-90'">▶</span>{{ group.category }} <span class="text-sm font-normal text-slate-500">({{ group.assets.length }})</span></span>
						<span class="text-sm text-slate-500">{{ collapsedCategories.has(group.category) ? 'Megnyitás' : 'Bezárás' }}</span>
					</button>
				</div>
				<table v-if="!collapsedCategories.has(group.category)" class="min-w-full divide-y divide-slate-200 text-sm">
					<thead class="border-t border-slate-200 bg-white">
						<tr><th class="px-4 py-3 text-left font-medium text-slate-500">Megnevezés</th><th class="px-4 py-3 text-left font-medium text-slate-500">Azonosító</th><th class="px-4 py-3 text-left font-medium text-slate-500">Helyszín</th><th class="px-4 py-3 text-left font-medium text-slate-500">Állapot</th></tr>
					</thead>
					<tbody class="divide-y divide-slate-200">
						<tr v-for="asset in group.assets" :key="asset.id" class="hover:bg-slate-50">
							<td class="px-4 py-3"><label class="flex items-start gap-3"><input v-if="isQrSelectionMode" type="checkbox" :checked="selectedAssetIds.has(asset.id)" :aria-label="`${asset.name} kijelölése`" class="mt-0.5 h-4 w-4 shrink-0 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500" @change="toggleAssetSelection(asset.id)" /><span><div class="font-medium text-slate-900">{{ asset.name }}</div><div v-if="asset.description" class="mt-0.5 max-w-sm truncate text-xs text-slate-500">{{ asset.description }}</div></span></label></td>
							<td class="px-4 py-3 text-slate-600">{{ asset.serialNumber || '—' }}</td><td class="px-4 py-3 text-slate-600">{{ asset.location || '—' }}</td><td class="px-4 py-3"><span class="inline-flex rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset" :class="statusClass(asset.status)">{{ statusLabel(asset.status) }}</span></td>
						</tr>
					</tbody>
				</table>
			</div>
			<div v-if="!groupedAssets.length" class="rounded-lg border border-slate-200 bg-white px-4 py-8 text-center text-sm text-slate-500">{{ searchQuery ? 'Nincs a keresésnek megfelelő eszköz.' : 'Nincs még rögzített eszköz.' }}</div>
		</div>

		<div v-if="isPrintViewOpen" class="qr-print-view fixed inset-0 z-50 overflow-y-auto bg-slate-950/50 px-4 py-8" @click.self="closePrintView">
			<div class="mx-auto w-full max-w-5xl rounded-xl bg-white p-6 shadow-xl">
				<div class="mb-6 flex items-start justify-between gap-4 print:hidden"><div><h2 class="text-xl font-semibold text-slate-900">QR-kódok nyomtatási nézete</h2><p class="mt-1 text-sm text-slate-500">{{ selectedAssets.length }} kijelölt eszköz</p></div><div class="flex gap-2"><button type="button" class="rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100" @click="closePrintView">Mégse</button><button type="button" class="rounded-lg bg-indigo-600 px-3 py-2 text-sm font-medium text-white hover:bg-indigo-500" @click="printSelectedQrs">Nyomtatás</button></div></div>
				<div class="qr-print-grid grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
					<div v-for="asset in selectedAssets" :key="asset.id" class="qr-print-card flex flex-col items-center rounded-lg border border-slate-200 p-5 text-center">
						<QRCode :value="`https://ypsylon.hu/scan/${asset.uuid}`" :size="180" level="H" render-as="svg" />
						<h3 class="mt-3 font-semibold text-slate-900">{{ asset.name }}</h3><p class="mt-1 text-xs text-slate-500">{{ asset.category }}<span v-if="asset.serialNumber"> · {{ asset.serialNumber }}</span></p>
					</div>
				</div>
			</div>
		</div>

		<div v-if="isModalOpen" class="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 px-4 py-6" @click.self="closeModal">
			<div class="max-h-full w-full max-w-lg overflow-y-auto rounded-xl bg-white p-6 shadow-xl">
				<div class="mb-5 flex items-start justify-between gap-4">
					<div><h2 class="text-lg font-semibold text-slate-900">Új eszköz rögzítése</h2><p class="mt-1 text-sm text-slate-500">Adja meg az eszköz alapadatait.</p></div>
					<button type="button" aria-label="Bezárás" class="text-2xl leading-none text-slate-400 hover:text-slate-700" @click="closeModal">×</button>
				</div>
				<form class="space-y-4" @submit.prevent="handleCreateAsset">
					<div><label for="asset-category" class="mb-1.5 block text-sm font-medium text-slate-700">Kategória <span class="text-red-500">*</span></label><input id="asset-category" v-model.trim="form.category" type="text" maxlength="100" required autocomplete="off" placeholder="Például: Informatika" class="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/30" /></div>
					<div><label for="asset-name" class="mb-1.5 block text-sm font-medium text-slate-700">Megnevezés <span class="text-red-500">*</span></label><input id="asset-name" v-model.trim="form.name" type="text" maxlength="200" required autocomplete="off" class="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/30" /></div>
					<div><label for="asset-description" class="mb-1.5 block text-sm font-medium text-slate-700">Leírás</label><textarea id="asset-description" v-model.trim="form.description" maxlength="2000" rows="3" class="w-full resize-y rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/30"></textarea></div>
					<div class="grid gap-4 sm:grid-cols-2">
						<div><label for="asset-serial" class="mb-1.5 block text-sm font-medium text-slate-700">Sorozatszám</label><input id="asset-serial" v-model.trim="form.serialNumber" type="text" maxlength="100" autocomplete="off" class="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/30" /></div>
						<div><label for="asset-location" class="mb-1.5 block text-sm font-medium text-slate-700">Helyszín</label><input id="asset-location" v-model.trim="form.location" type="text" maxlength="200" autocomplete="off" class="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/30" /></div>
					</div>
					<div><label for="asset-status" class="mb-1.5 block text-sm font-medium text-slate-700">Állapot</label><select id="asset-status" v-model="form.status" class="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/30"><option v-for="option in statusOptions" :key="option.value" :value="option.value">{{ option.label }}</option></select></div>
					<p v-if="modalError" class="text-sm text-red-600" role="alert">{{ modalError }}</p>
					<div class="flex justify-end gap-2 pt-2"><button type="button" class="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100" @click="closeModal">Mégse</button><button type="submit" :disabled="isSubmitting" class="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-indigo-500 disabled:cursor-not-allowed disabled:opacity-60">{{ isSubmitting ? 'Mentés…' : 'Eszköz mentése' }}</button></div>
				</form>
			</div>
		</div>
	</div>
</template>


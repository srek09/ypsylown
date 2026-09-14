<script setup>
import { useRouter, useRoute } from 'vue-router'

const router = useRouter()
const route = useRoute()

const navItems = [
  { name: 'Eszközök', to: '/assets' },
  { name: 'Leltárak', to: '/audits' },
]

function isActive(to) {
  return route.path.startsWith(to)
}

function logout() {
  localStorage.clear()
  router.push('/login')
}
</script>

<template>
  <div class="flex min-h-screen flex-col bg-slate-50">
    <header class="flex h-16 shrink-0 items-center justify-between border-b border-slate-200 bg-white px-6">
      <span class="text-lg font-semibold text-slate-900">Ypsyl-own</span>

      <button
        type="button"
        class="rounded-lg border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-100"
        @click="logout"
      >
        Kijelentkezés
      </button>
    </header>

    <div class="flex flex-1">
      <aside class="w-56 shrink-0 border-r border-slate-200 bg-white">
        <nav class="flex flex-col gap-1 p-4">
          <router-link
            v-for="item in navItems"
            :key="item.to"
            :to="item.to"
            class="rounded-lg px-3 py-2 text-sm font-medium transition-colors"
            :class="isActive(item.to)
              ? 'bg-indigo-50 text-indigo-700'
              : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'"
          >
            {{ item.name }}
          </router-link>
        </nav>
      </aside>

      <main class="flex-1 p-6">
        <router-view />
      </main>
    </div>
  </div>
</template>

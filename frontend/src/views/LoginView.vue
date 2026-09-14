<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import api from '../api'

const router = useRouter()

const email = ref('')
const password = ref('')
const error = ref('')
const isSubmitting = ref(false)

async function handleSubmit() {
  error.value = ''
  isSubmitting.value = true

  try {
    const { data } = await api.post('/auth/login', {
      email: email.value,
      password: password.value,
    })

    localStorage.setItem('token', data.token)
    localStorage.setItem('user', JSON.stringify(data.user))

    router.push('/assets')
  } catch (err) {
    if (err.response?.status === 401) {
      error.value = 'Sikertelen bejelentkezés. Kérjük, ellenőrizze az adatait!'
    } else {
      error.value = 'Váratlan hiba történt. Kérjük, próbálja újra később.'
    }
  } finally {
    isSubmitting.value = false
  }
}
</script>

<template>
  <div class="flex min-h-screen items-center justify-center bg-slate-100 px-4">
    <div class="w-full max-w-sm rounded-xl bg-white p-8 shadow-lg shadow-slate-200/60">
      <div class="mb-8 text-center">
        <h1 class="text-2xl font-semibold text-slate-900">Ypsyl-own</h1>
        <p class="mt-1 text-sm text-slate-500">Jelentkezzen be a fiókjába</p>
      </div>

      <form class="space-y-5" @submit.prevent="handleSubmit">
        <div>
          <label for="email" class="mb-1.5 block text-sm font-medium text-slate-700">
            E-mail cím
          </label>
          <input
            id="email"
            v-model="email"
            type="email"
            required
            autocomplete="email"
            placeholder="you@example.com"
            class="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 shadow-sm placeholder:text-slate-400 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/30"
          />
        </div>

        <div>
          <label for="password" class="mb-1.5 block text-sm font-medium text-slate-700">
            Jelszó
          </label>
          <input
            id="password"
            v-model="password"
            type="password"
            required
            autocomplete="current-password"
            placeholder="••••••••"
            class="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 shadow-sm placeholder:text-slate-400 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/30"
          />
        </div>

        <p v-if="error" class="text-sm text-red-600">
          {{ error }}
        </p>

        <button
          type="submit"
          :disabled="isSubmitting"
          class="w-full rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white shadow-sm transition-colors hover:bg-indigo-500 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {{ isSubmitting ? 'Bejelentkezés…' : 'Bejelentkezés' }}
        </button>
      </form>
    </div>
  </div>
</template>

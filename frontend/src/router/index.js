import { createRouter, createWebHistory } from 'vue-router'

const LoginView = () => import('../views/LoginView.vue')
const MainLayout = () => import('../components/MainLayout.vue')
const AssetListView = () => import('../views/AssetListView.vue')
const AuditListView = () => import('../views/AuditListView.vue')
const ScannerView = () => import('../views/ScannerView.vue')

const routes = [
  {
    path: '/login',
    name: 'login',
    component: LoginView,
  },
  {
    path: '/',
    component: MainLayout,
    redirect: '/assets',
    meta: { requiresAuth: true },
    children: [
      {
        path: 'assets',
        name: 'assets',
        component: AssetListView,
      },
      {
        path: 'audits',
        name: 'audits',
        component: AuditListView,
      },
      {
        path: 'audits/:id/scan',
        name: 'scan',
        component: ScannerView,
      },
    ],
  },
]

const router = createRouter({
  history: createWebHistory(),
  routes,
})

router.beforeEach((to) => {
  const requiresAuth = to.matched.some((record) => record.meta.requiresAuth)
  const token = localStorage.getItem('token')

  if (requiresAuth && !token) {
    return '/login'
  }
})

export default router

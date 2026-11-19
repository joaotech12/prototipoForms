import { createRouter, createWebHistory } from 'vue-router';

// Cada tela é carregada só quando é aberta (import dinâmico = arquivo JS separado)
const routes = [
  { path: '/', name: 'painel', component: () => import('@/views/PainelView.vue'), meta: { titulo: 'Painel' } },
  { path: '/formularios/novo', name: 'novo', component: () => import('@/views/EditorView.vue'), meta: { titulo: 'Nova pesquisa' } },
  {
    path: '/formularios/:id/editar',
    name: 'editar',
    component: () => import('@/views/EditorView.vue'),
    props: true,
    meta: { titulo: 'Editor' },
  },
  {
    path: '/formularios/:id/dashboard',
    name: 'dashboard',
    component: () => import('@/views/DashboardView.vue'),
    props: true,
    meta: { titulo: 'Dashboard' },
  },
  // Link público enviado aos clientes: sem o menu do sistema
  { path: '/f/:id', name: 'responder', component: () => import('@/views/ResponderView.vue'), props: true, meta: { publico: true } },
  { path: '/produtos', name: 'produtos', component: () => import('@/views/ProdutosView.vue'), meta: { titulo: 'Produtos' } },
  { path: '/:caminho(.*)*', name: 'nao-encontrado', component: () => import('@/views/NaoEncontradoView.vue') },
];

const router = createRouter({
  history: createWebHistory(),
  routes,
  scrollBehavior: () => ({ top: 0 }),
});

router.afterEach((rota) => {
  if (rota.meta.titulo) document.title = `${rota.meta.titulo} · Central de Pesquisas`;
});

export default router;

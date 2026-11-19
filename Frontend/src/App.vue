<script setup>
import { computed } from 'vue';
import { useRoute } from 'vue-router';
import { avisos, fecharAviso } from '@/services/avisos';

const rota = useRoute();
const publico = computed(() => rota.meta.publico);
</script>

<template>
  <header v-if="!publico" class="topo">
    <RouterLink to="/" class="marca">
      <span class="marca-icone">≡</span>
      <span>Central de Pesquisas</span>
    </RouterLink>
    <nav class="menu">
      <RouterLink to="/" :class="{ ativo: rota.name === 'painel' }">Painel</RouterLink>
      <RouterLink to="/formularios/novo" :class="{ ativo: rota.name === 'novo' }">+ Nova pesquisa</RouterLink>
      <RouterLink to="/produtos" :class="{ ativo: rota.name === 'produtos' }">Produtos</RouterLink>
    </nav>
  </header>

  <RouterView v-slot="{ Component }">
    <Transition name="pagina" mode="out-in">
      <component :is="Component" :key="rota.path" />
    </Transition>
  </RouterView>

  <!-- Avisos rápidos (services/avisos.js) -->
  <TransitionGroup tag="div" name="aviso" class="avisos">
    <div v-for="a in avisos" :key="a.id" class="aviso" :class="a.tipo" @click="fecharAviso(a.id)">
      <span>{{ a.tipo === 'erro' ? '⚠' : a.tipo === 'info' ? 'ℹ' : '✓' }}</span>
      {{ a.texto }}
    </div>
  </TransitionGroup>
</template>

<script setup>
// Barras horizontais: [{ rotulo, valor, pct? }]. Clique numa barra emite "escolher" (vira filtro).
import { computed } from 'vue';

const props = defineProps({
  itens: { type: Array, required: true },
  cor: { type: String, default: 'var(--primaria)' },
  sufixo: { type: String, default: '' },
  clicavel: { type: Boolean, default: false },
  destaque: { type: String, default: '' },
});
const emit = defineEmits(['escolher']);

const maior = computed(() => Math.max(1, ...props.itens.map((i) => i.valor ?? 0)));
// Valores negativos (ex.: NPS -20) aparecem como número, mas a barra fica vazia
const largura = (valor) => (Math.max(0, valor ?? 0) / maior.value) * 100 + '%';
</script>

<template>
  <div class="barras">
    <div
      v-for="item in itens"
      :key="item.rotulo"
      class="barra"
      :class="{ clicavel, destaque: destaque === item.rotulo }"
      :title="clicavel ? 'Clique para filtrar por esta opção' : ''"
      @click="clicavel && emit('escolher', item.rotulo)"
    >
      <span class="rotulo">{{ item.rotulo }}</span>
      <div class="trilho">
        <div class="preenchido" :style="{ width: largura(item.valor), background: item.cor || cor }"></div>
      </div>
      <span class="valor">
        {{ item.valor ?? '—' }}{{ sufixo }}
        <small v-if="item.pct !== undefined">{{ item.pct }}%</small>
      </span>
    </div>
  </div>
</template>

<style scoped>
.barras { display: flex; flex-direction: column; gap: 8px; }
.barra { display: grid; grid-template-columns: minmax(80px, 34%) 1fr 74px; align-items: center; gap: 10px; font-size: 0.88rem; border-radius: 6px; padding: 2px 4px; }
.barra.clicavel { cursor: pointer; }
.barra.clicavel:hover { background: var(--fundo); }
.barra.destaque { background: var(--primaria-suave); }
.rotulo { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.trilho { height: 12px; background: var(--fundo); border-radius: 99px; overflow: hidden; }
.preenchido { height: 100%; border-radius: 99px; transition: width 0.6s cubic-bezier(0.2, 0.8, 0.2, 1); min-width: 2px; }
.valor { text-align: right; font-weight: 600; font-variant-numeric: tabular-nums; }
.valor small { color: var(--texto-suave); font-weight: 500; margin-left: 4px; }
</style>

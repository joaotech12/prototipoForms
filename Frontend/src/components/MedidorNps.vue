<script setup>
// Meia-lua de -100 a 100 com as zonas do NPS e um ponteiro
import { computed } from 'vue';

const props = defineProps({ nps: { type: Number, default: null }, cor: { type: String, default: '#6d28d9' } });

const ZONAS = [
  { de: -100, ate: 0, cor: '#fca5a5' },
  { de: 0, ate: 50, cor: '#fcd34d' },
  { de: 50, ate: 75, cor: '#86efac' },
  { de: 75, ate: 100, cor: '#22c55e' },
];

// Converte um valor do NPS em ponto do arco (centro 100,100, raio r)
function ponto(valor, r) {
  const angulo = Math.PI * (1 - (valor + 100) / 200);
  return { x: 100 + r * Math.cos(angulo), y: 100 - r * Math.sin(angulo) };
}
function arco(de, ate) {
  const a = ponto(de, 80);
  const b = ponto(ate, 80);
  return `M${a.x},${a.y} A80,80 0 0 1 ${b.x},${b.y}`;
}
const ponteiro = computed(() => ponto(props.nps ?? 0, 62));
</script>

<template>
  <svg viewBox="0 0 200 118" class="medidor" role="img" :aria-label="`NPS ${nps ?? 'sem dados'}`">
    <path v-for="z in ZONAS" :key="z.de" :d="arco(z.de, z.ate)" :stroke="z.cor" stroke-width="18" fill="none" />
    <g v-if="nps !== null" class="agulha">
      <line x1="100" y1="100" :x2="ponteiro.x" :y2="ponteiro.y" stroke="#111827" stroke-width="4" stroke-linecap="round" />
    </g>
    <circle cx="100" cy="100" r="7" fill="#111827" />
    <text x="14" y="116" font-size="10" fill="#6b7280">-100</text>
    <text x="172" y="116" font-size="10" fill="#6b7280">100</text>
  </svg>
</template>

<style scoped>
.medidor { width: 100%; max-width: 240px; display: block; margin: 0 auto; }
.agulha line { transition: all 0.8s cubic-bezier(0.2, 0.9, 0.3, 1.2); }
</style>

<script setup>
// Gráfico de área (respostas por dia) em SVG. pontos: [{ rotulo, valor }]
import { computed, ref } from 'vue';

const props = defineProps({
  pontos: { type: Array, required: true },
  cor: { type: String, default: '#6d28d9' },
});

const LARGURA = 600;
const ALTURA = 180;
const MARGEM = 24;
const sobre = ref(null);

const maior = computed(() => Math.max(1, ...props.pontos.map((p) => p.valor)));
const coordenadas = computed(() => {
  const passo = props.pontos.length > 1 ? (LARGURA - MARGEM * 2) / (props.pontos.length - 1) : 0;
  return props.pontos.map((p, i) => ({
    ...p,
    x: MARGEM + i * passo,
    y: ALTURA - MARGEM - (p.valor / maior.value) * (ALTURA - MARGEM * 2),
  }));
});
const linha = computed(() => coordenadas.value.map((c, i) => `${i ? 'L' : 'M'}${c.x},${c.y}`).join(' '));
const area = computed(() => {
  const c = coordenadas.value;
  if (!c.length) return '';
  return `${linha.value} L${c[c.length - 1].x},${ALTURA - MARGEM} L${c[0].x},${ALTURA - MARGEM} Z`;
});
// Mostra só alguns rótulos para não amontoar
const cadaQuantos = computed(() => Math.ceil(props.pontos.length / 7));
</script>

<template>
  <div class="linha-grafico">
    <svg :viewBox="`0 0 ${LARGURA} ${ALTURA}`" role="img" aria-label="Respostas por dia">
      <defs>
        <linearGradient id="degrade-area" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" :stop-color="cor" stop-opacity="0.35" />
          <stop offset="100%" :stop-color="cor" stop-opacity="0" />
        </linearGradient>
      </defs>
      <line :x1="MARGEM" :x2="LARGURA - MARGEM" :y1="ALTURA - MARGEM" :y2="ALTURA - MARGEM" stroke="#e5e7eb" />
      <path :d="area" fill="url(#degrade-area)" />
      <path :d="linha" fill="none" :stroke="cor" stroke-width="2.5" stroke-linejoin="round" vector-effect="non-scaling-stroke" />
      <g v-for="(c, i) in coordenadas" :key="i">
        <rect :x="c.x - 14" :y="0" :width="28" :height="ALTURA" fill="transparent" @mouseenter="sobre = i" @mouseleave="sobre = null" />
        <circle v-if="sobre === i || c.valor > 0" :cx="c.x" :cy="c.y" :r="sobre === i ? 5 : 3" :fill="cor" />
      </g>
    </svg>
    <div class="eixo">
      <span v-for="(p, i) in pontos" :key="i" :style="{ visibility: i % cadaQuantos === 0 || i === pontos.length - 1 ? 'visible' : 'hidden' }">
        {{ p.rotulo }}
      </span>
    </div>
    <div v-if="sobre !== null" class="dica" :style="{ left: (coordenadas[sobre].x / LARGURA) * 100 + '%' }">
      <b>{{ pontos[sobre].valor }}</b> em {{ pontos[sobre].rotulo }}
    </div>
  </div>
</template>

<style scoped>
.linha-grafico { position: relative; }
svg { width: 100%; height: auto; display: block; }
.eixo { display: flex; justify-content: space-between; font-size: 0.72rem; color: var(--texto-suave); padding: 0 2%; }
.dica {
  position: absolute; top: -6px; transform: translateX(-50%); background: #111827; color: #fff;
  padding: 4px 8px; border-radius: 6px; font-size: 0.78rem; pointer-events: none; white-space: nowrap;
}
</style>

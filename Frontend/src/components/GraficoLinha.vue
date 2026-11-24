<script setup>
// Gráfico de linha/área em SVG. pontos: [{ rotulo, valor, total? }]
// Aceita valores negativos (ex.: NPS -30) e pontos sem dado (valor null: a linha fica interrompida).
import { computed, ref } from 'vue';

const props = defineProps({
  pontos: { type: Array, required: true },
  cor: { type: String, default: '#6d28d9' },
  sufixo: { type: String, default: '' },
  minimo: { type: Number, default: null }, // fixa a escala (ex.: -100 a 100 no NPS)
  maximo: { type: Number, default: null },
  area: { type: Boolean, default: true },
});

const LARGURA = 600;
const ALTURA = 180;
const MARGEM = 24;
const sobre = ref(null);
const uid = Math.random().toString(36).slice(2, 7);

const valores = computed(() => props.pontos.map((p) => p.valor).filter((v) => v !== null && v !== undefined));
const menor = computed(() => props.minimo ?? Math.min(0, ...valores.value));
const maior = computed(() => props.maximo ?? Math.max(1, ...valores.value));
const y = (v) => ALTURA - MARGEM - ((v - menor.value) / (maior.value - menor.value || 1)) * (ALTURA - MARGEM * 2);
const yZero = computed(() => y(Math.max(menor.value, 0)));

const coordenadas = computed(() => {
  const passo = props.pontos.length > 1 ? (LARGURA - MARGEM * 2) / (props.pontos.length - 1) : 0;
  return props.pontos.map((p, i) => ({
    ...p,
    x: MARGEM + i * passo,
    y: p.valor === null || p.valor === undefined ? null : y(p.valor),
  }));
});

// Trechos contínuos (sem pontos vazios no meio)
const trechos = computed(() => {
  const lista = [];
  let atual = [];
  for (const c of coordenadas.value) {
    if (c.y === null) {
      if (atual.length) lista.push(atual);
      atual = [];
    } else atual.push(c);
  }
  if (atual.length) lista.push(atual);
  return lista;
});
const linha = (t) => t.map((c, i) => `${i ? 'L' : 'M'}${c.x},${c.y}`).join(' ');
const preenchimento = (t) => `${linha(t)} L${t[t.length - 1].x},${yZero.value} L${t[0].x},${yZero.value} Z`;

// Mostra só alguns rótulos para não amontoar
const cadaQuantos = computed(() => Math.ceil(props.pontos.length / 7));
</script>

<template>
  <div class="linha-grafico">
    <svg :viewBox="`0 0 ${LARGURA} ${ALTURA}`" role="img" aria-label="Gráfico de linha">
      <defs>
        <linearGradient :id="`degrade-${uid}`" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" :stop-color="cor" stop-opacity="0.35" />
          <stop offset="100%" :stop-color="cor" stop-opacity="0" />
        </linearGradient>
      </defs>
      <line :x1="MARGEM" :x2="LARGURA - MARGEM" :y1="yZero" :y2="yZero" stroke="#e5e7eb" />
      <text v-if="menor < 0" :x="2" :y="yZero + 4" font-size="10" fill="#9ca3af">0</text>
      <template v-for="(t, i) in trechos" :key="i">
        <path v-if="area && t.length > 1" :d="preenchimento(t)" :fill="`url(#degrade-${uid})`" />
        <path :d="linha(t)" fill="none" :stroke="cor" stroke-width="2.5" stroke-linejoin="round" />
      </template>
      <g v-for="(c, i) in coordenadas" :key="i">
        <rect :x="c.x - 14" :y="0" :width="28" :height="ALTURA" fill="transparent" @mouseenter="sobre = i" @mouseleave="sobre = null" />
        <circle v-if="c.y !== null && (sobre === i || c.valor !== 0)" :cx="c.x" :cy="c.y" :r="sobre === i ? 5 : 3" :fill="cor" />
      </g>
    </svg>
    <div class="eixo">
      <span v-for="(p, i) in pontos" :key="i" :style="{ visibility: i % cadaQuantos === 0 || i === pontos.length - 1 ? 'visible' : 'hidden' }">
        {{ p.rotulo }}
      </span>
    </div>
    <div v-if="sobre !== null" class="dica" :style="{ left: (coordenadas[sobre].x / LARGURA) * 100 + '%' }">
      <template v-if="pontos[sobre].valor === null || pontos[sobre].valor === undefined">sem respostas em {{ pontos[sobre].rotulo }}</template>
      <template v-else>
        <b>{{ pontos[sobre].valor }}{{ sufixo }}</b> em {{ pontos[sobre].rotulo }}
        <span v-if="pontos[sobre].total !== undefined"> · {{ pontos[sobre].total }} resp.</span>
      </template>
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

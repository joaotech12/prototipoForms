<script setup>
// Mapa de horários: em que dia da semana e hora chegam as respostas (quanto mais escuro, mais respostas)
import { DIAS_SEMANA } from '@/services/estatisticas';

defineProps({
  calor: { type: Object, required: true }, // resultado de mapaDeCalor()
  cor: { type: String, default: '#6d28d9' },
});

const HORAS = Array.from({ length: 24 }, (_, h) => h);
</script>

<template>
  <div class="mapa">
    <div class="grade">
      <span></span>
      <span v-for="h in HORAS" :key="h" class="hora">{{ h % 3 === 0 ? h + 'h' : '' }}</span>
      <span class="total-titulo">total</span>

      <template v-for="(horas, d) in calor.grade" :key="d">
        <span class="dia">{{ DIAS_SEMANA[d] }}</span>
        <span
          v-for="h in HORAS"
          :key="h"
          class="celula"
          :style="{ background: horas[h] ? cor : undefined, opacity: horas[h] ? 0.18 + (horas[h] / calor.maior) * 0.82 : 1 }"
          :title="`${DIAS_SEMANA[d]}, ${h}h às ${h + 1}h: ${horas[h]} resposta(s)`"
        ></span>
        <span class="total">{{ calor.porDia[d] }}</span>
      </template>
    </div>
    <p v-if="calor.melhor" class="pequeno"><b>⏰ Pico:</b> {{ calor.melhor }}. Envie o link perto desse horário para ter mais respostas.</p>
    <p v-else class="suave pequeno">Ainda sem respostas para mostrar os horários.</p>
  </div>
</template>

<style scoped>
.mapa { display: flex; flex-direction: column; gap: 10px; }
.grade { display: grid; grid-template-columns: 32px repeat(24, minmax(8px, 1fr)) 34px; gap: 3px; align-items: center; }
.hora { font-size: 0.65rem; color: var(--texto-suave); text-align: left; white-space: nowrap; overflow: visible; }
.dia, .total-titulo { font-size: 0.72rem; color: var(--texto-suave); font-weight: 600; }
.total-titulo { text-align: right; }
.celula { aspect-ratio: 1; border-radius: 3px; background: var(--fundo); min-height: 10px; transition: opacity 0.4s; }
.total { font-size: 0.75rem; text-align: right; font-weight: 600; font-variant-numeric: tabular-nums; }
</style>

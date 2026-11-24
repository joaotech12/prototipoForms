<script setup>
// Funil de abandono: de quem abriu o link, quantos responderam cada pergunta e quantos enviaram.
import { computed } from 'vue';

const props = defineProps({
  funil: { type: Object, required: true }, // resultado de calcularFunil()
  cor: { type: String, default: '#6d28d9' },
});

// Linhas do funil: "Abriram" → cada pergunta → "Enviaram", com a queda em relação à linha anterior
const linhas = computed(() => {
  const f = props.funil;
  const lista = [
    { chave: 'abriram', titulo: 'Abriram o link', valor: f.total, pct: 100, tipo: 'ponta' },
    ...f.etapas.map((e) => ({
      chave: e.pergunta.id,
      titulo: `${e.indice + 1}. ${e.pergunta.titulo}`,
      valor: e.alcancaram,
      pct: e.pct,
      condicional: e.condicional,
      opcional: !e.pergunta.obrigatoria,
    })),
    { chave: 'enviaram', titulo: 'Enviaram a resposta', valor: f.concluidas, pct: f.taxa ?? 0, tipo: 'ponta' },
  ];
  // A queda só faz sentido entre perguntas que todo mundo vê (as condicionais caem de propósito)
  let anterior = lista[0].valor;
  for (const l of lista.slice(1)) {
    if (!l.condicional) {
      l.queda = Math.max(0, anterior - l.valor);
      anterior = l.valor;
    }
  }
  const maiorQueda = Math.max(0, ...lista.map((l) => l.queda ?? 0));
  for (const l of lista) l.pior = maiorQueda > 0 && l.queda === maiorQueda;
  return lista;
});
</script>

<template>
  <div class="funil">
    <div v-if="!funil.total" class="vazio pequeno">
      O funil começa a contar a partir de agora: cada visita ao link público aparece aqui, mesmo se a pessoa desistir no meio.
    </div>
    <template v-else>
      <div class="resumo">
        <div><b>{{ funil.total }}</b><small>abriram</small></div>
        <div><b>{{ funil.concluidas }}</b><small>enviaram ({{ funil.taxa }}%)</small></div>
        <div><b class="ruim">{{ funil.incompletas }}</b><small>desistiram</small></div>
      </div>

      <div class="etapas">
        <div v-for="l in linhas" :key="l.chave" class="etapa" :class="{ ponta: l.tipo === 'ponta', pior: l.pior }">
          <div class="texto">
            <span class="titulo" :title="l.titulo">{{ l.titulo }}</span>
            <span v-if="l.condicional" class="marca" title="Só aparece para algumas pessoas (ramificação)">🔀</span>
            <span v-else-if="l.opcional && !l.tipo" class="marca" title="Pergunta opcional: nem todos respondem">opcional</span>
          </div>
          <div class="trilho">
            <div class="barra" :style="{ width: Math.max(l.pct, 1) + '%', background: l.pior ? '#ef4444' : cor }"></div>
          </div>
          <div class="numeros">
            <b>{{ l.valor }}</b> <small>{{ l.pct }}%</small>
            <span v-if="l.queda" class="queda" :title="`${l.queda} pessoa(s) a menos que na etapa anterior`">−{{ l.queda }}</span>
          </div>
        </div>
      </div>

      <div v-if="funil.abandonos.length" class="onde">
        <span class="rotulo">Onde quem desistiu parou</span>
        <ol>
          <li v-for="a in funil.abandonos.slice(0, 3)" :key="a.perguntaId">
            <b>{{ a.titulo }}</b>
            <span class="suave"> · {{ a.total }} pessoa(s), {{ a.pct }}% das visitas{{ a.semResponder ? ' (saíram sem responder nada)' : '' }}</span>
          </li>
        </ol>
      </div>
    </template>
  </div>
</template>

<style scoped>
.funil { display: flex; flex-direction: column; gap: 14px; }
.resumo { display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px; text-align: center; }
.resumo div { background: var(--fundo); border-radius: 10px; padding: 10px; }
.resumo b { display: block; font-size: 1.35rem; }
.resumo b.ruim { color: var(--vermelho); }
.resumo small { color: var(--texto-suave); font-size: 0.75rem; }
.etapas { display: flex; flex-direction: column; gap: 6px; }
.etapa { display: grid; grid-template-columns: minmax(120px, 38%) 1fr 96px; gap: 10px; align-items: center; font-size: 0.86rem; }
.etapa.ponta { font-weight: 700; }
.texto { display: flex; align-items: center; gap: 6px; min-width: 0; }
.titulo { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.marca { flex: none; font-size: 0.7rem; color: var(--texto-suave); background: var(--fundo); border-radius: 99px; padding: 1px 6px; }
.trilho { height: 14px; background: var(--fundo); border-radius: 4px; overflow: hidden; }
.barra { height: 100%; border-radius: 4px; transition: width 0.6s cubic-bezier(0.2, 0.8, 0.2, 1); }
.etapa.pior .titulo { color: var(--vermelho); }
.numeros { text-align: right; font-variant-numeric: tabular-nums; white-space: nowrap; }
.numeros small { color: var(--texto-suave); }
.queda { margin-left: 4px; color: var(--vermelho); font-size: 0.75rem; font-weight: 700; }
.onde ol { margin: 6px 0 0; padding-left: 20px; display: flex; flex-direction: column; gap: 4px; font-size: 0.88rem; }
</style>

<script setup>
// Cartão de uma pesquisa no Painel (modo "cartões")
import { computed } from 'vue';
import MenuPesquisa from './MenuPesquisa.vue';
import { plural, tempoRelativo } from '@/services/formato';
import { imagemSegura } from '@/services/tema';

const props = defineProps({
  pesquisa: { type: Object, required: true },
  pastas: { type: Array, default: () => [] },
  selecionada: { type: Boolean, default: false },
  emSelecao: { type: Boolean, default: false }, // há alguma selecionada: mostra as caixinhas sempre
});
const emit = defineEmits(['selecionar', 'acao', 'copiar', 'etiqueta', 'arrastar']);

const f = computed(() => props.pesquisa);
const pasta = computed(() => props.pastas.find((p) => p.id === f.value.pastaId));
const capa = computed(() => imagemSegura(f.value.tema?.capa));
const taxa = computed(() =>
  f.value.visualizacoes ? Math.min(100, Math.round((f.value.totalRespostas / f.value.visualizacoes) * 100)) : null,
);
</script>

<template>
  <article
    class="cartao pesquisa"
    :class="{ selecionada, 'em-selecao': emSelecao, arquivada: f.arquivado }"
    :style="{ '--cor': f.tema?.corPrimaria || '#6d28d9' }"
    draggable="true"
    @dragstart="emit('arrastar', $event)"
  >
    <div v-if="capa" class="capa-cartao" :style="{ backgroundImage: `url(&quot;${capa}&quot;)` }"></div>
    <div v-else class="faixa"></div>

    <div class="linha topo-cartao">
      <label class="selecao" title="Selecionar" @click.stop>
        <input type="checkbox" :checked="selecionada" @click="emit('selecionar', $event)" />
      </label>
      <button class="estrela" :class="{ ligada: f.favorito }" :title="f.favorito ? 'Tirar dos favoritos' : 'Favoritar'" @click="emit('acao', f.favorito ? 'desfavoritar' : 'favoritar')">
        {{ f.favorito ? '★' : '☆' }}
      </button>
      <span v-if="f.arquivado" class="etiqueta">🗄 Arquivada</span>
      <span v-else class="etiqueta" :class="f.ativo ? 'verde' : 'vermelha'">{{ f.ativo ? '● Ativa' : 'Encerrada' }}</span>
      <span class="etiqueta">{{ f.modo === 'conversacional' ? 'Conversacional' : 'Clássico' }}</span>
      <span class="espaco"></span>
      <MenuPesquisa :pesquisa="f" :pastas="pastas" @acao="(a, extra) => emit('acao', a, extra)" />
    </div>

    <RouterLink :to="`/formularios/${f.id}/editar`" class="titulo-pesquisa" draggable="false">{{ f.titulo }}</RouterLink>
    <p class="suave pequeno">
      {{ plural(f.perguntas.length, 'pergunta', 'perguntas') }} · última resposta {{ tempoRelativo(f.ultimaResposta) }}
    </p>

    <div v-if="pasta || f.etiquetas?.length" class="organizacao">
      <span v-if="pasta" class="pasta-nome"><i :style="{ background: pasta.cor }"></i>{{ pasta.nome }}</span>
      <button v-for="e in f.etiquetas" :key="e" class="chip-mini" title="Filtrar por esta etiqueta" @click="emit('etiqueta', e)">#{{ e }}</button>
    </div>

    <div class="numeros">
      <div><strong>{{ f.totalRespostas }}</strong><small>respostas</small></div>
      <div><strong>{{ f.visualizacoes }}</strong><small>visualizações</small></div>
      <div><strong>{{ taxa === null ? '—' : taxa + '%' }}</strong><small>conclusão</small></div>
    </div>

    <div class="linha acoes">
      <RouterLink :to="`/formularios/${f.id}/dashboard`" class="botao pequeno primario" draggable="false">📊 Dashboard</RouterLink>
      <RouterLink :to="`/formularios/${f.id}/editar`" class="botao pequeno" draggable="false">✎ Editar</RouterLink>
      <button class="botao pequeno" @click="emit('copiar')">🔗 Copiar link</button>
    </div>
  </article>
</template>

<style scoped>
.pesquisa { position: relative; display: flex; flex-direction: column; gap: 10px; overflow: visible; padding-top: 22px; transition: transform 0.15s, box-shadow 0.15s, border-color 0.15s; cursor: grab; }
.pesquisa:active { cursor: grabbing; }
.pesquisa:hover { transform: translateY(-2px); box-shadow: var(--sombra-forte); }
.pesquisa.selecionada { border-color: var(--primaria); box-shadow: 0 0 0 3px var(--primaria-suave); }
.pesquisa.arquivada { opacity: 0.75; }
.faixa { position: absolute; inset: 0 0 auto 0; height: 5px; background: var(--cor); border-radius: var(--raio) var(--raio) 0 0; }
.capa-cartao { margin: -22px -20px 4px; height: 70px; background-size: cover; background-position: center; border-radius: var(--raio) var(--raio) 0 0; }
.topo-cartao { gap: 6px; }
.selecao { display: none; align-items: center; cursor: pointer; }
.selecao input { width: 17px; height: 17px; cursor: pointer; }
.pesquisa:hover .selecao, .em-selecao .selecao { display: inline-flex; }
.estrela { border: 0; background: none; font-size: 1.2rem; line-height: 1; cursor: pointer; color: #d1d5db; padding: 0 2px; transition: transform 0.15s, color 0.15s; }
.estrela:hover { transform: scale(1.2); color: #f59e0b; }
.estrela.ligada { color: #f59e0b; }
.titulo-pesquisa { font-size: 1.1rem; font-weight: 700; color: var(--texto); text-decoration: none; line-height: 1.3; }
.titulo-pesquisa:hover { color: var(--primaria); }
.organizacao { display: flex; flex-wrap: wrap; gap: 5px; align-items: center; }
.pasta-nome { display: inline-flex; align-items: center; gap: 5px; font-size: 0.78rem; font-weight: 600; color: var(--texto-suave); margin-right: 4px; }
.pasta-nome i { width: 9px; height: 9px; border-radius: 3px; }
.chip-mini { border: 0; background: var(--fundo); color: var(--texto-suave); border-radius: 99px; padding: 2px 8px; font: inherit; font-size: 0.75rem; cursor: pointer; }
.chip-mini:hover { background: var(--primaria-suave); color: var(--primaria); }
.numeros { display: grid; grid-template-columns: repeat(3, 1fr); background: var(--fundo); border-radius: 10px; padding: 10px; text-align: center; }
.numeros strong { display: block; font-size: 1.25rem; }
.numeros small { color: var(--texto-suave); font-size: 0.75rem; }
.acoes { margin-top: auto; }
</style>

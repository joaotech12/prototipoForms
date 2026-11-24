<script setup>
// Barra lateral do Painel: seções (Todas, Favoritas, Sem pasta, Arquivadas), pastas e etiquetas.
// Dá para soltar pesquisas arrastadas em cima de uma pasta, de "Favoritas" ou de "Arquivadas".
import { computed, nextTick, ref } from 'vue';
import { CORES_PASTA } from '@/services/tipos';

const props = defineProps({
  pesquisas: { type: Array, required: true },
  pastas: { type: Array, required: true },
  secao: { type: String, required: true }, // 'todas' | 'favoritas' | 'sem-pasta' | 'arquivadas' | 'pasta-<id>'
  etiqueta: { type: String, default: '' },
});
const emit = defineEmits(['update:secao', 'update:etiqueta', 'criar', 'renomear', 'excluir', 'soltar']);

const criando = ref(false);
const nomeNova = ref('');
const corNova = ref(CORES_PASTA[0]);
const editando = ref(null); // id da pasta em edição
const nomeEdicao = ref('');
const corEdicao = ref('');
const alvoSoltar = ref('');

const naoArquivadas = computed(() => props.pesquisas.filter((p) => !p.arquivado));
const contagem = computed(() => ({
  todas: naoArquivadas.value.length,
  favoritas: naoArquivadas.value.filter((p) => p.favorito).length,
  'sem-pasta': naoArquivadas.value.filter((p) => !p.pastaId).length,
  arquivadas: props.pesquisas.filter((p) => p.arquivado).length,
}));
const totalDaPasta = (id) => naoArquivadas.value.filter((p) => p.pastaId === id).length;

// Etiquetas usadas, das mais frequentes para as menos
const etiquetas = computed(() => {
  const mapa = new Map();
  for (const p of naoArquivadas.value) for (const e of p.etiquetas ?? []) mapa.set(e, (mapa.get(e) ?? 0) + 1);
  return [...mapa.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));
});

const SECOES = [
  { chave: 'todas', icone: '📋', nome: 'Todas' },
  { chave: 'favoritas', icone: '⭐', nome: 'Favoritas' },
  { chave: 'sem-pasta', icone: '📄', nome: 'Sem pasta' },
];

async function abrirCriacao() {
  criando.value = true;
  corNova.value = CORES_PASTA[props.pastas.length % CORES_PASTA.length];
  await nextTick();
  document.getElementById('nova-pasta')?.focus();
}
function confirmarCriacao() {
  if (nomeNova.value.trim()) emit('criar', nomeNova.value.trim(), corNova.value);
  nomeNova.value = '';
  criando.value = false;
}
async function abrirEdicao(pasta) {
  editando.value = pasta.id;
  nomeEdicao.value = pasta.nome;
  corEdicao.value = pasta.cor;
  await nextTick();
  document.getElementById(`editar-pasta-${pasta.id}`)?.focus();
}
function confirmarEdicao(pasta) {
  if (nomeEdicao.value.trim()) emit('renomear', pasta, nomeEdicao.value.trim(), corEdicao.value);
  editando.value = null;
}

// ----- Soltar pesquisas arrastadas -----
function soltar(evento, destino) {
  alvoSoltar.value = '';
  try {
    const ids = JSON.parse(evento.dataTransfer.getData('application/x-pesquisas') || '[]');
    if (ids.length) emit('soltar', destino, ids);
  } catch {
    /* arrastou outra coisa: ignora */
  }
}
const aceitaSoltar = (destino) => ({
  dragover: (e) => {
    if (!e.dataTransfer.types.includes('application/x-pesquisas')) return;
    e.preventDefault();
    alvoSoltar.value = destino;
  },
  dragleave: () => {
    if (alvoSoltar.value === destino) alvoSoltar.value = '';
  },
  drop: (e) => soltar(e, destino),
});
</script>

<template>
  <aside class="lateral">
    <nav class="grupo">
      <button
        v-for="s in SECOES"
        :key="s.chave"
        class="item"
        :class="{ ativo: secao === s.chave, alvo: alvoSoltar === s.chave }"
        v-on="s.chave === 'todas' ? {} : aceitaSoltar(s.chave)"
        @click="emit('update:secao', s.chave)"
      >
        <span>{{ s.icone }}</span>{{ s.nome }}<small>{{ contagem[s.chave] }}</small>
      </button>
    </nav>

    <div class="grupo">
      <div class="titulo-grupo">
        <span>Pastas</span>
        <button class="botao fantasma icone pequeno" title="Nova pasta" @click="abrirCriacao">+</button>
      </div>

      <div
        v-for="p in pastas"
        :key="p.id"
        class="item pasta"
        :class="{ ativo: secao === `pasta-${p.id}`, alvo: alvoSoltar === `pasta-${p.id}` }"
        v-on="aceitaSoltar(`pasta-${p.id}`)"
        @click="editando !== p.id && emit('update:secao', `pasta-${p.id}`)"
      >
        <template v-if="editando === p.id">
          <div class="edicao" @click.stop>
            <input :id="`editar-pasta-${p.id}`" v-model="nomeEdicao" maxlength="60" @keydown.enter="confirmarEdicao(p)" @keydown.esc="editando = null" />
            <div class="cores">
              <button v-for="c in CORES_PASTA" :key="c" class="cor" :class="{ marcada: corEdicao === c }" :style="{ background: c }" @click="corEdicao = c"></button>
            </div>
            <div class="linha">
              <button class="botao pequeno primario" @click="confirmarEdicao(p)">Salvar</button>
              <button class="botao pequeno" @click="editando = null">Cancelar</button>
              <span class="espaco"></span>
              <button class="botao pequeno fantasma perigo" title="Excluir pasta" @click="editando = null; emit('excluir', p)">🗑</button>
            </div>
          </div>
        </template>
        <template v-else>
          <i class="ponto" :style="{ background: p.cor }"></i>
          <span class="nome">{{ p.nome }}</span>
          <button class="editar" title="Renomear, mudar cor ou excluir" @click.stop="abrirEdicao(p)">✎</button>
          <small>{{ totalDaPasta(p.id) }}</small>
        </template>
      </div>

      <div v-if="criando" class="edicao">
        <input id="nova-pasta" v-model="nomeNova" maxlength="60" placeholder="Nome da pasta" @keydown.enter="confirmarCriacao" @keydown.esc="criando = false" />
        <div class="cores">
          <button v-for="c in CORES_PASTA" :key="c" class="cor" :class="{ marcada: corNova === c }" :style="{ background: c }" @click="corNova = c"></button>
        </div>
        <div class="linha">
          <button class="botao pequeno primario" @click="confirmarCriacao">Criar</button>
          <button class="botao pequeno" @click="criando = false">Cancelar</button>
        </div>
      </div>
      <p v-else-if="!pastas.length" class="suave pequeno dica">Crie pastas para separar as pesquisas por área, cliente ou projeto.</p>
    </div>

    <div class="grupo">
      <button
        class="item"
        :class="{ ativo: secao === 'arquivadas', alvo: alvoSoltar === 'arquivadas' }"
        v-on="aceitaSoltar('arquivadas')"
        @click="emit('update:secao', 'arquivadas')"
      >
        <span>🗄</span>Arquivadas<small>{{ contagem.arquivadas }}</small>
      </button>
    </div>

    <div v-if="etiquetas.length" class="grupo">
      <div class="titulo-grupo"><span>Etiquetas</span></div>
      <div class="nuvem">
        <button
          v-for="[e, qtd] in etiquetas"
          :key="e"
          class="etiqueta-filtro"
          :class="{ ativa: etiqueta === e }"
          @click="emit('update:etiqueta', etiqueta === e ? '' : e)"
        >
          #{{ e }} <small>{{ qtd }}</small>
        </button>
      </div>
    </div>

    <p class="suave pequeno dica">Dica: arraste uma pesquisa até uma pasta para movê-la.</p>
  </aside>
</template>

<style scoped>
.lateral { display: flex; flex-direction: column; gap: 18px; position: sticky; top: 76px; max-height: calc(100vh - 96px); overflow-y: auto; padding-right: 4px; }
.grupo { display: flex; flex-direction: column; gap: 2px; }
.titulo-grupo { display: flex; align-items: center; justify-content: space-between; font-size: 0.75rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.04em; color: var(--texto-suave); padding: 0 6px 4px 10px; }
.item {
  display: flex; align-items: center; gap: 9px; width: 100%; padding: 8px 10px; border-radius: 8px; border: 2px solid transparent;
  background: none; font: inherit; font-size: 0.9rem; color: var(--texto); cursor: pointer; text-align: left;
}
.item:hover { background: #ffffffb3; }
.item.ativo { background: var(--primaria-suave); color: var(--primaria); font-weight: 600; }
.item.alvo { border-color: var(--primaria); border-style: dashed; background: var(--primaria-suave); }
.item small { margin-left: auto; color: var(--texto-suave); font-size: 0.78rem; font-weight: 500; }
.pasta .nome { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.pasta .editar { border: 0; background: none; cursor: pointer; opacity: 0; color: var(--texto-suave); padding: 0 2px; margin-left: auto; }
.pasta .editar + small { margin-left: 4px; }
.pasta:hover .editar { opacity: 1; }
.ponto { width: 10px; height: 10px; border-radius: 3px; flex: none; }
.edicao { display: flex; flex-direction: column; gap: 8px; padding: 8px; background: #fff; border: 1px solid var(--borda); border-radius: 10px; width: 100%; cursor: default; }
.edicao input { padding: 7px 9px; }
.cores { display: flex; gap: 5px; flex-wrap: wrap; }
.cor { width: 20px; height: 20px; border-radius: 50%; border: 2px solid #fff; box-shadow: 0 0 0 1px var(--borda); cursor: pointer; padding: 0; }
.cor.marcada { box-shadow: 0 0 0 2px var(--texto); }
.nuvem { display: flex; flex-wrap: wrap; gap: 5px; padding: 0 6px; }
.etiqueta-filtro { border: 1px solid var(--borda); background: #fff; border-radius: 99px; padding: 3px 9px; font: inherit; font-size: 0.8rem; color: var(--texto-suave); cursor: pointer; }
.etiqueta-filtro.ativa { background: var(--primaria); border-color: var(--primaria); color: #fff; }
.etiqueta-filtro small { opacity: 0.7; }
.dica { padding: 0 10px; line-height: 1.4; }
</style>

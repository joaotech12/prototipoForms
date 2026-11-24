<script setup>
// Painel: o lugar onde a empresa gerencia todas as pesquisas.
// Pastas, etiquetas, favoritos, arquivo, busca, filtros, visão em cartões ou lista,
// seleção múltipla (com Shift) e ações em lote. Atualiza sozinho a cada 30 s.
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import BarraLateralPainel from '@/components/BarraLateralPainel.vue';
import CartaoPesquisa from '@/components/CartaoPesquisa.vue';
import EditorEtiquetas from '@/components/EditorEtiquetas.vue';
import MenuPesquisa from '@/components/MenuPesquisa.vue';
import {
  acaoEmLote,
  alterarPasta,
  criarPasta,
  duplicarFormulario,
  excluirPasta,
  linkPublico,
  listarFormularios,
  listarPastas,
} from '@/services/api';
import { avisar, avisarErro } from '@/services/avisos';
import { plural, tempoRelativo } from '@/services/formato';
import { MODELOS } from '@/services/modelos';
import { limparEtiqueta } from '@/services/tipos';

const rota = useRoute();
const router = useRouter();

const pesquisas = ref([]);
const pastas = ref([]);
const carregando = ref(true);
const erro = ref('');
const busca = ref('');
const status = ref('todas');
const ordem = ref('recentes');
const visao = ref(lerPreferencia('painel-visao', 'cartoes'));
const secao = ref(String(rota.query.secao || 'todas'));
const etiqueta = ref(String(rota.query.etiqueta || ''));
const selecionadas = ref(new Set());
const ultimaClicada = ref(null);
const organizandoId = ref(null);
// Busca pelo id: depois de recarregar a lista, os objetos mudam, mas o id não
const organizando = computed(() => pesquisas.value.find((f) => f.id === organizandoId.value) ?? null);
const etiquetaLote = ref('');
let relogio = null;

// ---------- Preferências do navegador (visão em cartões ou lista) ----------
function lerPreferencia(chave, padrao) {
  try {
    return localStorage.getItem(chave) || padrao;
  } catch {
    return padrao;
  }
}
watch(visao, (v) => {
  try {
    localStorage.setItem('painel-visao', v);
  } catch {
    /* sem localStorage */
  }
});

// A seção e a etiqueta ficam no endereço (?secao=pasta-3): dá para voltar e compartilhar
watch([secao, etiqueta], () => {
  selecionadas.value = new Set();
  const query = {};
  if (secao.value !== 'todas') query.secao = secao.value;
  if (etiqueta.value) query.etiqueta = etiqueta.value;
  router.replace({ query });
});

// ---------- Carregar ----------
async function carregar(silencioso = false) {
  if (!silencioso) carregando.value = true;
  try {
    const [lista, listaPastas] = await Promise.all([listarFormularios(), listarPastas()]);
    pesquisas.value = lista;
    pastas.value = listaPastas;
    erro.value = '';
    // Seleção: tira o que não existe mais
    selecionadas.value = new Set([...selecionadas.value].filter((id) => lista.some((p) => p.id === id)));
  } catch (e) {
    if (!silencioso) erro.value = e.message;
  } finally {
    carregando.value = false;
  }
}

// ---------- Filtros ----------
const pastaAtual = computed(() =>
  secao.value.startsWith('pasta-') ? pastas.value.find((p) => `pasta-${p.id}` === secao.value) ?? null : null,
);
const tituloSecao = computed(() => {
  if (pastaAtual.value) return pastaAtual.value.nome;
  return { todas: 'Todas as pesquisas', favoritas: 'Favoritas', 'sem-pasta': 'Sem pasta', arquivadas: 'Arquivadas' }[secao.value] ?? 'Pesquisas';
});
const nomeDaPasta = (id) => pastas.value.find((p) => p.id === id);
const taxa = (f) => (f.visualizacoes ? Math.min(100, Math.round((f.totalRespostas / f.visualizacoes) * 100)) : null);

const filtradas = computed(() => {
  const termo = busca.value.trim().toLowerCase();
  const lista = pesquisas.value.filter((f) => {
    if (secao.value === 'arquivadas' ? !f.arquivado : f.arquivado) return false;
    if (secao.value === 'favoritas' && !f.favorito) return false;
    if (secao.value === 'sem-pasta' && f.pastaId) return false;
    if (pastaAtual.value && f.pastaId !== pastaAtual.value.id) return false;
    if (status.value === 'ativas' && !f.ativo) return false;
    if (status.value === 'encerradas' && f.ativo) return false;
    if (etiqueta.value && !(f.etiquetas ?? []).includes(etiqueta.value)) return false;
    if (!termo) return true;
    const pasta = nomeDaPasta(f.pastaId)?.nome ?? '';
    return [f.titulo, f.descricao ?? '', pasta, ...(f.etiquetas ?? [])].some((t) => t.toLowerCase().includes(termo));
  });
  const ordens = {
    recentes: (a, b) => new Date(b.atualizadoEm) - new Date(a.atualizadoEm),
    respostas: (a, b) => b.totalRespostas - a.totalRespostas,
    titulo: (a, b) => a.titulo.localeCompare(b.titulo),
    ultima: (a, b) => new Date(b.ultimaResposta ?? 0) - new Date(a.ultimaResposta ?? 0),
    conclusao: (a, b) => (taxa(b) ?? -1) - (taxa(a) ?? -1),
  };
  // Favoritas sempre primeiro
  return [...lista].sort((a, b) => Number(b.favorito) - Number(a.favorito) || ordens[ordem.value](a, b));
});

const totais = computed(() => {
  const lista = pesquisas.value.filter((f) => !f.arquivado);
  const respostas = lista.reduce((s, f) => s + f.totalRespostas, 0);
  const visualizacoes = lista.reduce((s, f) => s + f.visualizacoes, 0);
  const semana = lista.filter((f) => f.ultimaResposta && Date.now() - new Date(f.ultimaResposta) < 7 * 86400000).length;
  return {
    pesquisas: lista.length,
    ativas: lista.filter((f) => f.ativo).length,
    respostas,
    semana,
    taxa: visualizacoes ? Math.min(100, Math.round((respostas / visualizacoes) * 100)) : null,
  };
});

const todasEtiquetas = computed(() => [...new Set(pesquisas.value.flatMap((p) => p.etiquetas ?? []))].sort());
const linkNovo = computed(() => (pastaAtual.value ? { path: '/formularios/novo', query: { pasta: pastaAtual.value.id } } : '/formularios/novo'));
const linkModelo = (chave) => ({ path: '/formularios/novo', query: { modelo: chave, ...(pastaAtual.value ? { pasta: pastaAtual.value.id } : {}) } });

// ---------- Seleção (clique, Shift + clique, selecionar todas) ----------
function selecionar(f, evento) {
  const nova = new Set(selecionadas.value);
  const marcar = !nova.has(f.id);
  if (evento?.shiftKey && ultimaClicada.value !== null) {
    // Shift: marca tudo entre a última clicada e esta
    const ids = filtradas.value.map((p) => p.id);
    const [a, b] = [ids.indexOf(ultimaClicada.value), ids.indexOf(f.id)].sort((x, y) => x - y);
    if (a >= 0) ids.slice(a, b + 1).forEach((id) => (marcar ? nova.add(id) : nova.delete(id)));
  } else if (marcar) nova.add(f.id);
  else nova.delete(f.id);
  ultimaClicada.value = f.id;
  selecionadas.value = nova;
}
const todasMarcadas = computed(() => filtradas.value.length > 0 && filtradas.value.every((f) => selecionadas.value.has(f.id)));
function alternarTodas() {
  selecionadas.value = todasMarcadas.value ? new Set() : new Set(filtradas.value.map((f) => f.id));
}
const limparSelecao = () => (selecionadas.value = new Set());

// ---------- Ações (de uma pesquisa ou em lote) ----------
const MENSAGENS = {
  arquivar: 'arquivada(s): saíram da lista, mas nada foi apagado',
  desarquivar: 'desarquivada(s)',
  favoritar: 'nos favoritos',
  desfavoritar: 'fora dos favoritos',
  encerrar: 'encerrada(s): o link não aceita mais respostas',
  reabrir: 'reaberta(s)',
  etiquetar: 'com a etiqueta nova',
  desetiquetar: 'sem a etiqueta',
  excluir: 'excluída(s)',
};

// Muda na tela na hora (resposta rápida) e depois confirma com a API
function aplicarNaTela(ids, acao, extra) {
  const alvo = (f) => ids.includes(f.id);
  if (acao === 'excluir') {
    pesquisas.value = pesquisas.value.filter((f) => !alvo(f));
    return;
  }
  for (const f of pesquisas.value.filter(alvo)) {
    if (acao === 'mover') f.pastaId = extra.pastaId;
    if (acao === 'arquivar' || acao === 'desarquivar') f.arquivado = acao === 'arquivar';
    if (acao === 'favoritar' || acao === 'desfavoritar') f.favorito = acao === 'favoritar';
    if (acao === 'encerrar' || acao === 'reabrir') f.ativo = acao === 'reabrir';
    if (acao === 'etiquetar' && !f.etiquetas.includes(extra.etiqueta)) f.etiquetas = [...f.etiquetas, extra.etiqueta];
    if (acao === 'desetiquetar') f.etiquetas = f.etiquetas.filter((e) => e !== extra.etiqueta);
  }
}

async function executar(ids, acao, extra = {}) {
  if (!ids.length) return;
  if (acao === 'excluir') {
    const respostas = pesquisas.value.filter((f) => ids.includes(f.id)).reduce((s, f) => s + f.totalRespostas, 0);
    const texto = ids.length === 1 ? `Excluir "${pesquisas.value.find((f) => f.id === ids[0])?.titulo}"` : `Excluir ${ids.length} pesquisas`;
    if (!window.confirm(`${texto}${respostas ? ` e ${respostas} resposta(s)` : ''}? Isso não pode ser desfeito.\n\nDica: "Arquivar" tira da lista sem apagar.`)) return;
  }
  aplicarNaTela(ids, acao, extra);
  if (['arquivar', 'desarquivar', 'excluir'].includes(acao)) limparSelecao();
  try {
    await acaoEmLote(ids, acao, extra);
    const quantas = ids.length === 1 ? 'Pesquisa' : `${ids.length} pesquisas`;
    if (acao === 'mover') {
      const destino = extra.pastaId ? `para "${nomeDaPasta(extra.pastaId)?.nome}"` : 'para "Sem pasta"';
      avisar(`${quantas} movida(s) ${destino}`);
    } else avisar(`${quantas} ${MENSAGENS[acao]}`);
  } catch (e) {
    avisarErro(e);
  }
  carregar(true);
}

async function acaoDoMenu(f, acao, extra) {
  if (acao === 'duplicar') {
    try {
      await duplicarFormulario(f.id);
      avisar('Pesquisa duplicada');
      carregar(true);
    } catch (e) {
      avisarErro(e);
    }
  } else if (acao === 'organizar') {
    organizandoId.value = f.id;
  } else if (acao === 'mover') {
    executar([f.id], 'mover', { pastaId: extra });
  } else {
    executar([f.id], acao);
  }
}

function etiquetarLote(remover = false) {
  const e = limparEtiqueta(etiquetaLote.value);
  if (!e) return avisar('Digite a etiqueta', 'erro');
  executar([...selecionadas.value], remover ? 'desetiquetar' : 'etiquetar', { etiqueta: e });
  etiquetaLote.value = '';
}

function moverLote(evento) {
  const valor = evento.target.value;
  evento.target.value = '';
  if (valor === '') return;
  executar([...selecionadas.value], 'mover', { pastaId: valor === 'nenhuma' ? null : Number(valor) });
}

// ---------- Arrastar para a barra lateral ----------
function arrastar(evento, f) {
  const ids = selecionadas.value.has(f.id) ? [...selecionadas.value] : [f.id];
  evento.dataTransfer.setData('application/x-pesquisas', JSON.stringify(ids));
  evento.dataTransfer.setData('text/plain', plural(ids.length, 'pesquisa', 'pesquisas'));
  evento.dataTransfer.effectAllowed = 'move';
}
function soltar(destino, ids) {
  if (destino === 'favoritas') executar(ids, 'favoritar');
  else if (destino === 'arquivadas') executar(ids, 'arquivar');
  else if (destino === 'sem-pasta') executar(ids, 'mover', { pastaId: null });
  else if (destino.startsWith('pasta-')) executar(ids, 'mover', { pastaId: Number(destino.slice(6)) });
}

// ---------- Pastas ----------
async function novaPasta(nome, cor) {
  try {
    const pasta = await criarPasta(nome, cor);
    pastas.value = [...pastas.value, pasta].sort((a, b) => a.nome.localeCompare(b.nome));
    avisar(`Pasta "${nome}" criada. Arraste pesquisas para ela.`);
  } catch (e) {
    avisarErro(e);
  }
}
async function renomearPasta(pasta, nome, cor) {
  try {
    Object.assign(pasta, await alterarPasta(pasta.id, nome, cor));
    avisar('Pasta atualizada');
  } catch (e) {
    avisarErro(e);
  }
}
async function apagarPasta(pasta) {
  const qtd = pesquisas.value.filter((f) => f.pastaId === pasta.id).length;
  if (!window.confirm(`Excluir a pasta "${pasta.nome}"?${qtd ? `\nAs ${qtd} pesquisa(s) dela NÃO são apagadas: ficam em "Sem pasta".` : ''}`)) return;
  try {
    await excluirPasta(pasta.id);
    pastas.value = pastas.value.filter((p) => p.id !== pasta.id);
    pesquisas.value.forEach((f) => f.pastaId === pasta.id && (f.pastaId = null));
    if (secao.value === `pasta-${pasta.id}`) secao.value = 'todas';
    avisar('Pasta excluída');
  } catch (e) {
    avisarErro(e);
  }
}

// ---------- Outros ----------
async function copiarLink(f) {
  const link = linkPublico(f.id);
  try {
    await navigator.clipboard.writeText(link);
    avisar('Link copiado! Agora é só enviar.');
  } catch {
    window.prompt('Copie o link:', link);
  }
}

function teclado(e) {
  const digitando = ['INPUT', 'TEXTAREA', 'SELECT'].includes(e.target.tagName);
  if (e.key === 'Escape') {
    organizandoId.value = null;
    limparSelecao();
  } else if (!digitando && (e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'a') {
    e.preventDefault();
    selecionadas.value = new Set(filtradas.value.map((f) => f.id));
  }
}

onMounted(() => {
  carregar();
  relogio = setInterval(() => carregar(true), 30000);
  window.addEventListener('keydown', teclado);
});
onBeforeUnmount(() => {
  clearInterval(relogio);
  window.removeEventListener('keydown', teclado);
});
</script>

<template>
  <main class="pagina painel">
    <BarraLateralPainel
      v-model:secao="secao"
      v-model:etiqueta="etiqueta"
      :pesquisas="pesquisas"
      :pastas="pastas"
      @criar="novaPasta"
      @renomear="renomearPasta"
      @excluir="apagarPasta"
      @soltar="soltar"
    />

    <section class="conteudo">
      <div class="cabecalho">
        <div>
          <h1>
            <i v-if="pastaAtual" class="ponto-titulo" :style="{ background: pastaAtual.cor }"></i>{{ tituloSecao }}
            <span v-if="etiqueta" class="etiqueta roxa filtro-ativo">#{{ etiqueta }} <button @click="etiqueta = ''">×</button></span>
          </h1>
          <p class="suave">
            {{ secao === 'arquivadas' ? 'Pesquisas guardadas: não aparecem nas outras listas, mas nada foi apagado.' : 'Crie, envie o link e acompanhe as respostas em tempo real.' }}
          </p>
        </div>
        <RouterLink :to="linkNovo" class="botao primario">+ Nova pesquisa{{ pastaAtual ? ' aqui' : '' }}</RouterLink>
      </div>

      <section v-if="secao === 'todas' && !etiqueta" class="kpis">
        <div class="kpi"><span class="rotulo">Pesquisas</span><strong>{{ totais.pesquisas }}</strong><small>{{ totais.ativas }} recebendo respostas</small></div>
        <div class="kpi"><span class="rotulo">Respostas</span><strong>{{ totais.respostas }}</strong><small>somando todas as pesquisas</small></div>
        <div class="kpi"><span class="rotulo">Movimentadas</span><strong>{{ totais.semana }}</strong><small>receberam resposta nos últimos 7 dias</small></div>
        <div class="kpi"><span class="rotulo">Taxa de conclusão</span><strong>{{ totais.taxa === null ? '—' : totais.taxa + '%' }}</strong><small>respostas ÷ vezes que o link foi aberto</small></div>
      </section>

      <details v-if="secao !== 'arquivadas'" class="modelos" :open="!carregando && !pesquisas.length">
        <summary><b>✨ Começar com um modelo</b> <span class="suave pequeno">NPS, atendimento, evento, clima, captação...</span></summary>
        <div class="modelos-lista">
          <RouterLink :to="linkNovo" class="modelo">
            <span class="modelo-icone">+</span>
            <b>Em branco</b>
            <small>Comece do zero</small>
          </RouterLink>
          <RouterLink v-for="m in MODELOS" :key="m.chave" :to="linkModelo(m.chave)" class="modelo">
            <span class="modelo-icone">{{ m.icone }}</span>
            <b>{{ m.nome }}</b>
            <small>{{ m.resumo }}</small>
          </RouterLink>
        </div>
      </details>

      <div class="linha filtros">
        <input v-model="busca" class="busca" type="search" placeholder="🔍 Buscar por título, pasta ou etiqueta..." />
        <div class="chips">
          <button v-for="s in ['todas', 'ativas', 'encerradas']" :key="s" class="chip" :class="{ ativo: status === s }" @click="status = s">
            {{ s[0].toUpperCase() + s.slice(1) }}
          </button>
        </div>
        <span class="espaco"></span>
        <select v-model="ordem" style="width: auto">
          <option value="recentes">Editadas recentemente</option>
          <option value="ultima">Última resposta</option>
          <option value="respostas">Mais respostas</option>
          <option value="conclusao">Maior conclusão</option>
          <option value="titulo">Título (A-Z)</option>
        </select>
        <div class="chips alternar-visao">
          <button class="chip" :class="{ ativo: visao === 'cartoes' }" title="Cartões" @click="visao = 'cartoes'">▦</button>
          <button class="chip" :class="{ ativo: visao === 'lista' }" title="Lista" @click="visao = 'lista'">☰</button>
        </div>
      </div>

      <div v-if="filtradas.length && !carregando" class="linha selecao-geral">
        <label class="linha pequeno">
          <input type="checkbox" :checked="todasMarcadas" @change="alternarTodas" />
          Selecionar as {{ filtradas.length }} visíveis
        </label>
        <span class="suave pequeno">· Shift + clique marca várias de uma vez · Ctrl + A seleciona tudo · Esc limpa</span>
      </div>

      <div v-if="carregando" class="grade-pesquisas">
        <div v-for="n in 3" :key="n" class="esqueleto" style="height: 210px"></div>
      </div>

      <div v-else-if="erro" class="cartao vazio">
        <div class="grande">⚠</div>
        <p>{{ erro }}</p>
        <button class="botao" style="margin-top: 14px" @click="carregar()">Tentar de novo</button>
      </div>

      <div v-else-if="!pesquisas.length" class="cartao vazio">
        <div class="grande">📋</div>
        <h2>Nenhuma pesquisa ainda</h2>
        <p style="margin: 8px 0 16px">Escolha um modelo acima ou comece em branco.</p>
        <RouterLink to="/formularios/novo" class="botao primario">Criar a primeira pesquisa</RouterLink>
      </div>

      <div v-else-if="!filtradas.length" class="cartao vazio">
        <div class="grande">{{ secao === 'arquivadas' ? '🗄' : pastaAtual ? '📁' : '🔍' }}</div>
        <p v-if="pastaAtual && !busca && !etiqueta">Pasta vazia. Arraste pesquisas da lista para cá, ou crie uma nova aqui dentro.</p>
        <p v-else-if="secao === 'arquivadas'">Nada arquivado.</p>
        <p v-else>Nenhuma pesquisa encontrada com esses filtros.</p>
      </div>

      <!-- Cartões -->
      <TransitionGroup v-else-if="visao === 'cartoes'" tag="div" name="cartoes" class="grade-pesquisas">
        <CartaoPesquisa
          v-for="f in filtradas"
          :key="f.id"
          :pesquisa="f"
          :pastas="pastas"
          :selecionada="selecionadas.has(f.id)"
          :em-selecao="selecionadas.size > 0"
          @selecionar="selecionar(f, $event)"
          @acao="(a, extra) => acaoDoMenu(f, a, extra)"
          @copiar="copiarLink(f)"
          @etiqueta="etiqueta = $event"
          @arrastar="arrastar($event, f)"
        />
      </TransitionGroup>

      <!-- Lista -->
      <div v-else class="tabela-rolagem lista">
        <table>
          <thead>
            <tr>
              <th style="width: 34px"><input type="checkbox" :checked="todasMarcadas" @change="alternarTodas" /></th>
              <th style="width: 30px"></th>
              <th>Pesquisa</th>
              <th>Pasta</th>
              <th>Situação</th>
              <th style="text-align: right">Respostas</th>
              <th style="text-align: right">Conclusão</th>
              <th>Última resposta</th>
              <th></th>
            </tr>
          </thead>
          <TransitionGroup tag="tbody" name="cartoes">
            <tr
              v-for="f in filtradas"
              :key="f.id"
              :class="{ marcada: selecionadas.has(f.id) }"
              draggable="true"
              @dragstart="arrastar($event, f)"
            >
              <td><input type="checkbox" :checked="selecionadas.has(f.id)" @click="selecionar(f, $event)" /></td>
              <td>
                <button class="estrela" :class="{ ligada: f.favorito }" @click="executar([f.id], f.favorito ? 'desfavoritar' : 'favoritar')">{{ f.favorito ? '★' : '☆' }}</button>
              </td>
              <td>
                <RouterLink :to="`/formularios/${f.id}/editar`" class="titulo-linha" draggable="false">{{ f.titulo }}</RouterLink>
                <div class="etiquetas-linha">
                  <button v-for="e in f.etiquetas" :key="e" class="chip-mini" @click="etiqueta = e">#{{ e }}</button>
                </div>
              </td>
              <td>
                <span v-if="nomeDaPasta(f.pastaId)" class="pasta-linha"><i :style="{ background: nomeDaPasta(f.pastaId).cor }"></i>{{ nomeDaPasta(f.pastaId).nome }}</span>
                <span v-else class="suave">—</span>
              </td>
              <td>
                <span v-if="f.arquivado" class="etiqueta">Arquivada</span>
                <span v-else class="etiqueta" :class="f.ativo ? 'verde' : 'vermelha'">{{ f.ativo ? 'Ativa' : 'Encerrada' }}</span>
              </td>
              <td style="text-align: right; font-weight: 600">{{ f.totalRespostas }}</td>
              <td style="text-align: right">{{ taxa(f) === null ? '—' : taxa(f) + '%' }}</td>
              <td class="suave" style="white-space: nowrap">{{ tempoRelativo(f.ultimaResposta) }}</td>
              <td>
                <div class="linha" style="flex-wrap: nowrap; gap: 2px">
                  <RouterLink :to="`/formularios/${f.id}/dashboard`" class="botao fantasma icone" title="Dashboard" draggable="false">📊</RouterLink>
                  <button class="botao fantasma icone" title="Copiar link" @click="copiarLink(f)">🔗</button>
                  <MenuPesquisa :pesquisa="f" :pastas="pastas" @acao="(a, extra) => acaoDoMenu(f, a, extra)" />
                </div>
              </td>
            </tr>
          </TransitionGroup>
        </table>
      </div>
    </section>

    <!-- Barra de ações em lote -->
    <Transition name="lote">
      <div v-if="selecionadas.size" class="barra-lote">
        <b>{{ plural(selecionadas.size, 'selecionada', 'selecionadas') }}</b>
        <select title="Mover para a pasta" @change="moverLote">
          <option value="">📁 Mover para...</option>
          <option value="nenhuma">— Sem pasta</option>
          <option v-for="p in pastas" :key="p.id" :value="p.id">{{ p.nome }}</option>
        </select>
        <div class="etiqueta-lote">
          <input v-model="etiquetaLote" list="etiquetas-lote" maxlength="30" placeholder="#etiqueta" @keydown.enter="etiquetarLote()" />
          <datalist id="etiquetas-lote"><option v-for="e in todasEtiquetas" :key="e" :value="e" /></datalist>
          <button class="botao pequeno" title="Adicionar etiqueta" @click="etiquetarLote()">+</button>
          <button class="botao pequeno" title="Remover etiqueta" @click="etiquetarLote(true)">−</button>
        </div>
        <button class="botao pequeno" @click="executar([...selecionadas], 'favoritar')">⭐</button>
        <button class="botao pequeno" @click="executar([...selecionadas], 'encerrar')">⏸ Encerrar</button>
        <button class="botao pequeno" @click="executar([...selecionadas], 'reabrir')">▶ Reabrir</button>
        <button v-if="secao === 'arquivadas'" class="botao pequeno" @click="executar([...selecionadas], 'desarquivar')">📤 Desarquivar</button>
        <button v-else class="botao pequeno" @click="executar([...selecionadas], 'arquivar')">🗄 Arquivar</button>
        <button class="botao pequeno perigo" @click="executar([...selecionadas], 'excluir')">🗑 Excluir</button>
        <button class="botao pequeno fantasma fechar-lote" title="Limpar seleção (Esc)" @click="limparSelecao">×</button>
      </div>
    </Transition>

    <!-- Organizar uma pesquisa (pasta e etiquetas, salvo na hora) -->
    <Transition name="pagina">
      <div v-if="organizando" class="fundo-modal" @click.self="organizandoId = null">
        <div class="modal" style="width: min(480px, 100%)">
          <div class="linha" style="margin-bottom: 6px">
            <h2 style="margin: 0">🏷 Organizar</h2>
            <span class="espaco"></span>
            <button class="botao fantasma icone" @click="organizandoId = null">×</button>
          </div>
          <p class="suave" style="margin-bottom: 18px">{{ organizando.titulo }}</p>
          <label class="campo" style="margin-bottom: 14px">
            <span>Pasta</span>
            <select :value="organizando.pastaId ?? ''" @change="executar([organizando.id], 'mover', { pastaId: $event.target.value ? Number($event.target.value) : null })">
              <option value="">— Sem pasta</option>
              <option v-for="p in pastas" :key="p.id" :value="p.id">{{ p.nome }}</option>
            </select>
          </label>
          <div class="campo">
            <span>Etiquetas (até 10)</span>
            <EditorEtiquetas
              :model-value="organizando.etiquetas"
              :sugestoes="todasEtiquetas"
              @adicionar="executar([organizando.id], 'etiquetar', { etiqueta: $event })"
              @remover="executar([organizando.id], 'desetiquetar', { etiqueta: $event })"
            />
          </div>
          <p class="suave pequeno" style="margin-top: 14px">As mudanças são salvas na hora.</p>
        </div>
      </div>
    </Transition>
  </main>
</template>

<style scoped>
.painel { display: grid; grid-template-columns: 230px minmax(0, 1fr); gap: 28px; align-items: start; max-width: 1400px; }
.conteudo { min-width: 0; }
h1 { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; }
.ponto-titulo { width: 14px; height: 14px; border-radius: 4px; }
.filtro-ativo { font-size: 0.85rem; }
.filtro-ativo button { border: 0; background: none; cursor: pointer; color: inherit; font-size: 1rem; padding: 0 0 0 4px; }

.modelos { margin-bottom: 20px; background: var(--cartao); border: 1px solid var(--borda); border-radius: var(--raio); padding: 12px 16px; }
.modelos summary { cursor: pointer; list-style: none; display: flex; gap: 10px; align-items: baseline; }
.modelos summary::-webkit-details-marker { display: none; }
.modelos[open] summary { margin-bottom: 12px; }
.modelos-lista { display: grid; grid-auto-flow: column; grid-auto-columns: minmax(180px, 1fr); gap: 10px; overflow-x: auto; padding-bottom: 6px; }
.modelo {
  display: flex; flex-direction: column; gap: 4px; padding: 14px; border-radius: var(--raio); text-decoration: none; color: var(--texto);
  background: var(--fundo); border: 1px dashed #d1d5db; transition: all 0.15s;
}
.modelo:hover { border-color: var(--primaria); border-style: solid; transform: translateY(-2px); background: #fff; }
.modelo-icone { font-size: 1.3rem; width: 36px; height: 36px; display: grid; place-items: center; background: var(--primaria-suave); color: var(--primaria); border-radius: 10px; margin-bottom: 4px; }
.modelo small { color: var(--texto-suave); font-size: 0.76rem; line-height: 1.35; }

.filtros { margin-bottom: 10px; }
.alternar-visao .chip { padding: 6px 10px; }
.selecao-geral { margin-bottom: 12px; gap: 6px; }
.selecao-geral label { gap: 6px; cursor: pointer; }
.grade-pesquisas { display: grid; grid-template-columns: repeat(auto-fill, minmax(300px, 1fr)); gap: 16px; padding-bottom: 80px; }

.lista { margin-bottom: 80px; background: #fff; }
.lista tr.marcada td { background: var(--primaria-suave); }
.lista td { vertical-align: middle; }
.titulo-linha { font-weight: 600; color: var(--texto); text-decoration: none; }
.titulo-linha:hover { color: var(--primaria); }
.etiquetas-linha { display: flex; flex-wrap: wrap; gap: 4px; margin-top: 3px; }
.chip-mini { border: 0; background: var(--fundo); color: var(--texto-suave); border-radius: 99px; padding: 1px 7px; font: inherit; font-size: 0.72rem; cursor: pointer; }
.chip-mini:hover { background: var(--primaria-suave); color: var(--primaria); }
.pasta-linha { display: inline-flex; align-items: center; gap: 6px; white-space: nowrap; }
.pasta-linha i { width: 9px; height: 9px; border-radius: 3px; }
.estrela { border: 0; background: none; font-size: 1.15rem; cursor: pointer; color: #d1d5db; padding: 0; }
.estrela:hover, .estrela.ligada { color: #f59e0b; }

.barra-lote {
  position: fixed; left: 50%; bottom: 20px; transform: translateX(-50%); z-index: 40; display: flex; align-items: center; gap: 8px;
  flex-wrap: wrap; justify-content: center; max-width: calc(100vw - 32px); padding: 10px 14px; border-radius: 14px;
  background: #111827; color: #fff; box-shadow: var(--sombra-forte);
}
.barra-lote select, .barra-lote input { width: auto; padding: 5px 8px; font-size: 0.85rem; }
.barra-lote .botao { background: #ffffff1a; border-color: #ffffff33; color: #fff; }
.barra-lote .botao:hover { background: #ffffff33; }
.barra-lote .botao.perigo { color: #fca5a5; }
.etiqueta-lote { display: flex; gap: 3px; }
.etiqueta-lote input { width: 120px; }
.fechar-lote { font-size: 1.1rem; }
.lote-enter-active, .lote-leave-active { transition: all 0.25s ease; }
.lote-enter-from, .lote-leave-to { opacity: 0; transform: translate(-50%, 20px); }

.cartoes-enter-active, .cartoes-leave-active { transition: all 0.25s ease; }
.cartoes-enter-from, .cartoes-leave-to { opacity: 0; transform: scale(0.96); }
.cartoes-move { transition: transform 0.3s ease; }

@media (max-width: 900px) {
  .painel { grid-template-columns: 1fr; }
  .painel :deep(.lateral) { position: static; max-height: none; }
}
</style>

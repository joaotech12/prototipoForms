<script setup>
// Painel: todas as pesquisas, números gerais, ações rápidas e modelos prontos
import { computed, onBeforeUnmount, onMounted, ref } from 'vue';
import { alterarFormulario, duplicarFormulario, excluirFormulario, linkPublico, listarFormularios } from '@/services/api';
import { avisar, avisarErro } from '@/services/avisos';
import { plural, tempoRelativo } from '@/services/formato';
import { MODELOS } from '@/services/modelos';
import { dadosParaEnvio } from '@/services/tipos';

const pesquisas = ref([]);
const carregando = ref(true);
const erro = ref('');
const busca = ref('');
const filtro = ref('todas');
const ordem = ref('recentes');
const menuAberto = ref(null);
let relogio = null;

async function carregar(silencioso = false) {
  if (!silencioso) carregando.value = true;
  try {
    pesquisas.value = await listarFormularios();
    erro.value = '';
  } catch (e) {
    erro.value = e.message;
  } finally {
    carregando.value = false;
  }
}

const taxa = (f) => (f.visualizacoes ? Math.min(100, Math.round((f.totalRespostas / f.visualizacoes) * 100)) : null);

const filtradas = computed(() => {
  const termo = busca.value.trim().toLowerCase();
  let lista = pesquisas.value.filter((f) => {
    if (filtro.value === 'ativas' && !f.ativo) return false;
    if (filtro.value === 'encerradas' && f.ativo) return false;
    return !termo || f.titulo.toLowerCase().includes(termo) || (f.descricao ?? '').toLowerCase().includes(termo);
  });
  const ordens = {
    recentes: (a, b) => new Date(b.atualizadoEm) - new Date(a.atualizadoEm),
    respostas: (a, b) => b.totalRespostas - a.totalRespostas,
    titulo: (a, b) => a.titulo.localeCompare(b.titulo),
    ultima: (a, b) => new Date(b.ultimaResposta ?? 0) - new Date(a.ultimaResposta ?? 0),
  };
  return [...lista].sort(ordens[ordem.value]);
});

const totais = computed(() => {
  const lista = pesquisas.value;
  const respostas = lista.reduce((s, f) => s + f.totalRespostas, 0);
  const visualizacoes = lista.reduce((s, f) => s + f.visualizacoes, 0);
  return {
    pesquisas: lista.length,
    ativas: lista.filter((f) => f.ativo).length,
    respostas,
    taxa: visualizacoes ? Math.min(100, Math.round((respostas / visualizacoes) * 100)) : null,
  };
});

async function copiarLink(f) {
  const link = linkPublico(f.id);
  try {
    await navigator.clipboard.writeText(link);
    avisar('Link copiado! Agora é só enviar.');
  } catch {
    window.prompt('Copie o link:', link);
  }
}

async function duplicar(f) {
  menuAberto.value = null;
  try {
    await duplicarFormulario(f.id);
    avisar('Pesquisa duplicada');
    carregar(true);
  } catch (e) {
    avisarErro(e);
  }
}

async function alternarAtivo(f) {
  menuAberto.value = null;
  try {
    await alterarFormulario(f.id, { ...dadosParaEnvio(f), ativo: !f.ativo });
    avisar(f.ativo ? 'Pesquisa encerrada: o link não aceita mais respostas' : 'Pesquisa reaberta');
    carregar(true);
  } catch (e) {
    avisarErro(e);
  }
}

async function excluir(f) {
  menuAberto.value = null;
  const aviso = f.totalRespostas ? ` e as ${f.totalRespostas} respostas dela` : '';
  if (!window.confirm(`Excluir "${f.titulo}"${aviso}? Isso não pode ser desfeito.`)) return;
  try {
    await excluirFormulario(f.id);
    pesquisas.value = pesquisas.value.filter((p) => p.id !== f.id);
    avisar('Pesquisa excluída');
  } catch (e) {
    avisarErro(e);
  }
}

function fecharMenu() {
  menuAberto.value = null;
}

onMounted(() => {
  carregar();
  // Atualiza sozinho a cada 30 s (novas respostas aparecem sem recarregar a página)
  relogio = setInterval(() => carregar(true), 30000);
  document.addEventListener('click', fecharMenu);
});
onBeforeUnmount(() => {
  clearInterval(relogio);
  document.removeEventListener('click', fecharMenu);
});
</script>

<template>
  <main class="pagina">
    <div class="cabecalho">
      <div>
        <h1>Suas pesquisas</h1>
        <p class="suave">Crie, envie o link e acompanhe as respostas em tempo real.</p>
      </div>
      <RouterLink to="/formularios/novo" class="botao primario">+ Nova pesquisa</RouterLink>
    </div>

    <section class="kpis">
      <div class="kpi"><span class="rotulo">Pesquisas</span><strong>{{ totais.pesquisas }}</strong><small>{{ totais.ativas }} recebendo respostas</small></div>
      <div class="kpi"><span class="rotulo">Respostas</span><strong>{{ totais.respostas }}</strong><small>somando todas as pesquisas</small></div>
      <div class="kpi"><span class="rotulo">Taxa de conclusão</span><strong>{{ totais.taxa === null ? '—' : totais.taxa + '%' }}</strong><small>respostas ÷ vezes que o link foi aberto</small></div>
    </section>

    <section class="modelos">
      <h2>Comece com um modelo</h2>
      <div class="modelos-lista">
        <RouterLink to="/formularios/novo" class="modelo">
          <span class="modelo-icone">+</span>
          <b>Em branco</b>
          <small>Comece do zero</small>
        </RouterLink>
        <RouterLink v-for="m in MODELOS" :key="m.chave" :to="{ path: '/formularios/novo', query: { modelo: m.chave } }" class="modelo">
          <span class="modelo-icone">{{ m.icone }}</span>
          <b>{{ m.nome }}</b>
          <small>{{ m.resumo }}</small>
        </RouterLink>
      </div>
    </section>

    <div class="linha filtros">
      <input v-model="busca" class="busca" type="search" placeholder="🔍 Buscar pesquisa..." />
      <div class="chips">
        <button v-for="f in ['todas', 'ativas', 'encerradas']" :key="f" class="chip" :class="{ ativo: filtro === f }" @click="filtro = f">
          {{ f[0].toUpperCase() + f.slice(1) }}
        </button>
      </div>
      <span class="espaco"></span>
      <select v-model="ordem" style="width: auto">
        <option value="recentes">Editadas recentemente</option>
        <option value="ultima">Última resposta</option>
        <option value="respostas">Mais respostas</option>
        <option value="titulo">Título (A-Z)</option>
      </select>
    </div>

    <div v-if="carregando" class="grade-pesquisas">
      <div v-for="n in 3" :key="n" class="esqueleto" style="height: 190px"></div>
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

    <p v-else-if="!filtradas.length" class="vazio">Nenhuma pesquisa encontrada com esse filtro.</p>

    <TransitionGroup v-else tag="div" name="cartoes" class="grade-pesquisas">
      <article v-for="f in filtradas" :key="f.id" class="cartao pesquisa" :style="{ '--cor': f.tema?.corPrimaria || '#6d28d9' }">
        <div class="faixa"></div>
        <div class="linha topo-cartao">
          <span class="etiqueta" :class="f.ativo ? 'verde' : 'vermelha'">{{ f.ativo ? '● Ativa' : 'Encerrada' }}</span>
          <span class="etiqueta">{{ f.modo === 'conversacional' ? 'Conversacional' : 'Clássico' }}</span>
          <span class="espaco"></span>
          <div class="menu-acoes" @click.stop>
            <button class="botao fantasma icone" title="Mais ações" @click="menuAberto = menuAberto === f.id ? null : f.id">⋯</button>
            <div v-if="menuAberto === f.id" class="menu-suspenso">
              <a :href="`/f/${f.id}`" target="_blank">↗ Abrir link público</a>
              <button @click="duplicar(f)">⧉ Duplicar</button>
              <button @click="alternarAtivo(f)">{{ f.ativo ? '⏸ Encerrar respostas' : '▶ Reabrir respostas' }}</button>
              <button class="perigo" @click="excluir(f)">🗑 Excluir</button>
            </div>
          </div>
        </div>

        <RouterLink :to="`/formularios/${f.id}/editar`" class="titulo-pesquisa">{{ f.titulo }}</RouterLink>
        <p class="suave pequeno">
          {{ plural(f.perguntas.length, 'pergunta', 'perguntas') }} · última resposta {{ tempoRelativo(f.ultimaResposta) }}
        </p>

        <div class="numeros">
          <div><strong>{{ f.totalRespostas }}</strong><small>respostas</small></div>
          <div><strong>{{ f.visualizacoes }}</strong><small>visualizações</small></div>
          <div><strong>{{ taxa(f) === null ? '—' : taxa(f) + '%' }}</strong><small>conclusão</small></div>
        </div>

        <div class="linha acoes">
          <RouterLink :to="`/formularios/${f.id}/dashboard`" class="botao pequeno primario">📊 Dashboard</RouterLink>
          <RouterLink :to="`/formularios/${f.id}/editar`" class="botao pequeno">✎ Editar</RouterLink>
          <button class="botao pequeno" @click="copiarLink(f)">🔗 Copiar link</button>
        </div>
      </article>
    </TransitionGroup>
  </main>
</template>

<style scoped>
.modelos { margin-bottom: 28px; }
.modelos h2 { margin-bottom: 12px; }
.modelos-lista { display: grid; grid-auto-flow: column; grid-auto-columns: minmax(190px, 1fr); gap: 12px; overflow-x: auto; padding-bottom: 6px; }
.modelo {
  display: flex; flex-direction: column; gap: 4px; padding: 16px; border-radius: var(--raio); text-decoration: none; color: var(--texto);
  background: var(--cartao); border: 1px dashed #d1d5db; transition: all 0.15s;
}
.modelo:hover { border-color: var(--primaria); border-style: solid; transform: translateY(-2px); box-shadow: var(--sombra); }
.modelo-icone { font-size: 1.4rem; width: 38px; height: 38px; display: grid; place-items: center; background: var(--primaria-suave); color: var(--primaria); border-radius: 10px; margin-bottom: 6px; }
.modelo small { color: var(--texto-suave); font-size: 0.78rem; line-height: 1.35; }

.filtros { margin-bottom: 16px; }
.grade-pesquisas { display: grid; grid-template-columns: repeat(auto-fill, minmax(320px, 1fr)); gap: 16px; }
.pesquisa { position: relative; display: flex; flex-direction: column; gap: 10px; overflow: visible; padding-top: 22px; transition: transform 0.15s, box-shadow 0.15s; }
.pesquisa:hover { transform: translateY(-2px); box-shadow: var(--sombra-forte); }
.faixa { position: absolute; inset: 0 0 auto 0; height: 5px; background: var(--cor); border-radius: var(--raio) var(--raio) 0 0; }
.titulo-pesquisa { font-size: 1.1rem; font-weight: 700; color: var(--texto); text-decoration: none; line-height: 1.3; }
.titulo-pesquisa:hover { color: var(--primaria); }
.numeros { display: grid; grid-template-columns: repeat(3, 1fr); background: var(--fundo); border-radius: 10px; padding: 10px; text-align: center; }
.numeros strong { display: block; font-size: 1.25rem; }
.numeros small { color: var(--texto-suave); font-size: 0.75rem; }
.acoes { margin-top: auto; }
.menu-acoes { position: relative; }
.menu-suspenso {
  position: absolute; right: 0; top: 36px; z-index: 10; min-width: 210px; background: #fff; border: 1px solid var(--borda);
  border-radius: 10px; box-shadow: var(--sombra-forte); padding: 6px; display: flex; flex-direction: column;
}
.menu-suspenso a, .menu-suspenso button {
  text-align: left; padding: 8px 10px; border-radius: 6px; border: 0; background: none; font: inherit; font-size: 0.88rem;
  color: var(--texto); cursor: pointer; text-decoration: none;
}
.menu-suspenso a:hover, .menu-suspenso button:hover { background: var(--fundo); }
.menu-suspenso .perigo { color: var(--vermelho); }
.cartoes-enter-active, .cartoes-leave-active { transition: all 0.25s ease; }
.cartoes-enter-from, .cartoes-leave-to { opacity: 0; transform: scale(0.96); }
.cartoes-move { transition: transform 0.3s ease; }
</style>

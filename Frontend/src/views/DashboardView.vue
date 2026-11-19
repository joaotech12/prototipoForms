<script setup>
// Dashboard: NPS, CSAT, taxa de conclusão, insights, gráficos por pergunta, cruzamento, filtros,
// tabela de respostas e exportação Excel. Atualiza sozinho ("ao vivo") a cada 10 s.
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue';
import GraficoBarras from '@/components/GraficoBarras.vue';
import GraficoLinha from '@/components/GraficoLinha.vue';
import MedidorNps from '@/components/MedidorNps.vue';
import { baixarExcel, buscarFormulario, excluirResposta, linkPublico, listarRespostas } from '@/services/api';
import { avisar, avisarErro } from '@/services/avisos';
import {
  calcularCsat,
  calcularNps,
  calcularNumero,
  contarOpcoes,
  cruzar,
  gerarInsights,
  nomeDaMetrica,
  palavrasFrequentes,
  perguntasDeGrupo,
  perguntasDeMetrica,
  respondeuPergunta,
  respostasPorDia,
  valoresDe,
} from '@/services/estatisticas';
import { formatarData, formatarDuracao, formatarValor, plural, tempoRelativo } from '@/services/formato';
import { estaRespondida, opcoesDaPergunta } from '@/services/regras';
import { infoDoTipo } from '@/services/tipos';

const props = defineProps({ id: { type: String, required: true } });

const formulario = ref(null);
const respostas = ref([]);
const carregando = ref(true);
const erro = ref('');
const aoVivo = ref(true);
const atualizadoEm = ref(null);
const novas = ref(new Set());
const periodo = ref('tudo');
const filtro = ref(null); // { perguntaId, valor }
const busca = ref('');
const limiteTabela = ref(20);
const detalhe = ref(null);
const metricaId = ref('');
const grupoId = ref('');
const exportando = ref(false);
let relogio = null;

async function carregar(silencioso = false) {
  try {
    const [f, r] = await Promise.all([buscarFormulario(props.id), listarRespostas(props.id)]);
    if (silencioso && r.length > respostas.value.length) {
      const antigos = new Set(respostas.value.map((x) => x.id));
      const chegaram = r.filter((x) => !antigos.has(x.id));
      novas.value = new Set(chegaram.map((x) => x.id));
      avisar(`${plural(chegaram.length, 'nova resposta', 'novas respostas')} ${chegaram.length > 1 ? 'chegaram' : 'chegou'}!`, 'info');
    }
    formulario.value = f;
    respostas.value = r;
    atualizadoEm.value = new Date();
    erro.value = '';
    if (!metricaId.value) metricaId.value = perguntasDeMetrica(f.perguntas)[0]?.id ?? '';
    if (!grupoId.value) grupoId.value = perguntasDeGrupo(f.perguntas).find((p) => p.id !== metricaId.value)?.id ?? '';
  } catch (e) {
    if (!silencioso) erro.value = e.message;
  } finally {
    carregando.value = false;
  }
}

function ligarRelogio() {
  clearInterval(relogio);
  if (aoVivo.value) relogio = setInterval(() => carregar(true), 10000);
}
watch(aoVivo, ligarRelogio);

// ---------- Filtros ----------
const perguntaDe = (id) => formulario.value?.perguntas.find((p) => p.id === id);

const filtradas = computed(() => {
  let lista = respostas.value;
  if (periodo.value !== 'tudo') {
    const limite = Date.now() - Number(periodo.value) * 86400000;
    lista = lista.filter((r) => new Date(r.criadoEm).getTime() >= limite);
  }
  if (filtro.value) {
    const { perguntaId, valor } = filtro.value;
    lista = lista.filter((r) => {
      const v = r.dados?.[perguntaId];
      return Array.isArray(v) ? v.map(String).includes(valor) : String(v ?? '') === valor;
    });
  }
  return lista;
});

function filtrarPor(pergunta, valor) {
  if (filtro.value?.perguntaId === pergunta.id && filtro.value.valor === valor) filtro.value = null;
  else filtro.value = { perguntaId: pergunta.id, valor };
}

// ---------- Números gerais ----------
const kpis = computed(() => {
  const f = formulario.value;
  const lista = filtradas.value;
  const tempos = lista.map((r) => r.duracaoSegundos).filter((t) => t !== null && t !== undefined);
  const nps = f.perguntas.find((p) => p.tipo === 'nps');
  const csat = f.perguntas.find((p) => p.tipo === 'csat');
  return {
    total: lista.length,
    visualizacoes: f.visualizacoes,
    taxa: f.visualizacoes ? Math.min(100, Math.round((respostas.value.length / f.visualizacoes) * 100)) : null,
    tempo: tempos.length ? tempos.reduce((a, b) => a + b, 0) / tempos.length : null,
    nps: nps ? calcularNps(valoresDe(nps, lista)) : null,
    csat: csat ? calcularCsat(valoresDe(csat, lista)) : null,
    ultima: respostas.value[0]?.criadoEm ?? null,
  };
});

const diasDoGrafico = computed(() => {
  if (periodo.value !== 'tudo') return Number(periodo.value);
  const primeira = respostas.value[respostas.value.length - 1];
  if (!primeira) return 14;
  const dias = Math.ceil((Date.now() - new Date(primeira.criadoEm)) / 86400000) + 1;
  return Math.min(90, Math.max(14, dias));
});
const porDia = computed(() => respostasPorDia(filtradas.value, diasDoGrafico.value));
const insights = computed(() => gerarInsights(formulario.value, filtradas.value));

// ---------- Resumo por pergunta ----------
function resumo(p) {
  const lista = filtradas.value;
  const valores = valoresDe(p, lista);
  const base = { respondidas: respondeuPergunta(p, lista) };
  if (p.tipo === 'nps') {
    const r = calcularNps(valores);
    return {
      ...base,
      nps: r,
      grupos: [
        { rotulo: 'Promotores (9-10)', valor: r.promotores, pct: r.pctPromotores, cor: '#22c55e' },
        { rotulo: 'Neutros (7-8)', valor: r.neutros, pct: r.pctNeutros, cor: '#f59e0b' },
        { rotulo: 'Detratores (0-6)', valor: r.detratores, pct: r.pctDetratores, cor: '#ef4444' },
      ],
      barras: contarOpcoes(p, lista).map((b) => ({ ...b, cor: Number(b.rotulo) >= 9 ? '#22c55e' : Number(b.rotulo) >= 7 ? '#f59e0b' : '#ef4444' })),
    };
  }
  if (p.tipo === 'csat') return { ...base, csat: calcularCsat(valores), barras: contarOpcoes(p, lista) };
  if (opcoesDaPergunta(p).length) return { ...base, barras: contarOpcoes(p, lista) };
  if (p.tipo === 'numero') return { ...base, numero: calcularNumero(valores) };
  const textos = valores.filter(estaRespondida);
  return {
    ...base,
    palavras: ['texto', 'paragrafo'].includes(p.tipo) ? palavrasFrequentes(textos, 14) : [],
    ultimas: textos.slice(0, 5),
  };
}
const resumos = computed(() => formulario.value.perguntas.map((p) => ({ p, r: resumo(p) })));

// ---------- Cruzamento ----------
const metricas = computed(() => perguntasDeMetrica(formulario.value?.perguntas ?? []));
const grupos = computed(() => perguntasDeGrupo(formulario.value?.perguntas ?? []));
const cruzamento = computed(() => {
  const m = perguntaDe(metricaId.value);
  const g = perguntaDe(grupoId.value);
  if (!m || !g) return null;
  const linhas = cruzar(m, g, filtradas.value);
  return { m, g, linhas, nome: nomeDaMetrica(m) };
});

// ---------- Tabela ----------
const tabela = computed(() => {
  const termo = busca.value.trim().toLowerCase();
  if (!termo) return filtradas.value;
  return filtradas.value.filter((r) => Object.values(r.dados ?? {}).some((v) => formatarValor(v).toLowerCase().includes(termo)));
});
const colunas = computed(() => formulario.value.perguntas.slice(0, 6));

async function apagar(resposta) {
  if (!window.confirm('Excluir esta resposta? Isso não pode ser desfeito.')) return;
  try {
    await excluirResposta(resposta.id);
    respostas.value = respostas.value.filter((r) => r.id !== resposta.id);
    detalhe.value = null;
    avisar('Resposta excluída');
  } catch (e) {
    avisarErro(e);
  }
}

async function exportar() {
  exportando.value = true;
  try {
    await baixarExcel(props.id, formulario.value.titulo);
    avisar('Excel gerado');
  } catch (e) {
    avisarErro(e);
  } finally {
    exportando.value = false;
  }
}

async function copiarLink() {
  try {
    await navigator.clipboard.writeText(linkPublico(props.id));
    avisar('Link copiado!');
  } catch {
    window.prompt('Copie o link:', linkPublico(props.id));
  }
}

const corInsight = { alerta: '⚠', bom: '✓', info: 'ℹ' };

onMounted(() => {
  carregar();
  ligarRelogio();
});
onBeforeUnmount(() => clearInterval(relogio));
</script>

<template>
  <div v-if="carregando" class="carregando"><div class="girando"></div>Calculando...</div>

  <main v-else-if="erro" class="pagina">
    <div class="cartao vazio">
      <div class="grande">⚠</div>
      <p>{{ erro }}</p>
      <RouterLink to="/" class="botao" style="margin-top: 14px">Voltar ao painel</RouterLink>
    </div>
  </main>

  <main v-else class="pagina" :style="{ '--primaria': formulario.tema.corPrimaria }">
    <div class="cabecalho">
      <div>
        <RouterLink to="/" class="suave pequeno">← Painel</RouterLink>
        <h1 style="margin-top: 6px">{{ formulario.titulo }}</h1>
        <p class="suave linha">
          <span class="etiqueta" :class="formulario.ativo ? 'verde' : 'vermelha'">{{ formulario.ativo ? '● Recebendo respostas' : 'Encerrada' }}</span>
          <span>última resposta {{ tempoRelativo(kpis.ultima) }}</span>
        </p>
      </div>
      <div class="linha">
        <label class="interruptor" title="Atualiza sozinho a cada 10 segundos">
          <input v-model="aoVivo" type="checkbox" />
          <span class="trilho"></span>
          <span v-if="aoVivo" class="ao-vivo"></span> Ao vivo
        </label>
        <button class="botao" @click="copiarLink">🔗 Link</button>
        <RouterLink :to="`/formularios/${id}/editar`" class="botao">✎ Editar</RouterLink>
        <button class="botao primario" :disabled="exportando" @click="exportar">{{ exportando ? 'Gerando...' : '⬇ Exportar Excel' }}</button>
      </div>
    </div>

    <!-- Filtros -->
    <div class="linha filtros">
      <div class="chips">
        <button v-for="op in [{ v: 'tudo', t: 'Tudo' }, { v: '7', t: '7 dias' }, { v: '30', t: '30 dias' }, { v: '90', t: '90 dias' }]" :key="op.v" class="chip" :class="{ ativo: periodo === op.v }" @click="periodo = op.v">
          {{ op.t }}
        </button>
      </div>
      <select :value="filtro ? `${filtro.perguntaId}::${filtro.valor}` : ''" style="width: auto; max-width: 340px" @change="$event.target.value ? (filtro = { perguntaId: $event.target.value.split('::')[0], valor: $event.target.value.split('::').slice(1).join('::') }) : (filtro = null)">
        <option value="">Filtrar por resposta...</option>
        <optgroup v-for="g in grupos" :key="g.id" :label="g.titulo">
          <option v-for="o in opcoesDaPergunta(g)" :key="o" :value="`${g.id}::${o}`">{{ o }}</option>
        </optgroup>
      </select>
      <span v-if="filtro" class="etiqueta roxa">
        {{ perguntaDe(filtro.perguntaId)?.titulo }} = {{ filtro.valor }}
        <button class="limpar" @click="filtro = null">×</button>
      </span>
      <span class="espaco"></span>
      <span class="suave pequeno">Atualizado {{ atualizadoEm?.toLocaleTimeString('pt-BR') }}</span>
    </div>

    <!-- Números gerais -->
    <section class="kpis">
      <div class="kpi"><span class="rotulo">Respostas</span><strong>{{ kpis.total }}</strong><small>{{ filtro || periodo !== 'tudo' ? `de ${respostas.length} no total` : 'no total' }}</small></div>
      <div class="kpi"><span class="rotulo">Taxa de conclusão</span><strong>{{ kpis.taxa === null ? '—' : kpis.taxa + '%' }}</strong><small>{{ kpis.visualizacoes }} visualizações do link</small></div>
      <div v-if="kpis.nps" class="kpi"><span class="rotulo">NPS</span><strong :style="{ color: kpis.nps.zona.cor }">{{ kpis.nps.nps ?? '—' }}</strong><small>{{ kpis.nps.zona.nome }}</small></div>
      <div v-if="kpis.csat" class="kpi"><span class="rotulo">CSAT</span><strong>{{ kpis.csat.csat === null ? '—' : kpis.csat.csat + '%' }}</strong><small>média {{ kpis.csat.media ?? '—' }} de 5</small></div>
      <div class="kpi"><span class="rotulo">Tempo médio</span><strong>{{ formatarDuracao(kpis.tempo) }}</strong><small>para responder tudo</small></div>
    </section>

    <div class="grade duas">
      <section class="cartao">
        <h2>Respostas por dia</h2>
        <GraficoLinha :pontos="porDia" :cor="formulario.tema.corPrimaria" />
      </section>
      <section class="cartao">
        <h2>💡 O que merece atenção</h2>
        <TransitionGroup tag="ul" name="pagina" class="insights">
          <li v-for="(ins, i) in insights" :key="ins.texto + i" :class="ins.tipo">
            <span>{{ corInsight[ins.tipo] }}</span>{{ ins.texto }}
          </li>
        </TransitionGroup>
      </section>
    </div>

    <!-- Cruzamento -->
    <section v-if="metricas.length && grupos.length" class="cartao" style="margin-top: 16px">
      <div class="linha" style="margin-bottom: 14px">
        <h2 style="margin: 0">🔀 Cruzamento de métricas</h2>
        <span class="espaco"></span>
        <select v-model="metricaId" style="width: auto; max-width: 260px">
          <option v-for="m in metricas" :key="m.id" :value="m.id">{{ nomeDaMetrica(m) }}: {{ m.titulo }}</option>
        </select>
        <span class="suave">por</span>
        <select v-model="grupoId" style="width: auto; max-width: 260px">
          <option v-for="g in grupos" :key="g.id" :value="g.id">{{ g.titulo }}</option>
        </select>
      </div>
      <GraficoBarras
        v-if="cruzamento"
        :itens="cruzamento.linhas.map((l) => ({ rotulo: `${l.grupo} (${l.total})`, valor: l.valor, cor: l.valor !== null && l.valor < 0 ? '#ef4444' : undefined }))"
        :cor="formulario.tema.corPrimaria"
      />
      <p v-if="cruzamento" class="suave pequeno" style="margin-top: 10px">
        {{ cruzamento.nome }} de "{{ cruzamento.m.titulo }}" para cada resposta de "{{ cruzamento.g.titulo }}".
        Entre parênteses, quantas pessoas responderam.
      </p>
    </section>

    <!-- Por pergunta -->
    <h2 style="margin: 28px 0 12px">Resultado por pergunta</h2>
    <div class="grade-perguntas">
      <section v-for="{ p, r } in resumos" :key="p.id" class="cartao pergunta-resumo">
        <div class="linha" style="margin-bottom: 4px">
          <span class="etiqueta roxa">{{ infoDoTipo(p.tipo).icone }} {{ infoDoTipo(p.tipo).rotulo }}</span>
          <span class="espaco"></span>
          <span class="suave pequeno">{{ plural(r.respondidas, 'resposta', 'respostas') }}</span>
        </div>
        <h3>{{ p.titulo }}</h3>

        <template v-if="r.nps">
          <div class="nps-bloco">
            <div>
              <MedidorNps :nps="r.nps.nps" />
              <p class="nps-numero" :style="{ color: r.nps.zona.cor }">{{ r.nps.nps ?? '—' }}</p>
              <p class="suave pequeno" style="text-align: center">{{ r.nps.zona.nome }}</p>
            </div>
            <GraficoBarras :itens="r.grupos" />
          </div>
          <details>
            <summary class="suave pequeno">Ver notas de 0 a 10</summary>
            <GraficoBarras :itens="r.barras" clicavel :destaque="filtro?.perguntaId === p.id ? filtro.valor : ''" @escolher="filtrarPor(p, $event)" />
          </details>
        </template>

        <template v-else-if="r.csat">
          <p class="destaque-numero">{{ r.csat.csat === null ? '—' : r.csat.csat + '%' }} <small>satisfeitos (4 e 5) · média {{ r.csat.media ?? '—' }}</small></p>
          <GraficoBarras :itens="r.barras.map((b) => ({ ...b, rotulo: '★'.repeat(Number(b.rotulo)) }))" :cor="formulario.tema.corPrimaria" />
        </template>

        <GraficoBarras
          v-else-if="r.barras"
          :itens="r.barras"
          :cor="formulario.tema.corPrimaria"
          clicavel
          :destaque="filtro?.perguntaId === p.id ? filtro.valor : ''"
          @escolher="filtrarPor(p, $event)"
        />

        <div v-else-if="r.numero" class="numeros-resumo">
          <div><small>Média</small><b>{{ r.numero.media ?? '—' }}</b></div>
          <div><small>Menor</small><b>{{ r.numero.menor ?? '—' }}</b></div>
          <div><small>Maior</small><b>{{ r.numero.maior ?? '—' }}</b></div>
        </div>

        <template v-else>
          <div v-if="r.palavras.length" class="nuvem">
            <span
              v-for="w in r.palavras"
              :key="w.palavra"
              :style="{ fontSize: 0.8 + (w.qtd / r.palavras[0].qtd) * 0.9 + 'rem', opacity: 0.55 + (w.qtd / r.palavras[0].qtd) * 0.45 }"
              :title="`${w.qtd} vezes`"
              @click="busca = w.palavra"
            >{{ w.palavra }}</span>
          </div>
          <ul class="ultimas">
            <li v-for="(t, i) in r.ultimas" :key="i">“{{ formatarValor(t) }}”</li>
            <li v-if="!r.ultimas.length" class="suave">Nenhuma resposta ainda.</li>
          </ul>
        </template>
      </section>
    </div>

    <!-- Tabela -->
    <section class="cartao" style="margin-top: 24px">
      <div class="linha" style="margin-bottom: 12px">
        <h2 style="margin: 0">Todas as respostas</h2>
        <span class="etiqueta">{{ tabela.length }}</span>
        <span class="espaco"></span>
        <input v-model="busca" type="search" class="busca" placeholder="🔍 Buscar nas respostas..." />
      </div>
      <div v-if="!tabela.length" class="vazio">
        <div class="grande">📭</div>
        <p v-if="!respostas.length">Ainda não há respostas. Envie o link: <a :href="`/f/${id}`" target="_blank">{{ linkPublico(id) }}</a></p>
        <p v-else>Nenhuma resposta com esses filtros.</p>
      </div>
      <div v-else class="tabela-rolagem">
        <table>
          <thead>
            <tr>
              <th>Data</th>
              <th v-for="p in colunas" :key="p.id">{{ p.titulo }}</th>
              <th>Tempo</th>
              <th></th>
            </tr>
          </thead>
          <TransitionGroup tag="tbody" name="pagina">
            <tr v-for="r in tabela.slice(0, limiteTabela)" :key="r.id" :class="{ nova: novas.has(r.id) }" @click="detalhe = r">
              <td style="white-space: nowrap">{{ formatarData(r.criadoEm) }}</td>
              <td v-for="p in colunas" :key="p.id" class="celula">{{ formatarValor(r.dados?.[p.id]) }}</td>
              <td>{{ formatarDuracao(r.duracaoSegundos) }}</td>
              <td @click.stop><button class="botao fantasma icone perigo" title="Excluir" @click="apagar(r)">🗑</button></td>
            </tr>
          </TransitionGroup>
        </table>
      </div>
      <div v-if="tabela.length > limiteTabela" style="text-align: center; margin-top: 12px">
        <button class="botao" @click="limiteTabela += 20">Mostrar mais ({{ tabela.length - limiteTabela }} restantes)</button>
      </div>
      <p v-if="formulario.perguntas.length > colunas.length" class="suave pequeno" style="margin-top: 8px">
        Clique numa linha para ver todas as {{ formulario.perguntas.length }} respostas.
      </p>
    </section>

    <!-- Detalhe de uma resposta -->
    <Transition name="pagina">
      <div v-if="detalhe" class="fundo-modal" @click.self="detalhe = null">
        <div class="modal">
          <div class="linha" style="margin-bottom: 16px">
            <h2 style="margin: 0">Resposta #{{ detalhe.id }}</h2>
            <span class="espaco"></span>
            <button class="botao fantasma icone" @click="detalhe = null">×</button>
          </div>
          <p class="suave pequeno" style="margin-bottom: 16px">
            {{ formatarData(detalhe.criadoEm) }} · respondida em {{ formatarDuracao(detalhe.duracaoSegundos) }}
          </p>
          <dl class="detalhe">
            <template v-for="p in formulario.perguntas" :key="p.id">
              <dt>{{ p.titulo }}</dt>
              <dd :class="{ suave: !estaRespondida(detalhe.dados?.[p.id]) }">
                {{ estaRespondida(detalhe.dados?.[p.id]) ? formatarValor(detalhe.dados[p.id]) : 'Não respondeu (ou a pergunta não apareceu)' }}
              </dd>
            </template>
          </dl>
          <div class="linha" style="margin-top: 18px">
            <span class="espaco"></span>
            <button class="botao perigo" @click="apagar(detalhe)">🗑 Excluir resposta</button>
          </div>
        </div>
      </div>
    </Transition>
  </main>
</template>

<style scoped>
.filtros { margin-bottom: 18px; }
.limpar { border: 0; background: none; cursor: pointer; font-size: 1rem; color: inherit; padding: 0 0 0 4px; }
.grade.duas { grid-template-columns: 1.3fr 1fr; }
.insights { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 8px; }
.insights li { display: flex; gap: 10px; padding: 10px 12px; border-radius: 10px; font-size: 0.9rem; line-height: 1.4; background: var(--fundo); }
.insights li span { font-weight: 700; }
.insights li.alerta { background: #fef2f2; color: #991b1b; }
.insights li.bom { background: #f0fdf4; color: #166534; }
.insights li.info { background: #eff6ff; color: #1e40af; }

.grade-perguntas { display: grid; grid-template-columns: repeat(auto-fill, minmax(380px, 1fr)); gap: 16px; }
.pergunta-resumo { display: flex; flex-direction: column; gap: 12px; }
.nps-bloco { display: grid; grid-template-columns: 180px 1fr; gap: 16px; align-items: center; }
.nps-numero { text-align: center; font-size: 2rem; font-weight: 800; margin-top: -8px; }
details summary { cursor: pointer; margin-bottom: 8px; }
.destaque-numero { font-size: 2rem; font-weight: 800; }
.destaque-numero small { font-size: 0.85rem; font-weight: 500; color: var(--texto-suave); }
.numeros-resumo { display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px; text-align: center; }
.numeros-resumo div { background: var(--fundo); border-radius: 10px; padding: 12px; }
.numeros-resumo small { display: block; color: var(--texto-suave); }
.numeros-resumo b { font-size: 1.4rem; }
.nuvem { display: flex; flex-wrap: wrap; gap: 4px 12px; align-items: baseline; padding: 10px; background: var(--fundo); border-radius: 10px; }
.nuvem span { color: var(--primaria); font-weight: 700; cursor: pointer; }
.nuvem span:hover { text-decoration: underline; }
.ultimas { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 6px; font-size: 0.88rem; }
.ultimas li { padding: 8px 10px; border-left: 3px solid var(--primaria); background: var(--fundo); border-radius: 0 8px 8px 0; }
tbody tr { cursor: pointer; }
tr.nova { animation: piscar 2.5s ease; }
@keyframes piscar { 0%, 40% { background: #dcfce7; } }
.celula { max-width: 220px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.detalhe { margin: 0; display: grid; gap: 4px; }
.detalhe dt { font-weight: 600; font-size: 0.85rem; color: var(--texto-suave); margin-top: 10px; }
.detalhe dd { margin: 0; white-space: pre-line; }

@media (max-width: 900px) {
  .grade.duas { grid-template-columns: 1fr; }
  .grade-perguntas { grid-template-columns: 1fr; }
  .nps-bloco { grid-template-columns: 1fr; }
}
</style>

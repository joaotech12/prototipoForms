<script setup>
// Painel de personalização (aba "Aparência" do editor), dividido em seções que abrem e fecham.
// Altera direto o objeto "tema" da pesquisa; a prévia ao lado atualiza na hora.
import { onMounted, ref } from 'vue';
import SeletorImagem from './SeletorImagem.vue';
import { criarTema, excluirTema, listarTemas } from '@/services/api';
import { avisar, avisarErro } from '@/services/avisos';
import { FONTES, PALETAS, TEMAS_PRONTOS, carregarFonte, corEscura, fundoDoTema, misturar } from '@/services/tema';

const props = defineProps({ tema: { type: Object, required: true } });
const t = props.tema;

const aberta = ref('temas');
const meusTemas = ref([]);
const erroTemas = ref('');
const nomeNovo = ref('');
const salvandoTema = ref(false);

const SECOES = [
  { chave: 'temas', titulo: '🎨 Temas', resumo: 'Visual completo em um clique' },
  { chave: 'cores', titulo: '🖌 Cores', resumo: 'Principal, fundo, texto e campos' },
  { chave: 'fundo', titulo: '🌄 Fundo', resumo: 'Cor, degradê ou imagem' },
  { chave: 'marca', titulo: '🏷 Logo e capa', resumo: 'Logotipo e imagem do topo' },
  { chave: 'texto', titulo: '🔤 Tipografia', resumo: 'Fontes e tamanho' },
  { chave: 'layout', titulo: '📐 Layout', resumo: 'Largura, alinhamento e cantos' },
  { chave: 'campos', titulo: '🔘 Campos e botões', resumo: 'Estilo e textos dos botões' },
  { chave: 'extras', titulo: '⚙ Extras', resumo: 'Progresso, numeração e marca' },
];

// Campos visuais que um tema muda (logo, capa e textos ficam como estão)
const CAMPOS_VISUAIS = ['corPrimaria', 'corFundo', 'corFundo2', 'corTexto', 'corCampo', 'fonte', 'fonteTitulo', 'cantos', 'fundoTipo', 'estiloCampo', 'estiloBotao', 'tamanhoFonte', 'largura', 'alinhamento'];

function abrir(chave) {
  aberta.value = aberta.value === chave ? '' : chave;
  if (['texto', 'temas'].includes(chave)) FONTES.forEach((f) => carregarFonte(f.nome));
}

function aplicarTema(modelo) {
  for (const campo of CAMPOS_VISUAIS) if (modelo[campo] !== undefined) t[campo] = modelo[campo];
  if (modelo.fundoTipo === 'imagem' && modelo.fundoImagem) t.fundoImagem = modelo.fundoImagem;
  avisar('Tema aplicado', 'sucesso', 1800);
}

function aplicarPaleta(p) {
  Object.assign(t, { corPrimaria: p.corPrimaria, corFundo: p.corFundo, corTexto: p.corTexto });
  t.corCampo = corEscura(p.corFundo) ? misturar(p.corFundo, 0.1) : '#ffffff';
  t.corFundo2 = misturar(p.corPrimaria, 0.75);
}

// Miniatura de um tema (fundo, título com a fonte, campo e botão)
function estiloMiniatura(m) {
  return {
    background: fundoDoTema({ ...t, ...m, fundoTipo: m.fundoTipo === 'imagem' && !m.fundoImagem ? 'cor' : m.fundoTipo }),
    color: m.corTexto,
    fontFamily: `'${m.fonteTitulo || m.fonte}', sans-serif`,
  };
}

// ---------- Meus temas ----------
async function carregarMeusTemas() {
  try {
    meusTemas.value = await listarTemas();
    erroTemas.value = '';
  } catch (e) {
    erroTemas.value = e.message;
  }
}

async function salvarComoTema() {
  const nome = nomeNovo.value.trim();
  if (!nome) return avisar('Dê um nome para o tema', 'erro');
  salvandoTema.value = true;
  try {
    const visual = Object.fromEntries(Object.entries(t).filter(([campo]) => !['textoBotao', 'textoComecar', 'linkFinal', 'textoLinkFinal', 'redirecionar'].includes(campo)));
    const salvo = await criarTema(nome, visual);
    meusTemas.value.unshift(salvo);
    nomeNovo.value = '';
    avisar(`Tema "${nome}" salvo. Ele aparece em todas as pesquisas.`);
  } catch (e) {
    avisarErro(e);
  } finally {
    salvandoTema.value = false;
  }
}

function aplicarMeuTema(salvo) {
  aplicarTema(salvo.tema);
  // O tema salvo traz também a marca da empresa
  for (const campo of ['logo', 'logoPosicao', 'logoTamanho', 'capa', 'capaAltura', 'fundoImagem', 'fundoEscurecer', 'mostrarMarca', 'mostrarProgresso', 'mostrarNumeros']) {
    if (salvo.tema[campo] !== undefined) t[campo] = salvo.tema[campo];
  }
}

async function apagarMeuTema(salvo) {
  if (!window.confirm(`Excluir o tema "${salvo.nome}"? As pesquisas que já usam continuam iguais.`)) return;
  try {
    await excluirTema(salvo.id);
    meusTemas.value = meusTemas.value.filter((m) => m.id !== salvo.id);
  } catch (e) {
    avisarErro(e);
  }
}

onMounted(() => {
  carregarMeusTemas();
  FONTES.forEach((f) => carregarFonte(f.nome));
});
</script>

<template>
  <div class="personalizacao">
    <section v-for="s in SECOES" :key="s.chave" class="secao" :class="{ aberta: aberta === s.chave }">
      <button class="cabeca" @click="abrir(s.chave)">
        <span><b>{{ s.titulo }}</b><small>{{ s.resumo }}</small></span>
        <span class="seta">⌄</span>
      </button>

      <div v-if="aberta === s.chave" class="conteudo">
        <!-- ===== Temas ===== -->
        <template v-if="s.chave === 'temas'">
          <span class="rotulo">Temas prontos</span>
          <div class="temas">
            <button v-for="m in TEMAS_PRONTOS" :key="m.nome" class="tema" @click="aplicarTema(m.tema)">
              <span class="mini" :style="estiloMiniatura(m.tema)">
                <b>Aa</b>
                <i class="mini-campo" :style="{ background: m.tema.estiloCampo === 'linha' ? 'transparent' : m.tema.corCampo, borderBottom: `2px solid ${m.tema.corTexto}33` }"></i>
                <i class="mini-botao" :style="{ background: m.tema.estiloBotao === 'contorno' ? 'transparent' : m.tema.corPrimaria, border: `2px solid ${m.tema.corPrimaria}`, borderRadius: Math.min(m.tema.cantos, 10) + 'px' }"></i>
              </span>
              <small>{{ m.nome }}</small>
            </button>
          </div>

          <span class="rotulo" style="margin-top: 8px">Meus temas</span>
          <p v-if="erroTemas" class="suave pequeno">Não foi possível carregar: {{ erroTemas }}</p>
          <p v-else-if="!meusTemas.length" class="suave pequeno">Salve o visual desta pesquisa para usar de novo em outras.</p>
          <div v-else class="meus">
            <div v-for="m in meusTemas" :key="m.id" class="meu">
              <span class="bolinha" :style="estiloMiniatura(m.tema)"><i :style="{ background: m.tema.corPrimaria }"></i></span>
              <b>{{ m.nome }}</b>
              <span class="espaco"></span>
              <button class="botao pequeno" @click="aplicarMeuTema(m)">Aplicar</button>
              <button class="botao pequeno fantasma perigo" title="Excluir" @click="apagarMeuTema(m)">🗑</button>
            </div>
          </div>
          <div class="linha">
            <input v-model="nomeNovo" maxlength="80" placeholder="Nome, ex.: Marca da empresa" @keydown.enter="salvarComoTema" />
            <button class="botao pequeno primario" :disabled="salvandoTema" @click="salvarComoTema">💾 Salvar tema</button>
          </div>
        </template>

        <!-- ===== Cores ===== -->
        <template v-else-if="s.chave === 'cores'">
          <div class="paletas">
            <button v-for="p in PALETAS" :key="p.nome" class="paleta" :title="p.nome" @click="aplicarPaleta(p)">
              <span :style="{ background: p.corFundo }"><i :style="{ background: p.corPrimaria }"></i></span>
              <small>{{ p.nome }}</small>
            </button>
          </div>
          <div class="cores">
            <label v-for="c in [
              { chave: 'corPrimaria', nome: 'Principal (botões e destaques)' },
              { chave: 'corFundo', nome: 'Fundo da página' },
              { chave: 'corTexto', nome: 'Texto' },
              { chave: 'corCampo', nome: 'Fundo dos campos' },
            ]" :key="c.chave" class="campo">
              <span>{{ c.nome }}</span>
              <div class="linha">
                <input v-model="t[c.chave]" type="color" />
                <input v-model.lazy="t[c.chave]" maxlength="7" class="hex" />
              </div>
            </label>
          </div>
        </template>

        <!-- ===== Fundo ===== -->
        <template v-else-if="s.chave === 'fundo'">
          <div class="chips">
            <button v-for="op in [{ v: 'cor', n: 'Cor lisa' }, { v: 'gradiente', n: 'Degradê' }, { v: 'imagem', n: 'Imagem' }]" :key="op.v" class="chip" :class="{ ativo: t.fundoTipo === op.v }" @click="t.fundoTipo = op.v">{{ op.n }}</button>
          </div>
          <div v-if="t.fundoTipo === 'gradiente'" class="cores">
            <label class="campo"><span>De</span><div class="linha"><input v-model="t.corFundo" type="color" /><input v-model.lazy="t.corFundo" class="hex" maxlength="7" /></div></label>
            <label class="campo"><span>Até</span><div class="linha"><input v-model="t.corFundo2" type="color" /><input v-model.lazy="t.corFundo2" class="hex" maxlength="7" /></div></label>
          </div>
          <template v-if="t.fundoTipo === 'imagem'">
            <SeletorImagem v-model="t.fundoImagem" prontas altura="110px" />
            <label class="campo">
              <span>Escurecer a imagem: {{ t.fundoEscurecer }}% (ajuda a ler o texto)</span>
              <input v-model.number="t.fundoEscurecer" type="range" min="0" max="80" step="5" />
            </label>
            <p class="suave pequeno">Dica: com fundo escuro, mude a cor do texto para branco em "Cores".</p>
          </template>
        </template>

        <!-- ===== Logo e capa ===== -->
        <template v-else-if="s.chave === 'marca'">
          <span class="rotulo">Logotipo</span>
          <SeletorImagem v-model="t.logo" formato="image/png" :tamanho-maximo="400" altura="64px" />
          <div class="duas">
            <label class="campo"><span>Posição</span>
              <select v-model="t.logoPosicao"><option value="esquerda">Esquerda</option><option value="centro">Centro</option></select>
            </label>
            <label class="campo"><span>Tamanho</span>
              <select v-model="t.logoTamanho"><option value="p">Pequeno</option><option value="m">Médio</option><option value="g">Grande</option></select>
            </label>
          </div>
          <span class="rotulo" style="margin-top: 8px">Imagem de capa (topo da pesquisa)</span>
          <SeletorImagem v-model="t.capa" prontas altura="90px" />
          <label v-if="t.capa" class="campo"><span>Altura da capa</span>
            <select v-model="t.capaAltura"><option value="baixa">Baixa</option><option value="media">Média</option><option value="alta">Alta</option></select>
          </label>
        </template>

        <!-- ===== Tipografia ===== -->
        <template v-else-if="s.chave === 'texto'">
          <span class="rotulo">Fonte do texto</span>
          <div class="fontes">
            <button v-for="f in FONTES" :key="f.nome" class="fonte" :class="{ ativa: t.fonte === f.nome }" :style="{ fontFamily: `'${f.nome}', sans-serif` }" @click="t.fonte = f.nome">
              <b>Aa</b><small>{{ f.nome }}</small>
            </button>
          </div>
          <label class="campo"><span>Fonte dos títulos</span>
            <select v-model="t.fonteTitulo">
              <option value="">A mesma do texto</option>
              <optgroup v-for="g in ['Sem serifa', 'Com serifa', 'Manuscrita']" :key="g" :label="g">
                <option v-for="f in FONTES.filter((x) => x.grupo === g)" :key="f.nome" :value="f.nome">{{ f.nome }}</option>
              </optgroup>
            </select>
          </label>
          <span class="rotulo">Tamanho do texto</span>
          <div class="chips">
            <button v-for="op in [{ v: 'p', n: 'Pequeno' }, { v: 'm', n: 'Normal' }, { v: 'g', n: 'Grande' }]" :key="op.v" class="chip" :class="{ ativo: t.tamanhoFonte === op.v }" @click="t.tamanhoFonte = op.v">{{ op.n }}</button>
          </div>
        </template>

        <!-- ===== Layout ===== -->
        <template v-else-if="s.chave === 'layout'">
          <span class="rotulo">Largura do conteúdo</span>
          <div class="chips">
            <button v-for="op in [{ v: 'estreita', n: 'Estreita' }, { v: 'normal', n: 'Normal' }, { v: 'larga', n: 'Larga' }]" :key="op.v" class="chip" :class="{ ativo: t.largura === op.v }" @click="t.largura = op.v">{{ op.n }}</button>
          </div>
          <span class="rotulo">Alinhamento</span>
          <div class="chips">
            <button class="chip" :class="{ ativo: t.alinhamento === 'esquerda' }" @click="t.alinhamento = 'esquerda'">⯇ Esquerda</button>
            <button class="chip" :class="{ ativo: t.alinhamento === 'centro' }" @click="t.alinhamento = 'centro'">☰ Centro</button>
          </div>
          <span class="rotulo">Cantos arredondados</span>
          <div class="linha">
            <input v-model.number="t.cantos" type="range" min="0" max="28" style="flex: 1" />
            <span class="amostra-canto" :style="{ borderRadius: t.cantos + 'px', background: t.corPrimaria }"></span>
            <b style="width: 44px">{{ t.cantos }}px</b>
          </div>
        </template>

        <!-- ===== Campos e botões ===== -->
        <template v-else-if="s.chave === 'campos'">
          <span class="rotulo">Estilo dos campos</span>
          <div class="estilos">
            <button class="estilo" :class="{ ativo: t.estiloCampo === 'caixa' }" @click="t.estiloCampo = 'caixa'">
              <i class="amostra caixa"></i><small>Caixa</small>
            </button>
            <button class="estilo" :class="{ ativo: t.estiloCampo === 'linha' }" @click="t.estiloCampo = 'linha'">
              <i class="amostra linha-baixo"></i><small>Só linha</small>
            </button>
          </div>
          <span class="rotulo">Estilo dos botões</span>
          <div class="estilos">
            <button class="estilo" :class="{ ativo: t.estiloBotao === 'cheio' }" @click="t.estiloBotao = 'cheio'">
              <i class="amostra-botao" :style="{ background: t.corPrimaria, borderColor: t.corPrimaria }"></i><small>Preenchido</small>
            </button>
            <button class="estilo" :class="{ ativo: t.estiloBotao === 'contorno' }" @click="t.estiloBotao = 'contorno'">
              <i class="amostra-botao" :style="{ borderColor: t.corPrimaria }"></i><small>Contorno</small>
            </button>
          </div>
          <div class="duas">
            <label class="campo"><span>Texto do botão de enviar</span><input v-model="t.textoBotao" maxlength="40" placeholder="Enviar respostas" /></label>
            <label class="campo"><span>Texto do botão de começar</span><input v-model="t.textoComecar" maxlength="40" placeholder="Começar" /></label>
          </div>
        </template>

        <!-- ===== Extras ===== -->
        <template v-else-if="s.chave === 'extras'">
          <label class="interruptor"><input v-model="t.mostrarProgresso" type="checkbox" /><span class="trilho"></span>Barra de progresso no topo</label>
          <label class="interruptor"><input v-model="t.mostrarNumeros" type="checkbox" /><span class="trilho"></span>Numerar as perguntas</label>
          <label class="interruptor"><input v-model="t.mostrarMarca" type="checkbox" /><span class="trilho"></span>Rodapé "Feito com Central de Pesquisas"</label>
        </template>
      </div>
    </section>
  </div>
</template>

<style scoped>
.personalizacao { display: flex; flex-direction: column; gap: 8px; }
.secao { background: var(--cartao); border: 1px solid var(--borda); border-radius: var(--raio); overflow: hidden; }
.secao.aberta { border-color: #c4b5fd; box-shadow: var(--sombra); }
.cabeca { width: 100%; display: flex; align-items: center; justify-content: space-between; gap: 10px; padding: 14px 16px; border: 0; background: none; font: inherit; cursor: pointer; text-align: left; }
.cabeca span:first-child { display: flex; flex-direction: column; }
.cabeca small { color: var(--texto-suave); font-size: 0.78rem; }
.seta { transition: transform 0.2s; color: var(--texto-suave); font-size: 1.2rem; }
.aberta .seta { transform: rotate(180deg); }
.conteudo { display: flex; flex-direction: column; gap: 12px; padding: 0 16px 16px; }

.temas { display: grid; grid-template-columns: repeat(4, 1fr); gap: 8px; }
.tema { border: 0; background: none; padding: 0; cursor: pointer; display: flex; flex-direction: column; gap: 4px; font: inherit; }
.mini { height: 74px; border-radius: 10px; border: 1px solid var(--borda); padding: 8px; display: flex; flex-direction: column; justify-content: space-between; transition: transform 0.15s, box-shadow 0.15s; }
.tema:hover .mini { transform: translateY(-2px); box-shadow: var(--sombra); }
.mini b { font-size: 1.1rem; line-height: 1; }
.mini-campo { display: block; height: 10px; border-radius: 3px; }
.mini-botao { display: block; height: 12px; width: 55%; }
.tema small { font-size: 0.75rem; color: var(--texto-suave); text-align: center; }
.meus { display: flex; flex-direction: column; gap: 6px; }
.meu { display: flex; align-items: center; gap: 8px; padding: 6px 8px; border: 1px solid var(--borda); border-radius: 9px; }
.bolinha { width: 30px; height: 30px; border-radius: 8px; border: 1px solid var(--borda); display: grid; place-items: center; flex: none; }
.bolinha i { width: 12px; height: 12px; border-radius: 50%; }

.paletas { display: grid; grid-template-columns: repeat(auto-fill, minmax(64px, 1fr)); gap: 8px; }
.paleta { border: 0; background: none; cursor: pointer; display: flex; flex-direction: column; align-items: center; gap: 4px; font: inherit; }
.paleta span { width: 100%; height: 34px; border-radius: 8px; border: 1px solid var(--borda); display: grid; place-items: center; transition: transform 0.15s; }
.paleta:hover span { transform: scale(1.06); }
.paleta i { width: 18px; height: 18px; border-radius: 50%; }
.paleta small { font-size: 0.7rem; color: var(--texto-suave); }
.cores { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
.hex { font-family: monospace; width: 96px; }
.duas { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }

.fontes { display: grid; grid-template-columns: repeat(auto-fill, minmax(96px, 1fr)); gap: 6px; }
.fonte { display: flex; flex-direction: column; align-items: center; padding: 10px 4px; border: 1.5px solid var(--borda); border-radius: 10px; background: #fff; cursor: pointer; }
.fonte b { font-size: 1.45rem; }
.fonte small { font-size: 0.7rem; color: var(--texto-suave); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 100%; }
.fonte.ativa { border-color: var(--primaria); background: var(--primaria-suave); }
.amostra-canto { width: 42px; height: 30px; transition: border-radius 0.2s; }

.estilos { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; }
.estilo { display: flex; flex-direction: column; align-items: center; gap: 8px; padding: 14px 8px; border: 1.5px solid var(--borda); border-radius: 10px; background: #fff; cursor: pointer; font: inherit; }
.estilo.ativo { border-color: var(--primaria); background: var(--primaria-suave); }
.estilo small { font-size: 0.8rem; }
.amostra { display: block; width: 80%; height: 26px; }
.amostra.caixa { border: 1.5px solid #9ca3af; border-radius: 6px; background: #fff; }
.amostra.linha-baixo { border-bottom: 2px solid #9ca3af; }
.amostra-botao { display: block; width: 60%; height: 24px; border: 2px solid; border-radius: 6px; }

@media (max-width: 520px) {
  .temas { grid-template-columns: repeat(2, 1fr); }
  .cores, .duas { grid-template-columns: 1fr; }
}
</style>

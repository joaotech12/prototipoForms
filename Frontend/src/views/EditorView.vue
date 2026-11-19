<script setup>
// Editor de pesquisa: perguntas (arrastar, duplicar, ramificar), aparência e configurações,
// com prévia ao vivo do lado direito.
import { computed, onBeforeUnmount, onMounted, ref } from 'vue';
import { onBeforeRouteLeave, useRoute, useRouter } from 'vue-router';
import EditorPergunta from '@/components/EditorPergunta.vue';
import FormularioPublico from '@/components/FormularioPublico.vue';
import { alterarFormulario, buscarFormulario, criarFormulario, linkPublico } from '@/services/api';
import { avisar, avisarErro } from '@/services/avisos';
import { copiaDoModelo } from '@/services/modelos';
import { opcoesDaPergunta } from '@/services/regras';
import { FONTES, PALETAS, carregarFonte } from '@/services/tema';
import { TIPOS_DE_GRUPO, TIPOS_PERGUNTA, dadosParaEnvio, gerarId, novaPergunta, novoFormulario, temOpcoesEditaveis } from '@/services/tipos';

const props = defineProps({ id: { type: String, default: '' } });
const rota = useRoute();
const router = useRouter();

const formulario = ref(null);
const original = ref('');
const carregando = ref(true);
const erroCarga = ref('');
const salvando = ref(false);
const aba = ref('perguntas');
const selecionada = ref(null);
const larguraPrevia = ref('computador');
const mostrarTipos = ref(false);
const segurando = ref(null); // id da pergunta cuja alça foi pressionada
const arrastando = ref(null);
const alvoArraste = ref(null);
const urlLogo = ref('');

const alterado = computed(() => formulario.value && JSON.stringify(dadosParaEnvio(formulario.value)) !== original.value);
const perguntas = computed(() => formulario.value?.perguntas ?? []);
const perguntasDeRamo = computed(() => perguntas.value.filter((p) => TIPOS_DE_GRUPO.includes(p.tipo)));

// ---------- Carregar ----------
async function carregar() {
  carregando.value = true;
  try {
    if (props.id) {
      formulario.value = await buscarFormulario(props.id);
    } else {
      formulario.value = copiaDoModelo(rota.query.modelo) ?? novoFormulario();
    }
    original.value = props.id ? JSON.stringify(dadosParaEnvio(formulario.value)) : '';
    selecionada.value = formulario.value.perguntas[0]?.id ?? null;
    if (formulario.value.tema.logo && !formulario.value.tema.logo.startsWith('data:')) urlLogo.value = formulario.value.tema.logo;
  } catch (e) {
    erroCarga.value = e.message;
  } finally {
    carregando.value = false;
  }
}

// ---------- Salvar ----------
function conferir() {
  const f = formulario.value;
  if (!f.titulo.trim()) return 'Dê um título para a pesquisa';
  if (!f.perguntas.length) return 'Adicione pelo menos uma pergunta';
  for (const [i, p] of f.perguntas.entries()) {
    if (!p.titulo.trim()) {
      selecionada.value = p.id;
      return `A pergunta ${i + 1} está sem enunciado`;
    }
    if (temOpcoesEditaveis(p.tipo)) {
      const opcoes = p.opcoes.map((o) => o.trim()).filter(Boolean);
      if (!opcoes.length) return `A pergunta ${i + 1} precisa de pelo menos uma opção`;
      if (new Set(opcoes.map((o) => o.toLowerCase())).size !== opcoes.length) {
        selecionada.value = p.id;
        return `A pergunta ${i + 1} tem opções repetidas`;
      }
    }
  }
  return '';
}

async function salvar() {
  if (salvando.value) return;
  const problema = conferir();
  if (problema) {
    aba.value = 'perguntas';
    avisar(problema, 'erro');
    return;
  }
  salvando.value = true;
  try {
    // Limpa opções vazias antes de enviar
    for (const p of formulario.value.perguntas) p.opcoes = (p.opcoes ?? []).map((o) => o.trim()).filter(Boolean);
    const dados = dadosParaEnvio(formulario.value);
    if (props.id) {
      await alterarFormulario(props.id, dados);
      original.value = JSON.stringify(dados);
      avisar('Alterações salvas');
    } else {
      const nova = await criarFormulario(dados);
      original.value = JSON.stringify(dados);
      avisar('Pesquisa criada! O link já está funcionando.');
      router.replace(`/formularios/${nova.id}/editar`);
    }
  } catch (e) {
    avisarErro(e);
  } finally {
    salvando.value = false;
  }
}

// ---------- Perguntas ----------
function adicionar(tipo) {
  const nova = novaPergunta(tipo);
  const i = perguntas.value.findIndex((p) => p.id === selecionada.value);
  perguntas.value.splice(i >= 0 ? i + 1 : perguntas.value.length, 0, nova);
  selecionada.value = nova.id;
  mostrarTipos.value = false;
  aba.value = 'perguntas';
  setTimeout(() => document.getElementById(`editor-${nova.id}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' }), 50);
}

function duplicar(i) {
  const copia = JSON.parse(JSON.stringify(perguntas.value[i]));
  copia.id = gerarId();
  copia.titulo = copia.titulo ? `${copia.titulo} (cópia)` : '';
  perguntas.value.splice(i + 1, 0, copia);
  selecionada.value = copia.id;
}

function excluir(i) {
  const [removida] = perguntas.value.splice(i, 1);
  if (formulario.value.perguntaRamificacao === removida.id) formulario.value.perguntaRamificacao = null;
  if (selecionada.value === removida.id) selecionada.value = perguntas.value[Math.max(0, i - 1)]?.id ?? null;
  limparCondicoes();
}

function mover(de, para) {
  if (para < 0 || para >= perguntas.value.length || de === para) return;
  const [item] = perguntas.value.splice(de, 1);
  perguntas.value.splice(para, 0, item);
  limparCondicoes();
}

// Condições só podem olhar para perguntas anteriores: depois de mover/excluir, remove as que ficaram inválidas
function limparCondicoes() {
  const vistas = new Set();
  let removidas = 0;
  for (const p of perguntas.value) {
    const antes = (p.condicoes ?? []).length;
    p.condicoes = (p.condicoes ?? []).filter((c) => vistas.has(c.perguntaId));
    removidas += antes - p.condicoes.length;
    vistas.add(p.id);
  }
  if (removidas) avisar(`${removidas} condição(ões) de ramificação removida(s): elas dependiam de perguntas que agora vêm depois.`, 'info', 6000);
}

// Arrastar e soltar (só começa pela alça ⠿)
function comecarArraste(evento, i) {
  arrastando.value = i;
  evento.dataTransfer.effectAllowed = 'move';
}
function soltar(i) {
  if (arrastando.value !== null) mover(arrastando.value, i);
  arrastando.value = null;
  alvoArraste.value = null;
  segurando.value = null;
}

// ---------- Aparência ----------
function aplicarPaleta(paleta) {
  Object.assign(formulario.value.tema, { corPrimaria: paleta.corPrimaria, corFundo: paleta.corFundo, corTexto: paleta.corTexto });
}

// Reduz o logo para no máximo 400 px antes de guardar em base64 (fica leve no banco)
function escolherLogo(evento) {
  const arquivo = evento.target.files?.[0];
  evento.target.value = '';
  if (!arquivo) return;
  if (!arquivo.type.startsWith('image/')) return avisar('Escolha um arquivo de imagem', 'erro');
  if (arquivo.size > 5 * 1024 * 1024) return avisar('Imagem muito grande (máximo 5 MB)', 'erro');
  const leitor = new FileReader();
  leitor.onload = () => {
    const imagem = new Image();
    imagem.onload = () => {
      const escala = Math.min(1, 400 / Math.max(imagem.width, imagem.height));
      const tela = document.createElement('canvas');
      tela.width = Math.round(imagem.width * escala);
      tela.height = Math.round(imagem.height * escala);
      tela.getContext('2d').drawImage(imagem, 0, 0, tela.width, tela.height);
      formulario.value.tema.logo = tela.toDataURL('image/png');
      urlLogo.value = '';
    };
    imagem.src = leitor.result;
  };
  leitor.readAsDataURL(arquivo);
}
function usarUrlLogo() {
  formulario.value.tema.logo = urlLogo.value.trim();
}

function abrirAba(nome) {
  aba.value = nome;
  if (nome === 'aparencia') FONTES.forEach(carregarFonte);
}

async function copiarLink() {
  try {
    await navigator.clipboard.writeText(linkPublico(props.id));
    avisar('Link copiado!');
  } catch {
    window.prompt('Copie o link:', linkPublico(props.id));
  }
}

// ---------- Atalhos e proteção contra perder alterações ----------
function teclado(e) {
  if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') {
    e.preventDefault();
    salvar();
  }
}
function antesDeFechar(e) {
  if (alterado.value) {
    e.preventDefault();
    e.returnValue = '';
  }
}
onBeforeRouteLeave(() => {
  if (alterado.value && !salvando.value) return window.confirm('Há alterações não salvas. Sair mesmo assim?');
  return true;
});

onMounted(() => {
  carregar();
  window.addEventListener('keydown', teclado);
  window.addEventListener('beforeunload', antesDeFechar);
});
onBeforeUnmount(() => {
  window.removeEventListener('keydown', teclado);
  window.removeEventListener('beforeunload', antesDeFechar);
});
</script>

<template>
  <div v-if="carregando" class="carregando"><div class="girando"></div>Carregando pesquisa...</div>

  <div v-else-if="erroCarga" class="pagina">
    <div class="cartao vazio">
      <div class="grande">⚠</div>
      <p>{{ erroCarga }}</p>
      <RouterLink to="/" class="botao" style="margin-top: 14px">Voltar ao painel</RouterLink>
    </div>
  </div>

  <div v-else class="editor">
    <!-- Barra superior -->
    <div class="barra">
      <RouterLink to="/" class="botao fantasma" title="Voltar ao painel">←</RouterLink>
      <input v-model="formulario.titulo" class="titulo-grande" placeholder="Título da pesquisa" maxlength="200" />
      <span class="etiqueta" :class="alterado ? 'amarela' : 'verde'">{{ alterado ? '● Não salvo' : '✓ Salvo' }}</span>
      <template v-if="id">
        <button class="botao pequeno" @click="copiarLink">🔗 Link</button>
        <a :href="`/f/${id}`" target="_blank" class="botao pequeno">↗ Abrir</a>
        <RouterLink :to="`/formularios/${id}/dashboard`" class="botao pequeno">📊 Dashboard</RouterLink>
      </template>
      <button class="botao primario" :disabled="salvando" title="Ctrl + S" @click="salvar">
        {{ salvando ? 'Salvando...' : id ? 'Salvar' : 'Criar pesquisa' }}
      </button>
    </div>

    <div class="colunas">
      <!-- ===== Coluna de edição ===== -->
      <section class="coluna-edicao">
        <div class="abas">
          <button :class="{ ativa: aba === 'perguntas' }" @click="abrirAba('perguntas')">Perguntas ({{ perguntas.length }})</button>
          <button :class="{ ativa: aba === 'aparencia' }" @click="abrirAba('aparencia')">Aparência</button>
          <button :class="{ ativa: aba === 'config' }" @click="abrirAba('config')">Configurações</button>
        </div>

        <!-- Perguntas -->
        <div v-show="aba === 'perguntas'" class="lista-perguntas">
          <label class="campo">
            <span>Descrição (aparece no início)</span>
            <textarea v-model="formulario.descricao" rows="2" placeholder="Ex.: Leva menos de 2 minutos."></textarea>
          </label>

          <TransitionGroup name="mover" tag="div" class="perguntas">
            <div
              v-for="(p, i) in perguntas"
              :id="`editor-${p.id}`"
              :key="p.id"
              class="item-arrastavel"
              :class="{ alvo: alvoArraste === i && arrastando !== i, arrastando: arrastando === i }"
              :draggable="segurando === p.id"
              @dragstart="comecarArraste($event, i)"
              @dragover.prevent="alvoArraste = i"
              @drop.prevent="soltar(i)"
              @dragend="arrastando = null; alvoArraste = null; segurando = null"
              @mouseup="segurando = null"
            >
              <EditorPergunta
                :pergunta="p"
                :indice="i"
                :total="perguntas.length"
                :anteriores="perguntas.slice(0, i)"
                :selecionada="selecionada === p.id"
                @selecionar="selecionada = p.id"
                @segurar="segurando = p.id"
                @mover="mover(i, i + $event)"
                @duplicar="duplicar(i)"
                @excluir="excluir(i)"
              />
            </div>
          </TransitionGroup>

          <div class="adicionar">
            <button class="botao primario" @click="mostrarTipos = !mostrarTipos">+ Adicionar pergunta</button>
            <Transition name="pagina">
              <div v-if="mostrarTipos" class="tipos">
                <button v-for="t in TIPOS_PERGUNTA" :key="t.valor" class="tipo" @click="adicionar(t.valor)">
                  <span>{{ t.icone }}</span>{{ t.rotulo }}
                </button>
              </div>
            </Transition>
          </div>
        </div>

        <!-- Aparência -->
        <div v-show="aba === 'aparencia'" class="grade">
          <div class="cartao">
            <h2>Logotipo</h2>
            <div class="linha">
              <div class="logo-previa">
                <img v-if="formulario.tema.logo" :src="formulario.tema.logo" alt="Logotipo" />
                <span v-else class="suave pequeno">sem logo</span>
              </div>
              <label class="botao">
                📁 Enviar imagem
                <input type="file" accept="image/*" hidden @change="escolherLogo" />
              </label>
              <button v-if="formulario.tema.logo" class="botao perigo" @click="formulario.tema.logo = ''">Remover</button>
            </div>
            <div class="linha" style="margin-top: 10px">
              <input v-model="urlLogo" placeholder="...ou cole o endereço (URL) de uma imagem" @keydown.enter="usarUrlLogo" />
              <button class="botao" @click="usarUrlLogo">Usar</button>
            </div>
          </div>

          <div class="cartao">
            <h2>Cores</h2>
            <div class="paletas">
              <button v-for="pal in PALETAS" :key="pal.nome" class="paleta" :title="pal.nome" @click="aplicarPaleta(pal)">
                <span :style="{ background: pal.corFundo }"><i :style="{ background: pal.corPrimaria }"></i></span>
                <small>{{ pal.nome }}</small>
              </button>
            </div>
            <div class="cores">
              <label v-for="c in [
                { chave: 'corPrimaria', nome: 'Principal (botões)' },
                { chave: 'corFundo', nome: 'Fundo' },
                { chave: 'corTexto', nome: 'Texto' },
              ]" :key="c.chave" class="campo">
                <span>{{ c.nome }}</span>
                <div class="linha">
                  <input v-model="formulario.tema[c.chave]" type="color" />
                  <input v-model.lazy="formulario.tema[c.chave]" maxlength="7" class="hex" />
                </div>
              </label>
            </div>
          </div>

          <div class="cartao">
            <h2>Fonte</h2>
            <div class="fontes">
              <button
                v-for="fonte in FONTES"
                :key="fonte"
                class="fonte"
                :class="{ ativa: formulario.tema.fonte === fonte }"
                :style="{ fontFamily: `'${fonte}', sans-serif` }"
                @click="formulario.tema.fonte = fonte"
              >
                <b>Aa</b><small>{{ fonte }}</small>
              </button>
            </div>
          </div>

          <div class="cartao">
            <h2>Cantos</h2>
            <div class="linha">
              <input v-model.number="formulario.tema.cantos" type="range" min="0" max="28" style="flex: 1" />
              <span class="amostra-canto" :style="{ borderRadius: formulario.tema.cantos + 'px', background: formulario.tema.corPrimaria }"></span>
              <b style="width: 44px">{{ formulario.tema.cantos }}px</b>
            </div>
          </div>
        </div>

        <!-- Configurações -->
        <div v-show="aba === 'config'" class="grade">
          <div class="cartao">
            <h2>Como as perguntas aparecem</h2>
            <div class="modos">
              <button class="modo" :class="{ ativo: formulario.modo === 'conversacional' }" @click="formulario.modo = 'conversacional'">
                <b>💬 Conversacional</b>
                <small>Uma pergunta por vez, com transições, Enter para avançar e letras (A, B, C) para escolher.</small>
              </button>
              <button class="modo" :class="{ ativo: formulario.modo === 'classico' }" @click="formulario.modo = 'classico'">
                <b>📜 Clássico</b>
                <small>Todas as perguntas numa página com rolagem, como um formulário tradicional.</small>
              </button>
            </div>
          </div>

          <div class="cartao">
            <h2>Excel com abas por ramificação</h2>
            <p class="suave pequeno" style="margin-bottom: 10px">
              Além das abas "Resumo" e "Todas as respostas", o Excel ganha uma aba para cada opção da pergunta escolhida.
            </p>
            <select v-model="formulario.perguntaRamificacao">
              <option :value="null">Não separar em abas</option>
              <option v-for="p in perguntasDeRamo" :key="p.id" :value="p.id">
                {{ p.titulo || 'Pergunta sem enunciado' }} ({{ opcoesDaPergunta(p).length }} abas)
              </option>
            </select>
          </div>

          <div class="cartao">
            <h2>Mensagem final</h2>
            <input v-model="formulario.mensagemFinal" maxlength="500" placeholder="Obrigado! Sua resposta foi registrada." />
          </div>

          <div class="cartao">
            <h2>Recebimento de respostas</h2>
            <label class="interruptor">
              <input v-model="formulario.ativo" type="checkbox" />
              <span class="trilho"></span>
              {{ formulario.ativo ? 'Aberta: o link aceita respostas' : 'Encerrada: o link mostra um aviso e não aceita respostas' }}
            </label>
            <p v-if="id" class="suave pequeno" style="margin-top: 12px">
              Link público: <a :href="`/f/${id}`" target="_blank">{{ linkPublico(id) }}</a>
            </p>
            <p v-else class="suave pequeno" style="margin-top: 12px">O link é criado quando você salvar a pesquisa.</p>
          </div>
        </div>
      </section>

      <!-- ===== Prévia ao vivo ===== -->
      <aside class="coluna-previa">
        <div class="linha topo-previa">
          <b>Prévia ao vivo</b>
          <span class="etiqueta roxa">{{ formulario.modo === 'conversacional' ? 'Conversacional' : 'Clássico' }}</span>
          <span class="espaco"></span>
          <div class="chips">
            <button class="chip" :class="{ ativo: larguraPrevia === 'computador' }" @click="larguraPrevia = 'computador'">🖥</button>
            <button class="chip" :class="{ ativo: larguraPrevia === 'celular' }" @click="larguraPrevia = 'celular'">📱</button>
          </div>
        </div>
        <div class="moldura" :class="larguraPrevia">
          <FormularioPublico :formulario="formulario" previa :pergunta-foco="selecionada ?? ''" />
        </div>
        <p class="suave pequeno" style="text-align: center">Clique numa pergunta à esquerda para vê-la aqui. As respostas da prévia não são salvas.</p>
      </aside>
    </div>
  </div>
</template>

<style scoped>
.editor { max-width: 1500px; margin: 0 auto; padding: 0 20px 60px; }
.barra {
  position: sticky; top: 53px; z-index: 15; display: flex; align-items: center; gap: 10px; flex-wrap: wrap;
  padding: 12px 0; background: var(--fundo); border-bottom: 1px solid var(--borda); margin-bottom: 16px;
}
.titulo-grande { flex: 1; min-width: 200px; font-size: 1.25rem; font-weight: 700; border-color: transparent; background: transparent; }
.titulo-grande:hover { border-color: var(--borda); background: #fff; }
.colunas { display: grid; grid-template-columns: minmax(0, 1fr) minmax(360px, 0.9fr); gap: 24px; align-items: start; }
.lista-perguntas, .perguntas { display: flex; flex-direction: column; gap: 10px; }
.item-arrastavel { border-radius: var(--raio); transition: opacity 0.2s; }
.item-arrastavel.arrastando { opacity: 0.4; }
.item-arrastavel.alvo { box-shadow: 0 -3px 0 var(--primaria); }
.mover-move { transition: transform 0.25s ease; }
.mover-enter-active, .mover-leave-active { transition: all 0.25s ease; }
.mover-enter-from, .mover-leave-to { opacity: 0; transform: translateY(-8px); }

.adicionar { display: flex; flex-direction: column; gap: 10px; align-items: flex-start; margin-top: 4px; }
.tipos { display: grid; grid-template-columns: repeat(auto-fill, minmax(160px, 1fr)); gap: 6px; width: 100%; }
.tipo { display: flex; align-items: center; gap: 8px; padding: 10px; border: 1px solid var(--borda); background: #fff; border-radius: 9px; font: inherit; font-size: 0.88rem; cursor: pointer; text-align: left; }
.tipo:hover { border-color: var(--primaria); background: var(--primaria-suave); }
.tipo span { width: 24px; height: 24px; display: grid; place-items: center; background: var(--primaria-suave); color: var(--primaria); border-radius: 6px; font-weight: 700; flex: none; }

.coluna-previa { position: sticky; top: 120px; display: flex; flex-direction: column; gap: 10px; }
.moldura { height: calc(100vh - 210px); min-height: 420px; border-radius: 16px; overflow: hidden; border: 1px solid var(--borda); box-shadow: var(--sombra-forte); margin: 0 auto; width: 100%; transition: width 0.3s; background: #fff; }
.moldura.celular { width: 375px; max-width: 100%; border: 8px solid #111827; border-radius: 32px; }

.logo-previa { width: 120px; height: 64px; border: 1px dashed var(--borda); border-radius: 8px; display: grid; place-items: center; background: var(--fundo); }
.logo-previa img { max-width: 100%; max-height: 100%; object-fit: contain; }
.paletas { display: grid; grid-template-columns: repeat(auto-fill, minmax(72px, 1fr)); gap: 8px; margin-bottom: 16px; }
.paleta { border: 0; background: none; cursor: pointer; display: flex; flex-direction: column; align-items: center; gap: 4px; font: inherit; }
.paleta span { width: 100%; height: 40px; border-radius: 8px; border: 1px solid var(--borda); display: grid; place-items: center; transition: transform 0.15s; }
.paleta:hover span { transform: scale(1.06); }
.paleta i { width: 22px; height: 22px; border-radius: 50%; }
.paleta small { font-size: 0.72rem; color: var(--texto-suave); }
.cores { display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 12px; }
.hex { font-family: monospace; width: 100px; }
.fontes { display: grid; grid-template-columns: repeat(auto-fill, minmax(110px, 1fr)); gap: 8px; }
.fonte { display: flex; flex-direction: column; align-items: center; padding: 12px 6px; border: 1.5px solid var(--borda); border-radius: 10px; background: #fff; cursor: pointer; }
.fonte b { font-size: 1.6rem; }
.fonte small { font-size: 0.75rem; color: var(--texto-suave); }
.fonte.ativa { border-color: var(--primaria); background: var(--primaria-suave); }
.amostra-canto { width: 42px; height: 30px; transition: border-radius 0.2s; }
.modos { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
.modo { text-align: left; display: flex; flex-direction: column; gap: 6px; padding: 14px; border: 1.5px solid var(--borda); border-radius: 12px; background: #fff; cursor: pointer; font: inherit; }
.modo small { color: var(--texto-suave); line-height: 1.4; }
.modo.ativo { border-color: var(--primaria); background: var(--primaria-suave); }

@media (max-width: 1050px) {
  .colunas { grid-template-columns: 1fr; }
  .coluna-previa { position: static; }
  .moldura { height: 620px; }
}
@media (max-width: 600px) {
  .modos { grid-template-columns: 1fr; }
  .barra { top: 53px; }
}
</style>

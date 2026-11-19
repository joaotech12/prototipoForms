<script setup>
// O formulário como o cliente vê. Usado no link público (/f/:id) e na prévia ao vivo do editor.
// Dois modos: "classico" (todas as perguntas, com rolagem) e "conversacional" (uma por vez).
import { computed, nextTick, onBeforeUnmount, onMounted, reactive, ref, watch, watchEffect } from 'vue';
import CampoPergunta from './CampoPergunta.vue';
import { aplicarRamificacao, estaRespondida, validarValor } from '@/services/regras';
import { carregarFonte, variaveisDoTema } from '@/services/tema';

const props = defineProps({
  formulario: { type: Object, required: true },
  previa: { type: Boolean, default: false },
  perguntaFoco: { type: String, default: '' }, // no editor: pergunta selecionada
  aoEnviar: { type: Function, default: async () => {} },
});

const uid = Math.random().toString(36).slice(2, 7);
const respostas = reactive({});
const erros = reactive({});
const etapa = ref(-1); // -1 = tela de boas-vindas do modo conversacional
const direcao = ref('frente');
const enviado = ref(false);
const enviando = ref(false);
const erroEnvio = ref('');
const inicio = ref(Date.now());
const campoAtual = ref(null);
const raiz = ref(null);
let esperaAvanco = null;

const conversacional = computed(() => props.formulario.modo === 'conversacional');
const tema = computed(() => props.formulario.tema ?? {});
const estilo = computed(() => variaveisDoTema(tema.value));
const ramificacao = computed(() => aplicarRamificacao(props.formulario.perguntas ?? [], respostas));
const visiveis = computed(() => ramificacao.value.visiveis);
const atual = computed(() => visiveis.value[etapa.value] ?? null);
const ultima = computed(() => etapa.value === visiveis.value.length - 1);
const respondidas = computed(() => visiveis.value.filter((p) => estaRespondida(respostas[p.id])).length);
const progresso = computed(() => {
  if (enviado.value) return 100;
  if (!visiveis.value.length) return 0;
  if (conversacional.value) return Math.round((Math.max(etapa.value, 0) / visiveis.value.length) * 100);
  return Math.round((respondidas.value / visiveis.value.length) * 100);
});
const minutos = computed(() => Math.max(1, Math.round((props.formulario.perguntas?.length ?? 0) * 0.25)));
const encerrado = computed(() => !props.previa && props.formulario.ativo === false);

watchEffect(() => carregarFonte(tema.value.fonte));

function responder(pergunta, valor) {
  respostas[pergunta.id] = valor;
  delete erros[pergunta.id];
}

// ---------- Modo conversacional ----------
function comecar() {
  direcao.value = 'frente';
  etapa.value = 0;
  inicio.value = Date.now();
}

function avancar(automatico = false) {
  clearTimeout(esperaAvanco);
  const p = atual.value;
  if (!p) return;
  if (automatico) {
    // Clicou numa opção: espera um instante para a pessoa ver a marcação
    if (ultima.value || p.tipo === 'multipla') return;
    esperaAvanco = setTimeout(() => avancar(false), 380);
    return;
  }
  const erro = validarValor(p, respostas[p.id]);
  if (erro) {
    erros[p.id] = erro;
    return;
  }
  if (ultima.value) {
    enviar();
    return;
  }
  direcao.value = 'frente';
  etapa.value++;
}

function voltar() {
  clearTimeout(esperaAvanco);
  if (etapa.value <= 0) return;
  direcao.value = 'tras';
  etapa.value--;
}

// Se a ramificação esconder perguntas, a etapa não pode passar do fim
watch(
  () => visiveis.value.length,
  (total) => {
    if (etapa.value >= total) etapa.value = Math.max(0, total - 1);
  },
);

// Teclado: Enter avança, letras escolhem opções, números dão nota
function tecla(evento) {
  if (!conversacional.value || enviado.value || encerrado.value) return;
  const alvo = evento.target.tagName;
  if (evento.key === 'Enter' && !evento.shiftKey) {
    if (alvo === 'INPUT' || alvo === 'TEXTAREA' || alvo === 'SELECT' || alvo === 'BUTTON') return;
    evento.preventDefault();
    if (etapa.value < 0) comecar();
    else avancar(false);
    return;
  }
  if (alvo === 'INPUT' || alvo === 'TEXTAREA' || alvo === 'SELECT') return;
  if (evento.ctrlKey || evento.metaKey || evento.altKey) return;
  if (evento.key === 'ArrowUp') return voltar();
  if (evento.key.length === 1 && campoAtual.value?.atalho(evento.key)) evento.preventDefault();
}

// ---------- Modo clássico ----------
function enviarClassico() {
  let primeiroErro = null;
  for (const p of visiveis.value) {
    const erro = validarValor(p, respostas[p.id]);
    if (erro) {
      erros[p.id] = erro;
      primeiroErro ??= p.id;
    }
  }
  if (primeiroErro) {
    raiz.value?.querySelector(`#q-${uid}-${primeiroErro}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    return;
  }
  enviar();
}

// ---------- Envio ----------
async function enviar() {
  enviando.value = true;
  erroEnvio.value = '';
  try {
    const duracao = Math.round((Date.now() - inicio.value) / 1000);
    await props.aoEnviar({ ...ramificacao.value.limpas }, duracao);
    enviado.value = true;
    apagarRascunho();
  } catch (e) {
    erroEnvio.value = e.message;
  } finally {
    enviando.value = false;
  }
}

function recomecar() {
  for (const chave of Object.keys(respostas)) delete respostas[chave];
  for (const chave of Object.keys(erros)) delete erros[chave];
  enviado.value = false;
  etapa.value = -1;
  inicio.value = Date.now();
}

// ---------- Rascunho: quem fecha a aba e volta continua de onde parou ----------
const chaveRascunho = computed(() => (props.previa || !props.formulario.id ? null : `rascunho-pesquisa-${props.formulario.id}`));

function apagarRascunho() {
  try {
    if (chaveRascunho.value) localStorage.removeItem(chaveRascunho.value);
  } catch {
    /* navegador sem localStorage */
  }
}

watch(
  respostas,
  () => {
    if (!chaveRascunho.value || enviado.value) return;
    try {
      localStorage.setItem(chaveRascunho.value, JSON.stringify({ respostas, etapa: etapa.value }));
    } catch {
      /* sem espaço ou bloqueado: segue sem rascunho */
    }
  },
  { deep: true },
);

const retomado = ref(false);
onMounted(() => {
  if (!props.previa) window.addEventListener('keydown', tecla);
  if (!chaveRascunho.value) return;
  try {
    const salvo = JSON.parse(localStorage.getItem(chaveRascunho.value) ?? 'null');
    if (salvo && Object.keys(salvo.respostas ?? {}).length) {
      Object.assign(respostas, salvo.respostas);
      if (conversacional.value) etapa.value = Math.min(salvo.etapa ?? 0, visiveis.value.length - 1);
      retomado.value = true;
    }
  } catch {
    /* rascunho inválido: ignora */
  }
});
onBeforeUnmount(() => {
  window.removeEventListener('keydown', tecla);
  clearTimeout(esperaAvanco);
});

// ---------- Prévia: acompanha a pergunta selecionada no editor ----------
watch(
  () => props.perguntaFoco,
  async (id) => {
    if (!props.previa || !id || enviado.value) return;
    const i = visiveis.value.findIndex((p) => p.id === id);
    if (conversacional.value) {
      if (i >= 0) {
        direcao.value = i >= etapa.value ? 'frente' : 'tras';
        etapa.value = i;
      }
    } else {
      await nextTick();
      raiz.value?.querySelector(`#q-${uid}-${id}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  },
);

// Ao trocar de modo no editor, volta ao início
watch(conversacional, () => {
  etapa.value = -1;
});
</script>

<template>
  <div ref="raiz" class="f-pagina" :class="{ previa, conversacional }" :style="estilo">
    <div class="f-progresso" v-if="!encerrado"><div :style="{ width: progresso + '%' }"></div></div>

    <!-- Pesquisa encerrada -->
    <div v-if="encerrado" class="f-centro">
      <div class="f-cartao f-final">
        <img v-if="tema.logo" :src="tema.logo" alt="" class="f-logo" />
        <div class="f-icone-final">🔒</div>
        <h1>{{ formulario.titulo }}</h1>
        <p>Esta pesquisa não está mais recebendo respostas. Obrigado pelo interesse!</p>
      </div>
    </div>

    <!-- Enviado -->
    <div v-else-if="enviado" class="f-centro">
      <div class="f-cartao f-final">
        <img v-if="tema.logo" :src="tema.logo" alt="" class="f-logo" />
        <div class="f-check">✓</div>
        <h1>{{ formulario.mensagemFinal || 'Obrigado! Sua resposta foi registrada.' }}</h1>
        <button v-if="previa" type="button" class="f-botao secundario" @click="recomecar">Recomeçar prévia</button>
      </div>
    </div>

    <!-- ===== Modo conversacional ===== -->
    <div v-else-if="conversacional" class="f-centro">
      <Transition :name="'f-' + direcao" mode="out-in">
        <!-- Boas-vindas -->
        <div v-if="etapa < 0" key="inicio" class="f-passo f-inicio">
          <img v-if="tema.logo" :src="tema.logo" alt="" class="f-logo" />
          <h1>{{ formulario.titulo || 'Pesquisa sem título' }}</h1>
          <p v-if="formulario.descricao" class="f-descricao">{{ formulario.descricao }}</p>
          <div class="f-acoes">
            <button type="button" class="f-botao" :disabled="!visiveis.length" @click="comecar">Começar</button>
            <span class="f-atalho">pressione <b>Enter ↵</b></span>
          </div>
          <p class="f-tempo">⏱ Leva cerca de {{ minutos }} min · {{ formulario.perguntas?.length ?? 0 }} perguntas</p>
          <p v-if="retomado" class="f-tempo">Você já tinha começado: suas respostas foram recuperadas.</p>
        </div>

        <!-- Uma pergunta -->
        <div v-else-if="atual" :key="atual.id" class="f-passo">
          <p class="f-numero">{{ etapa + 1 }} <span>→</span> de {{ visiveis.length }}</p>
          <h2 class="f-titulo">
            {{ atual.titulo || 'Pergunta sem enunciado' }}<span v-if="atual.obrigatoria" class="f-obrigatoria">*</span>
          </h2>
          <p v-if="atual.descricao" class="f-descricao">{{ atual.descricao }}</p>
          <CampoPergunta
            ref="campoAtual"
            :pergunta="atual"
            :model-value="respostas[atual.id]"
            :erro="erros[atual.id]"
            letras
            :autofoco="!previa"
            @update:model-value="responder(atual, $event)"
            @avancar="avancar"
          />
          <div class="f-acoes">
            <button type="button" class="f-botao" :disabled="enviando" @click="avancar(false)">
              {{ ultima ? (enviando ? 'Enviando...' : 'Enviar ✓') : 'OK ✓' }}
            </button>
            <span class="f-atalho" v-if="!previa">
              pressione <b>{{ atual.tipo === 'paragrafo' ? 'Ctrl + Enter' : 'Enter ↵' }}</b>
            </span>
          </div>
          <p v-if="erroEnvio" class="f-erro-envio">{{ erroEnvio }}</p>
        </div>
      </Transition>

      <div v-if="etapa >= 0" class="f-navegacao">
        <button type="button" :disabled="etapa <= 0" title="Voltar" @click="voltar">↑</button>
        <button type="button" :disabled="ultima" title="Avançar" @click="avancar(false)">↓</button>
      </div>
    </div>

    <!-- ===== Modo clássico ===== -->
    <div v-else class="f-classico">
      <header class="f-cartao f-cabecalho">
        <img v-if="tema.logo" :src="tema.logo" alt="" class="f-logo" />
        <h1>{{ formulario.titulo || 'Pesquisa sem título' }}</h1>
        <p v-if="formulario.descricao" class="f-descricao">{{ formulario.descricao }}</p>
        <p v-if="retomado" class="f-tempo">Suas respostas anteriores foram recuperadas.</p>
      </header>

      <TransitionGroup name="f-lista">
        <section
          v-for="(p, i) in visiveis"
          :id="`q-${uid}-${p.id}`"
          :key="p.id"
          class="f-cartao f-pergunta"
          :class="{ 'com-erro': erros[p.id], foco: previa && perguntaFoco === p.id }"
        >
          <h2 class="f-titulo">
            <span class="f-num">{{ i + 1 }}.</span> {{ p.titulo || 'Pergunta sem enunciado' }}
            <span v-if="p.obrigatoria" class="f-obrigatoria">*</span>
          </h2>
          <p v-if="p.descricao" class="f-descricao">{{ p.descricao }}</p>
          <CampoPergunta
            :pergunta="p"
            :model-value="respostas[p.id]"
            :erro="erros[p.id]"
            @update:model-value="responder(p, $event)"
          />
        </section>
      </TransitionGroup>

      <div class="f-rodape">
        <button type="button" class="f-botao" :disabled="enviando || !visiveis.length" @click="enviarClassico">
          {{ enviando ? 'Enviando...' : 'Enviar respostas' }}
        </button>
        <span class="f-tempo">{{ respondidas }} de {{ visiveis.length }} respondidas</span>
      </div>
      <p v-if="erroEnvio" class="f-erro-envio">{{ erroEnvio }}</p>
    </div>
  </div>
</template>

<style scoped>
.f-pagina {
  position: relative; min-height: 100vh; background: var(--f-fundo); color: var(--f-texto);
  font-family: var(--f-fonte); transition: background 0.3s, color 0.3s;
}
.f-pagina.previa { min-height: 100%; height: 100%; overflow-y: auto; }
.f-progresso { position: sticky; top: 0; height: 4px; background: var(--f-suave); z-index: 2; }
.f-progresso div { height: 100%; background: var(--f-primaria); transition: width 0.4s ease; }

.f-cartao { background: var(--f-cartao); border: 1px solid var(--f-borda); border-radius: calc(var(--f-cantos) + 4px); padding: 28px; }
.f-logo { max-height: 56px; max-width: 200px; object-fit: contain; margin-bottom: 18px; display: block; }
h1 { font-size: 1.9rem; line-height: 1.2; margin: 0 0 8px; }
.f-descricao { opacity: 0.75; margin: 0 0 14px; line-height: 1.5; white-space: pre-line; }
.f-titulo { font-size: 1.25rem; font-weight: 600; line-height: 1.35; margin: 0 0 8px; }
.f-obrigatoria { color: var(--f-primaria); margin-left: 4px; }
.f-tempo { font-size: 0.85rem; opacity: 0.6; margin: 10px 0 0; }

.f-botao {
  font: inherit; font-weight: 700; font-size: 1rem; cursor: pointer; padding: 12px 24px;
  background: var(--f-primaria); color: var(--f-sobre-primaria); border: 0; border-radius: var(--f-cantos);
  transition: filter 0.15s, transform 0.1s; box-shadow: 0 4px 14px var(--f-suave);
}
.f-botao:hover { filter: brightness(1.08); }
.f-botao:active { transform: translateY(1px); }
.f-botao:disabled { opacity: 0.5; cursor: not-allowed; }
.f-botao.secundario { background: transparent; color: var(--f-primaria); border: 1.5px solid var(--f-primaria); box-shadow: none; margin-top: 18px; }
.f-acoes { display: flex; align-items: center; gap: 14px; margin-top: 22px; flex-wrap: wrap; }
.f-atalho { font-size: 0.82rem; opacity: 0.6; }
.f-erro-envio { color: #dc2626; font-weight: 600; margin-top: 12px; }

/* Conversacional */
.f-centro { display: flex; align-items: center; justify-content: center; min-height: calc(100vh - 4px); padding: 40px 24px 90px; }
.previa .f-centro { min-height: calc(100% - 4px); }
.f-passo { width: 100%; max-width: 640px; }
.f-inicio h1 { font-size: 2.3rem; }
.f-numero { font-size: 0.9rem; font-weight: 700; color: var(--f-primaria); margin: 0 0 8px; }
.f-numero span { margin: 0 2px; }
.conversacional .f-titulo { font-size: 1.6rem; }
.f-navegacao { position: absolute; right: 20px; bottom: 20px; display: flex; gap: 2px; }
.f-navegacao button {
  width: 38px; height: 38px; font-size: 1.1rem; cursor: pointer; border: 0;
  background: var(--f-primaria); color: var(--f-sobre-primaria);
}
.f-navegacao button:first-child { border-radius: var(--f-cantos) 0 0 var(--f-cantos); }
.f-navegacao button:last-child { border-radius: 0 var(--f-cantos) var(--f-cantos) 0; }
.f-navegacao button:disabled { opacity: 0.4; cursor: default; }

/* Transições entre perguntas */
.f-frente-enter-active, .f-frente-leave-active, .f-tras-enter-active, .f-tras-leave-active { transition: all 0.28s ease; }
.f-frente-enter-from { opacity: 0; transform: translateY(40px); }
.f-frente-leave-to { opacity: 0; transform: translateY(-40px); }
.f-tras-enter-from { opacity: 0; transform: translateY(-40px); }
.f-tras-leave-to { opacity: 0; transform: translateY(40px); }

/* Clássico */
.f-classico { max-width: 720px; margin: 0 auto; padding: 32px 20px 60px; display: flex; flex-direction: column; gap: 14px; }
.f-cabecalho { border-top: 8px solid var(--f-primaria); }
.f-pergunta { transition: border-color 0.2s, box-shadow 0.2s; padding: 22px 24px; }
.f-pergunta.com-erro { border-color: #dc2626; }
.f-pergunta.foco { box-shadow: 0 0 0 3px var(--f-primaria); }
.f-num { opacity: 0.5; margin-right: 4px; }
.f-rodape { display: flex; align-items: center; gap: 16px; flex-wrap: wrap; margin-top: 6px; }
.f-rodape .f-tempo { margin: 0; }
.f-lista-enter-active, .f-lista-leave-active { transition: all 0.3s ease; }
.f-lista-enter-from, .f-lista-leave-to { opacity: 0; transform: translateY(-10px); }
.f-lista-move { transition: transform 0.3s ease; }

/* Final */
.f-final { text-align: center; max-width: 520px; width: 100%; }
.f-final .f-logo { margin: 0 auto 18px; }
.f-final h1 { font-size: 1.5rem; }
.f-check {
  width: 72px; height: 72px; margin: 0 auto 18px; border-radius: 50%; display: grid; place-items: center;
  background: var(--f-primaria); color: var(--f-sobre-primaria); font-size: 2.2rem; animation: surgir 0.5s cubic-bezier(0.2, 1.6, 0.4, 1);
}
.f-icone-final { font-size: 2.6rem; margin-bottom: 10px; }
@keyframes surgir { from { transform: scale(0); } }

@media (max-width: 600px) {
  .f-cartao { padding: 20px; }
  h1, .f-inicio h1 { font-size: 1.6rem; }
  .conversacional .f-titulo { font-size: 1.3rem; }
}
</style>

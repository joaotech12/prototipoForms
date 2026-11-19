<script setup>
// Desenha o campo certo para cada tipo de pergunta (texto, opções, NPS, estrelas...)
import { computed, nextTick, onMounted, ref } from 'vue';
import { opcoesDaPergunta } from '@/services/regras';

const props = defineProps({
  pergunta: { type: Object, required: true },
  modelValue: { default: null },
  letras: { type: Boolean, default: false }, // mostra A, B, C nas opções (modo conversacional)
  autofoco: { type: Boolean, default: false },
  erro: { type: String, default: '' },
});
const emit = defineEmits(['update:modelValue', 'avancar']);

const LETRAS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
const ROSTOS = [
  { nota: 1, rosto: '😡', rotulo: 'Muito insatisfeito' },
  { nota: 2, rosto: '🙁', rotulo: 'Insatisfeito' },
  { nota: 3, rosto: '😐', rotulo: 'Neutro' },
  { nota: 4, rosto: '🙂', rotulo: 'Satisfeito' },
  { nota: 5, rosto: '😍', rotulo: 'Muito satisfeito' },
];

const entrada = ref(null);
const tipo = computed(() => props.pergunta.tipo);
const opcoes = computed(() => opcoesDaPergunta(props.pergunta));
const tipoDoInput = computed(() => ({ email: 'email', numero: 'number', data: 'date' })[tipo.value] ?? 'text');
const placeholder = computed(
  () => ({ email: 'nome@exemplo.com', numero: 'Digite um número', texto: 'Digite sua resposta...' })[tipo.value] ?? '',
);

const atualizar = (valor) => emit('update:modelValue', valor);

function digitar(evento) {
  const texto = evento.target.value;
  if (tipo.value === 'numero') atualizar(texto === '' ? null : Number(texto));
  else atualizar(texto);
}

// Escolha única / sim-não / notas: marca e pede para avançar sozinho
function escolher(valor) {
  atualizar(valor);
  emit('avancar', true);
}

function alternar(opcao) {
  const lista = Array.isArray(props.modelValue) ? [...props.modelValue] : [];
  const i = lista.indexOf(opcao);
  if (i >= 0) lista.splice(i, 1);
  else lista.push(opcao);
  atualizar(lista);
}

const marcada = (opcao) =>
  Array.isArray(props.modelValue) ? props.modelValue.includes(opcao) : String(props.modelValue ?? '') === opcao;

// Atalhos de teclado vindos do formulário: letras escolhem opções, números dão nota
function atalho(tecla) {
  if (tipo.value === 'nps' && /^[0-9]$/.test(tecla)) {
    escolher(Number(tecla));
    return true;
  }
  if (tipo.value === 'csat' && /^[1-5]$/.test(tecla)) {
    escolher(Number(tecla));
    return true;
  }
  const i = LETRAS.indexOf(tecla.toUpperCase());
  if (i < 0 || i >= opcoes.value.length) return false;
  const opcao = opcoes.value[i];
  if (tipo.value === 'multipla') alternar(opcao);
  else if (['unica', 'simnao', 'lista'].includes(tipo.value)) escolher(opcao);
  else return false;
  return true;
}

function focar() {
  nextTick(() => entrada.value?.focus({ preventScroll: true }));
}

onMounted(() => {
  if (props.autofoco) focar();
});

defineExpose({ atalho, focar });
</script>

<template>
  <div class="campo-pergunta">
    <!-- Texto curto, e-mail, número e data -->
    <input
      v-if="['texto', 'email', 'numero', 'data'].includes(tipo)"
      ref="entrada"
      class="f-entrada"
      :type="tipoDoInput"
      :value="modelValue ?? ''"
      :placeholder="placeholder"
      :inputmode="tipo === 'numero' ? 'decimal' : undefined"
      @input="digitar"
      @keydown.enter.prevent="emit('avancar', false)"
    />

    <!-- Parágrafo: Enter quebra linha, Ctrl+Enter avança -->
    <textarea
      v-else-if="tipo === 'paragrafo'"
      ref="entrada"
      class="f-entrada"
      rows="4"
      :value="modelValue ?? ''"
      placeholder="Escreva aqui..."
      @input="digitar"
      @keydown.enter.ctrl.prevent="emit('avancar', false)"
    ></textarea>

    <!-- Lista suspensa -->
    <select
      v-else-if="tipo === 'lista'"
      ref="entrada"
      class="f-entrada"
      :value="modelValue ?? ''"
      @change="escolher($event.target.value)"
    >
      <option value="" disabled>Selecione uma opção...</option>
      <option v-for="o in opcoes" :key="o" :value="o">{{ o }}</option>
    </select>

    <!-- Escolha única, múltipla e sim/não -->
    <div v-else-if="['unica', 'multipla', 'simnao'].includes(tipo)" class="f-opcoes" :class="{ lado: tipo === 'simnao' }">
      <button
        v-for="(o, i) in opcoes"
        :key="o"
        type="button"
        class="f-opcao"
        :class="{ marcada: marcada(o) }"
        @click="tipo === 'multipla' ? alternar(o) : escolher(o)"
      >
        <span v-if="letras" class="f-letra">{{ LETRAS[i] }}</span>
        <span v-else class="f-marcador" :class="{ quadrado: tipo === 'multipla' }"></span>
        <span class="f-texto-opcao">{{ o }}</span>
        <span class="f-visto">✓</span>
      </button>
      <p v-if="tipo === 'multipla'" class="f-dica">Pode marcar mais de uma.</p>
    </div>

    <!-- NPS: 0 a 10 -->
    <div v-else-if="tipo === 'nps'" class="f-nps">
      <div class="f-nps-botoes">
        <button
          v-for="n in 11"
          :key="n"
          type="button"
          class="f-nota"
          :class="{ marcada: modelValue !== null && modelValue !== undefined && Number(modelValue) === n - 1 }"
          @click="escolher(n - 1)"
        >
          {{ n - 1 }}
        </button>
      </div>
      <div class="f-legenda"><span>0 · Nada provável</span><span>10 · Muito provável</span></div>
    </div>

    <!-- CSAT: 1 a 5 com rostinhos -->
    <div v-else-if="tipo === 'csat'" class="f-csat">
      <button
        v-for="r in ROSTOS"
        :key="r.nota"
        type="button"
        class="f-rosto"
        :class="{ marcada: Number(modelValue) === r.nota, apagado: modelValue && Number(modelValue) !== r.nota }"
        :title="r.rotulo"
        @click="escolher(r.nota)"
      >
        <span class="emoji">{{ r.rosto }}</span>
        <small>{{ r.rotulo }}</small>
      </button>
    </div>

    <Transition name="f-erro">
      <p v-if="erro" class="f-erro">⚠ {{ erro }}</p>
    </Transition>
  </div>
</template>

<style scoped>
.campo-pergunta { display: flex; flex-direction: column; gap: 10px; }

.f-entrada {
  width: 100%; font: inherit; font-size: 1.05rem; color: var(--f-texto);
  background: var(--f-cartao); border: 1.5px solid var(--f-borda); border-radius: var(--f-cantos);
  padding: 12px 14px; transition: border-color 0.15s, box-shadow 0.15s;
}
.f-entrada:focus { outline: none; border-color: var(--f-primaria); box-shadow: 0 0 0 4px var(--f-suave); }
.f-entrada::placeholder { color: var(--f-texto); opacity: 0.4; }
textarea.f-entrada { resize: vertical; min-height: 110px; }
select.f-entrada { cursor: pointer; }

.f-opcoes { display: flex; flex-direction: column; gap: 8px; }
.f-opcoes.lado { flex-direction: row; flex-wrap: wrap; }
.f-opcoes.lado .f-opcao { flex: 1; min-width: 130px; }
.f-opcao {
  display: flex; align-items: center; gap: 12px; width: 100%; text-align: left;
  font: inherit; font-size: 1rem; color: var(--f-texto); cursor: pointer;
  background: var(--f-cartao); border: 1.5px solid var(--f-borda); border-radius: var(--f-cantos);
  padding: 11px 14px; transition: border-color 0.15s, background 0.15s, transform 0.1s;
}
.f-opcao:hover { border-color: var(--f-primaria); }
.f-opcao:active { transform: scale(0.99); }
.f-opcao.marcada { border-color: var(--f-primaria); background: var(--f-suave); }
.f-letra {
  display: grid; place-items: center; width: 26px; height: 26px; flex: none; font-size: 0.8rem; font-weight: 700;
  border: 1.5px solid var(--f-primaria); color: var(--f-primaria); border-radius: 6px; background: var(--f-cartao);
}
.f-opcao.marcada .f-letra { background: var(--f-primaria); color: var(--f-sobre-primaria); }
.f-marcador { width: 18px; height: 18px; flex: none; border: 2px solid var(--f-borda); border-radius: 50%; position: relative; }
.f-marcador.quadrado { border-radius: 5px; }
.f-opcao.marcada .f-marcador { border-color: var(--f-primaria); background: var(--f-primaria); box-shadow: inset 0 0 0 3px var(--f-cartao); }
.f-texto-opcao { flex: 1; }
.f-visto { color: var(--f-primaria); font-weight: 700; opacity: 0; transform: scale(0.5); transition: all 0.2s; }
.f-opcao.marcada .f-visto { opacity: 1; transform: scale(1); }
.f-dica { font-size: 0.85rem; opacity: 0.6; }

.f-nps-botoes { display: grid; grid-template-columns: repeat(11, 1fr); gap: 6px; }
.f-nota {
  aspect-ratio: 1; min-width: 0; font: inherit; font-weight: 700; font-size: 1rem; cursor: pointer;
  color: var(--f-texto); background: var(--f-cartao); border: 1.5px solid var(--f-borda); border-radius: var(--f-cantos);
  transition: all 0.15s;
}
.f-nota:hover { border-color: var(--f-primaria); transform: translateY(-2px); }
.f-nota.marcada { background: var(--f-primaria); border-color: var(--f-primaria); color: var(--f-sobre-primaria); transform: scale(1.08); }
.f-legenda { display: flex; justify-content: space-between; font-size: 0.8rem; opacity: 0.6; margin-top: 4px; }

.f-csat { display: grid; grid-template-columns: repeat(5, 1fr); gap: 8px; }
.f-rosto {
  display: flex; flex-direction: column; align-items: center; gap: 4px; padding: 12px 4px; cursor: pointer;
  font: inherit; color: var(--f-texto); background: var(--f-cartao); border: 1.5px solid var(--f-borda);
  border-radius: var(--f-cantos); transition: all 0.2s;
}
.f-rosto .emoji { font-size: 2rem; transition: transform 0.2s; }
.f-rosto small { font-size: 0.7rem; opacity: 0.7; text-align: center; line-height: 1.2; }
.f-rosto:hover .emoji { transform: scale(1.2); }
.f-rosto.marcada { border-color: var(--f-primaria); background: var(--f-suave); }
.f-rosto.marcada .emoji { transform: scale(1.25); }
.f-rosto.apagado { opacity: 0.45; }

.f-erro { color: #dc2626; font-size: 0.9rem; font-weight: 600; }
.f-erro-enter-active { animation: tremer 0.35s; }
@keyframes tremer { 25% { transform: translateX(-6px); } 50% { transform: translateX(6px); } 75% { transform: translateX(-3px); } }

@media (max-width: 520px) {
  .f-nps-botoes { grid-template-columns: repeat(6, 1fr); }
  .f-rosto small { display: none; }
}
</style>

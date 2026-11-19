<script setup>
// Cartão de uma pergunta no editor: enunciado, tipo, opções e ramificação ("mostrar só se...")
import { computed, nextTick, ref, watch } from 'vue';
import { OPERADORES, operadoresDoTipo, opcoesDaPergunta } from '@/services/regras';
import { TIPOS_PERGUNTA, infoDoTipo, temOpcoesEditaveis } from '@/services/tipos';

const props = defineProps({
  pergunta: { type: Object, required: true },
  indice: { type: Number, required: true },
  total: { type: Number, required: true },
  anteriores: { type: Array, default: () => [] }, // perguntas que vêm antes (para a ramificação)
  selecionada: { type: Boolean, default: false },
});
const emit = defineEmits(['selecionar', 'mover', 'duplicar', 'excluir', 'segurar']);

const p = props.pergunta; // o objeto é do editor; alteramos os campos dele diretamente
const campoTitulo = ref(null);
const colando = ref(false);
const textoColado = ref('');
const info = computed(() => infoDoTipo(p.tipo));
const editaOpcoes = computed(() => temOpcoesEditaveis(p.tipo));

watch(
  () => props.selecionada,
  async (sim) => {
    if (sim && !p.titulo) {
      await nextTick();
      campoTitulo.value?.focus();
    }
  },
  { immediate: true },
);

function trocarTipo(novo) {
  p.tipo = novo;
  if (temOpcoesEditaveis(novo) && !(p.opcoes ?? []).length) p.opcoes = ['Opção 1', 'Opção 2'];
}

// ---------- Opções ----------
async function adicionarOpcao(depois = p.opcoes.length - 1) {
  p.opcoes.splice(depois + 1, 0, '');
  await nextTick();
  document.getElementById(`opcao-${p.id}-${depois + 1}`)?.focus();
}
function removerOpcao(i) {
  p.opcoes.splice(i, 1);
}
function aplicarColagem() {
  const linhas = textoColado.value.split('\n').map((l) => l.trim()).filter(Boolean);
  if (linhas.length) p.opcoes = [...new Set(linhas)];
  colando.value = false;
  textoColado.value = '';
}
const repetidas = computed(() => {
  const vistas = new Set();
  return (p.opcoes ?? []).filter((o) => {
    const chave = o.trim().toLowerCase();
    if (!chave) return false;
    if (vistas.has(chave)) return true;
    vistas.add(chave);
    return false;
  });
});

// ---------- Ramificação ----------
const perguntaDa = (id) => props.anteriores.find((a) => a.id === id);
const operadoresPara = (c) => {
  const origem = perguntaDa(c.perguntaId);
  return OPERADORES.filter((o) => operadoresDoTipo(origem?.tipo ?? 'texto').includes(o.valor));
};
const opcoesPara = (c) => {
  const origem = perguntaDa(c.perguntaId);
  return origem ? opcoesDaPergunta(origem) : [];
};

function valorPadrao(origem) {
  if (!origem) return '';
  if (origem.tipo === 'nps') return 7;
  if (origem.tipo === 'csat') return 4;
  return opcoesDaPergunta(origem)[0] ?? '';
}

function adicionarCondicao() {
  const origem = props.anteriores[props.anteriores.length - 1];
  if (!origem) return;
  p.condicoes = p.condicoes ?? [];
  p.condicoes.push({ perguntaId: origem.id, operador: operadoresDoTipo(origem.tipo)[0], valor: valorPadrao(origem) });
}

function trocarOrigem(c, id) {
  const origem = perguntaDa(id);
  c.perguntaId = id;
  c.operador = operadoresDoTipo(origem?.tipo)[0];
  c.valor = valorPadrao(origem);
}

function removerCondicao(i) {
  p.condicoes.splice(i, 1);
}

const numerico = (c) => ['nps', 'csat', 'numero'].includes(perguntaDa(c.perguntaId)?.tipo);

// Resumo da regra para o cartão fechado
const resumoRegra = computed(() => {
  const cs = p.condicoes ?? [];
  if (!cs.length) return '';
  return cs
    .map((c) => {
      const origem = perguntaDa(c.perguntaId);
      const op = OPERADORES.find((o) => o.valor === c.operador)?.rotulo ?? '';
      const nome = origem ? `"${origem.titulo || 'sem título'}"` : '(pergunta removida)';
      return c.operador === 'respondida' ? `${nome} ${op}` : `${nome} ${op} ${c.valor}`;
    })
    .join(p.logica === 'qualquer' ? ' ou ' : ' e ');
});
</script>

<template>
  <article class="pergunta" :class="{ selecionada }" @click="emit('selecionar')">
    <div class="topo-pergunta">
      <span class="alca" title="Arraste para mudar a ordem" @mousedown="emit('segurar')">⠿</span>
      <span class="numero">{{ indice + 1 }}</span>
      <span class="tipo-icone" :title="info.rotulo">{{ info.icone }}</span>
      <div class="resumo" v-if="!selecionada">
        <b>{{ p.titulo || 'Pergunta sem enunciado' }}<span v-if="p.obrigatoria" class="obrig">*</span></b>
        <small v-if="resumoRegra" class="regra">🔀 Só se {{ resumoRegra }}</small>
        <small v-else class="suave">{{ info.rotulo }}<template v-if="editaOpcoes"> · {{ p.opcoes.length }} opções</template></small>
      </div>
      <span v-else class="espaco"></span>
      <div class="acoes" @click.stop>
        <button class="botao fantasma icone" title="Subir" :disabled="indice === 0" @click="emit('mover', -1)">↑</button>
        <button class="botao fantasma icone" title="Descer" :disabled="indice === total - 1" @click="emit('mover', 1)">↓</button>
        <button class="botao fantasma icone" title="Duplicar" @click="emit('duplicar')">⧉</button>
        <button class="botao fantasma icone perigo" title="Excluir" @click="emit('excluir')">🗑</button>
      </div>
    </div>

    <div v-if="selecionada" class="corpo" @click.stop>
      <div class="grade-campos">
        <label class="campo largo">
          <span>Enunciado</span>
          <input ref="campoTitulo" v-model="p.titulo" placeholder="Escreva a pergunta..." maxlength="500" />
        </label>
        <label class="campo">
          <span>Tipo</span>
          <select :value="p.tipo" @change="trocarTipo($event.target.value)">
            <optgroup v-for="g in ['Texto', 'Escolha', 'Métricas']" :key="g" :label="g">
              <option v-for="t in TIPOS_PERGUNTA.filter((t) => t.grupo === g)" :key="t.valor" :value="t.valor">
                {{ t.icone }} {{ t.rotulo }}
              </option>
            </optgroup>
          </select>
        </label>
      </div>

      <label class="campo">
        <span>Descrição (opcional)</span>
        <input v-model="p.descricao" placeholder="Um texto de ajuda abaixo da pergunta" maxlength="1000" />
      </label>

      <label class="interruptor">
        <input v-model="p.obrigatoria" type="checkbox" />
        <span class="trilho"></span>
        Resposta obrigatória
      </label>

      <!-- Opções (escolha única, múltipla, lista) -->
      <div v-if="editaOpcoes" class="bloco">
        <div class="linha">
          <span class="rotulo">Opções</span>
          <span class="espaco"></span>
          <button class="botao pequeno fantasma" @click="colando = !colando">📋 Colar várias</button>
        </div>
        <div v-if="colando" class="colar">
          <textarea v-model="textoColado" rows="4" placeholder="Uma opção por linha"></textarea>
          <div class="linha">
            <button class="botao pequeno primario" @click="aplicarColagem">Usar estas opções</button>
            <button class="botao pequeno" @click="colando = false">Cancelar</button>
          </div>
        </div>
        <TransitionGroup tag="div" name="opcao" class="opcoes">
          <div v-for="(o, i) in p.opcoes" :key="i" class="opcao">
            <span class="marcador" :class="{ quadrado: p.tipo === 'multipla' }"></span>
            <input
              :id="`opcao-${p.id}-${i}`"
              v-model="p.opcoes[i]"
              :class="{ repetida: repetidas.includes(o) }"
              :placeholder="`Opção ${i + 1}`"
              @keydown.enter.prevent="adicionarOpcao(i)"
              @keydown.backspace="!p.opcoes[i] && p.opcoes.length > 1 && ($event.preventDefault(), removerOpcao(i))"
            />
            <button class="botao fantasma icone" title="Remover opção" :disabled="p.opcoes.length <= 1" @click="removerOpcao(i)">×</button>
          </div>
        </TransitionGroup>
        <p v-if="repetidas.length" class="aviso-campo">Há opções repetidas.</p>
        <button class="botao pequeno" @click="adicionarOpcao()">+ Adicionar opção</button>
        <p class="suave pequeno">Dica: Enter cria a próxima opção; Backspace num campo vazio apaga.</p>
      </div>

      <!-- Ramificação -->
      <div class="bloco ramificacao">
        <div class="linha">
          <span class="rotulo">🔀 Mostrar esta pergunta só se...</span>
          <span class="espaco"></span>
          <button class="botao pequeno" :disabled="!anteriores.length" @click="adicionarCondicao">+ Condição</button>
        </div>
        <p v-if="!anteriores.length" class="suave pequeno">A primeira pergunta sempre aparece.</p>
        <p v-else-if="!(p.condicoes ?? []).length" class="suave pequeno">Sem condições: a pergunta aparece sempre.</p>

        <div v-for="(c, i) in p.condicoes" :key="i" class="condicao">
          <select :value="c.perguntaId" @change="trocarOrigem(c, $event.target.value)">
            <option v-for="a in anteriores" :key="a.id" :value="a.id">
              {{ anteriores.indexOf(a) + 1 }}. {{ a.titulo || 'Pergunta sem enunciado' }}
            </option>
          </select>
          <select v-model="c.operador">
            <option v-for="o in operadoresPara(c)" :key="o.valor" :value="o.valor">{{ o.rotulo }}</option>
          </select>
          <template v-if="c.operador !== 'respondida'">
            <select v-if="opcoesPara(c).length" v-model="c.valor">
              <option v-for="o in opcoesPara(c)" :key="o" :value="numerico(c) ? Number(o) : o">{{ o }}</option>
            </select>
            <input v-else-if="numerico(c)" v-model.number="c.valor" type="number" placeholder="valor" />
            <input v-else v-model="c.valor" placeholder="texto" />
          </template>
          <button class="botao fantasma icone perigo" title="Remover condição" @click="removerCondicao(i)">×</button>
        </div>

        <label v-if="(p.condicoes ?? []).length > 1" class="campo logica">
          <span>Mostrar quando</span>
          <select v-model="p.logica">
            <option value="todas">TODAS as condições forem verdadeiras (e)</option>
            <option value="qualquer">QUALQUER uma for verdadeira (ou)</option>
          </select>
        </label>
      </div>
    </div>
  </article>
</template>

<style scoped>
.pergunta {
  background: var(--cartao); border: 1px solid var(--borda); border-radius: var(--raio); padding: 12px 14px;
  cursor: pointer; transition: border-color 0.15s, box-shadow 0.15s;
}
.pergunta:hover { border-color: #c4b5fd; }
.pergunta.selecionada { border-color: var(--primaria); box-shadow: 0 0 0 3px var(--primaria-suave); cursor: default; }
.topo-pergunta { display: flex; align-items: center; gap: 10px; }
.alca { cursor: grab; color: #9ca3af; font-size: 1.1rem; padding: 0 2px; user-select: none; }
.alca:active { cursor: grabbing; }
.numero { font-weight: 700; color: var(--texto-suave); font-size: 0.85rem; min-width: 18px; }
.tipo-icone { width: 30px; height: 30px; border-radius: 8px; display: grid; place-items: center; background: var(--primaria-suave); color: var(--primaria); font-size: 0.9rem; font-weight: 700; flex: none; }
.resumo { flex: 1; min-width: 0; display: flex; flex-direction: column; }
.resumo b { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; font-size: 0.95rem; }
.resumo small { font-size: 0.78rem; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.obrig { color: var(--primaria); margin-left: 3px; }
.regra { color: var(--azul); }
.acoes { display: flex; gap: 0; opacity: 0.6; transition: opacity 0.15s; }
.pergunta:hover .acoes, .pergunta.selecionada .acoes { opacity: 1; }
.acoes .perigo:hover { background: #fef2f2; }

.corpo { display: flex; flex-direction: column; gap: 14px; margin-top: 14px; padding-top: 14px; border-top: 1px solid var(--borda); }
.grade-campos { display: grid; grid-template-columns: 1fr 210px; gap: 12px; }
.bloco { display: flex; flex-direction: column; gap: 8px; padding: 12px; background: var(--fundo); border-radius: 10px; }
.opcoes { display: flex; flex-direction: column; gap: 6px; }
.opcao { display: flex; align-items: center; gap: 8px; }
.opcao input.repetida { border-color: var(--amarelo); }
.marcador { width: 16px; height: 16px; border: 2px solid #c4c4c4; border-radius: 50%; flex: none; }
.marcador.quadrado { border-radius: 4px; }
.colar { display: flex; flex-direction: column; gap: 8px; }
.aviso-campo { color: #b45309; font-size: 0.82rem; }
.condicao { display: grid; grid-template-columns: 1.4fr 1fr 1fr auto; gap: 6px; align-items: center; }
.condicao select, .condicao input { padding: 7px 8px; font-size: 0.85rem; }
.ramificacao { background: #eff6ff; }
.logica { margin-top: 4px; }
.opcao-enter-active, .opcao-leave-active { transition: all 0.2s; }
.opcao-enter-from, .opcao-leave-to { opacity: 0; transform: translateX(-8px); }

@media (max-width: 640px) {
  .grade-campos { grid-template-columns: 1fr; }
  .condicao { grid-template-columns: 1fr; }
}
</style>

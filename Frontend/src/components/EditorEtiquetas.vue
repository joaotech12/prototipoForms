<script setup>
// Campo de etiquetas em "chips": digite e aperte Enter (ou vírgula) para adicionar; × remove.
// Emite update:modelValue (lista nova) e também adicionar/remover (para quem salva na hora).
import { computed, ref } from 'vue';
import { limparEtiqueta } from '@/services/tipos';

const props = defineProps({
  modelValue: { type: Array, default: () => [] },
  sugestoes: { type: Array, default: () => [] },
  maximo: { type: Number, default: 10 },
});
const emit = defineEmits(['update:modelValue', 'adicionar', 'remover']);

const texto = ref('');
const idLista = `sugestoes-${Math.random().toString(36).slice(2, 7)}`;
const restantes = computed(() => props.sugestoes.filter((s) => !props.modelValue.includes(s)));
const cheio = computed(() => props.modelValue.length >= props.maximo);

function adicionar() {
  const etiqueta = limparEtiqueta(texto.value.replace(/,/g, ''));
  texto.value = '';
  if (!etiqueta || props.modelValue.includes(etiqueta) || cheio.value) return;
  emit('update:modelValue', [...props.modelValue, etiqueta]);
  emit('adicionar', etiqueta);
}

function remover(etiqueta) {
  emit('update:modelValue', props.modelValue.filter((e) => e !== etiqueta));
  emit('remover', etiqueta);
}

function tecla(evento) {
  if (evento.key === 'Enter' || evento.key === ',') {
    evento.preventDefault();
    adicionar();
  } else if (evento.key === 'Backspace' && !texto.value && props.modelValue.length) {
    remover(props.modelValue[props.modelValue.length - 1]);
  }
}
</script>

<template>
  <div class="etiquetas-campo" @click="$event.currentTarget.querySelector('input')?.focus()">
    <TransitionGroup name="chip">
      <span v-for="e in modelValue" :key="e" class="chip-etiqueta">
        #{{ e }}
        <button type="button" title="Remover etiqueta" @click.stop="remover(e)">×</button>
      </span>
    </TransitionGroup>
    <input
      v-model="texto"
      :list="idLista"
      :disabled="cheio"
      :placeholder="cheio ? 'Máximo de etiquetas' : modelValue.length ? 'Mais uma...' : 'Digite e aperte Enter'"
      maxlength="30"
      @keydown="tecla"
      @change="restantes.includes(limparEtiqueta(texto)) && adicionar()"
    />
    <datalist :id="idLista">
      <option v-for="s in restantes" :key="s" :value="s" />
    </datalist>
  </div>
</template>

<style scoped>
.etiquetas-campo {
  display: flex; flex-wrap: wrap; gap: 6px; align-items: center; padding: 6px 8px; min-height: 42px;
  border: 1px solid var(--borda); border-radius: 8px; background: #fff; cursor: text;
}
.etiquetas-campo:focus-within { border-color: var(--primaria); box-shadow: 0 0 0 3px var(--primaria-suave); }
.etiquetas-campo input { flex: 1; min-width: 120px; border: 0; padding: 4px; box-shadow: none; }
.chip-etiqueta { display: inline-flex; align-items: center; gap: 2px; padding: 3px 4px 3px 9px; border-radius: 99px; background: var(--primaria-suave); color: var(--primaria); font-size: 0.82rem; font-weight: 600; }
.chip-etiqueta button { border: 0; background: none; color: inherit; cursor: pointer; font-size: 1rem; line-height: 1; padding: 0 4px; border-radius: 50%; }
.chip-etiqueta button:hover { background: #0000001a; }
.chip-enter-active, .chip-leave-active { transition: all 0.2s; }
.chip-enter-from, .chip-leave-to { opacity: 0; transform: scale(0.7); }
</style>

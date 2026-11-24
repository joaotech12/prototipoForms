<script setup>
// Escolher uma imagem: enviar arquivo (reduzido automaticamente), colar URL ou usar uma pronta
import { ref } from 'vue';
import { avisar } from '@/services/avisos';
import { IMAGENS_PRONTAS, reduzirImagem } from '@/services/imagens';
import { imagemSegura } from '@/services/tema';

const props = defineProps({
  modelValue: { type: String, default: '' },
  tamanhoMaximo: { type: Number, default: 1600 },
  formato: { type: String, default: 'image/jpeg' }, // logo usa PNG para manter a transparência
  prontas: { type: Boolean, default: false },
  altura: { type: String, default: '90px' },
});
const emit = defineEmits(['update:modelValue']);

const url = ref(props.modelValue.startsWith('http') ? props.modelValue : '');
const processando = ref(false);
const mostrarProntas = ref(false);

async function escolherArquivo(evento) {
  const arquivo = evento.target.files?.[0];
  evento.target.value = '';
  if (!arquivo) return;
  processando.value = true;
  try {
    emit('update:modelValue', await reduzirImagem(arquivo, { tamanhoMaximo: props.tamanhoMaximo, formato: props.formato }));
    url.value = '';
  } catch (e) {
    avisar(e.message, 'erro');
  } finally {
    processando.value = false;
  }
}

function usarUrl() {
  const endereco = url.value.trim();
  if (endereco && !imagemSegura(endereco)) return avisar('O endereço precisa começar com http:// ou https://', 'erro');
  emit('update:modelValue', endereco);
}

function usarPronta(endereco) {
  url.value = endereco;
  emit('update:modelValue', endereco);
  mostrarProntas.value = false;
}
</script>

<template>
  <div class="seletor">
    <div class="linha">
      <div class="miniatura" :style="{ height: altura }">
        <img v-if="modelValue" :src="modelValue" alt="" />
        <span v-else class="suave pequeno">{{ processando ? 'Reduzindo...' : 'sem imagem' }}</span>
      </div>
      <div class="botoes">
        <label class="botao pequeno">
          📁 Enviar
          <input type="file" accept="image/*" hidden @change="escolherArquivo" />
        </label>
        <button v-if="prontas" class="botao pequeno" @click="mostrarProntas = !mostrarProntas">🖼 Galeria</button>
        <button v-if="modelValue" class="botao pequeno perigo" @click="emit('update:modelValue', ''); url = ''">Remover</button>
      </div>
    </div>
    <div v-if="mostrarProntas" class="galeria">
      <button v-for="img in IMAGENS_PRONTAS" :key="img" class="pronta" @click="usarPronta(img)">
        <img :src="img.replace('w=1600', 'w=240')" alt="" loading="lazy" />
      </button>
    </div>
    <div class="linha">
      <input v-model="url" placeholder="...ou cole o endereço (URL) de uma imagem" @keydown.enter="usarUrl" />
      <button class="botao pequeno" @click="usarUrl">Usar</button>
    </div>
  </div>
</template>

<style scoped>
.seletor { display: flex; flex-direction: column; gap: 8px; }
.linha { flex-wrap: nowrap; }
.miniatura { flex: 1; min-width: 0; border: 1px dashed var(--borda); border-radius: 8px; display: grid; place-items: center; background: repeating-conic-gradient(#f3f4f6 0 25%, #fff 0 50%) 0 0 / 16px 16px; overflow: hidden; }
.miniatura img { width: 100%; height: 100%; object-fit: contain; }
.botoes { display: flex; flex-direction: column; gap: 4px; }
.galeria { display: grid; grid-template-columns: repeat(3, 1fr); gap: 6px; }
.pronta { padding: 0; border: 2px solid transparent; border-radius: 8px; overflow: hidden; cursor: pointer; aspect-ratio: 16 / 9; background: none; }
.pronta:hover { border-color: var(--primaria); }
.pronta img { width: 100%; height: 100%; object-fit: cover; display: block; }
</style>

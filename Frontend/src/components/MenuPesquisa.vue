<script setup>
// Menu "⋯" de uma pesquisa (usado no cartão e na lista do Painel). Só avisa a ação escolhida.
import { onBeforeUnmount, onMounted, ref } from 'vue';

const props = defineProps({
  pesquisa: { type: Object, required: true },
  pastas: { type: Array, default: () => [] },
});
const emit = defineEmits(['acao']);

const aberto = ref(false);
const mostrarPastas = ref(false);

function escolher(acao, extra) {
  aberto.value = false;
  mostrarPastas.value = false;
  emit('acao', acao, extra);
}

function fechar() {
  aberto.value = false;
  mostrarPastas.value = false;
}
onMounted(() => document.addEventListener('click', fechar));
onBeforeUnmount(() => document.removeEventListener('click', fechar));
</script>

<template>
  <div class="menu-acoes" @click.stop>
    <button class="botao fantasma icone" title="Mais ações" @click="aberto = !aberto">⋯</button>
    <Transition name="pagina">
      <div v-if="aberto" class="menu-suspenso">
        <a :href="`/f/${pesquisa.id}`" target="_blank" @click="aberto = false">↗ Abrir link público</a>
        <button @click="escolher('duplicar')">⧉ Duplicar</button>
        <button @click="escolher('organizar')">🏷 Pasta e etiquetas...</button>
        <button @click="mostrarPastas = !mostrarPastas">📁 Mover para {{ mostrarPastas ? '▴' : '▸' }}</button>
        <div v-if="mostrarPastas" class="submenu">
          <button :disabled="!pesquisa.pastaId" @click="escolher('mover', null)">— Sem pasta</button>
          <button v-for="p in pastas" :key="p.id" :disabled="pesquisa.pastaId === p.id" @click="escolher('mover', p.id)">
            <i class="ponto" :style="{ background: p.cor }"></i>{{ p.nome }}
          </button>
          <p v-if="!pastas.length" class="suave pequeno">Crie uma pasta na barra lateral.</p>
        </div>
        <button @click="escolher(pesquisa.favorito ? 'desfavoritar' : 'favoritar')">{{ pesquisa.favorito ? '☆ Tirar dos favoritos' : '⭐ Favoritar' }}</button>
        <button @click="escolher(pesquisa.ativo ? 'encerrar' : 'reabrir')">{{ pesquisa.ativo ? '⏸ Encerrar respostas' : '▶ Reabrir respostas' }}</button>
        <button @click="escolher(pesquisa.arquivado ? 'desarquivar' : 'arquivar')">{{ pesquisa.arquivado ? '📤 Desarquivar' : '🗄 Arquivar' }}</button>
        <button class="perigo" @click="escolher('excluir')">🗑 Excluir</button>
      </div>
    </Transition>
  </div>
</template>

<style scoped>
.menu-acoes { position: relative; }
.menu-suspenso {
  position: absolute; right: 0; top: 36px; z-index: 30; min-width: 230px; background: #fff; border: 1px solid var(--borda);
  border-radius: 10px; box-shadow: var(--sombra-forte); padding: 6px; display: flex; flex-direction: column;
}
.menu-suspenso a, .menu-suspenso button {
  display: flex; align-items: center; gap: 8px; text-align: left; padding: 8px 10px; border-radius: 6px; border: 0; background: none;
  font: inherit; font-size: 0.88rem; color: var(--texto); cursor: pointer; text-decoration: none;
}
.menu-suspenso a:hover, .menu-suspenso button:hover:not(:disabled) { background: var(--fundo); }
.menu-suspenso button:disabled { opacity: 0.45; cursor: default; }
.menu-suspenso .perigo { color: var(--vermelho); }
.submenu { display: flex; flex-direction: column; margin: 0 0 4px 14px; padding-left: 6px; border-left: 2px solid var(--borda); max-height: 200px; overflow: auto; }
.submenu p { padding: 6px 10px; }
.ponto { width: 10px; height: 10px; border-radius: 50%; flex: none; }
</style>

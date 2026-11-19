<script setup>
// Link público (/f/:id): o que o cliente abre. Conta a visualização e envia a resposta.
import { onMounted, ref } from 'vue';
import FormularioPublico from '@/components/FormularioPublico.vue';
import { buscarFormulario, enviarResposta, registrarVisualizacao } from '@/services/api';

const props = defineProps({ id: { type: String, required: true } });
const formulario = ref(null);
const erro = ref('');

// Conta só uma visualização por aba do navegador (recarregar a página não soma de novo)
function contarVisualizacao() {
  const chave = `visualizou-pesquisa-${props.id}`;
  try {
    if (sessionStorage.getItem(chave)) return;
    sessionStorage.setItem(chave, '1');
  } catch {
    /* sem sessionStorage: conta mesmo assim */
  }
  registrarVisualizacao(props.id).catch(() => {});
}

const enviar = (dados, duracao) => enviarResposta(props.id, dados, duracao);

onMounted(async () => {
  try {
    formulario.value = await buscarFormulario(props.id);
    document.title = formulario.value.titulo;
    if (formulario.value.ativo) contarVisualizacao();
  } catch (e) {
    erro.value = e.message;
  }
});
</script>

<template>
  <FormularioPublico v-if="formulario" :formulario="formulario" :ao-enviar="enviar" />
  <div v-else-if="erro" class="carregando">
    <div style="font-size: 2.5rem">🔍</div>
    <h2>Pesquisa não encontrada</h2>
    <p class="suave">O link pode estar errado ou a pesquisa foi removida.</p>
  </div>
  <div v-else class="carregando"><div class="girando"></div></div>
</template>

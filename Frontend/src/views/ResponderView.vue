<script setup>
// Link público (/f/:id): o que o cliente abre. Conta a visualização, informa o progresso
// (para o funil de abandono do dashboard) e envia a resposta.
import { onMounted, ref } from 'vue';
import FormularioPublico from '@/components/FormularioPublico.vue';
import { buscarFormulario, enviarResposta, registrarProgresso, registrarVisualizacao } from '@/services/api';

const props = defineProps({ id: { type: String, required: true } });
const formulario = ref(null);
const erro = ref('');
const chaveSessao = `sessao-pesquisa-${props.id}`;

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

// Código aleatório da visita (não identifica a pessoa). Recarregar a aba mantém o mesmo.
function novoCodigo() {
  if (globalThis.crypto?.randomUUID) return crypto.randomUUID();
  // Navegadores antigos: monta um UUID versão 4 na mão
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const n = Math.floor(Math.random() * 16);
    return (c === 'x' ? n : (n & 0x3) | 0x8).toString(16);
  });
}
function codigoDaSessao() {
  try {
    let codigo = sessionStorage.getItem(chaveSessao);
    if (!codigo) {
      codigo = novoCodigo();
      sessionStorage.setItem(chaveSessao, codigo);
    }
    return codigo;
  } catch {
    return novoCodigo();
  }
}
let sessao = codigoDaSessao();

// O funil é um "extra": se a chamada falhar, a pessoa continua respondendo normalmente
const progredir = (perguntas) => registrarProgresso(props.id, sessao, perguntas).catch(() => {});

async function enviar(dados, duracao) {
  await enviarResposta(props.id, dados, duracao, sessao);
  // Próxima resposta nesta aba = nova visita
  try {
    sessionStorage.removeItem(chaveSessao);
  } catch {
    /* sem sessionStorage */
  }
  sessao = codigoDaSessao();
}

onMounted(async () => {
  try {
    formulario.value = await buscarFormulario(props.id);
    document.title = formulario.value.titulo;
    if (formulario.value.ativo) {
      contarVisualizacao();
      progredir([]); // abriu o link: entra no topo do funil
    }
  } catch (e) {
    erro.value = e.message;
  }
});
</script>

<template>
  <FormularioPublico v-if="formulario" :formulario="formulario" :ao-enviar="enviar" :ao-progredir="progredir" />
  <div v-else-if="erro" class="carregando">
    <div style="font-size: 2.5rem">🔍</div>
    <h2>Pesquisa não encontrada</h2>
    <p class="suave">O link pode estar errado ou a pesquisa foi removida.</p>
  </div>
  <div v-else class="carregando"><div class="girando"></div></div>
</template>

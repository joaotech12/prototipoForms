<script setup>
// Protótipo antigo no estilo Windows Forms: campos em cima, grade embaixo, botões Novo/Salvar/Excluir
import { computed, onMounted, reactive, ref } from 'vue';
import { alterarProduto, criarProduto, excluirProduto, listarProdutos } from '@/services/api';
import { avisar, avisarErro } from '@/services/avisos';

const produtos = ref([]);
const selecionado = ref(null);
const busca = ref('');
const status = ref('Pronto');
const campos = reactive({ nome: '', preco: 0, estoque: 0 });

const filtrados = computed(() => {
  const termo = busca.value.trim().toLowerCase();
  return termo ? produtos.value.filter((p) => p.nome.toLowerCase().includes(termo)) : produtos.value;
});
const valorEstoque = computed(() => produtos.value.reduce((s, p) => s + p.preco * p.estoque, 0));
const dinheiro = (v) => Number(v).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

async function carregar() {
  try {
    produtos.value = await listarProdutos();
    status.value = `${produtos.value.length} registro(s)`;
  } catch (e) {
    status.value = e.message;
  }
}

function novo() {
  selecionado.value = null;
  Object.assign(campos, { nome: '', preco: 0, estoque: 0 });
  document.getElementById('campo-nome')?.focus();
}

function selecionar(p) {
  selecionado.value = p.id;
  Object.assign(campos, { nome: p.nome, preco: p.preco, estoque: p.estoque });
}

async function salvar() {
  const dados = { nome: campos.nome.trim(), preco: Number(campos.preco), estoque: Number(campos.estoque) };
  try {
    if (selecionado.value) {
      await alterarProduto(selecionado.value, dados);
      avisar('Produto alterado');
    } else {
      const criado = await criarProduto(dados);
      selecionado.value = criado.id;
      avisar('Produto cadastrado');
    }
    await carregar();
  } catch (e) {
    avisarErro(e);
  }
}

async function excluir() {
  if (!selecionado.value || !window.confirm(`Excluir "${campos.nome}"?`)) return;
  try {
    await excluirProduto(selecionado.value);
    avisar('Produto excluído');
    novo();
    await carregar();
  } catch (e) {
    avisarErro(e);
  }
}

onMounted(carregar);
</script>

<template>
  <main class="pagina">
    <div class="janela">
      <div class="barra-titulo">
        <span>🗂 Cadastro de Produtos</span>
        <span class="botoes-janela"><i>–</i><i>□</i><i>×</i></span>
      </div>

      <div class="ferramentas">
        <button class="win" @click="novo">📄 Novo</button>
        <button class="win" @click="salvar">💾 Salvar</button>
        <button class="win" :disabled="!selecionado" @click="excluir">🗑 Excluir</button>
        <button class="win" @click="carregar">🔄 Atualizar</button>
        <span class="espaco"></span>
        <label>Pesquisar: <input v-model="busca" class="win-entrada" /></label>
      </div>

      <fieldset class="grupo">
        <legend>Dados do produto {{ selecionado ? `(Código ${selecionado})` : '(novo)' }}</legend>
        <label>Nome:<input id="campo-nome" v-model="campos.nome" class="win-entrada" maxlength="120" @keydown.enter="salvar" /></label>
        <label>Preço (R$):<input v-model.number="campos.preco" class="win-entrada" type="number" min="0" step="0.01" /></label>
        <label>Estoque:<input v-model.number="campos.estoque" class="win-entrada" type="number" min="0" step="1" /></label>
      </fieldset>

      <div class="grade-win">
        <table>
          <thead>
            <tr><th>Código</th><th>Nome</th><th>Preço</th><th>Estoque</th><th>Total</th></tr>
          </thead>
          <tbody>
            <tr v-for="p in filtrados" :key="p.id" :class="{ marcado: selecionado === p.id }" @click="selecionar(p)">
              <td>{{ p.id }}</td>
              <td>{{ p.nome }}</td>
              <td>{{ dinheiro(p.preco) }}</td>
              <td :class="{ baixo: p.estoque < 5 }">{{ p.estoque }}</td>
              <td>{{ dinheiro(p.preco * p.estoque) }}</td>
            </tr>
            <tr v-if="!filtrados.length"><td colspan="5" style="text-align: center">Nenhum produto</td></tr>
          </tbody>
        </table>
      </div>

      <div class="barra-status">
        <span>{{ status }}</span>
        <span>Valor em estoque: {{ dinheiro(valorEstoque) }}</span>
      </div>
    </div>
  </main>
</template>

<style scoped>
.janela { max-width: 820px; margin: 0 auto; background: #f0f0f0; border: 1px solid #7a7a7a; box-shadow: 4px 4px 0 #0002; font-family: 'Segoe UI', Tahoma, sans-serif; font-size: 13px; color: #000; }
.barra-titulo { display: flex; justify-content: space-between; align-items: center; padding: 6px 8px; background: linear-gradient(#0a64d6, #0447a8); color: #fff; font-weight: 600; }
.botoes-janela i { display: inline-grid; place-items: center; width: 22px; height: 18px; margin-left: 2px; background: #ffffff33; font-style: normal; border-radius: 2px; }
.ferramentas { display: flex; gap: 4px; padding: 6px; border-bottom: 1px solid #c8c8c8; align-items: center; flex-wrap: wrap; }
.win { font: inherit; padding: 3px 10px; background: linear-gradient(#fdfdfd, #e3e3e3); border: 1px solid #8e8e8e; border-radius: 2px; cursor: pointer; }
.win:hover { background: linear-gradient(#eaf6fd, #bee6fd); border-color: #3c7fb1; }
.win:disabled { opacity: 0.5; cursor: default; }
.win-entrada { font: inherit; padding: 2px 4px; border: 1px solid #7a7a7a; border-radius: 0; width: auto; background: #fff; }
.win-entrada:focus { box-shadow: none; border-color: #3c7fb1; }
.grupo { margin: 8px; border: 1px solid #c8c8c8; display: grid; grid-template-columns: 2fr 1fr 1fr; gap: 10px; padding: 10px; }
.grupo label { display: flex; flex-direction: column; gap: 2px; }
.grade-win { margin: 0 8px; background: #fff; border: 1px solid #7a7a7a; height: 300px; overflow: auto; }
table { font-size: 13px; }
th { background: linear-gradient(#fff, #e8e8e8); border-right: 1px solid #d0d0d0; border-bottom: 1px solid #a0a0a0; color: #000; text-transform: none; letter-spacing: 0; padding: 4px 8px; font-size: 12px; }
td { padding: 3px 8px; border-bottom: 1px solid #eee; }
tbody tr { cursor: default; }
tr.marcado td { background: #0078d7; color: #fff; }
td.baixo { color: #c00; font-weight: 700; }
tr.marcado td.baixo { color: #ffd0d0; }
.barra-status { display: flex; justify-content: space-between; padding: 4px 8px; margin-top: 8px; border-top: 1px solid #c8c8c8; background: #e8e8e8; }
@media (max-width: 640px) { .grupo { grid-template-columns: 1fr; } }
</style>

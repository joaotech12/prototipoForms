<script setup lang="ts">

import Default from '../layout/Default.vue';







import { ref } from 'vue'

import { useRouter } from 'vue-router'

const router = useRouter()

const nome = ref('')
const email = ref('')
const senha = ref('')
const mensagem = ref('')
const carregando = ref(false)

async function cadastrar() {
  carregando.value = true
  mensagem.value = ''


}
</script>

<template>
  <div class="container">
    <h1>Criar Conta</h1>

    <form @submit.prevent="cadastrar">
      <input
        v-model="nome"
        placeholder="Nome completo"
        required
      />

      <input
        v-model="email"
        type="email"
        placeholder="E-mail"
        required
      />

      <input
        v-model="senha"
        type="password"
        placeholder="Senha (mínimo 6 caracteres)"
        minlength="6"
        required
      />

      <button :disabled="carregando">
        {{ carregando ? 'Cadastrando...' : 'Cadastrar' }}
      </button>
    </form>

    <p>{{ mensagem }}</p>

    <router-link to="/login">
      Já tenho uma conta
    </router-link>
  </div>


 
</template>
<style scoped></style><style scoped>
.container {
  max-width: 400px;
  margin: 70px auto;
  padding: 25px;
  font-family: Arial;
}

input {
  display: block;
  width: 100%;
  padding: 12px;
  margin: 12px 0;
  box-sizing: border-box;
}

button {
  width: 100%;
  padding: 12px;
  background: #2563eb;
  color: white;
  border: none;
  cursor: pointer;
}
</style>
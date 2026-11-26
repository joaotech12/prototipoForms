<script setup lang="ts">

import Default from '../layout/Default.vue';




import { ref } from 'vue'

import { useRouter } from 'vue-router'

const router = useRouter()

const email = ref('')
const senha = ref('')
const mensagem = ref('')

async function login() {
  mensagem.value = ''



  router.push('/dashboard')
}
</script>

<template>
  <div class="container">
    <h1>Entrar na Plataforma</h1>

    
    <form @submit.prevent="login">
      <input
        v-model="email"
        type="email"
        placeholder="Seu e-mail"
        required
      />

      <input
        v-model="senha"
        type="password"
        placeholder="Sua senha"
        required
      />

      <button>Entrar</button>
    </form>

    <p>{{ mensagem }}</p>


    
      <router-link to="/">
      Voltar

    </router-link>
  </div>



    
</template>
<style scoped>
.container {
  max-width: 400px;
  margin: 70px auto;
  padding: 25px;
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
}
</style>
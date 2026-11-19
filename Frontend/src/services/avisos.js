import { reactive } from 'vue';

// Mensagens rápidas que aparecem no canto da tela ("Salvo!", "Link copiado"...)
export const avisos = reactive([]);
let proximoId = 1;

export function avisar(texto, tipo = 'sucesso', duracao = 3500) {
  const id = proximoId++;
  avisos.push({ id, texto, tipo });
  setTimeout(() => fecharAviso(id), duracao);
}

export function fecharAviso(id) {
  const i = avisos.findIndex((a) => a.id === id);
  if (i >= 0) avisos.splice(i, 1);
}

export const avisarErro = (erro) => avisar(erro?.message ?? String(erro), 'erro', 6000);

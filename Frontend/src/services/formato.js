// Funções pequenas de formatação usadas em várias telas

export function formatarData(data) {
  if (!data) return '-';
  return new Date(data).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' });
}

// "agora", "há 5 min", "há 3 h", "há 2 dias"
export function tempoRelativo(data) {
  if (!data) return 'nunca';
  const segundos = Math.round((Date.now() - new Date(data).getTime()) / 1000);
  if (segundos < 60) return 'agora';
  const minutos = Math.round(segundos / 60);
  if (minutos < 60) return `há ${minutos} min`;
  const horas = Math.round(minutos / 60);
  if (horas < 24) return `há ${horas} h`;
  const dias = Math.round(horas / 24);
  if (dias < 30) return `há ${dias} dia${dias > 1 ? 's' : ''}`;
  return formatarData(data);
}

export function formatarDuracao(segundos) {
  if (segundos === null || segundos === undefined) return '-';
  if (segundos < 60) return `${Math.round(segundos)} s`;
  const m = Math.floor(segundos / 60);
  const s = Math.round(segundos % 60);
  return `${m} min${s ? ` ${s} s` : ''}`;
}

// Valor de uma resposta como texto (listas viram "A, B")
export function formatarValor(valor) {
  if (valor === undefined || valor === null || valor === '') return '—';
  if (Array.isArray(valor)) return valor.join(', ');
  return String(valor);
}

export function plural(n, singular, pluralTexto) {
  return `${n} ${n === 1 ? singular : pluralTexto}`;
}

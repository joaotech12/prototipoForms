// Cálculos do dashboard: NPS, CSAT, contagens, palavras, cruzamentos e insights
import { estaRespondida, opcoesDaPergunta } from './regras';
import { TIPOS_DE_GRUPO, TIPOS_DE_METRICA } from './tipos';

const numeros = (valores) => valores.filter(estaRespondida).map(Number).filter(Number.isFinite);
const media = (lista) => (lista.length ? lista.reduce((a, b) => a + b, 0) / lista.length : null);
const pct = (parte, total) => (total ? Math.round((parte / total) * 100) : 0);

export const valoresDe = (pergunta, respostas) => respostas.map((r) => r.dados?.[pergunta.id]);

// ---------- NPS ----------
// Zonas usadas no mercado: Crítica (<0), Aperfeiçoamento (0-49), Qualidade (50-74), Excelência (75-100)
export function zonaNps(nps) {
  if (nps === null) return { nome: 'Sem dados', cor: '#9ca3af' };
  if (nps < 0) return { nome: 'Zona crítica', cor: '#dc2626' };
  if (nps < 50) return { nome: 'Zona de aperfeiçoamento', cor: '#f59e0b' };
  if (nps < 75) return { nome: 'Zona de qualidade', cor: '#22c55e' };
  return { nome: 'Zona de excelência', cor: '#15803d' };
}

export function calcularNps(valores) {
  const n = numeros(valores);
  const promotores = n.filter((v) => v >= 9).length;
  const detratores = n.filter((v) => v <= 6).length;
  const neutros = n.length - promotores - detratores;
  const nps = n.length ? Math.round(((promotores - detratores) / n.length) * 100) : null;
  return {
    total: n.length,
    nps,
    promotores,
    neutros,
    detratores,
    pctPromotores: pct(promotores, n.length),
    pctNeutros: pct(neutros, n.length),
    pctDetratores: pct(detratores, n.length),
    zona: zonaNps(nps),
  };
}

// ---------- CSAT ----------
export function calcularCsat(valores) {
  const n = numeros(valores);
  const satisfeitos = n.filter((v) => v >= 4).length;
  const m = media(n);
  return { total: n.length, csat: n.length ? pct(satisfeitos, n.length) : null, media: m === null ? null : Number(m.toFixed(2)) };
}

export function calcularNumero(valores) {
  const n = numeros(valores);
  const m = media(n);
  return {
    total: n.length,
    media: m === null ? null : Number(m.toFixed(2)),
    menor: n.length ? Math.min(...n) : null,
    maior: n.length ? Math.max(...n) : null,
  };
}

// Valor de uma métrica para um grupo de respostas (usado no cruzamento)
export function valorDaMetrica(pergunta, respostas) {
  const valores = valoresDe(pergunta, respostas);
  if (pergunta.tipo === 'nps') return calcularNps(valores).nps;
  if (pergunta.tipo === 'csat') return calcularCsat(valores).csat;
  return calcularNumero(valores).media;
}

export function nomeDaMetrica(pergunta) {
  if (pergunta.tipo === 'nps') return 'NPS';
  if (pergunta.tipo === 'csat') return 'CSAT (%)';
  return 'Média';
}

// ---------- Contagens ----------
export function contarOpcoes(pergunta, respostas) {
  const valores = valoresDe(pergunta, respostas).filter(estaRespondida);
  return opcoesDaPergunta(pergunta).map((opcao) => {
    const qtd = valores.filter((v) => (Array.isArray(v) ? v.map(String).includes(opcao) : String(v) === opcao)).length;
    return { rotulo: opcao, valor: qtd, pct: pct(qtd, valores.length) };
  });
}

export function respondeuPergunta(pergunta, respostas) {
  return valoresDe(pergunta, respostas).filter(estaRespondida).length;
}

// Últimos N dias (ou desde a primeira resposta), um ponto por dia
export function respostasPorDia(respostas, dias = 14) {
  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);
  const pontos = [];
  for (let i = dias - 1; i >= 0; i--) {
    const dia = new Date(hoje);
    dia.setDate(hoje.getDate() - i);
    pontos.push({ data: dia, rotulo: dia.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }), valor: 0 });
  }
  for (const r of respostas) {
    const d = new Date(r.criadoEm);
    d.setHours(0, 0, 0, 0);
    const ponto = pontos.find((p) => p.data.getTime() === d.getTime());
    if (ponto) ponto.valor++;
  }
  return pontos;
}

// ---------- Palavras mais citadas ----------
const PALAVRAS_VAZIAS = new Set(
  ('a o e é de da do das dos em no na nos nas um uma uns umas que para por com sem se mais muito muita ' +
    'me eu meu minha você vocês ele ela eles elas isso isto esse essa este esta aqui ali já não sim mas ' +
    'como quando onde porque pra pro ao aos às foi ser ter tem está estou são era bem bom boa tudo nada ' +
    'também só ou lhe nós seu sua seus suas qual quais algum alguma pelo pela pelos pelas até entre')
    .split(' '),
);

export function palavrasFrequentes(textos, limite = 18) {
  const contagem = new Map();
  for (const texto of textos) {
    if (!estaRespondida(texto)) continue;
    const palavras = String(texto)
      .toLowerCase()
      .normalize('NFC')
      .match(/[a-zà-úç]{3,}/g);
    for (const palavra of new Set(palavras ?? [])) {
      if (PALAVRAS_VAZIAS.has(palavra)) continue;
      contagem.set(palavra, (contagem.get(palavra) ?? 0) + 1);
    }
  }
  return [...contagem.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, limite)
    .map(([palavra, qtd]) => ({ palavra, qtd }));
}

// ---------- Cruzamento: métrica (NPS/CSAT/número) separada por grupo (uma pergunta de escolha) ----------
export function cruzar(metrica, grupo, respostas) {
  return opcoesDaPergunta(grupo).map((opcao) => {
    const doGrupo = respostas.filter((r) => {
      const v = r.dados?.[grupo.id];
      return Array.isArray(v) ? v.map(String).includes(opcao) : String(v ?? '') === opcao;
    });
    const comMetrica = doGrupo.filter((r) => estaRespondida(r.dados?.[metrica.id]));
    return { grupo: opcao, total: comMetrica.length, valor: comMetrica.length ? valorDaMetrica(metrica, comMetrica) : null };
  });
}

export const perguntasDeMetrica = (perguntas) => perguntas.filter((p) => TIPOS_DE_METRICA.includes(p.tipo));
export const perguntasDeGrupo = (perguntas) => perguntas.filter((p) => TIPOS_DE_GRUPO.includes(p.tipo));

// ---------- Insights automáticos ----------
// Frases curtas apontando o que merece atenção. tipo: 'alerta' | 'bom' | 'info'
// extras (opcional): { funil, calor } calculados por calcularFunil() e mapaDeCalor()
export function gerarInsights(formulario, respostas, extras = {}) {
  const lista = [];
  const total = respostas.length;
  const { funil, calor } = extras;

  // Onde as pessoas desistem (funciona mesmo antes da primeira resposta completa)
  if (funil && funil.incompletas >= 5 && funil.abandonos.length) {
    const pior = funil.abandonos[0];
    const parte = pct(pior.total, funil.total);
    if (parte >= 10) {
      lista.push({ tipo: 'alerta', texto: `${parte}% das visitas desistem em "${pior.titulo}". Vale simplificar essa pergunta ou torná-la opcional.` });
    }
  }

  if (total === 0) {
    lista.push({ tipo: 'info', texto: 'Ainda não há respostas completas. Copie o link no Painel e envie para os seus clientes.' });
    return lista;
  }

  if (calor?.melhor && total >= 10) {
    lista.push({ tipo: 'info', texto: `A maioria das respostas chega ${calor.melhor}. Bom momento para enviar ou reenviar o link.` });
  }

  // Taxa de conclusão
  if (formulario.visualizacoes >= 10) {
    const taxa = pct(total, formulario.visualizacoes);
    if (taxa < 40) {
      lista.push({ tipo: 'alerta', texto: `Só ${taxa}% de quem abre o link termina a pesquisa. Experimente reduzir perguntas ou usar o modo conversacional.` });
    } else if (taxa >= 70) {
      lista.push({ tipo: 'bom', texto: `Ótima taxa de conclusão: ${taxa}% de quem abre o link responde até o fim.` });
    }
  }

  // Tendência: últimos 7 dias contra os 7 anteriores
  const agora = Date.now();
  const dia = 86400000;
  const recentes = respostas.filter((r) => agora - new Date(r.criadoEm) < 7 * dia).length;
  const anteriores = respostas.filter((r) => {
    const idade = agora - new Date(r.criadoEm);
    return idade >= 7 * dia && idade < 14 * dia;
  }).length;
  if (anteriores >= 3) {
    const variacao = pct(recentes - anteriores, anteriores);
    if (variacao >= 25) lista.push({ tipo: 'bom', texto: `As respostas cresceram ${variacao}% nos últimos 7 dias.` });
    if (variacao <= -25) lista.push({ tipo: 'alerta', texto: `As respostas caíram ${Math.abs(variacao)}% nos últimos 7 dias. Vale reenviar o link.` });
  }

  const grupos = perguntasDeGrupo(formulario.perguntas);

  for (const p of formulario.perguntas) {
    const valores = valoresDe(p, respostas);
    if (p.tipo === 'nps') {
      const r = calcularNps(valores);
      if (r.total === 0) continue;
      lista.push({
        tipo: r.nps >= 50 ? 'bom' : r.nps < 0 ? 'alerta' : 'info',
        texto: `NPS de ${r.nps} em "${p.titulo}": ${r.zona.nome.toLowerCase()}.`,
      });
      if (r.pctDetratores >= 30) {
        lista.push({ tipo: 'alerta', texto: `${r.pctDetratores}% das notas são de detratores (0 a 6). Leia as respostas abertas deles primeiro.` });
      }
    }
    if (p.tipo === 'csat') {
      const r = calcularCsat(valores);
      if (r.total && r.csat < 70) lista.push({ tipo: 'alerta', texto: `Satisfação baixa em "${p.titulo}": só ${r.csat}% deram nota 4 ou 5.` });
      else if (r.total && r.csat >= 85) lista.push({ tipo: 'bom', texto: `${r.csat}% de satisfação em "${p.titulo}".` });
    }

    // Opção dominante numa pergunta de escolha
    if (['unica', 'lista', 'simnao'].includes(p.tipo)) {
      const contagem = contarOpcoes(p, respostas);
      const maior = [...contagem].sort((a, b) => b.valor - a.valor)[0];
      const respondidas = respondeuPergunta(p, respostas);
      if (maior && respondidas >= 5 && maior.pct >= 60) {
        lista.push({ tipo: 'info', texto: `${maior.pct}% responderam "${maior.rotulo}" em "${p.titulo}".` });
      }
    }

    // Cruzamento automático: algum grupo está bem abaixo (ou acima) da média?
    if (['nps', 'csat'].includes(p.tipo)) {
      const geral = valorDaMetrica(p, respostas.filter((r) => estaRespondida(r.dados?.[p.id])));
      for (const g of grupos) {
        if (g.id === p.id) continue;
        for (const linha of cruzar(p, g, respostas)) {
          if (linha.total < 3 || linha.valor === null || geral === null) continue;
          const diferenca = linha.valor - geral;
          if (diferenca <= -15) {
            lista.push({ tipo: 'alerta', texto: `Quem respondeu "${linha.grupo}" em "${g.titulo}" tem ${nomeDaMetrica(p)} ${Math.round(Math.abs(diferenca))} pontos abaixo da média (${linha.valor} contra ${geral}).` });
          } else if (diferenca >= 15) {
            lista.push({ tipo: 'bom', texto: `Quem respondeu "${linha.grupo}" em "${g.titulo}" tem ${nomeDaMetrica(p)} ${Math.round(diferenca)} pontos acima da média (${linha.valor}).` });
          }
        }
      }
    }
  }

  // Palavra mais citada nas respostas abertas
  const textos = formulario.perguntas
    .filter((p) => p.tipo === 'paragrafo' || p.tipo === 'texto')
    .flatMap((p) => valoresDe(p, respostas));
  const [primeira] = palavrasFrequentes(textos, 1);
  if (primeira && primeira.qtd >= 3) {
    lista.push({ tipo: 'info', texto: `A palavra mais citada nas respostas abertas é "${primeira.palavra}" (${primeira.qtd} vezes).` });
  }

  // Tempo médio
  const tempos = respostas.map((r) => r.duracaoSegundos).filter((t) => t !== null && t !== undefined);
  const tempoMedio = media(tempos);
  if (tempoMedio !== null && tempoMedio > 300) {
    lista.push({ tipo: 'alerta', texto: `As pessoas levam em média ${Math.round(tempoMedio / 60)} minutos para responder. Pesquisas curtas têm mais respostas.` });
  }

  return lista.slice(0, 10);
}

// ======================================================================================
// Etapa 3: filtros combinados, funil de abandono, horários de pico, evolução e comparação
// ======================================================================================

const DIA = 86400000;

// No NPS dá para filtrar pelo grupo inteiro, além da nota exata
export const GRUPOS_NPS = { Promotores: [9, 10], Neutros: [7, 8], Detratores: [0, 6] };

// Opções que aparecem no "Filtrar por resposta..."
export function opcoesDeFiltro(pergunta) {
  if (pergunta.tipo === 'nps') return Object.keys(GRUPOS_NPS);
  return opcoesDaPergunta(pergunta);
}

function combina(pergunta, valor, filtro) {
  if (!estaRespondida(valor)) return false;
  if (pergunta?.tipo === 'nps' && GRUPOS_NPS[filtro]) {
    const [de, ate] = GRUPOS_NPS[filtro];
    return Number(valor) >= de && Number(valor) <= ate;
  }
  return Array.isArray(valor) ? valor.map(String).includes(filtro) : String(valor) === filtro;
}

// Filtros da mesma pergunta valem como "OU" (Pro ou Empresa); de perguntas diferentes, "E"
export function aplicarFiltros(respostas, filtros, perguntas) {
  if (!filtros.length) return respostas;
  const porPergunta = new Map();
  for (const f of filtros) porPergunta.set(f.perguntaId, [...(porPergunta.get(f.perguntaId) ?? []), f.valor]);
  return respostas.filter((r) =>
    [...porPergunta.entries()].every(([id, valores]) => {
      const pergunta = perguntas.find((p) => p.id === id);
      return valores.some((v) => combina(pergunta, r.dados?.[id], v));
    }),
  );
}

// Respostas (ou sessões) dentro de uma janela de tempo: [agora - (deslocamento + dias), agora - deslocamento)
export function naJanela(lista, dias, deslocamento = 0, campo = 'criadoEm') {
  if (!dias) return lista;
  const fim = Date.now() - deslocamento * DIA;
  const inicio = fim - dias * DIA;
  return lista.filter((r) => {
    const t = new Date(r[campo]).getTime();
    return t >= inicio && t < fim;
  });
}

// ---------- Funil de abandono ----------
// sessoes: [{ perguntas: [ids respondidos], concluida }]
export function calcularFunil(perguntas, sessoes) {
  const total = sessoes.length;
  const concluidas = sessoes.filter((s) => s.concluida).length;
  const etapas = perguntas.map((p, i) => {
    const alcancaram = sessoes.filter((s) => s.perguntas.includes(p.id)).length;
    return { pergunta: p, indice: i, alcancaram, pct: pct(alcancaram, total), condicional: (p.condicoes ?? []).length > 0 };
  });

  // Onde parou quem não terminou: na pergunta seguinte à última que respondeu
  const contagem = new Map();
  for (const s of sessoes.filter((x) => !x.concluida)) {
    const ultima = Math.max(-1, ...s.perguntas.map((id) => perguntas.findIndex((p) => p.id === id)));
    const parou = perguntas[ultima + 1];
    const chave = parou?.id ?? '__fim';
    contagem.set(chave, (contagem.get(chave) ?? 0) + 1);
  }
  const abandonos = [...contagem.entries()]
    .map(([id, qtd]) => {
      const p = perguntas.find((x) => x.id === id);
      const indice = perguntas.indexOf(p);
      return {
        perguntaId: id,
        titulo: p ? `${indice + 1}. ${p.titulo}` : 'No botão de enviar',
        total: qtd,
        pct: pct(qtd, total),
        semResponder: indice === 0, // abriu e não respondeu nem a primeira
      };
    })
    .sort((a, b) => b.total - a.total);

  return { total, concluidas, incompletas: total - concluidas, taxa: total ? pct(concluidas, total) : null, etapas, abandonos };
}

// ---------- Horários de pico: dia da semana × hora ----------
export const DIAS_SEMANA = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
const DIAS_EXTENSO = ['domingo', 'segunda-feira', 'terça-feira', 'quarta-feira', 'quinta-feira', 'sexta-feira', 'sábado'];

export function mapaDeCalor(respostas) {
  const grade = Array.from({ length: 7 }, () => Array(24).fill(0));
  for (const r of respostas) {
    const d = new Date(r.criadoEm);
    grade[d.getDay()][d.getHours()]++;
  }
  const maior = Math.max(0, ...grade.flat());
  const porDia = grade.map((horas) => horas.reduce((a, b) => a + b, 0));
  const porHora = Array.from({ length: 24 }, (_, h) => grade.reduce((s, horas) => s + horas[h], 0));

  let melhor = '';
  if (respostas.length) {
    const dia = porDia.indexOf(Math.max(...porDia));
    // Janela de 2 horas: começa no horário com mais respostas e se estende para o vizinho mais movimentado
    const pico = porHora.indexOf(Math.max(...porHora));
    const antes = porHora[(pico + 23) % 24];
    const depois = porHora[(pico + 1) % 24];
    const inicio = antes > depois ? (pico + 23) % 24 : pico;
    melhor = `na ${DIAS_EXTENSO[dia]}, entre ${inicio}h e ${(inicio + 2) % 24}h`;
  }
  return { grade, maior, porDia, porHora, melhor };
}

// ---------- Evolução semanal de uma métrica (NPS, CSAT ou média) ----------
export function evolucaoSemanal(pergunta, respostas, semanas = 12) {
  const hoje = new Date();
  hoje.setHours(23, 59, 59, 999);
  const pontos = [];
  for (let i = semanas - 1; i >= 0; i--) {
    const fim = hoje.getTime() - i * 7 * DIA;
    const inicio = fim - 7 * DIA;
    const daSemana = respostas.filter((r) => {
      const t = new Date(r.criadoEm).getTime();
      return t > inicio && t <= fim && estaRespondida(r.dados?.[pergunta.id]);
    });
    const rotulo = new Date(inicio + DIA).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
    pontos.push({ rotulo, valor: daSemana.length ? valorDaMetrica(pergunta, daSemana) : null, total: daSemana.length });
  }
  return pontos;
}

// ---------- Comparação com o período anterior ----------
// tipo: 'pct' (variação %, ex.: respostas) ou 'pontos' (diferença, ex.: NPS). menorMelhor: ex.: tempo
export function variacao(atual, anterior, tipo = 'pct', menorMelhor = false) {
  if (atual === null || anterior === null || atual === undefined || anterior === undefined) return null;
  let valor;
  if (tipo === 'pontos') valor = Math.round(atual - anterior);
  else if (anterior === 0) return atual > 0 ? { texto: 'novo', classe: 'bom' } : null;
  else valor = Math.round(((atual - anterior) / anterior) * 100);
  if (valor === 0) return { texto: '= igual', classe: 'neutro' };
  const subiu = valor > 0;
  const bom = menorMelhor ? !subiu : subiu;
  const unidade = tipo === 'pontos' ? ' pts' : '%';
  return { texto: `${subiu ? '▲' : '▼'} ${Math.abs(valor)}${unidade}`, classe: bom ? 'bom' : 'ruim' };
}

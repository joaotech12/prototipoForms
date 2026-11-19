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
export function gerarInsights(formulario, respostas) {
  const lista = [];
  const total = respostas.length;
  if (total === 0) {
    return [{ tipo: 'info', texto: 'Ainda não há respostas. Copie o link no Painel e envie para os seus clientes.' }];
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

  return lista.slice(0, 8);
}

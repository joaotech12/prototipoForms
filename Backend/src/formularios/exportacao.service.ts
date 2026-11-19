import { Injectable } from '@nestjs/common';
import { Row, Workbook, Worksheet } from 'exceljs';
import { Formulario } from './formulario.entity';
import { estaRespondida, opcoesDaPergunta, Pergunta } from './regras';
import { Resposta } from './resposta.entity';

// Gera o arquivo Excel: "Resumo", "Todas as respostas" e uma aba por opção da ramificação
@Injectable()
export class ExportacaoService {
  async gerar(formulario: Formulario, respostas: Resposta[]): Promise<Buffer> {
    const planilha = new Workbook();
    planilha.creator = 'Central de Pesquisas';
    planilha.created = new Date();
    const cor = 'FF' + (formulario.tema?.corPrimaria ?? '#6d28d9').replace('#', '').toUpperCase();
    const nomesUsados = new Set<string>();

    this.abaResumo(planilha.addWorksheet(this.nomeAba('Resumo', nomesUsados)), formulario, respostas, cor);
    this.abaRespostas(
      planilha.addWorksheet(this.nomeAba('Todas as respostas', nomesUsados)),
      formulario.perguntas,
      respostas,
      cor,
    );

    // Planilhas ramificadas: uma aba para cada opção da pergunta escolhida no editor
    const ramo = formulario.perguntas.find((p) => p.id === formulario.perguntaRamificacao);
    if (ramo) {
      for (const opcao of opcoesDaPergunta(ramo)) {
        const filtradas = respostas.filter((r) => {
          const v = r.dados[ramo.id];
          return Array.isArray(v) ? v.map(String).includes(opcao) : String(v ?? '') === opcao;
        });
        const aba = planilha.addWorksheet(this.nomeAba(`${ramo.titulo.slice(0, 14)} = ${opcao}`, nomesUsados));
        this.abaRespostas(aba, formulario.perguntas, filtradas, cor);
      }
    }

    return Buffer.from(await planilha.xlsx.writeBuffer());
  }

  private abaResumo(aba: Worksheet, f: Formulario, respostas: Resposta[], cor: string) {
    aba.columns = [{ width: 48 }, { width: 18 }, { width: 14 }];
    aba.addRow([f.titulo]).font = { bold: true, size: 16 };
    aba.addRow([`Exportado em ${new Date().toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' })}`]);
    aba.addRow([]);

    const taxa = f.visualizacoes > 0 ? Math.min(100, Math.round((respostas.length / f.visualizacoes) * 100)) : null;
    const geral: [string, string | number][] = [
      ['Total de respostas', respostas.length],
      ['Visualizações do link', f.visualizacoes],
      ['Taxa de conclusão', taxa === null ? '-' : `${taxa}%`],
    ];
    for (const linha of geral) aba.addRow(linha);

    for (const p of f.perguntas) {
      const valores = respostas.map((r) => r.dados[p.id]).filter(estaRespondida);
      aba.addRow([]);
      const titulo = aba.addRow([p.titulo, 'Respostas', '%']);
      this.pintarCabecalho(titulo, cor);

      if (p.tipo === 'nps') {
        const n = valores.map(Number);
        const promotores = n.filter((v) => v >= 9).length;
        const detratores = n.filter((v) => v <= 6).length;
        const nps = n.length ? Math.round(((promotores - detratores) / n.length) * 100) : 0;
        aba.addRow(['NPS', nps]).font = { bold: true };
        aba.addRow(['Promotores (9-10)', promotores, this.pct(promotores, n.length)]);
        aba.addRow(['Neutros (7-8)', n.length - promotores - detratores, this.pct(n.length - promotores - detratores, n.length)]);
        aba.addRow(['Detratores (0-6)', detratores, this.pct(detratores, n.length)]);
      } else if (p.tipo === 'csat') {
        const n = valores.map(Number);
        const satisfeitos = n.filter((v) => v >= 4).length;
        aba.addRow(['CSAT (notas 4 e 5)', this.pct(satisfeitos, n.length)]).font = { bold: true };
        aba.addRow(['Média', n.length ? Number((n.reduce((a, b) => a + b, 0) / n.length).toFixed(2)) : '-']);
      }

      const opcoes = opcoesDaPergunta(p);
      if (opcoes.length > 0) {
        for (const opcao of opcoes) {
          const qtd = valores.filter((v) => (Array.isArray(v) ? v.map(String).includes(opcao) : String(v) === opcao)).length;
          aba.addRow([opcao, qtd, this.pct(qtd, valores.length)]);
        }
      } else if (p.tipo === 'numero') {
        const n = valores.map(Number);
        aba.addRow(['Média', n.length ? Number((n.reduce((a, b) => a + b, 0) / n.length).toFixed(2)) : '-']);
        aba.addRow(['Menor', n.length ? Math.min(...n) : '-']);
        aba.addRow(['Maior', n.length ? Math.max(...n) : '-']);
      } else {
        aba.addRow(['Respostas preenchidas', valores.length, this.pct(valores.length, respostas.length)]);
      }
    }
  }

  private abaRespostas(aba: Worksheet, perguntas: Pergunta[], respostas: Resposta[], cor: string) {
    aba.columns = [
      { header: '#', key: 'id', width: 8 },
      { header: 'Data', key: 'data', width: 20 },
      { header: 'Duração (s)', key: 'duracao', width: 12 },
      ...perguntas.map((p) => ({ header: p.titulo, key: p.id, width: Math.min(45, Math.max(14, p.titulo.length)) })),
    ];
    this.pintarCabecalho(aba.getRow(1), cor);
    aba.views = [{ state: 'frozen', ySplit: 1 }];

    for (const r of respostas) {
      const linha: Record<string, unknown> = {
        id: r.id,
        data: new Date(r.criadoEm).toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' }),
        duracao: r.duracaoSegundos ?? '',
      };
      for (const p of perguntas) {
        const v = r.dados[p.id];
        if (!estaRespondida(v)) linha[p.id] = '';
        else if (Array.isArray(v)) linha[p.id] = v.join(', ');
        else if (['nps', 'csat', 'numero'].includes(p.tipo)) linha[p.id] = Number(v);
        else linha[p.id] = String(v);
      }
      aba.addRow(linha);
    }
    aba.autoFilter = { from: { row: 1, column: 1 }, to: { row: 1, column: perguntas.length + 3 } };
  }

  private pintarCabecalho(linha: Row, cor: string) {
    linha.eachCell((celula) => {
      celula.font = { bold: true, color: { argb: 'FFFFFFFF' } };
      celula.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: cor } };
      celula.alignment = { vertical: 'middle', wrapText: true };
    });
  }

  private pct(parte: number, total: number) {
    return total ? `${Math.round((parte / total) * 100)}%` : '0%';
  }

  // O Excel não aceita alguns caracteres, nem nomes com mais de 31 letras ou repetidos
  private nomeAba(nome: string, usados: Set<string>) {
    const base = nome.replace(/[\\/?*[\]:]/g, '-').slice(0, 31) || 'Aba';
    let final = base;
    for (let i = 2; usados.has(final.toLowerCase()); i++) final = `${base.slice(0, 27)} (${i})`;
    usados.add(final.toLowerCase());
    return final;
  }
}

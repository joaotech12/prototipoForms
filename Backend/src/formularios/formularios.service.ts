import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { Pasta } from '../pastas/pasta.entity';
import { FormularioDto, LoteDto } from './formulario.dto';
import { Formulario } from './formulario.entity';
import { opcoesDaPergunta } from './regras';
import { Resposta } from './resposta.entity';
import { SegmentoDto } from './analise.dto';
import { Sessao } from './sessao.entity';

@Injectable()
export class FormulariosService {
  constructor(
    @InjectRepository(Formulario) private readonly formularios: Repository<Formulario>,
    @InjectRepository(Resposta) private readonly respostas: Repository<Resposta>,
    @InjectRepository(Pasta) private readonly pastas: Repository<Pasta>,
    @InjectRepository(Sessao) private readonly sessoes: Repository<Sessao>,
  ) {}

  // Lista todas as pesquisas já com o total de respostas e a data da última
  async listar() {
    const lista = await this.formularios.find({ order: { atualizadoEm: 'DESC' } });
    const totais: { formularioId: number; total: string; ultima: Date | null }[] = await this.respostas
      .createQueryBuilder('r')
      .select('r.formularioId', 'formularioId')
      .addSelect('COUNT(*)', 'total')
      .addSelect('MAX(r.criadoEm)', 'ultima')
      .groupBy('r.formularioId')
      .getRawMany();

    return lista.map((f) => {
      const t = totais.find((item) => Number(item.formularioId) === f.id);
      return { ...f, etiquetas: f.etiquetas ?? [], totalRespostas: t ? Number(t.total) : 0, ultimaResposta: t?.ultima ?? null };
    });
  }

  async buscar(id: number) {
    const formulario = await this.formularios.findOneBy({ id });
    if (!formulario) throw new NotFoundException('Pesquisa não encontrada');
    return formulario;
  }

  async criar(dados: FormularioDto) {
    this.validarEstrutura(dados);
    await this.conferirPasta(dados.pastaId);
    const agora = new Date();
    const novo = this.formularios.create({
      ...this.normalizar(dados),
      pastaId: dados.pastaId ?? null,
      etiquetas: this.normalizarEtiquetas(dados.etiquetas ?? []),
      arquivado: false,
      favorito: false,
      visualizacoes: 0,
      criadoEm: agora,
      atualizadoEm: agora,
    });
    return this.formularios.save(novo);
  }

  async alterar(id: number, dados: FormularioDto) {
    const atual = await this.buscar(id);
    this.validarEstrutura(dados);
    await this.conferirPasta(dados.pastaId);
    // Pasta e etiquetas só mudam se vierem no corpo (o editor pode não enviar)
    const organizacao: Partial<Formulario> = {};
    if (dados.pastaId !== undefined) organizacao.pastaId = dados.pastaId;
    if (dados.etiquetas !== undefined) organizacao.etiquetas = this.normalizarEtiquetas(dados.etiquetas);
    return this.formularios.save({ ...atual, ...this.normalizar(dados), ...organizacao, atualizadoEm: new Date() });
  }

  async duplicar(id: number) {
    const original = await this.buscar(id);
    const agora = new Date();
    const { id: _id, ...resto } = original;
    const copia = this.formularios.create({
      ...resto,
      titulo: `${original.titulo} (cópia)`.slice(0, 200),
      segmentos: [],
      arquivado: false,
      favorito: false,
      visualizacoes: 0,
      criadoEm: agora,
      atualizadoEm: agora,
    });
    return this.formularios.save(copia);
  }

  // Ações em lote do Painel: mover, etiquetar, arquivar, favoritar, encerrar, excluir...
  async lote(dados: LoteDto) {
    const lista = await this.formularios.findBy({ id: In([...new Set(dados.ids)]) });
    if (!lista.length) throw new NotFoundException('Nenhuma das pesquisas foi encontrada');
    const ids = In(lista.map((f) => f.id));

    switch (dados.acao) {
      case 'mover':
        await this.conferirPasta(dados.pastaId ?? null);
        await this.formularios.update({ id: ids }, { pastaId: dados.pastaId ?? null });
        break;
      case 'arquivar':
      case 'desarquivar':
        await this.formularios.update({ id: ids }, { arquivado: dados.acao === 'arquivar' });
        break;
      case 'favoritar':
      case 'desfavoritar':
        await this.formularios.update({ id: ids }, { favorito: dados.acao === 'favoritar' });
        break;
      case 'encerrar':
      case 'reabrir':
        await this.formularios.update({ id: ids }, { ativo: dados.acao === 'reabrir' });
        break;
      case 'etiquetar':
      case 'desetiquetar': {
        const [etiqueta] = this.normalizarEtiquetas([dados.etiqueta ?? '']);
        if (!etiqueta) throw new BadRequestException('Informe a etiqueta');
        for (const f of lista) {
          const atuais = f.etiquetas ?? [];
          f.etiquetas =
            dados.acao === 'etiquetar' ? this.normalizarEtiquetas([...atuais, etiqueta]) : atuais.filter((e) => e !== etiqueta);
          if (f.etiquetas.length > 10) throw new BadRequestException(`"${f.titulo}" já tem 10 etiquetas (o máximo)`);
        }
        await this.formularios.save(lista);
        break;
      }
      case 'excluir':
        await this.respostas.delete({ formularioId: ids });
        await this.sessoes.delete({ formularioId: ids });
        await this.formularios.delete({ id: ids });
        break;
    }
    return { afetadas: lista.length };
  }

  // Etiquetas: sem espaços sobrando, em minúsculas e sem repetir ("Clientes" = "clientes")
  private normalizarEtiquetas(lista: string[]) {
    const limpas = lista.map((e) => e.trim().replace(/\s+/g, ' ').toLowerCase().slice(0, 30)).filter(Boolean);
    return [...new Set(limpas)];
  }

  private async conferirPasta(pastaId: number | null | undefined) {
    if (pastaId === undefined || pastaId === null) return;
    if (!(await this.pastas.existsBy({ id: pastaId }))) throw new BadRequestException('Pasta não encontrada');
  }

  async excluir(id: number) {
    await this.buscar(id);
    // Respostas e sessões do funil vão junto (também há ON DELETE CASCADE no banco)
    await this.respostas.delete({ formularioId: id });
    await this.sessoes.delete({ formularioId: id });
    await this.formularios.delete({ id });
  }

  // Segmentos salvos no dashboard (substitui a lista inteira)
  async salvarSegmentos(id: number, segmentos: SegmentoDto[]) {
    const formulario = await this.buscar(id);
    const validas = new Set(formulario.perguntas.map((p) => p.id));
    for (const s of segmentos) {
      if (s.filtros.some((f) => !validas.has(f.perguntaId))) {
        throw new BadRequestException(`Segmento "${s.nome}": usa uma pergunta que não existe mais`);
      }
    }
    const limpos = segmentos.map((s) => ({ ...s, nome: s.nome.trim() }));
    await this.formularios.update({ id }, { segmentos: limpos });
    return limpos;
  }

  async registrarVisualizacao(id: number) {
    await this.buscar(id);
    await this.formularios.increment({ id }, 'visualizacoes', 1);
  }

  // Campos opcionais viram null e o texto é aparado
  private normalizar(dados: FormularioDto) {
    return {
      titulo: dados.titulo.trim(),
      descricao: dados.descricao?.trim() || null,
      perguntas: dados.perguntas.map((p) => ({
        ...p,
        titulo: p.titulo.trim(),
        opcoes: (p.opcoes ?? []).map((o) => o.trim()).filter(Boolean),
        condicoes: p.condicoes ?? [],
        logica: p.logica ?? 'todas',
      })),
      tema: dados.tema,
      modo: dados.modo,
      perguntaRamificacao: dados.perguntaRamificacao || null,
      mensagemFinal: dados.mensagemFinal?.trim() || null,
      ativo: dados.ativo ?? true,
    };
  }

  // Regras que o class-validator sozinho não consegue conferir
  private validarEstrutura(dados: FormularioDto) {
    const vistos = new Set<string>();
    for (const [i, p] of dados.perguntas.entries()) {
      const nome = `Pergunta ${i + 1}`;
      if (vistos.has(p.id)) throw new BadRequestException(`${nome}: id repetido (${p.id})`);
      if (!p.titulo.trim()) throw new BadRequestException(`${nome}: escreva o enunciado`);
      if (['unica', 'multipla', 'lista'].includes(p.tipo)) {
        const opcoes = (p.opcoes ?? []).map((o) => o.trim()).filter(Boolean);
        if (opcoes.length === 0) throw new BadRequestException(`${nome}: adicione pelo menos uma opção`);
        if (new Set(opcoes).size !== opcoes.length) throw new BadRequestException(`${nome}: há opções repetidas`);
      }
      // A condição só pode olhar para perguntas que vêm ANTES (senão nunca teria resposta)
      for (const c of p.condicoes ?? []) {
        if (!vistos.has(c.perguntaId)) {
          throw new BadRequestException(`${nome}: a ramificação deve usar uma pergunta anterior`);
        }
      }
      vistos.add(p.id);
    }

    if (dados.perguntaRamificacao) {
      const alvo = dados.perguntas.find((p) => p.id === dados.perguntaRamificacao);
      if (!alvo || opcoesDaPergunta(alvo).length === 0) {
        throw new BadRequestException('A pergunta de ramificação do Excel precisa ter opções');
      }
    }
  }
}

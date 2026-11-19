import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { FormularioDto } from './formulario.dto';
import { Formulario } from './formulario.entity';
import { opcoesDaPergunta } from './regras';
import { Resposta } from './resposta.entity';

@Injectable()
export class FormulariosService {
  constructor(
    @InjectRepository(Formulario) private readonly formularios: Repository<Formulario>,
    @InjectRepository(Resposta) private readonly respostas: Repository<Resposta>,
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
      return { ...f, totalRespostas: t ? Number(t.total) : 0, ultimaResposta: t?.ultima ?? null };
    });
  }

  async buscar(id: number) {
    const formulario = await this.formularios.findOneBy({ id });
    if (!formulario) throw new NotFoundException('Pesquisa não encontrada');
    return formulario;
  }

  criar(dados: FormularioDto) {
    this.validarEstrutura(dados);
    const agora = new Date();
    const novo = this.formularios.create({
      ...this.normalizar(dados),
      visualizacoes: 0,
      criadoEm: agora,
      atualizadoEm: agora,
    });
    return this.formularios.save(novo);
  }

  async alterar(id: number, dados: FormularioDto) {
    const atual = await this.buscar(id);
    this.validarEstrutura(dados);
    return this.formularios.save({ ...atual, ...this.normalizar(dados), atualizadoEm: new Date() });
  }

  async duplicar(id: number) {
    const original = await this.buscar(id);
    const agora = new Date();
    const { id: _id, ...resto } = original;
    const copia = this.formularios.create({
      ...resto,
      titulo: `${original.titulo} (cópia)`.slice(0, 200),
      visualizacoes: 0,
      criadoEm: agora,
      atualizadoEm: agora,
    });
    return this.formularios.save(copia);
  }

  async excluir(id: number) {
    await this.buscar(id);
    // As respostas vão junto (também há ON DELETE CASCADE no banco)
    await this.respostas.delete({ formularioId: id });
    await this.formularios.delete({ id });
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

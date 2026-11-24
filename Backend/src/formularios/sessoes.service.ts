import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { FormulariosService } from './formularios.service';
import { ProgressoDto } from './analise.dto';
import { Sessao } from './sessao.entity';

// Funil de abandono: registra até onde cada visita chegou
@Injectable()
export class SessoesService {
  constructor(
    @InjectRepository(Sessao) private readonly sessoes: Repository<Sessao>,
    private readonly formularios: FormulariosService,
  ) {}

  // Cria a sessão na primeira chamada e depois só soma as perguntas novas
  async registrar(formularioId: number, dados: ProgressoDto) {
    const formulario = await this.formularios.buscar(formularioId);
    if (!formulario.ativo) return; // pesquisa encerrada: não conta mais
    const validas = new Set(formulario.perguntas.map((p) => p.id));
    const perguntas = dados.perguntas.filter((id) => validas.has(id));
    await this.salvar(formularioId, dados.sessao, perguntas, false);
  }

  // Chamado quando a resposta é enviada: marca como concluída
  async concluir(formularioId: number, sessao: string, perguntas: string[]) {
    await this.salvar(formularioId, sessao, perguntas, true);
  }

  listar(formularioId: number) {
    return this.sessoes.find({
      select: { id: true, perguntas: true, concluida: true, criadoEm: true, atualizadoEm: true },
      where: { formularioId },
      order: { criadoEm: 'DESC' },
    });
  }

  private async salvar(formularioId: number, sessao: string, perguntas: string[], concluida: boolean) {
    const agora = new Date();
    const existente = await this.sessoes.findOneBy({ formularioId, sessao });
    if (existente) {
      existente.perguntas = [...new Set([...existente.perguntas, ...perguntas])];
      existente.concluida = existente.concluida || concluida;
      existente.atualizadoEm = agora;
      await this.sessoes.save(existente);
      return;
    }
    try {
      await this.sessoes.insert({ formularioId, sessao, perguntas, concluida, criadoEm: agora, atualizadoEm: agora });
    } catch (e) {
      // Duas chamadas ao mesmo tempo: a outra já criou a linha, então só atualiza
      if ((e as { code?: string }).code !== 'ER_DUP_ENTRY') throw e;
      await this.salvar(formularioId, sessao, perguntas, concluida);
    }
  }
}

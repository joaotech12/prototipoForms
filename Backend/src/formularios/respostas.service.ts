import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { FormulariosService } from './formularios.service';
import { aplicarRamificacao, validarValor } from './regras';
import { RespostaDto } from './resposta.dto';
import { Resposta } from './resposta.entity';

@Injectable()
export class RespostasService {
  constructor(
    @InjectRepository(Resposta) private readonly respostas: Repository<Resposta>,
    private readonly formularios: FormulariosService,
  ) {}

  async listar(formularioId: number) {
    await this.formularios.buscar(formularioId);
    return this.respostas.find({ where: { formularioId }, order: { criadoEm: 'DESC' } });
  }

  async enviar(formularioId: number, corpo: RespostaDto) {
    const formulario = await this.formularios.buscar(formularioId);
    if (!formulario.ativo) throw new BadRequestException('Esta pesquisa está encerrada');

    // Só valem as respostas das perguntas que a pessoa realmente viu (ramificação)
    const { visiveis, limpas } = aplicarRamificacao(formulario.perguntas, corpo.dados);
    for (const p of visiveis) {
      const erro = validarValor(p, limpas[p.id]);
      if (erro) throw new BadRequestException(`"${p.titulo}": ${erro}`);
    }
    if (Object.keys(limpas).length === 0) throw new BadRequestException('Responda pelo menos uma pergunta');

    const nova = this.respostas.create({
      formularioId,
      dados: limpas,
      duracaoSegundos: corpo.duracaoSegundos ?? null,
      criadoEm: new Date(),
    });
    return this.respostas.save(nova);
  }

  async excluir(id: number) {
    const resposta = await this.respostas.findOneBy({ id });
    if (!resposta) throw new NotFoundException('Resposta não encontrada');
    await this.respostas.delete({ id });
  }
}

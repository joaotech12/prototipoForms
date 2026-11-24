import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { TemaSalvoDto } from './tema.dto';
import { TemaSalvo } from './tema.entity';

@Injectable()
export class TemasService {
  constructor(@InjectRepository(TemaSalvo) private readonly repositorio: Repository<TemaSalvo>) {}

  listar() {
    return this.repositorio.find({ order: { criadoEm: 'DESC' } });
  }

  criar(dados: TemaSalvoDto) {
    const novo = this.repositorio.create({ nome: dados.nome.trim(), tema: dados.tema, criadoEm: new Date() });
    return this.repositorio.save(novo);
  }

  async excluir(id: number) {
    const tema = await this.repositorio.findOneBy({ id });
    if (!tema) throw new NotFoundException('Tema não encontrado');
    await this.repositorio.delete({ id });
  }
}

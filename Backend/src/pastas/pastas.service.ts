import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Formulario } from '../formularios/formulario.entity';
import { PastaDto } from './pasta.dto';
import { Pasta } from './pasta.entity';

@Injectable()
export class PastasService {
  constructor(
    @InjectRepository(Pasta) private readonly pastas: Repository<Pasta>,
    @InjectRepository(Formulario) private readonly formularios: Repository<Formulario>,
  ) {}

  // Lista as pastas já com quantas pesquisas (não arquivadas) cada uma tem
  async listar() {
    const lista = await this.pastas.find({ order: { nome: 'ASC' } });
    const totais: { pastaId: number; total: string }[] = await this.formularios
      .createQueryBuilder('f')
      .select('f.pastaId', 'pastaId')
      .addSelect('COUNT(*)', 'total')
      .where('f.pastaId IS NOT NULL')
      .andWhere('f.arquivado = :arquivado', { arquivado: false })
      .groupBy('f.pastaId')
      .getRawMany();
    return lista.map((p) => ({
      ...p,
      totalPesquisas: Number(totais.find((t) => Number(t.pastaId) === p.id)?.total ?? 0),
    }));
  }

  async buscar(id: number) {
    const pasta = await this.pastas.findOneBy({ id });
    if (!pasta) throw new NotFoundException('Pasta não encontrada');
    return pasta;
  }

  criar(dados: PastaDto) {
    return this.pastas.save(this.pastas.create({ nome: dados.nome.trim(), cor: dados.cor, criadoEm: new Date() }));
  }

  async alterar(id: number, dados: PastaDto) {
    const pasta = await this.buscar(id);
    return this.pastas.save({ ...pasta, nome: dados.nome.trim(), cor: dados.cor });
  }

  // As pesquisas da pasta NÃO são excluídas: ficam "sem pasta" (também há ON DELETE SET NULL no banco)
  async excluir(id: number) {
    await this.buscar(id);
    await this.formularios.update({ pastaId: id }, { pastaId: null });
    await this.pastas.delete({ id });
  }
}

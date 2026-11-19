import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ProdutoDto } from './produto.dto';
import { Produto } from './produto.entity';

@Injectable()
export class ProdutosService {
  constructor(@InjectRepository(Produto) private readonly repositorio: Repository<Produto>) {}

  listar() {
    return this.repositorio.find({ order: { nome: 'ASC' } });
  }

  async buscar(id: number) {
    const produto = await this.repositorio.findOneBy({ id });
    if (!produto) throw new NotFoundException('Produto não encontrado');
    return produto;
  }

  criar(dados: ProdutoDto) {
    return this.repositorio.save(this.repositorio.create(dados));
  }

  async alterar(id: number, dados: ProdutoDto) {
    const produto = await this.buscar(id);
    return this.repositorio.save({ ...produto, ...dados });
  }

  async excluir(id: number) {
    await this.buscar(id);
    await this.repositorio.delete({ id });
  }
}

import { Body, Controller, Delete, Get, HttpCode, Param, ParseIntPipe, Post, Put } from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiCreatedResponse,
  ApiNoContentResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { ProdutoDto } from './produto.dto';
import { Produto } from './produto.entity';
import { ProdutosService } from './produtos.service';

@ApiTags('Produtos')
@Controller('api/produtos')
export class ProdutosController {
  constructor(private readonly servico: ProdutosService) {}

  @Get()
  @ApiOperation({ summary: 'Lista todos os produtos' })
  @ApiOkResponse({ type: [Produto] })
  listar() {
    return this.servico.listar();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Busca um produto' })
  @ApiOkResponse({ type: Produto })
  @ApiNotFoundResponse({ description: 'Produto não encontrado' })
  buscar(@Param('id', ParseIntPipe) id: number) {
    return this.servico.buscar(id);
  }

  @Post()
  @ApiOperation({ summary: 'Cadastra um produto' })
  @ApiCreatedResponse({ type: Produto })
  @ApiBadRequestResponse({ description: 'Dados inválidos' })
  criar(@Body() dados: ProdutoDto) {
    return this.servico.criar(dados);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Altera um produto' })
  @ApiOkResponse({ type: Produto })
  @ApiNotFoundResponse({ description: 'Produto não encontrado' })
  alterar(@Param('id', ParseIntPipe) id: number, @Body() dados: ProdutoDto) {
    return this.servico.alterar(id, dados);
  }

  @Delete(':id')
  @HttpCode(204)
  @ApiOperation({ summary: 'Exclui um produto' })
  @ApiNoContentResponse({ description: 'Excluído' })
  @ApiNotFoundResponse({ description: 'Produto não encontrado' })
  excluir(@Param('id', ParseIntPipe) id: number) {
    return this.servico.excluir(id);
  }
}

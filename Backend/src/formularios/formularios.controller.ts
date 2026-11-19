import { Body, Controller, Delete, Get, HttpCode, Param, ParseIntPipe, Post, Put, Res } from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiCreatedResponse,
  ApiNoContentResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiProduces,
  ApiTags,
} from '@nestjs/swagger';
import { Response } from 'express';
import { ExportacaoService } from './exportacao.service';
import { FormularioDto } from './formulario.dto';
import { Formulario } from './formulario.entity';
import { FormulariosService } from './formularios.service';
import { RespostaDto } from './resposta.dto';
import { Resposta } from './resposta.entity';
import { RespostasService } from './respostas.service';

@ApiTags('Pesquisas')
@Controller('api/formularios')
export class FormulariosController {
  constructor(
    private readonly formularios: FormulariosService,
    private readonly respostas: RespostasService,
    private readonly exportacao: ExportacaoService,
  ) {}

  @Get()
  @ApiOperation({ summary: 'Lista as pesquisas (com total de respostas e data da última)' })
  @ApiOkResponse({ type: [Formulario] })
  listar() {
    return this.formularios.listar();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Busca uma pesquisa (perguntas e tema)' })
  @ApiOkResponse({ type: Formulario })
  @ApiNotFoundResponse({ description: 'Pesquisa não encontrada' })
  buscar(@Param('id', ParseIntPipe) id: number) {
    return this.formularios.buscar(id);
  }

  @Post()
  @ApiOperation({ summary: 'Cria uma pesquisa' })
  @ApiCreatedResponse({ type: Formulario })
  @ApiBadRequestResponse({ description: 'Dados inválidos' })
  criar(@Body() dados: FormularioDto) {
    return this.formularios.criar(dados);
  }

  @Post(':id/duplicar')
  @ApiOperation({ summary: 'Cria uma cópia da pesquisa (sem as respostas)' })
  @ApiCreatedResponse({ type: Formulario })
  @ApiNotFoundResponse({ description: 'Pesquisa não encontrada' })
  duplicar(@Param('id', ParseIntPipe) id: number) {
    return this.formularios.duplicar(id);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Altera uma pesquisa' })
  @ApiOkResponse({ type: Formulario })
  @ApiBadRequestResponse({ description: 'Dados inválidos' })
  @ApiNotFoundResponse({ description: 'Pesquisa não encontrada' })
  alterar(@Param('id', ParseIntPipe) id: number, @Body() dados: FormularioDto) {
    return this.formularios.alterar(id, dados);
  }

  @Delete(':id')
  @HttpCode(204)
  @ApiOperation({ summary: 'Exclui a pesquisa e as respostas dela' })
  @ApiNoContentResponse({ description: 'Excluída' })
  @ApiNotFoundResponse({ description: 'Pesquisa não encontrada' })
  excluir(@Param('id', ParseIntPipe) id: number) {
    return this.formularios.excluir(id);
  }

  @Post(':id/visualizacoes')
  @HttpCode(204)
  @ApiOperation({ summary: 'Conta uma visualização do link (usada na taxa de conclusão)' })
  @ApiNoContentResponse({ description: 'Contada' })
  registrarVisualizacao(@Param('id', ParseIntPipe) id: number) {
    return this.formularios.registrarVisualizacao(id);
  }

  @Get(':id/respostas')
  @ApiOperation({ summary: 'Lista as respostas da pesquisa (mais recentes primeiro)' })
  @ApiOkResponse({ type: [Resposta] })
  listarRespostas(@Param('id', ParseIntPipe) id: number) {
    return this.respostas.listar(id);
  }

  @Post(':id/respostas')
  @ApiOperation({ summary: 'Envia uma resposta (confere obrigatórias, tipos e ramificação)' })
  @ApiCreatedResponse({ type: Resposta })
  @ApiBadRequestResponse({ description: 'Resposta inválida ou pesquisa encerrada' })
  enviarResposta(@Param('id', ParseIntPipe) id: number, @Body() corpo: RespostaDto) {
    return this.respostas.enviar(id, corpo);
  }

  @Get(':id/exportar')
  @ApiOperation({ summary: 'Baixa o Excel (resumo + todas as respostas + abas por ramificação)' })
  @ApiProduces('application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
  @ApiOkResponse({ description: 'Arquivo .xlsx' })
  async exportar(@Param('id', ParseIntPipe) id: number, @Res() res: Response) {
    const formulario = await this.formularios.buscar(id);
    const respostas = await this.respostas.listar(id);
    const arquivo = await this.exportacao.gerar(formulario, respostas);
    const nome = `pesquisa-${id}.xlsx`;
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="${nome}"`);
    res.send(arquivo);
  }
}

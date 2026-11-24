import { Body, Controller, Delete, Get, HttpCode, Param, ParseIntPipe, Post } from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiCreatedResponse,
  ApiNoContentResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { TemaSalvoDto } from './tema.dto';
import { TemaSalvo } from './tema.entity';
import { TemasService } from './temas.service';

@ApiTags('Temas')
@Controller('api/temas')
export class TemasController {
  constructor(private readonly servico: TemasService) {}

  @Get()
  @ApiOperation({ summary: 'Lista os temas salvos pela empresa' })
  @ApiOkResponse({ type: [TemaSalvo] })
  listar() {
    return this.servico.listar();
  }

  @Post()
  @ApiOperation({ summary: 'Salva um tema para reaproveitar em outras pesquisas' })
  @ApiCreatedResponse({ type: TemaSalvo })
  @ApiBadRequestResponse({ description: 'Dados inválidos' })
  criar(@Body() dados: TemaSalvoDto) {
    return this.servico.criar(dados);
  }

  @Delete(':id')
  @HttpCode(204)
  @ApiOperation({ summary: 'Exclui um tema salvo (as pesquisas que já usam continuam iguais)' })
  @ApiNoContentResponse({ description: 'Excluído' })
  @ApiNotFoundResponse({ description: 'Tema não encontrado' })
  excluir(@Param('id', ParseIntPipe) id: number) {
    return this.servico.excluir(id);
  }
}

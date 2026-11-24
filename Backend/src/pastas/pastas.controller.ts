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
import { PastaDto } from './pasta.dto';
import { Pasta } from './pasta.entity';
import { PastasService } from './pastas.service';

@ApiTags('Pastas')
@Controller('api/pastas')
export class PastasController {
  constructor(private readonly servico: PastasService) {}

  @Get()
  @ApiOperation({ summary: 'Lista as pastas (com o total de pesquisas de cada uma)' })
  @ApiOkResponse({ type: [Pasta] })
  listar() {
    return this.servico.listar();
  }

  @Post()
  @ApiOperation({ summary: 'Cria uma pasta' })
  @ApiCreatedResponse({ type: Pasta })
  @ApiBadRequestResponse({ description: 'Dados inválidos' })
  criar(@Body() dados: PastaDto) {
    return this.servico.criar(dados);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Renomeia ou muda a cor de uma pasta' })
  @ApiOkResponse({ type: Pasta })
  @ApiNotFoundResponse({ description: 'Pasta não encontrada' })
  alterar(@Param('id', ParseIntPipe) id: number, @Body() dados: PastaDto) {
    return this.servico.alterar(id, dados);
  }

  @Delete(':id')
  @HttpCode(204)
  @ApiOperation({ summary: 'Exclui a pasta (as pesquisas dela ficam sem pasta, nada é apagado)' })
  @ApiNoContentResponse({ description: 'Excluída' })
  @ApiNotFoundResponse({ description: 'Pasta não encontrada' })
  excluir(@Param('id', ParseIntPipe) id: number) {
    return this.servico.excluir(id);
  }
}

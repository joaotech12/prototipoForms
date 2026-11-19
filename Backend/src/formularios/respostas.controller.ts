import { Controller, Delete, HttpCode, Param, ParseIntPipe } from '@nestjs/common';
import { ApiNoContentResponse, ApiNotFoundResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { RespostasService } from './respostas.service';

@ApiTags('Respostas')
@Controller('api/respostas')
export class RespostasController {
  constructor(private readonly respostas: RespostasService) {}

  @Delete(':id')
  @HttpCode(204)
  @ApiOperation({ summary: 'Exclui uma resposta' })
  @ApiNoContentResponse({ description: 'Excluída' })
  @ApiNotFoundResponse({ description: 'Resposta não encontrada' })
  excluir(@Param('id', ParseIntPipe) id: number) {
    return this.respostas.excluir(id);
  }
}

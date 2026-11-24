import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { ArrayMaxSize, IsArray, IsIn, IsNotEmpty, IsString, IsUUID, MaxLength, ValidateNested } from 'class-validator';

// Progresso de quem está respondendo (enviado pelo link público enquanto a pessoa responde)
export class ProgressoDto {
  @ApiProperty({ example: '3f2b8c1e-4d5a-4b6c-9e7f-1a2b3c4d5e6f', description: 'Código da visita (gerado no navegador)' })
  @IsUUID('4', { message: 'Sessão inválida' })
  sessao: string;

  @ApiProperty({ type: [String], example: ['plano', 'nota'], description: 'Ids das perguntas já respondidas' })
  @IsArray()
  @ArrayMaxSize(200)
  @IsString({ each: true })
  @MaxLength(50, { each: true })
  perguntas: string[];
}

// ----- Segmentos salvos do dashboard (ex.: "Plano Pro com nota baixa") -----
export class FiltroDto {
  @ApiProperty({ example: 'plano' })
  @IsString()
  @MaxLength(50)
  perguntaId: string;

  @ApiProperty({ example: 'Pro', description: 'Opção escolhida (ou "Promotores", "Neutros", "Detratores" no NPS)' })
  @IsString()
  @MaxLength(200)
  valor: string;
}

export class SegmentoDto {
  @ApiProperty({ example: 's_k3j9x2' })
  @IsString()
  @MaxLength(30)
  id: string;

  @ApiProperty({ example: 'Pro com nota baixa' })
  @IsString()
  @IsNotEmpty({ message: 'Dê um nome para o segmento' })
  @MaxLength(60)
  nome: string;

  @ApiProperty({ enum: ['tudo', '7', '30', '90'], example: '30' })
  @IsIn(['tudo', '7', '30', '90'])
  periodo: string;

  @ApiProperty({ type: [FiltroDto] })
  @IsArray()
  @ArrayMaxSize(10)
  @ValidateNested({ each: true })
  @Type(() => FiltroDto)
  filtros: FiltroDto[];
}

export class SegmentosDto {
  @ApiPropertyOptional({ type: [SegmentoDto] })
  @IsArray()
  @ArrayMaxSize(20, { message: 'No máximo 20 segmentos por pesquisa' })
  @ValidateNested({ each: true })
  @Type(() => SegmentoDto)
  segmentos: SegmentoDto[];
}

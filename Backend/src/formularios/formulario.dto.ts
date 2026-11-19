import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  Allow,
  ArrayMaxSize,
  IsArray,
  IsBoolean,
  IsIn,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
  Max,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';

// Tipos de pergunta aceitos (a mesma lista existe no frontend, em services/tipos.js)
export const TIPOS_PERGUNTA = [
  'texto',
  'paragrafo',
  'email',
  'numero',
  'data',
  'unica',
  'multipla',
  'lista',
  'simnao',
  'nps',
  'csat',
] as const;

export const OPERADORES = ['igual', 'diferente', 'contem', 'maior', 'menor', 'respondida'] as const;
export const MODOS = ['classico', 'conversacional'] as const;

const COR = /^#[0-9a-fA-F]{6}$/;

// "Mostrar esta pergunta só se <pergunta> <operador> <valor>"
export class CondicaoDto {
  @ApiProperty({ example: 'nota', description: 'id de uma pergunta ANTERIOR' })
  @IsString()
  perguntaId: string;

  @ApiProperty({ enum: OPERADORES, example: 'menor' })
  @IsIn(OPERADORES)
  operador: string;

  @ApiPropertyOptional({ example: 7, description: 'Texto ou número (não usado em "respondida")' })
  @IsOptional()
  @Allow()
  valor?: string | number;
}

export class PerguntaDto {
  @ApiProperty({ example: 'nota' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(50)
  id: string;

  @ApiProperty({ enum: TIPOS_PERGUNTA, example: 'nps' })
  @IsIn(TIPOS_PERGUNTA, { message: 'Tipo de pergunta inválido' })
  tipo: string;

  @ApiProperty({ example: 'De 0 a 10, quanto você nos recomendaria?' })
  @IsString()
  @MaxLength(500)
  titulo: string;

  @ApiPropertyOptional({ example: '' })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  descricao?: string;

  @ApiProperty({ example: true })
  @IsBoolean()
  obrigatoria: boolean;

  @ApiPropertyOptional({ type: [String], example: ['Básico', 'Pro'] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  @ArrayMaxSize(100)
  opcoes?: string[];

  @ApiPropertyOptional({ type: [CondicaoDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CondicaoDto)
  condicoes?: CondicaoDto[];

  @ApiPropertyOptional({ enum: ['todas', 'qualquer'], example: 'todas' })
  @IsOptional()
  @IsIn(['todas', 'qualquer'])
  logica?: string;
}

// Identidade visual do formulário
export class TemaDto {
  @ApiPropertyOptional({ description: 'URL ou imagem em base64 (data:image/...)' })
  @IsOptional()
  @IsString()
  logo?: string;

  @ApiProperty({ example: '#6d28d9' })
  @Matches(COR, { message: 'Cor primária inválida' })
  corPrimaria: string;

  @ApiProperty({ example: '#f5f3ff' })
  @Matches(COR, { message: 'Cor de fundo inválida' })
  corFundo: string;

  @ApiProperty({ example: '#1f2937' })
  @Matches(COR, { message: 'Cor do texto inválida' })
  corTexto: string;

  @ApiProperty({ example: 'Inter' })
  @IsString()
  @MaxLength(60)
  fonte: string;

  @ApiProperty({ example: 12, description: 'Arredondamento dos cantos, em px' })
  @IsInt()
  @Min(0)
  @Max(32)
  cantos: number;
}

// Dados que o cliente envia para criar ou alterar uma pesquisa
export class FormularioDto {
  @ApiProperty({ example: 'Pesquisa de satisfação' })
  @IsString()
  @IsNotEmpty({ message: 'Informe o título da pesquisa' })
  @MaxLength(200)
  titulo: string;

  @ApiPropertyOptional({ example: 'Leva menos de 1 minuto.' })
  @IsOptional()
  @IsString()
  descricao?: string;

  @ApiProperty({ type: [PerguntaDto] })
  @IsArray()
  @ArrayMaxSize(200)
  @ValidateNested({ each: true })
  @Type(() => PerguntaDto)
  perguntas: PerguntaDto[];

  @ApiProperty({ type: TemaDto })
  @ValidateNested()
  @Type(() => TemaDto)
  tema: TemaDto;

  @ApiProperty({ enum: MODOS, example: 'conversacional' })
  @IsIn(MODOS)
  modo: string;

  @ApiPropertyOptional({ example: 'plano', description: 'Pergunta que gera uma aba por opção no Excel' })
  @IsOptional()
  @IsString()
  perguntaRamificacao?: string | null;

  @ApiPropertyOptional({ example: 'Obrigado pela sua opinião!' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  mensagemFinal?: string | null;

  @ApiPropertyOptional({ example: true, description: 'false = pesquisa encerrada' })
  @IsOptional()
  @IsBoolean()
  ativo?: boolean;
}

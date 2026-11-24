import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  Allow,
  ArrayMaxSize,
  ArrayMinSize,
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
// Imagem: vazia, enviada (data:image/...) ou endereço http(s). Bloqueia "javascript:" e afins.
const IMAGEM = /^$|^data:image\/(png|jpeg|webp|gif);base64,[A-Za-z0-9+/=]+$|^https?:\/\/[^\s"'()]+$/;

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
  @Matches(IMAGEM, { message: 'Logo inválido: use uma imagem enviada ou um endereço http(s)' })
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

  // ----- Personalização avançada (todas opcionais: pesquisas antigas continuam válidas) -----

  @ApiPropertyOptional({ enum: ['esquerda', 'centro'] })
  @IsOptional()
  @IsIn(['esquerda', 'centro'])
  logoPosicao?: string;

  @ApiPropertyOptional({ enum: ['p', 'm', 'g'] })
  @IsOptional()
  @IsIn(['p', 'm', 'g'])
  logoTamanho?: string;

  @ApiPropertyOptional({ description: 'Imagem de capa no topo (URL ou base64)' })
  @IsOptional()
  @IsString()
  @Matches(IMAGEM, { message: 'Capa inválida: use uma imagem enviada ou um endereço http(s)' })
  capa?: string;

  @ApiPropertyOptional({ enum: ['baixa', 'media', 'alta'] })
  @IsOptional()
  @IsIn(['baixa', 'media', 'alta'])
  capaAltura?: string;

  @ApiPropertyOptional({ example: '#ffffff', description: 'Fundo dos campos de resposta' })
  @IsOptional()
  @Matches(COR, { message: 'Cor dos campos inválida' })
  corCampo?: string;

  @ApiPropertyOptional({ enum: ['cor', 'gradiente', 'imagem'] })
  @IsOptional()
  @IsIn(['cor', 'gradiente', 'imagem'])
  fundoTipo?: string;

  @ApiPropertyOptional({ example: '#ddd6fe', description: 'Segunda cor do degradê' })
  @IsOptional()
  @Matches(COR, { message: 'Segunda cor do fundo inválida' })
  corFundo2?: string;

  @ApiPropertyOptional({ description: 'Imagem de fundo (URL ou base64)' })
  @IsOptional()
  @IsString()
  @Matches(IMAGEM, { message: 'Imagem de fundo inválida' })
  fundoImagem?: string;

  @ApiPropertyOptional({ example: 30, description: 'Película escura sobre a imagem de fundo, em %' })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(80)
  fundoEscurecer?: number;

  @ApiPropertyOptional({ example: 'Playfair Display', description: 'Fonte dos títulos (vazio = mesma do texto)' })
  @IsOptional()
  @IsString()
  @MaxLength(60)
  fonteTitulo?: string;

  @ApiPropertyOptional({ enum: ['p', 'm', 'g'] })
  @IsOptional()
  @IsIn(['p', 'm', 'g'])
  tamanhoFonte?: string;

  @ApiPropertyOptional({ enum: ['estreita', 'normal', 'larga'] })
  @IsOptional()
  @IsIn(['estreita', 'normal', 'larga'])
  largura?: string;

  @ApiPropertyOptional({ enum: ['esquerda', 'centro'] })
  @IsOptional()
  @IsIn(['esquerda', 'centro'])
  alinhamento?: string;

  @ApiPropertyOptional({ enum: ['caixa', 'linha'], description: 'Campo com borda ou só com linha embaixo' })
  @IsOptional()
  @IsIn(['caixa', 'linha'])
  estiloCampo?: string;

  @ApiPropertyOptional({ enum: ['cheio', 'contorno'] })
  @IsOptional()
  @IsIn(['cheio', 'contorno'])
  estiloBotao?: string;

  @ApiPropertyOptional({ example: 'Enviar respostas' })
  @IsOptional()
  @IsString()
  @MaxLength(40)
  textoBotao?: string;

  @ApiPropertyOptional({ example: 'Começar' })
  @IsOptional()
  @IsString()
  @MaxLength(40)
  textoComecar?: string;

  @ApiPropertyOptional({ example: true })
  @IsOptional()
  @IsBoolean()
  mostrarProgresso?: boolean;

  @ApiPropertyOptional({ example: true })
  @IsOptional()
  @IsBoolean()
  mostrarNumeros?: boolean;

  @ApiPropertyOptional({ example: true, description: 'Rodapé "Feito com Central de Pesquisas"' })
  @IsOptional()
  @IsBoolean()
  mostrarMarca?: boolean;

  @ApiPropertyOptional({ example: 'https://minhaempresa.com.br', description: 'Botão na tela final' })
  @IsOptional()
  @IsString()
  @Matches(/^(https?:\/\/\S+)?$/, { message: 'O link final precisa começar com http:// ou https://' })
  linkFinal?: string;

  @ApiPropertyOptional({ example: 'Voltar ao site' })
  @IsOptional()
  @IsString()
  @MaxLength(40)
  textoLinkFinal?: string;

  @ApiPropertyOptional({ example: false, description: 'Abre o link final sozinho depois de 3 s' })
  @IsOptional()
  @IsBoolean()
  redirecionar?: boolean;
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

  @ApiPropertyOptional({ example: 1, nullable: true, description: 'Pasta (null = sem pasta; omitido = não muda)' })
  @IsOptional()
  @IsInt()
  pastaId?: number | null;

  @ApiPropertyOptional({ type: [String], example: ['clientes'], description: 'Omitido = não muda' })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(10, { message: 'No máximo 10 etiquetas por pesquisa' })
  @IsString({ each: true })
  @MaxLength(30, { each: true, message: 'Cada etiqueta pode ter até 30 letras' })
  etiquetas?: string[];
}

// ----- Ações em lote do Painel -----
export const ACOES_LOTE = [
  'mover',
  'etiquetar',
  'desetiquetar',
  'arquivar',
  'desarquivar',
  'favoritar',
  'desfavoritar',
  'encerrar',
  'reabrir',
  'excluir',
] as const;

export class LoteDto {
  @ApiProperty({ type: [Number], example: [1, 2, 3] })
  @IsArray()
  @ArrayMinSize(1, { message: 'Selecione pelo menos uma pesquisa' })
  @ArrayMaxSize(500)
  @IsInt({ each: true })
  ids: number[];

  @ApiProperty({ enum: ACOES_LOTE, example: 'mover' })
  @IsIn(ACOES_LOTE, { message: 'Ação inválida' })
  acao: string;

  @ApiPropertyOptional({ example: 1, nullable: true, description: 'Para "mover" (null = tirar da pasta)' })
  @IsOptional()
  @IsInt()
  pastaId?: number | null;

  @ApiPropertyOptional({ example: 'clientes', description: 'Para "etiquetar" e "desetiquetar"' })
  @IsOptional()
  @IsString()
  @MaxLength(30)
  etiqueta?: string;
}

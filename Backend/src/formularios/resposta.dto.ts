import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsInt, IsObject, IsOptional, Max, Min } from 'class-validator';

// O que o site público envia quando alguém termina de responder
export class RespostaDto {
  @ApiProperty({ example: { nota: 9, plano: 'Pro', gosta: 'Atendimento rápido' } })
  @IsObject({ message: 'Envie as respostas como objeto { idDaPergunta: valor }' })
  dados: Record<string, unknown>;

  @ApiPropertyOptional({ example: 42, description: 'Tempo que a pessoa levou, em segundos' })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(86400)
  duracaoSegundos?: number;
}

import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsNotEmpty, IsString, MaxLength, ValidateNested } from 'class-validator';
import { TemaDto } from '../formularios/formulario.dto';

// O que o cliente envia para salvar um tema
export class TemaSalvoDto {
  @ApiProperty({ example: 'Marca da empresa' })
  @IsString()
  @IsNotEmpty({ message: 'Dê um nome para o tema' })
  @MaxLength(80)
  nome: string;

  @ApiProperty({ type: TemaDto })
  @ValidateNested()
  @Type(() => TemaDto)
  tema: TemaDto;
}

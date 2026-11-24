import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, Matches, MaxLength } from 'class-validator';

// O que o cliente envia para criar ou renomear uma pasta
export class PastaDto {
  @ApiProperty({ example: 'Clientes' })
  @IsString()
  @IsNotEmpty({ message: 'Dê um nome para a pasta' })
  @MaxLength(60)
  nome: string;

  @ApiProperty({ example: '#0369a1' })
  @Matches(/^#[0-9a-fA-F]{6}$/, { message: 'Cor da pasta inválida' })
  cor: string;
}

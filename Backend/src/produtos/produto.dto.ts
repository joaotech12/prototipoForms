import { ApiProperty } from '@nestjs/swagger';
import { IsInt, IsNotEmpty, IsNumber, IsString, MaxLength, Min } from 'class-validator';

// Dados que o cliente envia para cadastrar ou alterar um produto
export class ProdutoDto {
  @ApiProperty({ example: 'Teclado' })
  @IsString()
  @IsNotEmpty({ message: 'Informe o nome do produto' })
  @MaxLength(120)
  nome: string;

  @ApiProperty({ example: 149.9 })
  @IsNumber({ maxDecimalPlaces: 2 }, { message: 'Preço inválido' })
  @Min(0)
  preco: number;

  @ApiProperty({ example: 12 })
  @IsInt({ message: 'Estoque deve ser um número inteiro' })
  @Min(0)
  estoque: number;
}

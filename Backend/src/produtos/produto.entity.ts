import { ApiProperty } from '@nestjs/swagger';
import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

// O mysql2 entrega DECIMAL como texto ("149.90"); o transformer converte para número
const decimalParaNumero = {
  to: (valor: number) => valor,
  from: (valor: string | null) => (valor === null ? null : Number(valor)),
};

@Entity('produtos')
export class Produto {
  @ApiProperty({ example: 1 })
  @PrimaryGeneratedColumn()
  id: number;

  @ApiProperty({ example: 'Teclado' })
  @Column({ length: 120 })
  nome: string;

  @ApiProperty({ example: 149.9 })
  @Column({ type: 'decimal', precision: 10, scale: 2, transformer: decimalParaNumero })
  preco: number;

  @ApiProperty({ example: 12 })
  @Column({ type: 'int' })
  estoque: number;
}

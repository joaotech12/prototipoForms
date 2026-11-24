import { ApiProperty } from '@nestjs/swagger';
import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

// Pasta para organizar as pesquisas (ex.: "Clientes", "RH")
@Entity('pastas')
export class Pasta {
  @ApiProperty({ example: 1 })
  @PrimaryGeneratedColumn()
  id: number;

  @ApiProperty({ example: 'Clientes' })
  @Column({ length: 60 })
  nome: string;

  @ApiProperty({ example: '#0369a1' })
  @Column({ length: 7, default: '#6d28d9' })
  cor: string;

  @ApiProperty()
  @Column({ name: 'criado_em', type: 'datetime' })
  criadoEm: Date;
}

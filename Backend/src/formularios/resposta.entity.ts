import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity('respostas')
export class Resposta {
  @ApiProperty({ example: 1 })
  @PrimaryGeneratedColumn()
  id: number;

  @ApiProperty({ example: 1 })
  @Column({ name: 'formulario_id', type: 'int' })
  formularioId: number;

  @ApiProperty({ example: { nota: 9, plano: 'Pro' }, description: '{ idDaPergunta: valor }' })
  @Column({ type: 'simple-json' })
  dados: Record<string, unknown>;

  @ApiPropertyOptional({ example: 42, nullable: true })
  @Column({ name: 'duracao_segundos', type: 'int', nullable: true })
  duracaoSegundos: number | null;

  @ApiProperty()
  @Column({ name: 'criado_em', type: 'datetime' })
  criadoEm: Date;
}

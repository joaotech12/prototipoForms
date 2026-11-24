import { ApiProperty } from '@nestjs/swagger';
import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

// Uma visita ao link público. Serve para o funil de abandono do dashboard.
@Entity('sessoes')
export class Sessao {
  @ApiProperty({ example: 1 })
  @PrimaryGeneratedColumn()
  id: number;

  @ApiProperty({ example: 1 })
  @Column({ name: 'formulario_id', type: 'int' })
  formularioId: number;

  // Código aleatório gerado pelo navegador de quem responde (não identifica a pessoa)
  @Column({ length: 36 })
  sessao: string;

  @ApiProperty({ type: [String], example: ['plano', 'nota'], description: 'Ids das perguntas já respondidas' })
  @Column({ type: 'simple-json' })
  perguntas: string[];

  @ApiProperty({ example: false, description: 'true = enviou a resposta no fim' })
  @Column({ type: 'boolean', default: false })
  concluida: boolean;

  @ApiProperty()
  @Column({ name: 'criado_em', type: 'datetime' })
  criadoEm: Date;

  @ApiProperty()
  @Column({ name: 'atualizado_em', type: 'datetime' })
  atualizadoEm: Date;
}

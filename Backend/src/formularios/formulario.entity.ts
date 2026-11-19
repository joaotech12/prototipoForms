import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';
import { MODOS, PerguntaDto, TemaDto } from './formulario.dto';

@Entity('formularios')
export class Formulario {
  @ApiProperty({ example: 1 })
  @PrimaryGeneratedColumn()
  id: number;

  @ApiProperty({ example: 'Pesquisa de satisfação' })
  @Column({ length: 200 })
  titulo: string;

  @ApiPropertyOptional({ nullable: true })
  @Column({ type: 'text', nullable: true })
  descricao: string | null;

  // simple-json: o TypeORM grava como texto JSON (coluna LONGTEXT) e devolve como objeto
  @ApiProperty({ type: [PerguntaDto] })
  @Column({ type: 'simple-json' })
  perguntas: PerguntaDto[];

  @ApiProperty({ type: TemaDto })
  @Column({ type: 'simple-json' })
  tema: TemaDto;

  @ApiProperty({ enum: MODOS })
  @Column({ length: 20, default: 'classico' })
  modo: string;

  @ApiPropertyOptional({ nullable: true })
  @Column({ name: 'pergunta_ramificacao', type: 'varchar', length: 50, nullable: true })
  perguntaRamificacao: string | null;

  @ApiPropertyOptional({ nullable: true })
  @Column({ name: 'mensagem_final', type: 'varchar', length: 500, nullable: true })
  mensagemFinal: string | null;

  @ApiProperty({ example: true })
  @Column({ type: 'boolean', default: true })
  ativo: boolean;

  @ApiProperty({ example: 40, description: 'Quantas vezes o link foi aberto' })
  @Column({ type: 'int', default: 0 })
  visualizacoes: number;

  @ApiProperty()
  @Column({ name: 'criado_em', type: 'datetime' })
  criadoEm: Date;

  @ApiProperty()
  @Column({ name: 'atualizado_em', type: 'datetime' })
  atualizadoEm: Date;
}

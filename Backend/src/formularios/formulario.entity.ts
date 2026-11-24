import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';
import { SegmentoDto } from './analise.dto';
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

  // ----- Organização (Painel): pasta, etiquetas, arquivo e favoritos -----

  @ApiPropertyOptional({ example: 1, nullable: true })
  @Column({ name: 'pasta_id', type: 'int', nullable: true })
  pastaId: number | null;

  @ApiProperty({ type: [String], example: ['clientes', '2026'] })
  @Column({ type: 'simple-json', nullable: true })
  etiquetas: string[] | null;

  @ApiProperty({ example: false, description: 'Arquivada: some da lista principal, mas nada é apagado' })
  @Column({ type: 'boolean', default: false })
  arquivado: boolean;

  @ApiProperty({ example: false })
  @Column({ type: 'boolean', default: false })
  favorito: boolean;

  @ApiProperty({ type: [SegmentoDto], description: 'Segmentos salvos no dashboard' })
  @Column({ type: 'simple-json', nullable: true })
  segmentos: SegmentoDto[] | null;

  @ApiProperty()
  @Column({ name: 'criado_em', type: 'datetime' })
  criadoEm: Date;

  @ApiProperty()
  @Column({ name: 'atualizado_em', type: 'datetime' })
  atualizadoEm: Date;
}

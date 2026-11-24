import { ApiProperty } from '@nestjs/swagger';
import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';
import { TemaDto } from '../formularios/formulario.dto';

// Um tema salvo pela empresa, para reaproveitar em várias pesquisas ("Meus temas")
@Entity('temas')
export class TemaSalvo {
  @ApiProperty({ example: 1 })
  @PrimaryGeneratedColumn()
  id: number;

  @ApiProperty({ example: 'Marca da empresa' })
  @Column({ length: 80 })
  nome: string;

  @ApiProperty({ type: TemaDto })
  @Column({ type: 'simple-json' })
  tema: TemaDto;

  @ApiProperty()
  @Column({ name: 'criado_em', type: 'datetime' })
  criadoEm: Date;
}

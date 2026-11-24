import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Formulario } from '../formularios/formulario.entity';
import { Pasta } from './pasta.entity';
import { PastasController } from './pastas.controller';
import { PastasService } from './pastas.service';

@Module({
  imports: [TypeOrmModule.forFeature([Pasta, Formulario])],
  controllers: [PastasController],
  providers: [PastasService],
})
export class PastasModule {}

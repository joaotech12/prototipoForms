import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ExportacaoService } from './exportacao.service';
import { Formulario } from './formulario.entity';
import { FormulariosController } from './formularios.controller';
import { FormulariosService } from './formularios.service';
import { Resposta } from './resposta.entity';
import { RespostasController } from './respostas.controller';
import { RespostasService } from './respostas.service';

@Module({
  imports: [TypeOrmModule.forFeature([Formulario, Resposta])],
  controllers: [FormulariosController, RespostasController],
  providers: [FormulariosService, RespostasService, ExportacaoService],
})
export class FormulariosModule {}

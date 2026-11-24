import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Pasta } from '../pastas/pasta.entity';
import { ExportacaoService } from './exportacao.service';
import { Formulario } from './formulario.entity';
import { FormulariosController } from './formularios.controller';
import { FormulariosService } from './formularios.service';
import { Resposta } from './resposta.entity';
import { RespostasController } from './respostas.controller';
import { RespostasService } from './respostas.service';
import { Sessao } from './sessao.entity';
import { SessoesService } from './sessoes.service';

@Module({
  imports: [TypeOrmModule.forFeature([Formulario, Resposta, Pasta, Sessao])],
  controllers: [FormulariosController, RespostasController],
  providers: [FormulariosService, RespostasService, ExportacaoService, SessoesService],
})
export class FormulariosModule {}

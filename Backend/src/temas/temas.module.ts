import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TemaSalvo } from './tema.entity';
import { TemasController } from './temas.controller';
import { TemasService } from './temas.service';

@Module({
  imports: [TypeOrmModule.forFeature([TemaSalvo])],
  controllers: [TemasController],
  providers: [TemasService],
})
export class TemasModule {}

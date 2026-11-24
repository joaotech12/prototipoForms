import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { FormulariosModule } from './formularios/formularios.module';
import { ProdutosModule } from './produtos/produtos.module';
import { PastasModule } from './pastas/pastas.module';
import { TemasModule } from './temas/temas.module';

// Sem os dados do banco a API não tem como funcionar: avisa logo na subida
const obrigatorias = ['DB_HOST', 'DB_USER', 'DB_PASSWORD', 'DB_NAME'];
const faltando = obrigatorias.filter((nome) => !process.env[nome]);
if (faltando.length > 0) {
  throw new Error(`Faltam variáveis no .env: ${faltando.join(', ')} (veja o .env.example)`);
}

@Module({
  imports: [
    TypeOrmModule.forRoot({
      type: 'mysql',
      host: process.env.DB_HOST,
      port: Number(process.env.DB_PORT || 3306),
      username: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME,
      charset: 'utf8mb4',
      // Datas sempre em UTC, tanto para gravar quanto para ler
      timezone: 'Z',
      autoLoadEntities: true,
      // As tabelas já existem no alwaysdata (banco/schema.sql); o TypeORM nunca as altera
      synchronize: false,
    }),
    ProdutosModule,
    FormulariosModule,
    TemasModule,
    PastasModule,
  ],
})
export class AppModule {}

import 'reflect-metadata';
import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { DataSource } from 'typeorm';
import { AppModule } from './app.module';

async function iniciar() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);

  // O logotipo vai em base64 dentro do JSON; o limite padrão (100 kb) é pequeno demais
  app.useBodyParser('json', { limit: '5mb' });

  // Só o site (localhost:3000) pode chamar a API pelo navegador
  app.enableCors({ origin: 'http://localhost:3000' });

  // Confere os DTOs: whitelist remove campos que não existem no DTO
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));

  // Documentação em http://localhost:8080/api/docs
  const config = new DocumentBuilder()
    .setTitle('Central de Pesquisas')
    .setDescription('API do Projeto Final Senac: pesquisas, respostas, dashboard e exportação Excel.')
    .setVersion('1.0')
    .build();
  SwaggerModule.setup('api/docs', app, SwaggerModule.createDocument(app, config));

  await app.listen(8080, '0.0.0.0');
  console.log('API no ar em http://localhost:8080 (Swagger em /api/docs)');
  await conferirTabelas(app.get(DataSource));
}

// As tabelas são criadas à mão (synchronize: false). Se faltar alguma, avisa no log.
async function conferirTabelas(banco: DataSource) {
  const linhas: Record<string, string>[] = await banco.query('SHOW TABLES');
  const existentes = new Set(linhas.map((linha) => Object.values(linha)[0]));
  const faltam = ['produtos', 'pastas', 'formularios', 'respostas', 'sessoes', 'temas'].filter((t) => !existentes.has(t));
  if (faltam.length) {
    console.warn(`ATENÇÃO: faltam as tabelas ${faltam.join(', ')}. Rode banco/schema.sql no phpMyAdmin do alwaysdata.`);
  }
}

iniciar();

# Projeto Final Senac: NestJS + Vue 3 + MySQL (alwaysdata)

```
Navegador (Vue 3)  →  API NestJS (Node)  →  MySQL no alwaysdata
localhost:3000        localhost:8080         mysql-SUACONTA.alwaysdata.net
```

Tudo roda no Docker: não é preciso instalar Node.js.

## Antes de tudo

1. Rode `banco/schema.sql` no phpMyAdmin do alwaysdata (aba **SQL**, com o banco do projeto selecionado).
   Se faltar alguma tabela, a API avisa no log: `ATENÇÃO: faltam as tabelas ...`.
2. Copie `.env.example` para `.env` e preencha os dados do banco (`DB_HOST`, `DB_USER`,
   `DB_PASSWORD`, `DB_NAME`).

## Modo 1 · Construir as imagens a partir do código (dia a dia)

Na raiz do projeto:

```bash
docker compose up --build
```

O Docker baixa as imagens oficiais (Node e nginx), compila o código
e cria as imagens do projeto: `projeto-final-api` e `projeto-final-web`.

- Site: http://localhost:3000
- API: http://localhost:8080
- Documentação da API (Swagger): http://localhost:8080/api/docs
- Desligar: `docker compose down`

Para ver as imagens criadas: `docker compose images`

> Erro `port is already allocated`? Outro projeto está usando a porta 3000 ou 8080.
> Veja quem é com `docker ps` e desligue o outro (`docker compose down` na pasta dele).

## Modo 2 · Publicar no Docker Hub e usar a imagem pronta (opcional)

Útil para quem vai só usar o sistema, sem esperar a compilação (o professor, por exemplo).
Crie uma conta gratuita em https://hub.docker.com e troque `seuusuario` pelo seu usuário.

**Quem publica (a equipe):**

```bash
docker login
docker build -t seuusuario/projeto-final-api:1.0 ./backend
docker build --build-arg VITE_API_URL=http://localhost:8080 -t seuusuario/projeto-final-web:1.0 ./frontend
docker push seuusuario/projeto-final-api:1.0
docker push seuusuario/projeto-final-web:1.0
```

**Quem usa:** precisa só do `compose.hub.yaml` (com o mesmo usuário) e de um `.env` preenchido.

```bash
docker compose -f compose.hub.yaml pull
docker compose -f compose.hub.yaml up
```

Importante:

- A senha **não** vai dentro da imagem: o `.env` fica fora dela, e cada pessoa usa o seu.
- O endereço da API (`http://localhost:8080`) fica gravado na imagem do site durante o build.
- Mudou o código? Gere uma nova versão (`:1.1`), publique de novo e atualize o `compose.hub.yaml`.

## O sistema: Central de Pesquisas (um "Forms" melhorado)

Um lugar onde a empresa cria e gerencia todas as suas pesquisas e transforma as respostas em dados úteis.

| Tela                  | Endereço                                   | O que faz |
|-----------------------|--------------------------------------------|-----------|
| Painel                | http://localhost:3000/                     | Todas as pesquisas, números gerais, busca, filtros, copiar link, duplicar, encerrar, modelos prontos. Atualiza sozinho a cada 30 s |
| Editor                | /formularios/novo e /formularios/{id}/editar | Perguntas (arrastar e soltar, duplicar), ramificação ("mostrar só se..."), identidade visual, modo, **prévia ao vivo** (computador e celular) |
| Dashboard             | /formularios/{id}/dashboard                | NPS, CSAT, taxa de conclusão, insights automáticos, cruzamento de métricas, filtros, tabela, exportar Excel. **Ao vivo**: atualiza a cada 10 s |
| Responder (público)   | /f/{id}                                    | O link enviado aos clientes, com a marca da empresa. Modo clássico (rolagem) ou conversacional (uma pergunta por vez) |
| Produtos (exemplo)    | /produtos                                  | Protótipo antigo no estilo Windows Forms |

### Tipos de pergunta

Texto curto, parágrafo, e-mail, número, data, escolha única, múltipla escolha, lista suspensa,
sim/não, NPS (0 a 10) e satisfação/CSAT (1 a 5, com rostinhos).

### Como cada item do PDF do projeto foi atendido

- **Identidade visual por formulário:** logotipo (envio de imagem, reduzida automaticamente, ou URL),
  3 cores com 8 paletas prontas, 8 fontes do Google Fonts e cantos, com prévia ao vivo no editor.
- **Modo clássico de rolagem:** mantido como opção ao lado do modo conversacional.
- **Dashboard integrado:** NPS (com medidor e as zonas de mercado), CSAT, respostas por dia, gráfico por pergunta,
  palavras mais citadas nas respostas abertas, cruzamento (ex.: NPS por plano) e frases automáticas
  apontando o que merece atenção (grupos abaixo da média, queda de respostas, taxa de conclusão baixa...).
  Clicar numa barra filtra o dashboard inteiro por aquela resposta.
- **Exportação Excel:** botão no dashboard; o arquivo é gerado pela API (pacote `exceljs`).
- **Planilhas ramificadas:** além das abas "Resumo" e "Todas as respostas", uma aba por opção da
  pergunta de ramificação (escolhida no editor, em Configurações).
- **Experiência moderna:** modo conversacional com transições, barra de progresso, Enter para avançar,
  letras (A, B, C) para escolher, números para dar nota, avanço automático ao clicar numa opção,
  e **rascunho automático** (quem fecha a aba e volta continua de onde parou).

### Ramificação

Cada pergunta pode ter uma ou mais condições ("mostrar só se a nota for menor que 7"), ligadas por
**e** (todas) ou **ou** (qualquer). A condição só pode usar perguntas anteriores, e funciona em cascata:
se uma pergunta some, as que dependem dela também somem. A API confere tudo de novo ao receber a resposta
(obrigatórias, tipos e ramificação) e descarta respostas de perguntas que não apareceram.

Observação: o PDF cita React e PostgreSQL (JSONB). O projeto usa Vue 3 e MySQL; a estrutura flexível
das perguntas e respostas fica em colunas `LONGTEXT` com JSON (tipo `simple-json` do TypeORM).

Os cálculos do dashboard estão em `frontend/src/services/estatisticas.js`, e as regras de ramificação
em `frontend/src/services/regras.js` (a mesma regra existe na API, em `backend/src/formularios/regras.ts`).

## Rotas da API

| Verbo  | Rota                | O que faz        |
|--------|---------------------|------------------|
| GET    | /api/produtos       | Lista todos      |
| GET    | /api/produtos/{id}  | Busca um         |
| POST   | /api/produtos       | Cadastra         |
| PUT    | /api/produtos/{id}  | Altera           |
| DELETE | /api/produtos/{id}  | Exclui           |
| GET    | /api/formularios                      | Lista as pesquisas (com total de respostas e data da última) |
| GET    | /api/formularios/{id}                 | Busca uma pesquisa (perguntas e tema) |
| POST   | /api/formularios                      | Cria uma pesquisa |
| POST   | /api/formularios/{id}/duplicar        | Cria uma cópia da pesquisa (sem as respostas) |
| PUT    | /api/formularios/{id}                 | Altera uma pesquisa |
| DELETE | /api/formularios/{id}                 | Exclui a pesquisa e as respostas dela |
| POST   | /api/formularios/{id}/visualizacoes   | Conta uma visualização (taxa de conclusão) |
| GET    | /api/formularios/{id}/respostas       | Lista as respostas |
| POST   | /api/formularios/{id}/respostas       | Envia uma resposta (confere obrigatórias, tipos e ramificação) |
| GET    | /api/formularios/{id}/exportar        | Baixa o Excel (resumo + respostas + abas por ramificação) |
| DELETE | /api/respostas/{id}                   | Exclui uma resposta |

Os testes de cada rota estão em `backend/Api.http` (extensão REST Client do VS Code).
Também dá para testar pelo navegador no Swagger: http://localhost:8080/api/docs
(clique na rota → **Try it out** → **Execute**).

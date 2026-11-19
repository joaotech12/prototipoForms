import { TEMA_PADRAO } from './tipos';

// Modelos prontos mostrados no Painel. Cada um já vem com ramificação de exemplo.
const p = (id, tipo, titulo, extra = {}) => ({
  id,
  tipo,
  titulo,
  descricao: '',
  obrigatoria: false,
  opcoes: [],
  condicoes: [],
  logica: 'todas',
  ...extra,
});

export const MODELOS = [
  {
    chave: 'nps',
    nome: 'NPS de clientes',
    resumo: 'Nota de 0 a 10 com perguntas diferentes para promotores e detratores.',
    icone: '⓾',
    formulario: {
      titulo: 'Quanto você nos recomendaria?',
      descricao: 'São só 3 perguntas. Sua opinião ajuda a gente a melhorar.',
      modo: 'conversacional',
      perguntaRamificacao: 'plano',
      mensagemFinal: 'Obrigado! Cada resposta é lida pela nossa equipe.',
      tema: { ...TEMA_PADRAO },
      perguntas: [
        p('plano', 'unica', 'Qual plano você usa?', { obrigatoria: true, opcoes: ['Básico', 'Pro', 'Empresa'] }),
        p('nota', 'nps', 'De 0 a 10, quanto você recomendaria nossa empresa a um amigo?', { obrigatoria: true }),
        p('melhorar', 'paragrafo', 'Poxa! O que podemos melhorar?', {
          condicoes: [{ perguntaId: 'nota', operador: 'menor', valor: 7 }],
        }),
        p('gosta', 'paragrafo', 'Que bom! O que você mais gosta em nós?', {
          condicoes: [{ perguntaId: 'nota', operador: 'maior', valor: 8 }],
        }),
        p('contato', 'simnao', 'Podemos entrar em contato para conversar sobre sua nota?'),
        p('email', 'email', 'Qual é o melhor e-mail para isso?', {
          obrigatoria: true,
          condicoes: [{ perguntaId: 'contato', operador: 'igual', valor: 'Sim' }],
        }),
      ],
    },
  },
  {
    chave: 'atendimento',
    nome: 'Satisfação com atendimento',
    resumo: 'CSAT de 1 a 5, canal usado e motivo da insatisfação.',
    icone: '★',
    formulario: {
      titulo: 'Como foi o seu atendimento?',
      descricao: 'Conte para a gente como foi o seu último contato com o suporte.',
      modo: 'conversacional',
      perguntaRamificacao: 'canal',
      mensagemFinal: 'Obrigado pelo retorno!',
      tema: { ...TEMA_PADRAO, corPrimaria: '#0369a1', corFundo: '#f0f9ff', corTexto: '#0c4a6e', fonte: 'Poppins' },
      perguntas: [
        p('canal', 'unica', 'Por qual canal você foi atendido?', {
          obrigatoria: true,
          opcoes: ['WhatsApp', 'Telefone', 'E-mail', 'Chat do site'],
        }),
        p('csat', 'csat', 'Qual é o seu nível de satisfação com o atendimento?', { obrigatoria: true }),
        p('motivos', 'multipla', 'O que não foi bom?', {
          opcoes: ['Demora', 'Não resolveu', 'Atendente despreparado', 'Precisei repetir as informações'],
          condicoes: [{ perguntaId: 'csat', operador: 'menor', valor: 4 }],
        }),
        p('resolvido', 'simnao', 'Seu problema foi resolvido?', { obrigatoria: true }),
        p('comentario', 'paragrafo', 'Quer deixar algum comentário?'),
      ],
    },
  },
  {
    chave: 'evento',
    nome: 'Avaliação de evento',
    resumo: 'Notas por tema, palestra preferida e intenção de voltar.',
    icone: '🎤',
    formulario: {
      titulo: 'O que você achou do evento?',
      descricao: 'Sua avaliação define o próximo evento.',
      modo: 'classico',
      perguntaRamificacao: 'perfil',
      mensagemFinal: 'Valeu! Nos vemos no próximo.',
      tema: { ...TEMA_PADRAO, corPrimaria: '#ea580c', corFundo: '#fff7ed', corTexto: '#431407', fonte: 'Montserrat', cantos: 20 },
      perguntas: [
        p('perfil', 'lista', 'Como você participou?', { obrigatoria: true, opcoes: ['Participante', 'Palestrante', 'Patrocinador', 'Organização'] }),
        p('geral', 'csat', 'Nota geral para o evento', { obrigatoria: true }),
        p('local', 'csat', 'Nota para o local e a estrutura'),
        p('palestra', 'texto', 'Qual palestra você mais gostou?'),
        p('voltaria', 'nps', 'De 0 a 10, quanto você indicaria este evento?', { obrigatoria: true }),
        p('sugestao', 'paragrafo', 'O que faltou?', { condicoes: [{ perguntaId: 'geral', operador: 'menor', valor: 4 }] }),
      ],
    },
  },
  {
    chave: 'clima',
    nome: 'Clima organizacional',
    resumo: 'eNPS anônimo por área, com perguntas sobre liderança e carga de trabalho.',
    icone: '🏢',
    formulario: {
      titulo: 'Pesquisa de clima',
      descricao: 'É anônima. Seja sincero(a)!',
      modo: 'conversacional',
      perguntaRamificacao: 'area',
      mensagemFinal: 'Obrigado por ajudar a construir um lugar melhor para trabalhar.',
      tema: { ...TEMA_PADRAO, corPrimaria: '#0f766e', corFundo: '#f0fdfa', corTexto: '#134e4a', fonte: 'Nunito', cantos: 16 },
      perguntas: [
        p('area', 'unica', 'Em qual área você trabalha?', { obrigatoria: true, opcoes: ['Comercial', 'Operações', 'Tecnologia', 'Administrativo'] }),
        p('enps', 'nps', 'De 0 a 10, quanto você recomendaria a empresa como lugar para trabalhar?', { obrigatoria: true }),
        p('lideranca', 'csat', 'Como você avalia sua liderança direta?', { obrigatoria: true }),
        p('carga', 'unica', 'Sua carga de trabalho está...', { opcoes: ['Leve', 'Adequada', 'Pesada', 'Insustentável'] }),
        p('mudar', 'paragrafo', 'Se pudesse mudar uma coisa, o que seria?'),
      ],
    },
  },
  {
    chave: 'lead',
    nome: 'Captação de interessados',
    resumo: 'Formulário de contato com ramificação por interesse.',
    icone: '✉',
    formulario: {
      titulo: 'Fale com a gente',
      descricao: 'Preencha e retornamos em até 1 dia útil.',
      modo: 'classico',
      perguntaRamificacao: 'interesse',
      mensagemFinal: 'Recebemos seus dados! Em breve entraremos em contato.',
      tema: { ...TEMA_PADRAO, corPrimaria: '#111827', corFundo: '#ffffff', corTexto: '#111827', fonte: 'Space Grotesk', cantos: 6 },
      perguntas: [
        p('nome', 'texto', 'Seu nome', { obrigatoria: true }),
        p('email', 'email', 'Seu e-mail', { obrigatoria: true }),
        p('interesse', 'unica', 'Você tem interesse em...', { obrigatoria: true, opcoes: ['Comprar', 'Ser parceiro', 'Trabalhar conosco'] }),
        p('funcionarios', 'numero', 'Quantos funcionários tem sua empresa?', {
          condicoes: [{ perguntaId: 'interesse', operador: 'igual', valor: 'Comprar' }],
        }),
        p('mensagem', 'paragrafo', 'Mensagem'),
      ],
    },
  },
];

// Cópia independente do modelo (para não alterar o original ao editar)
export function copiaDoModelo(chave) {
  const modelo = MODELOS.find((m) => m.chave === chave);
  return modelo ? JSON.parse(JSON.stringify({ ...modelo.formulario, ativo: true })) : null;
}

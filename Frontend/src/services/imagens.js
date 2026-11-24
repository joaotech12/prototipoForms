// Reduz uma imagem escolhida pelo usuário antes de guardar em base64 no banco.
// Ex.: uma foto de 5 MB vira um JPEG de ~200 KB, que carrega rápido no link público.
export function reduzirImagem(arquivo, { tamanhoMaximo = 1600, formato = 'image/jpeg', qualidade = 0.82 } = {}) {
  return new Promise((resolver, rejeitar) => {
    if (!arquivo.type.startsWith('image/')) return rejeitar(new Error('Escolha um arquivo de imagem'));
    if (arquivo.size > 10 * 1024 * 1024) return rejeitar(new Error('Imagem muito grande (máximo 10 MB)'));

    const leitor = new FileReader();
    leitor.onerror = () => rejeitar(new Error('Não foi possível ler a imagem'));
    leitor.onload = () => {
      const imagem = new Image();
      imagem.onerror = () => rejeitar(new Error('Formato de imagem não suportado'));
      imagem.onload = () => {
        const escala = Math.min(1, tamanhoMaximo / Math.max(imagem.width, imagem.height));
        const tela = document.createElement('canvas');
        tela.width = Math.round(imagem.width * escala);
        tela.height = Math.round(imagem.height * escala);
        tela.getContext('2d').drawImage(imagem, 0, 0, tela.width, tela.height);
        resolver(tela.toDataURL(formato, qualidade));
      };
      imagem.src = leitor.result;
    };
    leitor.readAsDataURL(arquivo);
  });
}

// Algumas imagens prontas de fundo/capa (Unsplash, uso livre)
export const IMAGENS_PRONTAS = [
  'https://images.unsplash.com/photo-1557683316-973673baf926?w=1600&q=70',
  'https://images.unsplash.com/photo-1579546929518-9e396f3cc809?w=1600&q=70',
  'https://images.unsplash.com/photo-1506744038136-46273834b3fb?w=1600&q=70',
  'https://images.unsplash.com/photo-1497366216548-37526070297c?w=1600&q=70',
  'https://images.unsplash.com/photo-1519681393784-d120267933ba?w=1600&q=70',
  'https://images.unsplash.com/photo-1501785888041-af3ef285b470?w=1600&q=70',
];

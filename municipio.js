// ── Parâmetros da URL ─────────────────────────────────────────────
const params = new URLSearchParams(window.location.search);
const id     = params.get('id')     || '';
const nome   = params.get('nome')   || 'Município';
const regiao = params.get('regiao') || 'Bahia';

// ── Preenche cabeçalho fixo ───────────────────────────────────────
document.title                                    = `${nome} — Bahia`;
document.getElementById('nome-header').textContent    = nome;
document.getElementById('regiao-header').textContent  = regiao;
document.getElementById('codigo-ibge').textContent    = id ? `Código IBGE: ${id}` : '';

// ── Carrega conteúdo em paralelo ──────────────────────────────────
carregarCultura(nome, id);
carregarImagens(nome);

// ── Claude API: texto cultural ────────────────────────────────────
async function carregarCultura(nome, id) {
  try {
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 1000,
        messages: [{
          role: 'user',
          content: `Escreva exatamente 3 parágrafos sobre o município de ${nome}, na Bahia, Brasil (código IBGE: ${id}).

Parágrafo 1: origem histórica e fundação.
Parágrafo 2: cultura, festas populares, culinária típica e expressões artísticas locais.
Parágrafo 3: economia, geografia e uma curiosidade marcante do lugar.

Português brasileiro claro e direto. Sem títulos, listas ou formatação. Separe os parágrafos com uma linha em branco.`
        }]
      })
    });

    const data  = await res.json();
    const texto = data.content?.[0]?.text || '';
    const paras = texto.split(/\n{2,}/).filter(p => p.trim());

    document.getElementById('cultura-texto').innerHTML =
      paras.map(p => `<p>${p.trim()}</p>`).join('');

  } catch (err) {
    console.error('Erro ao carregar cultura:', err);
    document.getElementById('cultura-texto').innerHTML =
      '<p>Não foi possível carregar as informações. Tente recarregar a página.</p>';
  }
}

// ── Wikipedia: imagens ────────────────────────────────────────────
async function carregarImagens(nome) {
  const titulo = encodeURIComponent(`${nome}, Bahia`);
  let urls = [];

  try {
    // 1. Lista imagens da página Wikipedia
    const listaRes  = await fetch(
      `https://pt.wikipedia.org/w/api.php?action=query&titles=${titulo}&prop=images&imlimit=20&format=json&origin=*`
    );
    const listaData = await listaRes.json();
    const paginas   = Object.values(listaData?.query?.pages || {});

    const arquivos = (paginas[0]?.images || [])
      .map(i => i.title)
      .filter(t => /\.(jpg|jpeg|png)$/i.test(t))
      .filter(t => !/logo|icon|flag|bandeira|brasão|coat|arms|stamp|mapa|map|locator/i.test(t))
      .slice(0, 6);

    // 2. Resolve URLs reais
    if (arquivos.length > 0) {
      const infoRes  = await fetch(
        `https://pt.wikipedia.org/w/api.php?action=query&titles=${encodeURIComponent(arquivos.join('|'))}&prop=imageinfo&iiprop=url&iiurlwidth=700&format=json&origin=*`
      );
      const infoData = await infoRes.json();
      urls = Object.values(infoData?.query?.pages || {})
        .map(p => p?.imageinfo?.[0]?.url)
        .filter(Boolean);
    }

    // 3. Fallback: thumbnail do summary
    if (urls.length === 0) {
      const sumRes = await fetch(
        `https://pt.wikipedia.org/api/rest_v1/page/summary/${titulo}`
      );
      if (sumRes.ok) {
        const sum = await sumRes.json();
        if (sum?.thumbnail?.source) urls.push(sum.thumbnail.source);
      }
    }

    // Atribui aos slots
    urls.slice(0, 3).forEach((url, i) => definirImagem(i, url));
    for (let i = urls.length; i < 3; i++) esconderShimmer(i);

  } catch (err) {
    console.error('Erro ao carregar imagens:', err);
    for (let i = 0; i < 3; i++) esconderShimmer(i);
  }
}

function definirImagem(i, url) {
  const slot    = document.getElementById(`slot-${i}`);
  const shimmer = slot.querySelector('.shimmer');
  const img     = slot.querySelector('img');

  img.onload  = () => { img.classList.add('visivel'); shimmer.classList.add('feito'); };
  img.onerror = () => esconderShimmer(i);
  img.src     = url;
}

function esconderShimmer(i) {
  const slot = document.getElementById(`slot-${i}`);
  if (slot) slot.querySelector('.shimmer').style.display = 'none';
}
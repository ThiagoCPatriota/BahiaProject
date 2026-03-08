// =============================================================
//  PORTAL CULTURAL DA BAHIA — script.js
// =============================================================

// --- 1. Elementos do DOM ---
const dom = {
  container:    document.getElementById('container-mapa'),
  wrapper:      document.getElementById('wrapper-mapa'),
  carregando:   document.getElementById('carregando'),
  estadoVazio:  document.getElementById('estado-vazio'),
  detalhes:     document.getElementById('detalhes-municipio'),
  nome:         document.getElementById('nome-municipio'),
  regiao:       document.getElementById('regiao-municipio'),
  cultura:      document.getElementById('cultura-municipio'),
  btnCompleta:  document.getElementById('btn-pagina-completa'),
  pesquisa:     document.getElementById('input-pesquisa'),
  sugestoes:    document.getElementById('lista-sugestoes')
};

// --- 2. Variáveis globais ---
let todosMunicipios = [];
let municipioAtivo  = null;
let transform  = { scale: 1, x: 0, y: 0 };
let arrastando = false, moveuMouse = false;
let startX, startY;

// --- 3. Inicialização ---
async function iniciar() {
  try {
    const [resMapa, resMunicipios] = await Promise.all([
      fetch('https://servicodados.ibge.gov.br/api/v3/malhas/estados/BA?formato=image/svg+xml&qualidade=minima&intrarregiao=municipio'),
      fetch('https://servicodados.ibge.gov.br/api/v1/localidades/estados/29/municipios')
    ]);

    dom.wrapper.innerHTML = await resMapa.text();
    todosMunicipios       = await resMunicipios.json();
    dom.carregando.remove();

    configurarInteracoesMapa();
  } catch (erro) {
    console.error('Erro de inicialização:', erro);
    dom.carregando.textContent = 'Erro ao carregar os dados. Recarregue a página.';
  }
}

// --- 4. Cliques no mapa ---
function configurarInteracoesMapa() {
  const caminhos = dom.wrapper.querySelectorAll('path');
  caminhos.forEach(caminho => {
    caminho.addEventListener('click', () => {
      if (moveuMouse) return;
      const id = caminho.getAttribute('id');
      if (id) selecionarMunicipio(id, caminhos);
    });
  });
}

function selecionarMunicipio(id, caminhos = dom.wrapper.querySelectorAll('path')) {
  // Destaque no mapa
  caminhos.forEach(c => c.classList.remove('municipio-ativo'));
  const caminho = dom.wrapper.querySelector(`path[id="${id}"]`);
  if (caminho) caminho.classList.add('municipio-ativo');
  municipioAtivo = id;

  // Dados da cidade
  const municipio = todosMunicipios.find(m => m.id == id);
  if (!municipio) return;

  const nome  = municipio.nome;
  const meso  = municipio.microrregiao?.mesorregiao?.nome || 'Bahia';

  // Esconde estado vazio, mostra card
  dom.estadoVazio.classList.add('oculto');
  dom.detalhes.classList.remove('oculto');

  dom.nome.textContent    = nome;
  dom.regiao.textContent  = meso;
  dom.cultura.textContent = `Clique no botão abaixo para ver a história, cultura e galeria de imagens de ${nome}.`;

  // Botão → abre página do município na mesma aba
  dom.btnCompleta.onclick = () => {
    const nomeFormatado = nome
      .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .replace(/\s+/g, '-');
      
    // Abre a página na mesma guia!
    window.location.href = `municipios/${nomeFormatado}.html`;
  };
}

// --- 5. Barra de pesquisa ---
dom.pesquisa.addEventListener('input', e => {
  const termo = e.target.value.trim().toLowerCase();
  if (termo.length < 2) return (dom.sugestoes.style.display = 'none');

  const encontrados = todosMunicipios
    .filter(m => m.nome.toLowerCase().includes(termo))
    .slice(0, 8);

  dom.sugestoes.innerHTML = '';
  if (!encontrados.length) return (dom.sugestoes.style.display = 'none');

  encontrados.forEach(mun => {
    const li = document.createElement('li');
    li.innerHTML = `${mun.nome} <span>${mun.microrregiao?.mesorregiao?.nome || ''}</span>`;
    li.onclick = () => {
      selecionarMunicipio(mun.id);
      dom.pesquisa.value         = mun.nome;
      dom.sugestoes.style.display = 'none';
    };
    dom.sugestoes.appendChild(li);
  });
  dom.sugestoes.style.display = 'block';
});

document.addEventListener('click', e => {
  if (!e.target.closest('#barra-pesquisa')) dom.sugestoes.style.display = 'none';
});

// --- 6. Pan e Zoom ---
const aplicarTransform = () => {
  dom.wrapper.style.transform = `translate(${transform.x}px, ${transform.y}px) scale(${transform.scale})`;
};

dom.container.addEventListener('wheel', e => {
  e.preventDefault();
  const d = e.deltaY < 0 ? 0.12 : -0.12;
  transform.scale = Math.max(0.4, Math.min(transform.scale + d, 8));
  aplicarTransform();
}, { passive: false });

dom.container.addEventListener('mousedown', e => {
  arrastando = true; moveuMouse = false;
  startX = e.clientX - transform.x;
  startY = e.clientY - transform.y;
});

window.addEventListener('mouseup', () => {
  arrastando = false;
  setTimeout(() => moveuMouse = false, 50);
});

dom.container.addEventListener('mousemove', e => {
  if (!arrastando) return;
  moveuMouse = true; e.preventDefault();
  transform.x = e.clientX - startX;
  transform.y = e.clientY - startY;
  aplicarTransform();
});

iniciar();
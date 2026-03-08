// =============================================================
// PORTAL CULTURAL DA BAHIA — script.js (Otimizado)
// =============================================================

// --- 1. Elementos do DOM ---
const dom = {
  container: document.getElementById('container-mapa'),
  wrapper: document.getElementById('wrapper-mapa'),
  carregando: document.getElementById('carregando'),
  detalhes: document.getElementById('detalhes-municipio'),
  nome: document.getElementById('nome-municipio'),
  regiao: document.getElementById('regiao-municipio'),
  cultura: document.getElementById('cultura-municipio'),
  btnCompleta: document.getElementById('btn-pagina-completa'),
  pesquisa: document.getElementById('input-pesquisa'),
  sugestoes: document.getElementById('lista-sugestoes')
};

// --- 2. Variáveis Globais ---
let todosMunicipios = [];
let municipioAtivo = null;

// Controle de Arrastar (Pan) e Zoom
let transform = { scale: 1, x: 0, y: 0 };
let arrastando = false, moveuMouse = false;
let startX, startY;

// --- 3. Inicialização (Carrega Mapa e Dados Juntos) ---
async function iniciar() {
  try {
    // Baixa o SVG do mapa e a lista de cidades do IBGE ao mesmo tempo (mais rápido)
    const [resMapa, resMunicipios] = await Promise.all([
      fetch('https://servicodados.ibge.gov.br/api/v3/malhas/estados/BA?formato=image/svg+xml&qualidade=minima&intrarregiao=municipio'),
      fetch('https://servicodados.ibge.gov.br/api/v1/localidades/estados/29/municipios')
    ]);

    dom.wrapper.innerHTML = await resMapa.text();
    todosMunicipios = await resMunicipios.json();
    dom.carregando.remove();

    configurarInteracoesMapa();
  } catch (erro) {
    console.error('Erro de inicialização:', erro);
    dom.carregando.textContent = 'Erro ao carregar os dados. Recarregue a página.';
  }
}

// --- 4. Interações do Mapa (Cliques) ---
function configurarInteracoesMapa() {
  const caminhos = dom.wrapper.querySelectorAll('path');

  caminhos.forEach(caminho => {
    caminho.addEventListener('click', () => {
      if (moveuMouse) return; // Ignora se foi só um arrasto no mapa
      const id = caminho.getAttribute('id');
      if (id) selecionarMunicipio(id, caminhos);
    });
  });
}

function selecionarMunicipio(id, caminhos = dom.wrapper.querySelectorAll('path')) {
  // Destaque visual laranja no mapa
  caminhos.forEach(c => c.classList.remove('municipio-ativo'));
  const caminhoAtivo = dom.wrapper.querySelector(`path[id="${id}"]`);
  if (caminhoAtivo) caminhoAtivo.classList.add('municipio-ativo');
  
  municipioAtivo = id;

  // Busca as infos da cidade na lista local (super rápido, sem requisição extra)
  const municipio = todosMunicipios.find(m => m.id == id);
  if (!municipio) return;

  const nome = municipio.nome;
  const meso = municipio.microrregiao?.mesorregiao?.nome || '';

  // Atualiza painel esquerdo
  dom.detalhes.classList.remove('oculto');
  dom.nome.textContent = nome;
  dom.regiao.textContent = meso;
  dom.cultura.textContent = 'Clique no botão abaixo para ver a página desta cidade.';

  // Configura botão para abrir o arquivo HTML formatado (ex: porto-seguro.html)
  dom.btnCompleta.onclick = () => {
    const nomeFormatado = nome
      .normalize("NFD").replace(/[\u0300-\u036f]/g, "") // Tira acentos
      .toLowerCase()                                    // Tudo minúsculo
      .replace(/\s+/g, "-");                            // Espaços por hífen
      
    window.open(`municipios/${nomeFormatado}.html`, '_blank');
  };
}

// --- 5. Barra de Pesquisa ---
dom.pesquisa.addEventListener('input', (e) => {
  const termo = e.target.value.trim().toLowerCase();
  
  // Esconde se tiver menos de 2 letras
  if (termo.length < 2) return dom.sugestoes.style.display = 'none';

  // Filtra até 8 cidades correspondentes
  const encontrados = todosMunicipios
    .filter(m => m.nome.toLowerCase().includes(termo))
    .slice(0, 8);
    
  dom.sugestoes.innerHTML = '';

  if (encontrados.length === 0) return dom.sugestoes.style.display = 'none';

  // Monta os itens da lista
  encontrados.forEach(mun => {
    const li = document.createElement('li');
    li.innerHTML = `${mun.nome} <span>${mun.microrregiao?.mesorregiao?.nome || ''}</span>`;
    
    // Ao clicar na sugestão
    li.onclick = () => {
      selecionarMunicipio(mun.id);
      dom.pesquisa.value = mun.nome;
      dom.sugestoes.style.display = 'none';
    };
    dom.sugestoes.appendChild(li);
  });
  
  dom.sugestoes.style.display = 'block';
});

// Fecha pesquisa ao clicar fora
document.addEventListener('click', e => {
  if (!e.target.closest('#barra-pesquisa')) dom.sugestoes.style.display = 'none';
});

// --- 6. Pan (Arrastar) e Zoom do Mapa ---
const aplicarTransform = () => {
  dom.wrapper.style.transform = `translate(${transform.x}px, ${transform.y}px) scale(${transform.scale})`;
};

// Zoom com Scroll
dom.container.addEventListener('wheel', e => {
  e.preventDefault();
  const direcao = e.deltaY < 0 ? 0.12 : -0.12;
  transform.scale = Math.max(0.4, Math.min(transform.scale + direcao, 8)); // Limites de zoom
  aplicarTransform();
}, { passive: false });

// Começa a arrastar
dom.container.addEventListener('mousedown', e => {
  arrastando = true; moveuMouse = false;
  startX = e.clientX - transform.x; 
  startY = e.clientY - transform.y;
});

// Para de arrastar
window.addEventListener('mouseup', () => {
  arrastando = false;
  setTimeout(() => moveuMouse = false, 50); // Delay pro clique não disparar sem querer
});

// Movimento de arrastar
dom.container.addEventListener('mousemove', e => {
  if (!arrastando) return;
  moveuMouse = true; e.preventDefault();
  transform.x = e.clientX - startX; 
  transform.y = e.clientY - startY;
  aplicarTransform();
});

// --- Executa! ---
iniciar();
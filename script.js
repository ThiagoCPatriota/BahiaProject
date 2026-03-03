// Elementos do DOM - Mapa e Painel
const containerMapa = document.getElementById('container-mapa');
const wrapperMapa = document.getElementById('wrapper-mapa');
const textoCarregando = document.getElementById('carregando');
const detalhesMunicipio = document.getElementById('detalhes-municipio');
const nomeMunicipioEl = document.getElementById('nome-municipio');
const regiaoMunicipioEl = document.getElementById('regiao-municipio');
const culturaMunicipioEl = document.getElementById('cultura-municipio');
const btnPaginaCompleta = document.getElementById('btn-pagina-completa');

// Elementos do DOM - Zoom
const btnZoomIn = document.getElementById('btn-zoom-in');
const btnZoomOut = document.getElementById('btn-zoom-out');

// Variáveis de Estado da Aplicação
let municipioSelecionadoId = null;

// Variáveis de Controle de Zoom e Arraste (Pan)
let nivelZoom = 1;
let translateX = 0;
let translateY = 0;
let isArrastando = false;
let startX, startY;

// --- 1. LÓGICA DE CARREGAMENTO DO MAPA ---
async function carregarMapa() {
    try {
        const resposta = await fetch('https://servicodados.ibge.gov.br/api/v3/malhas/estados/BA?formato=image/svg+xml&qualidade=minima&intrarregiao=municipio');
        const svgTexto = await resposta.text();
        
        textoCarregando.remove();
        wrapperMapa.innerHTML = svgTexto;

        configurarInteracoesMapa();
    } catch (erro) {
        console.error("Erro ao carregar o mapa:", erro);
        if (textoCarregando) textoCarregando.innerText = "Erro ao carregar o mapa da Bahia.";
    }
}

// --- 2. LÓGICA DE CLIQUES NOS MUNICÍPIOS ---
function configurarInteracoesMapa() {
    const caminhos = document.querySelectorAll('svg path');
    
    caminhos.forEach(caminho => {
        caminho.addEventListener('click', async (e) => {
            // Evita que um clique simples após um arraste selecione a cidade sem querer
            if(isArrastando) return;

            const idMunicipio = caminho.getAttribute('id');
            municipioSelecionadoId = idMunicipio;
            
            caminhos.forEach(c => c.classList.remove('municipio-ativo')); 
            caminho.classList.add('municipio-ativo');

            await buscarResumoMunicipio(idMunicipio);
        });
    });
}

// --- 3. BUSCA DE DADOS (PREVIEW) ---
async function buscarResumoMunicipio(id) {
    try {
        const resposta = await fetch(`https://servicodados.ibge.gov.br/api/v1/localidades/municipios/${id}`);
        const dados = await resposta.json();

        detalhesMunicipio.classList.remove('oculto');
        nomeMunicipioEl.innerText = dados.nome;
        regiaoMunicipioEl.innerText = `${dados.microrregiao.nome} - ${dados.microrregiao.mesorregiao.nome}`;
        culturaMunicipioEl.innerText = `Resumo sobre ${dados.nome}. Clique no botão abaixo para acessar a página com galerias e história completa.`;

    } catch (erro) {
        console.error("Erro ao buscar dados:", erro);
    }
}

// --- 4. SISTEMA DE PAN (ARRASTAR) E ZOOM ---

// Função central que aplica as mudanças visuais
function atualizarTransformacao() {
    wrapperMapa.style.transform = `translate(${translateX}px, ${translateY}px) scale(${nivelZoom})`;
}

// Zoom com os botões
btnZoomIn.addEventListener('click', () => {
    nivelZoom += 0.3;
    atualizarTransformacao();
});

btnZoomOut.addEventListener('click', () => {
    if (nivelZoom > 0.4) {
        nivelZoom -= 0.3;
        atualizarTransformacao();
    }
});

// Zoom com a rodinha do mouse (Scroll)
containerMapa.addEventListener('wheel', (e) => {
    e.preventDefault(); // Impede a página inteira de rolar
    const zoomSpeed = 0.1;
    
    if (e.deltaY < 0) {
        nivelZoom += zoomSpeed; // Rolou pra cima, aproxima
    } else {
        nivelZoom = Math.max(0.4, nivelZoom - zoomSpeed); // Rolou pra baixo, afasta (limite de 0.4)
    }
    atualizarTransformacao();
}, { passive: false });

// Lógica de Arrastar (Mousedown, Mousemove, Mouseup)
containerMapa.addEventListener('mousedown', (e) => {
    isArrastando = true;
    // Pega a posição inicial do clique menos o quanto já foi movido antes
    startX = e.clientX - translateX;
    startY = e.clientY - translateY;
});

window.addEventListener('mouseup', () => {
    isArrastando = false;
});

containerMapa.addEventListener('mousemove', (e) => {
    if (!isArrastando) return;
    
    e.preventDefault();
    // Calcula a nova posição baseada no movimento do mouse
    translateX = e.clientX - startX;
    translateY = e.clientY - startY;
    
    atualizarTransformacao();
});

// --- 5. NAVEGAÇÃO PARA OUTRA PÁGINA ---
btnPaginaCompleta.addEventListener('click', () => {
    if (municipioSelecionadoId) {
        alert(`Navegando para a página de detalhes do município ID: ${municipioSelecionadoId}`);
    }
});

// Inicia o projeto
carregarMapa();
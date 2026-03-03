// Elementos do DOM - Mapa e Painel
const containerMapa = document.getElementById('container-mapa');
const wrapperMapa = document.getElementById('wrapper-mapa');
const textoCarregando = document.getElementById('carregando');
const detalhesMunicipio = document.getElementById('detalhes-municipio');
const nomeMunicipioEl = document.getElementById('nome-municipio');
const regiaoMunicipioEl = document.getElementById('regiao-municipio');
const culturaMunicipioEl = document.getElementById('cultura-municipio');
const btnPaginaCompleta = document.getElementById('btn-pagina-completa');

const btnZoomIn = document.getElementById('btn-zoom-in');
const btnZoomOut = document.getElementById('btn-zoom-out');

let municipioSelecionadoId = null;

// Variáveis de Controle de Zoom e Arraste (Pan)
let nivelZoom = 1;
let translateX = 0;
let translateY = 0;
let isMousedown = false;
let moveuMouse = false; // NOVA LÓGICA: Para diferenciar clique de arraste
let startX, startY;

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

function configurarInteracoesMapa() {
    const caminhos = document.querySelectorAll('svg path');
    
    caminhos.forEach(caminho => {
        caminho.addEventListener('click', async (e) => {
            // Se o mouse moveu enquanto estava clicado, foi um arraste, então ignoramos o clique
            if (moveuMouse) return;

            const idMunicipio = caminho.getAttribute('id');
            municipioSelecionadoId = idMunicipio;
            
            caminhos.forEach(c => c.classList.remove('municipio-ativo')); 
            caminho.classList.add('municipio-ativo');

            await buscarResumoMunicipio(idMunicipio);
        });
    });
}

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

// --- SISTENA DE PAN (ARRASTAR) E ZOOM ---
function atualizarTransformacao() {
    wrapperMapa.style.transform = `translate(${translateX}px, ${translateY}px) scale(${nivelZoom})`;
}

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

containerMapa.addEventListener('wheel', (e) => {
    e.preventDefault(); 
    const zoomSpeed = 0.1;
    
    if (e.deltaY < 0) {
        nivelZoom += zoomSpeed; 
    } else {
        nivelZoom = Math.max(0.4, nivelZoom - zoomSpeed); 
    }
    atualizarTransformacao();
}, { passive: false });

containerMapa.addEventListener('mousedown', (e) => {
    isMousedown = true;
    moveuMouse = false; // Reseta a variável de movimento
    startX = e.clientX - translateX;
    startY = e.clientY - translateY;
});

window.addEventListener('mouseup', () => {
    isMousedown = false;
    // Usamos um pequeno timeout para dar tempo do evento de clique rodar antes de resetar o movimento
    setTimeout(() => { moveuMouse = false; }, 50);
});

containerMapa.addEventListener('mousemove', (e) => {
    if (!isMousedown) return;
    
    moveuMouse = true; // Confirma que o usuário está arrastando
    e.preventDefault();
    translateX = e.clientX - startX;
    translateY = e.clientY - startY;
    
    atualizarTransformacao();
});

btnPaginaCompleta.addEventListener('click', () => {
    if (municipioSelecionadoId) {
        alert(`Navegando para a página de detalhes do município ID: ${municipioSelecionadoId}`);
    }
});

carregarMapa();
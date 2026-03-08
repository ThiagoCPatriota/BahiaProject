// =============================================================
//  PORTAL CULTURAL DA BAHIA — script.js
//  
//  O que esse arquivo faz, em ordem:
//  1. Baixa o mapa SVG da Bahia direto do IBGE
//  2. Quando o usuário clica num município, busca o nome
//     dele também no IBGE e mostra no painel da esquerda
//  3. O botão "Ver página completa" leva para municipio.html
//     passando o código e nome do município pela URL
//  4. A barra de pesquisa filtra municípios pelo nome
//  5. Permite arrastar o mapa (pan) e usar scroll para zoom
// =============================================================


// -------------------------------------------------------------
//  PASSO 1: Pegar os elementos da tela que vamos usar
//  (isso evita ficar repetindo document.getElementById toda hora)
// -------------------------------------------------------------

const containerMapa      = document.getElementById('container-mapa');
const wrapperMapa        = document.getElementById('wrapper-mapa');
const carregandoEl       = document.getElementById('carregando');

// Painel da esquerda
const detalhesMunicipio  = document.getElementById('detalhes-municipio');
const nomeMunicipioEl    = document.getElementById('nome-municipio');
const regiaoMunicipioEl  = document.getElementById('regiao-municipio');
const culturaMunicipioEl = document.getElementById('cultura-municipio');
const btnPaginaCompleta  = document.getElementById('btn-pagina-completa');

// Barra de pesquisa
const inputPesquisa      = document.getElementById('input-pesquisa');
const listaSugestoes     = document.getElementById('lista-sugestoes');


// -------------------------------------------------------------
//  PASSO 2: Variáveis de controle geral
// -------------------------------------------------------------

let municipioAtivo  = null;  // Guarda o ID do município clicado atualmente
let todosMunicipios = [];    // Lista com todos os 417 municípios (preenchida depois)

// Variáveis para controlar o arraste do mapa
let nivelZoom  = 1;
let translateX = 0;
let translateY = 0;
let isDragging = false;
let moveuMouse = false;
let startX, startY;


// -------------------------------------------------------------
//  PASSO 3: Carregar o mapa SVG do IBGE
//
//  O IBGE disponibiliza o mapa da Bahia como SVG.
//  Cada município vira um <path id="CÓDIGO_IBGE"> dentro do SVG.
//  Ex: <path id="2910800"> é Salvador.
// -------------------------------------------------------------

async function carregarMapa() {
    try {
        // URL da API do IBGE que retorna o SVG da Bahia com todos os municípios
        const url = 'https://servicodados.ibge.gov.br/api/v3/malhas/estados/BA'
                  + '?formato=image/svg+xml&qualidade=minima&intrarregiao=municipio';

        const resposta = await fetch(url);
        const svgTexto = await resposta.text();

        // Remove o texto "Carregando..." e coloca o SVG no lugar
        carregandoEl.remove();
        wrapperMapa.innerHTML = svgTexto;

        // Depois que o mapa carregou, ativa os cliques nos municípios
        configurarCliqueNosMunicipios();

        // Carrega a lista de municípios para a barra de pesquisa
        carregarListaMunicipios();

    } catch (erro) {
        console.error('Erro ao carregar o mapa:', erro);
        carregandoEl.textContent = 'Erro ao carregar o mapa. Recarregue a página.';
    }
}


// -------------------------------------------------------------
//  PASSO 4: Configurar o clique em cada município do mapa
//
//  O SVG tem um <path> para cada município.
//  Aqui adicionamos o evento de clique em todos eles.
// -------------------------------------------------------------

function configurarCliqueNosMunicipios() {
    // Pega todos os caminhos (municípios) dentro do SVG
    const todosCaminhos = wrapperMapa.querySelectorAll('path');

    todosCaminhos.forEach(function(caminho) {
        caminho.addEventListener('click', async function() {

            // Se o usuário estava arrastando, ignora o clique
            if (moveuMouse) return;

            // Pega o ID do município (que é o código IBGE)
            const idMunicipio = caminho.getAttribute('id');
            if (!idMunicipio) return;

            // Remove o destaque do município anterior
            todosCaminhos.forEach(c => c.classList.remove('municipio-ativo'));

            // Destaca o município clicado em laranja
            caminho.classList.add('municipio-ativo');

            // Guarda qual município está selecionado
            municipioAtivo = idMunicipio;

            // Busca o nome e a região desse município
            await buscarDadosMunicipio(idMunicipio);
        });
    });
}


// -------------------------------------------------------------
//  PASSO 5: Buscar nome e região do município na API do IBGE
//
//  Com o código IBGE, conseguimos o nome e a região do município.
//  Ex: código 2910800 → { nome: "Salvador", mesorregiao: "..." }
// -------------------------------------------------------------

async function buscarDadosMunicipio(id) {
    // Mostra mensagem de carregando enquanto busca
    culturaMunicipioEl.textContent = 'Carregando…';
    detalhesMunicipio.classList.remove('oculto');
    nomeMunicipioEl.textContent   = '…';
    regiaoMunicipioEl.textContent = '';

    try {
        // Busca os dados do município pelo código IBGE
        const resposta = await fetch(`https://servicodados.ibge.gov.br/api/v1/localidades/municipios/${id}`);
        const dados    = await resposta.json();

        // Extrai nome e região dos dados recebidos
        const nome  = dados.nome;
        const micro = dados.microrregiao?.nome               || '';
        const meso  = dados.microrregiao?.mesorregiao?.nome  || '';

        // Atualiza o painel da esquerda com as informações
        nomeMunicipioEl.textContent   = nome;
        regiaoMunicipioEl.textContent = [micro, meso].filter(Boolean).join(' · ');
        culturaMunicipioEl.textContent = `Clique no botão abaixo para ver a história, cultura e galeria de imagens de ${nome}.`;

        // Configura o botão para levar para a página do município.
        // Passamos o ID, nome e região pela URL — municipio.js vai ler isso.
        btnPaginaCompleta.onclick = function() {
            const parametros = new URLSearchParams({ id, nome, regiao: meso });
            window.open(`municipio.html?${parametros}`, '_blank');
        };

    } catch (erro) {
        console.error('Erro ao buscar dados do município:', erro);
        culturaMunicipioEl.textContent = 'Não foi possível carregar as informações.';
    }
}


// -------------------------------------------------------------
//  PASSO 6: Barra de pesquisa
//
//  Carrega a lista de todos os 417 municípios da Bahia.
//  Quando o usuário digita, filtra e mostra sugestões.
//  Ao clicar numa sugestão, destaca o município no mapa.
// -------------------------------------------------------------

async function carregarListaMunicipios() {
    try {
        // Busca todos os municípios da Bahia (estado 29 = Bahia no IBGE)
        const resposta = await fetch('https://servicodados.ibge.gov.br/api/v1/localidades/estados/29/municipios');
        todosMunicipios = await resposta.json();
    } catch (erro) {
        console.error('Erro ao carregar lista de municípios:', erro);
    }
}

// Quando o usuário digita no campo de pesquisa
inputPesquisa.addEventListener('input', function() {
    const termo = inputPesquisa.value.trim().toLowerCase();

    // Se digitou menos de 2 letras, esconde as sugestões
    if (termo.length < 2) {
        listaSugestoes.style.display = 'none';
        return;
    }

    // Filtra os municípios que contêm o que foi digitado
    const encontrados = todosMunicipios
        .filter(function(m) {
            return m.nome.toLowerCase().includes(termo);
        })
        .slice(0, 8); // Mostra no máximo 8 sugestões

    // Monta a lista de sugestões na tela
    listaSugestoes.innerHTML = '';

    if (encontrados.length === 0) {
        listaSugestoes.style.display = 'none';
        return;
    }

    encontrados.forEach(function(municipio) {
        const item = document.createElement('li');
        item.innerHTML = `${municipio.nome} <span>${municipio.microrregiao?.mesorregiao?.nome || ''}</span>`;

        // Ao clicar na sugestão, destaca o município no mapa e carrega os dados
        item.addEventListener('click', function() {
            selecionarMunicipioPorId(String(municipio.id));
            inputPesquisa.value = municipio.nome;
            listaSugestoes.style.display = 'none';
        });

        listaSugestoes.appendChild(item);
    });

    listaSugestoes.style.display = 'block';
});

// Fecha as sugestões se clicar fora da barra de pesquisa
document.addEventListener('click', function(e) {
    if (!e.target.closest('#barra-pesquisa')) {
        listaSugestoes.style.display = 'none';
    }
});

// Seleciona e destaca um município no mapa pelo ID
async function selecionarMunicipioPorId(id) {
    const todosCaminhos = wrapperMapa.querySelectorAll('path');

    todosCaminhos.forEach(function(caminho) {
        caminho.classList.remove('municipio-ativo');

        if (caminho.getAttribute('id') === id) {
            caminho.classList.add('municipio-ativo');
            municipioAtivo = id;
        }
    });

    await buscarDadosMunicipio(id);
}


// -------------------------------------------------------------
//  PASSO 7: Pan (arrastar) e Zoom (scroll do mouse)
//
//  Permite mover o mapa arrastando e aproximar com o scroll.
// -------------------------------------------------------------

// Aplica a posição e o zoom ao wrapper do mapa
function aplicarTransform() {
    wrapperMapa.style.transform = `translate(${translateX}px, ${translateY}px) scale(${nivelZoom})`;
}

// Zoom com o scroll do mouse
containerMapa.addEventListener('wheel', function(e) {
    e.preventDefault();

    // Scroll para cima = aproxima, scroll para baixo = afasta
    const velocidade = 0.12;
    if (e.deltaY < 0) {
        nivelZoom = Math.min(nivelZoom + velocidade, 8);   // Máximo 8x
    } else {
        nivelZoom = Math.max(nivelZoom - velocidade, 0.4); // Mínimo 0.4x
    }

    aplicarTransform();
}, { passive: false });

// Arrastar: começa quando o botão do mouse é pressionado
containerMapa.addEventListener('mousedown', function(e) {
    isDragging = true;
    moveuMouse = false;
    startX = e.clientX - translateX;
    startY = e.clientY - translateY;
});

// Arrastar: para quando o botão do mouse é solto
window.addEventListener('mouseup', function() {
    isDragging = false;
    setTimeout(function() { moveuMouse = false; }, 50);
});

// Arrastar: move o mapa enquanto o botão está pressionado
containerMapa.addEventListener('mousemove', function(e) {
    if (!isDragging) return;

    moveuMouse = true;
    e.preventDefault();
    translateX = e.clientX - startX;
    translateY = e.clientY - startY;

    aplicarTransform();
});


// -------------------------------------------------------------
//  INICIAR — chama a função principal para tudo começar
// -------------------------------------------------------------

carregarMapa();
const fs = require('fs');
const path = require('path');

// Coloque o caminho correto da sua pasta de municípios
const pastaMunicipios = path.join(__dirname, 'municipios');

fs.readdirSync(pastaMunicipios).forEach(arquivo => {
    // Pega o nome original (ex: "São-Desidério.html")
    const nomeAntigo = path.join(pastaMunicipios, arquivo);

    // Remove acentos e joga para minúsculo
    let novoNomeArquivo = arquivo
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, "")
        .toLowerCase();

    const nomeNovo = path.join(pastaMunicipios, novoNomeArquivo);

    if (nomeAntigo !== nomeNovo) {
        fs.renameSync(nomeAntigo, nomeNovo);
        console.log(`✅ Renomeado: ${arquivo}  ->  ${novoNomeArquivo}`);
    }
});
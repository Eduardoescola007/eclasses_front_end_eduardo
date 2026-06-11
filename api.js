// BASE_URL aponta para o JSON local enquanto a API não está integrada.
// Quando a API estiver pronta, basta trocar para: 'http://localhost:3000/api'
const BASE_URL = './data.json';

// Função interna que simula um GET na "API"
async function _get(endpoint) {
    const response = await fetch(BASE_URL);

    if (!response.ok) {
        throw new Error(`Erro ao buscar ${endpoint}: status ${response.status}`);
    }

    const data = await response.json();

    // Mapeia cada endpoint para a chave correspondente no JSON
    const rotas = {
        '/jogos': data.games,
        '/times': data.teams,
        '/competidores': data.competitors,
        '/confrontos': data.matches,
    };

    return rotas[endpoint] ?? [];
}

// Retorna todos os jogos
async function getJogos() {
    return _get('/jogos');
}

// Retorna todos os times
async function getTimes() {
    return _get('/times');
}

// Retorna todos os competidores
async function getCompetidores() {
    return _get('/competidores');
}

// Retorna todos os confrontos
async function getConfrontos() {
    return _get('/confrontos');
}
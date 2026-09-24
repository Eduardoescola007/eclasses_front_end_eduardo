// Estado global da aplicação
let state = {
    jogos: [],
    times: [],
    competidores: [],
    confrontos: [],
};

// Inicialização — ATUALIZADO
document.addEventListener('DOMContentLoaded', async () => {
    await carregarDados();
    configurarNavegacao();
    configurarBuscaGlobal();     // 🔍 NOVO
    renderizarTudo();
});

// Busca todos os dados via service
async function carregarDados() {
    try {
        const [jogos, times, competidores, confrontos] = await Promise.all([
            getJogos(),
            getTimes(),
            getCompetidores(),
            getConfrontos(),
        ]);

        state.jogos = jogos;
        state.times = times;
        state.competidores = competidores;
        state.confrontos = confrontos;
    } catch (erro) {
        console.error('Erro ao carregar dados:', erro);
    }
}

// ============================================================
// 🔍 BUSCA GLOBAL COM FILTRO EM TEMPO REAL
// ============================================================

let termoBusca = '';

function configurarBuscaGlobal() {
    const input = document.getElementById('busca-global');
    const limpar = document.getElementById('limpar-busca');
    const resultadoBox = document.getElementById('resultado-busca');

    if (!input) return;

    input.addEventListener('input', (e) => {
        termoBusca = e.target.value.trim().toLowerCase();
        limpar.style.display = termoBusca ? 'flex' : 'none';
        executarBuscaGlobal(termoBusca);
    });

    limpar?.addEventListener('click', () => {
        input.value = '';
        termoBusca = '';
        limpar.style.display = 'none';
        resultadoBox.innerHTML = '';
        resultadoBox.classList.remove('active');
    });

    // Fecha dropdown ao clicar fora
    document.addEventListener('click', (e) => {
        if (!e.target.closest('.busca-container')) {
            resultadoBox.classList.remove('active');
        }
    });

    // Atalho Ctrl+K para focar busca
    document.addEventListener('keydown', (e) => {
        if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
            e.preventDefault();
            input.focus();
        }
        if (e.key === 'Escape') {
            resultadoBox.classList.remove('active');
            input.blur();
        }
    });
}

function executarBuscaGlobal(termo) {
    const resultadoBox = document.getElementById('resultado-busca');
    if (!termo) {
        resultadoBox.classList.remove('active');
        resultadoBox.innerHTML = '';
        return;
    }

    const resultados = [];

    // Busca em Times
    state.times.forEach(t => {
        if (t.name.toLowerCase().includes(termo)) {
            resultados.push({
                tipo: 'time',
                icone: '🛡️',
                titulo: t.name,
                sub: `Time • ${state.competidores.filter(c => c.teamId == t.id).length} jogadores`,
                view: 'times'
            });
        }
    });

    // Busca em Competidores
    state.competidores.forEach(c => {
        if (c.name.toLowerCase().includes(termo) || c.nickname.toLowerCase().includes(termo)) {
            const time = state.times.find(t => t.id == c.teamId);
            resultados.push({
                tipo: 'competidor',
                icone: '🎮',
                titulo: c.nickname,
                sub: `${c.name} • ${time?.name || 'Sem Time'}`,
                view: 'competidores'
            });
        }
    });

    // Busca em Jogos
    state.jogos.forEach(j => {
        if (j.name.toLowerCase().includes(termo) || (j.genre || '').toLowerCase().includes(termo)) {
            resultados.push({
                tipo: 'jogo',
                icone: '🕹️',
                titulo: j.name,
                sub: `Jogo • ${j.genre}`,
                view: 'jogos'
            });
        }
    });

    // Busca em Confrontos (por nome de time/jogo)
    state.confrontos.forEach(c => {
        const jogo = state.jogos.find(j => j.id == c.gameId);
        const t1 = state.times.find(t => t.id == c.team1Id);
        const t2 = state.times.find(t => t.id == c.team2Id);
        const texto = `${jogo?.name} ${t1?.name} ${t2?.name}`.toLowerCase();
        if (texto.includes(termo)) {
            resultados.push({
                tipo: 'confronto',
                icone: '⚔️',
                titulo: `${t1?.name || '?'} vs ${t2?.name || '?'}`,
                sub: `${jogo?.name || 'Jogo'} • ${c.status === 'finished' ? 'Finalizado' : 'Agendado'}`,
                view: 'confrontos'
            });
        }
    });

    if (resultados.length === 0) {
        resultadoBox.innerHTML = `
            <div class="busca-vazio">
                <span>🔎</span>
                <p>Nenhum resultado para "<strong>${termo}</strong>"</p>
            </div>`;
    } else {
        resultadoBox.innerHTML = resultados.slice(0, 8).map(r => `
            <div class="busca-item" data-view="${r.view}">
                <span class="busca-icone">${r.icone}</span>
                <div class="busca-info">
                    <strong>${destacarTermo(r.titulo, termo)}</strong>
                    <small>${destacarTermo(r.sub, termo)}</small>
                </div>
                <span class="busca-tipo">${r.tipo}</span>
            </div>
        `).join('');
    }

    resultadoBox.classList.add('active');

    // Clique em item → navega para a view
    resultadoBox.querySelectorAll('.busca-item').forEach(el => {
        el.addEventListener('click', () => {
            const view = el.getAttribute('data-view');
            const navItem = document.querySelector(`#sidebar-nav li[data-view="${view}"]`);
            if (navItem) navItem.click();
            resultadoBox.classList.remove('active');
        });
    });
}

// Destaca o termo buscado no texto
function destacarTermo(texto, termo) {
    if (!termo) return texto;
    const regex = new RegExp(`(${termo.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
    return texto.replace(regex, '<mark>$1</mark>');
}

// ============================================================
// 🎞️ BANNER ROTATIVO AUTOMÁTICO
// ============================================================

let bannerIndex = 0;
let bannerInterval = null;

function configurarBannerRotativo() {
    const banner = document.getElementById('banner-rotativo');
    if (!banner) return;

    // Gera slides dinamicamente a partir do estado
    const slides = gerarSlidesBanner();
    if (slides.length === 0) {
        banner.innerHTML = `<div class="banner-slide active">
            <h2>Bem-vindo ao E-classes</h2>
            <p>Cadastre times, jogos e confrontos para começar.</p>
        </div>`;
        return;
    }

    banner.innerHTML = `
        <div class="banner-track">
            ${slides.map((s, i) => `
                <div class="banner-slide ${i === 0 ? 'active' : ''}" data-index="${i}">
                    <div class="banner-content">
                        <span class="banner-tag">${s.tag}</span>
                        <h2>${s.titulo}</h2>
                        <p>${s.descricao}</p>
                        ${s.acao ? `<button class="banner-btn" data-view="${s.acao.view}">${s.acao.label}</button>` : ''}
                    </div>
                    <div class="banner-visual">${s.emoji}</div>
                </div>
            `).join('')}
        </div>
        <div class="banner-dots">
            ${slides.map((_, i) => `<span class="banner-dot ${i === 0 ? 'active' : ''}" data-index="${i}"></span>`).join('')}
        </div>
        <button class="banner-nav banner-prev" aria-label="Anterior">‹</button>
        <button class="banner-nav banner-next" aria-label="Próximo">›</button>
    `;

    // Navegação manual
    banner.querySelector('.banner-next')?.addEventListener('click', () => trocarSlide(1));
    banner.querySelector('.banner-prev')?.addEventListener('click', () => trocarSlide(-1));
    banner.querySelectorAll('.banner-dot').forEach(dot => {
        dot.addEventListener('click', () => {
            bannerIndex = Number(dot.dataset.index);
            atualizarBanner();
            reiniciarAutoPlay();
        });
    });

    // Botões de ação nos slides
    banner.querySelectorAll('.banner-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const view = btn.getAttribute('data-view');
            const navItem = document.querySelector(`#sidebar-nav li[data-view="${view}"]`);
            if (navItem) navItem.click();
        });
    });

    // Pausa autoplay ao passar o mouse
    banner.addEventListener('mouseenter', () => clearInterval(bannerInterval));
    banner.addEventListener('mouseleave', iniciarAutoPlay);

    iniciarAutoPlay();
}

function gerarSlidesBanner() {
    const slides = [];

    // Slide 1: Próximo confronto agendado
    const proximo = state.confrontos
        .filter(c => c.status === 'scheduled')
        .sort((a, b) => new Date(a.date) - new Date(b.date))[0];

    if (proximo) {
        const t1 = state.times.find(t => t.id == proximo.team1Id);
        const t2 = state.times.find(t => t.id == proximo.team2Id);
        const jogo = state.jogos.find(j => j.id == proximo.gameId);
        const data = new Date(proximo.date).toLocaleString('pt-BR', {
            day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit'
        });
        slides.push({
            tag: '🔥 PRÓXIMO CONFRONTO',
            titulo: `${t1?.name || 'TBD'} vs ${t2?.name || 'TBD'}`,
            descricao: `${jogo?.name || 'Jogo'} • ${data}`,
            emoji: '⚔️',
            acao: { label: 'Ver Confrontos', view: 'confrontos' }
        });
    }

    // Slide 2: Time com mais jogadores
    if (state.times.length > 0) {
        const timeTop = [...state.times].sort((a, b) =>
            state.competidores.filter(c => c.teamId == b.id).length -
            state.competidores.filter(c => c.teamId == a.id).length
        )[0];
        const qtd = state.competidores.filter(c => c.teamId == timeTop.id).length;
        slides.push({
            tag: '🏆 TIME DESTAQUE',
            titulo: timeTop.name,
            descricao: `Lidera com ${qtd} competidor${qtd !== 1 ? 'es' : ''} registrado${qtd !== 1 ? 's' : ''}`,
            emoji: '🛡️',
            acao: { label: 'Ver Times', view: 'times' }
        });
    }

    // Slide 3: Estatísticas gerais
    const totalConfrontos = state.confrontos.length;
    const finalizados = state.confrontos.filter(c => c.status === 'finished').length;
    slides.push({
        tag: '📊 PANORAMA DO TORNEIO',
        titulo: `${totalConfrontos} Confrontos Registrados`,
        descricao: `${finalizados} finalizados • ${totalConfrontos - finalizados} agendados • ${state.competidores.length} atletas`,
        emoji: '🏅',
        acao: { label: 'Ver Dashboard', view: 'dashboard' }
    });

    return slides;
}

function iniciarAutoPlay() {
    clearInterval(bannerInterval);
    bannerInterval = setInterval(() => trocarSlide(1), 5000);
}

function reiniciarAutoPlay() {
    iniciarAutoPlay();
}

function trocarSlide(direcao) {
    const slides = document.querySelectorAll('.banner-slide');
    if (slides.length === 0) return;

    bannerIndex = (bannerIndex + direcao + slides.length) % slides.length;
    atualizarBanner();
}

function atualizarBanner() {
    const banner = document.getElementById('banner-rotativo');
    if (!banner) return;
    banner.querySelectorAll('.banner-slide').forEach((s, i) => {
        s.classList.toggle('active', i === bannerIndex);
    });
    banner.querySelectorAll('.banner-dot').forEach((d, i) => {
        d.classList.toggle('active', i === bannerIndex);
    });
}

// ============================================================
// 🏅 RANKING AUTOMÁTICO COM PÓDIO E BARRA DE PROGRESSO
// ============================================================

function calcularRanking() {
    // Pontuação: vitória = 3 pts, empate = 1 pt, derrota = 0
    // Critérios de desempate: pontos → saldo → gols pró
    const ranking = state.times.map(time => ({
        id: time.id,
        nome: time.name,
        cor: time.color || '#6366f1',
        jogos: 0,
        vitorias: 0,
        empates: 0,
        derrotas: 0,
        pontosPro: 0,
        pontosContra: 0,
        pontos: 0,
        saldo: 0
    }));

    state.confrontos
        .filter(c => c.status === 'finished')
        .forEach(c => {
            const t1 = ranking.find(r => r.id == c.team1Id);
            const t2 = ranking.find(r => r.id == c.team2Id);
            if (!t1 || !t2) return;

            const s1 = Number(c.score1) || 0;
            const s2 = Number(c.score2) || 0;

            t1.jogos++;
            t2.jogos++;
            t1.pontosPro += s1;
            t1.pontosContra += s2;
            t2.pontosPro += s2;
            t2.pontosContra += s1;

            if (s1 > s2) {
                t1.vitorias++;
                t1.pontos += 3;
                t2.derrotas++;
            } else if (s1 < s2) {
                t2.vitorias++;
                t2.pontos += 3;
                t1.derrotas++;
            } else {
                t1.empates++;
                t2.empates++;
                t1.pontos += 1;
                t2.pontos += 1;
            }
        });

    ranking.forEach(r => { r.saldo = r.pontosPro - r.pontosContra; });

    return ranking.sort((a, b) =>
        b.pontos - a.pontos ||
        b.saldo - a.saldo ||
        b.pontosPro - a.pontosPro ||
        a.nome.localeCompare(b.nome)
    );
}

function renderizarRanking() {
    const container = document.getElementById('ranking-container');
    if (!container) return;

    const ranking = calcularRanking();

    if (ranking.length === 0) {
        container.innerHTML = `
            <div class="ranking-vazio">
                <span>📊</span>
                <p>Sem dados suficientes. Finalize confrontos para gerar o ranking.</p>
            </div>`;
        return;
    }

    const maxPontos = Math.max(...ranking.map(r => r.pontos), 1);
    const podium = ranking.slice(0, 3);
    const resto = ranking.slice(3);

    // Ordem visual do pódio: 2º, 1º, 3º
    const ordemPodio = [podium[1], podium[0], podium[2]].filter(Boolean);
    const posicoes = { 0: 2, 1: 1, 2: 3 };
    const medalhas = { 1: '🥇', 2: '🥈', 3: '🥉' };

    container.innerHTML = `
        <div class="podium">
            ${ordemPodio.map((t, idx) => {
                const posicaoReal = podium.indexOf(t) + 1;
                const alturaClasse = `podium-${posicaoReal}`;
                return `
                    <div class="podium-item ${alturaClasse}">
                        <div class="podium-medalha">${medalhas[posicaoReal]}</div>
                        <div class="podium-time" style="border-color: ${t.cor}">
                            <strong>${t.nome}</strong>
                            <span class="podium-pontos">${t.pontos} pts</span>
                        </div>
                        <div class="podium-base">
                            <span class="podium-posicao">${posicaoReal}º</span>
                        </div>
                    </div>
                `;
            }).join('')}
        </div>

        ${resto.length > 0 ? `
            <div class="ranking-lista">
                <h4>Classificação Completa</h4>
                ${ranking.map((t, i) => {
                    const posicao = i + 1;
                    const percentual = (t.pontos / maxPontos) * 100;
                    return `
                        <div class="ranking-linha ${posicao <= 3 ? 'top3' : ''}">
                            <span class="ranking-pos">${posicao}º</span>
                            <div class="ranking-info">
                                <div class="ranking-nome">
                                    <span class="ranking-cor" style="background:${t.cor}"></span>
                                    <strong>${t.nome}</strong>
                                </div>
                                <div class="ranking-barra">
                                    <div class="ranking-barra-fill"
                                         style="width:${percentual}%; background:${t.cor}">
                                    </div>
                                </div>
                                <div class="ranking-stats">
                                    <span>${t.jogos}J</span>
                                    <span class="v">${t.vitorias}V</span>
                                    <span class="e">${t.empates}E</span>
                                    <span class="d">${t.derrotas}D</span>
                                    <span class="saldo ${t.saldo >= 0 ? 'pos' : 'neg'}">
                                        Saldo ${t.saldo >= 0 ? '+' : ''}${t.saldo}
                                    </span>
                                </div>
                            </div>
                            <span class="ranking-pontos">${t.pontos}<small>pts</small></span>
                        </div>
                    `;
                }).join('')}
            </div>
        ` : ''}
    `;
}

// Configura cliques na navegação lateral
function configurarNavegacao() {
    const itens = document.querySelectorAll('#sidebar-nav li');

    itens.forEach(item => {
        item.addEventListener('click', () => {
            const view = item.getAttribute('data-view');
            trocarView(view);
            itens.forEach(i => i.classList.remove('active'));
            item.classList.add('active');
        });
    });
}

function trocarView(viewId) {
    document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
    document.getElementById(`view-${viewId}`).classList.add('active');
}

// Renderização global — ATUALIZADO
function renderizarTudo() {
    renderizarDashboard();
    renderizarJogos();
    renderizarTimes();
    renderizarCompetidores();
    renderizarConfrontos();
    renderizarRanking();          
    configurarBannerRotativo();  
}

// --- Funções de renderização ---

function renderizarDashboard() {
    const stats = document.getElementById('dashboard-stats');
    const proximos = document.getElementById('upcoming-matches');

    const encerrados = state.confrontos.filter(c => c.status === 'finished').length;
    const agendados = state.confrontos.filter(c => c.status === 'scheduled').length;

    stats.innerHTML = `
        <div class="card">
            <span class="card-tag">Torneio</span>
            <h3>${state.times.length}</h3>
            <p class="subtitle">Equipes</p>
        </div>
        <div class="card">
            <span class="card-tag">Atletas</span>
            <h3>${state.competidores.length}</h3>
            <p class="subtitle">Competidores</p>
        </div>
        <div class="card">
            <span class="card-tag">Encerrados</span>
            <h3>${encerrados}</h3>
            <p class="subtitle">Resultados</p>
        </div>
        <div class="card">
            <span class="card-tag">Pendentes</span>
            <h3>${agendados}</h3>
            <p class="subtitle">Agendamentos</p>
        </div>
    `;

    const lista = state.confrontos.filter(c => c.status === 'scheduled').slice(0, 3);

    proximos.innerHTML = lista.map(c => {
        const jogo = state.jogos.find(j => j.id == c.gameId);
        const time1 = state.times.find(t => t.id == c.team1Id);
        const time2 = state.times.find(t => t.id == c.team2Id);
        return `
            <div class="card">
                <span class="card-tag">${jogo?.name || 'Jogo'}</span>
                <div class="match-card">
                    <div class="team-score"><strong>${time1?.name || 'TBD'}</strong></div>
                    <div class="vs">VS</div>
                    <div class="team-score"><strong>${time2?.name || 'TBD'}</strong></div>
                </div>
            </div>
        `;
    }).join('');
}

function renderizarJogos() {
    const lista = document.getElementById('list-jogos');
    lista.innerHTML = state.jogos.map(j => `
        <div class="card">
            <span class="card-tag">${j.genre}</span>
            <h3>${j.name}</h3>
            <p class="subtitle">ID: ${j.id}</p>
        </div>
    `).join('');
}

function renderizarTimes() {
    const lista = document.getElementById('list-times');
    lista.innerHTML = state.times.map(t => `
        <div class="card" style="border-right: 4px solid ${t.color}">
            <span class="card-tag">EQUIPE</span>
            <h3>${t.name}</h3>
            <p class="subtitle">${state.competidores.filter(c => c.teamId == t.id).length} Jogadores</p>
        </div>
    `).join('');
}

function renderizarCompetidores() {
    const lista = document.getElementById('list-competidores');
    lista.innerHTML = state.competidores.map(c => {
        const time = state.times.find(t => t.id == c.teamId);
        return `
            <div class="card">
                <span class="card-tag">${time?.name || 'Sem Time'}</span>
                <h3>${c.nickname}</h3>
                <p class="subtitle">${c.name}</p>
            </div>
        `;
    }).join('');
}

function renderizarConfrontos() {
    const lista = document.getElementById('list-confrontos');
    lista.innerHTML = state.confrontos.map(c => {
        const jogo = state.jogos.find(j => j.id == c.gameId);
        const time1 = state.times.find(t => t.id == c.team1Id);
        const time2 = state.times.find(t => t.id == c.team2Id);
        const data = new Date(c.date).toLocaleString('pt-BR');

        return `
            <div class="card">
                <span class="card-tag">${jogo?.name || 'Jogo'} | ${data}</span>
                <div class="match-card">
                    <div class="team-score">
                        <strong>${time1?.name || '???'}</strong>
                        <div class="score">${c.score1}</div>
                    </div>
                    <div class="vs">VS</div>
                    <div class="team-score">
                        <strong>${time2?.name || '???'}</strong>
                        <div class="score">${c.score2}</div>
                    </div>
                </div>
                <div style="margin-top: 1rem; text-align: center;">
                    <span class="card-tag" style="background: ${c.status === 'finished' ? '#10b981' : '#f59e0b'}">
                        ${c.status === 'finished' ? 'FINALIZADO' : 'AGENDADO'}
                    </span>
                    ${c.status === 'scheduled'
                        ? `<button onclick="encerrarConfrontos(${c.id})" style="padding: 4px 8px; font-size: 0.7rem; margin-left: 8px;">Finalizar</button>`
                        : ''}
                </div>
            </div>
        `;
    }).join('');
}

// --- Modal e formulários ---

const modal = document.getElementById('modal-container');
const formContent = document.getElementById('form-content');

window.abrirFormulario = function (tipo) {
    modal.style.display = 'flex';
    setTimeout(() => {
        modal.style.opacity = '1';
        modal.style.pointerEvents = 'all';
    }, 10);

    const optionsTimes = state.times.map(t => `<option value="${t.id}">${t.name}</option>`).join('');
    const optionsJogos = state.jogos.map(j => `<option value="${j.id}">${j.name}</option>`).join('');

    const formularios = {
        jogo: `
            <h2>Adicionar Jogo</h2>
            <form onsubmit="salvarItem(event, 'jogos')">
                <div class="form-group">
                    <label>Nome do Jogo</label>
                    <input type="text" name="name" required placeholder="Ex: CS2">
                </div>
                <div class="form-group">
                    <label>Gênero</label>
                    <input type="text" name="genre" required placeholder="Ex: FPS">
                </div>
                <div style="display:flex; gap: 1rem;">
                    <button type="submit" class="btn-primary">Salvar</button>
                    <button type="button" onclick="fecharModal()">Cancelar</button>
                </div>
            </form>
        `,
        time: `
            <h2>Adicionar Time</h2>
            <form onsubmit="salvarItem(event, 'times')">
                <div class="form-group">
                    <label>Nome da Equipe</label>
                    <input type="text" name="name" required placeholder="Ex: Ninjas da Noite">
                </div>
                <div class="form-group">
                    <label>Cor Identidade</label>
                    <input type="color" name="color" value="#6366f1">
                </div>
                <div style="display:flex; gap: 1rem;">
                    <button type="submit" class="btn-primary">Criar</button>
                    <button type="button" onclick="fecharModal()">Cancelar</button>
                </div>
            </form>
        `,
        competidor: `
            <h2>Registrar Competidor</h2>
            <form onsubmit="salvarItem(event, 'competidores')">
                <div class="form-group">
                    <label>Nome Completo</label>
                    <input type="text" name="name" required>
                </div>
                <div class="form-group">
                    <label>Nickname</label>
                    <input type="text" name="nickname" required>
                </div>
                <div class="form-group">
                    <label>Time</label>
                    <select name="teamId" required>${optionsTimes}</select>
                </div>
                <div style="display:flex; gap: 1rem;">
                    <button type="submit" class="btn-primary">Registrar</button>
                    <button type="button" onclick="fecharModal()">Cancelar</button>
                </div>
            </form>
        `,
        confronto: `
            <h2>Novo Confronto</h2>
            <form onsubmit="salvarItem(event, 'confrontos')">
                <div class="form-group">
                    <label>Jogo</label>
                    <select name="gameId" required>${optionsJogos}</select>
                </div>
                <div style="display:grid; grid-template-columns: 1fr 1fr; gap: 1rem;">
                    <div class="form-group">
                        <label>Time A</label>
                        <select name="team1Id" required>${optionsTimes}</select>
                    </div>
                    <div class="form-group">
                        <label>Time B</label>
                        <select name="team2Id" required>${optionsTimes}</select>
                    </div>
                </div>
                <div class="form-group">
                    <label>Data/Hora</label>
                    <input type="datetime-local" name="date" required value="${new Date().toISOString().slice(0, 16)}">
                </div>
                <input type="hidden" name="score1" value="0">
                <input type="hidden" name="score2" value="0">
                <input type="hidden" name="status" value="scheduled">
                <div style="display:flex; gap: 1rem;">
                    <button type="submit" class="btn-primary">Agendar</button>
                    <button type="button" onclick="fecharModal()">Cancelar</button>
                </div>
            </form>
        `,
    };

    formContent.innerHTML = formularios[tipo] || '';
};

window.fecharModal = function () {
    modal.style.opacity = '0';
    modal.style.pointerEvents = 'none';
    setTimeout(() => { modal.style.display = 'none'; }, 300);
};

window.salvarItem = function (event, colecao) {
    event.preventDefault();
    const dados = Object.fromEntries(new FormData(event.target).entries());

    const maxId = state[colecao].reduce((max, item) => (item.id > max ? item.id : max), 0);
    dados.id = maxId + 1;

    if (dados.teamId) dados.teamId = Number(dados.teamId);
    if (dados.gameId) dados.gameId = Number(dados.gameId);
    if (dados.team1Id) dados.team1Id = Number(dados.team1Id);
    if (dados.team2Id) dados.team2Id = Number(dados.team2Id);
    if (dados.score1 !== undefined) dados.score1 = Number(dados.score1);
    if (dados.score2 !== undefined) dados.score2 = Number(dados.score2);

    state[colecao].push(dados);
    renderizarTudo();
    fecharModal();
};

window.encerrarConfrontos = function (id) {
    const confronto = state.confrontos.find(c => c.id == id);
    if (!confronto) return;

    const time1 = state.times.find(t => t.id == confronto.team1Id);
    const time2 = state.times.find(t => t.id == confronto.team2Id);

    const placar1 = prompt(`Placar para ${time1?.name}:`, '0');
    const placar2 = prompt(`Placar para ${time2?.name}:`, '0');

    if (placar1 !== null && placar2 !== null) {
        confronto.score1 = Number(placar1);
        confronto.score2 = Number(placar2);
        confronto.status = 'finished';
        renderizarTudo();
    }
};
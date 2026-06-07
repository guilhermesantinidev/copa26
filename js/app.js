// ============================================================
// COPA DO MUNDO 2026 — App Principal
// Fonte: SofaScore API (não-oficial, sem chave necessária)
// Torneio ID 77 = FIFA World Cup no SofaScore
// Atualização automática a cada 60s (30s durante jogos ao vivo)
// ============================================================

const SOFA = {
  base:       'https://api.sofascore.com/api/v1',
  tourneyId:  77,      // FIFA World Cup
  seasonId:   null,    // preenchido automaticamente na inicialização
};

// User-Agent de browser para evitar bloqueio
const SOFA_HEADERS = {
  'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15',
  'Accept': 'application/json',
  'Referer': 'https://www.sofascore.com/',
};

// Proxies CORS públicos (tentados em ordem)
const CORS_PROXIES = [
  'https://corsproxy.io/?',
  'https://api.allorigins.win/raw?url=',
  'https://thingproxy.freeboard.io/fetch/',
];

// ── Estado Global ────────────────────────────────────────────
const state = {
  matches:       [],
  liveMatches:   [],
  standings:     {},
  activeTab:     'ao-vivo',
  lastUpdate:    null,
  refreshInterval: null,
  isLive:        false,
  usingDemo:     true,
  loading:       false,
  proxyIndex:    0,   // qual proxy está funcionando
};

// ── Init ─────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  renderTodayDate();
  renderCountdown();
  setInterval(renderCountdown, 1000);

  loadDemoData();   // exibe conteúdo imediatamente
  fetchSofaScore(); // depois tenta dados reais em background
  startAutoRefresh();
  showTab('ao-vivo');
});

// ── Fetch principal ───────────────────────────────────────────
async function fetchSofaScore() {
  try {
    setLoadingState(true);

    // 1. Busca o season ID atual da Copa 2026
    if (!SOFA.seasonId) {
      SOFA.seasonId = await fetchSeasonId();
      if (!SOFA.seasonId) throw new Error('Season não encontrada');
    }

    // 2. Busca dados em paralelo
    await Promise.all([
      fetchLiveAndToday(),
      fetchAllMatches(),
      fetchStandings(),
    ]);

    state.usingDemo  = false;
    state.lastUpdate = new Date();
    updateLastUpdateTime();
  } catch (err) {
    console.warn('[Copa/SofaScore] Usando demo:', err.message);
    // Mantém dados demo — não mostra erro pro usuário na primeira carga
    if (state.lastUpdate) {
      showToast('⚠️ Falha ao atualizar — usando cache');
    }
  } finally {
    setLoadingState(false);
  }
}

// ── Fetch com proxy CORS automático ──────────────────────────
async function sofaFetch(path) {
  const fullUrl = SOFA.base + path;

  // Tenta sem proxy primeiro (funciona em alguns ambientes/apps)
  try {
    const res = await fetch(fullUrl, {
      headers: SOFA_HEADERS,
      signal: AbortSignal.timeout(6_000),
    });
    if (res.ok) return await res.json();
  } catch (_) {}

  // Tenta proxies em ordem, memorizando o que funcionou
  const proxies = [...CORS_PROXIES.slice(state.proxyIndex), ...CORS_PROXIES.slice(0, state.proxyIndex)];
  for (let i = 0; i < proxies.length; i++) {
    try {
      const proxyUrl = proxies[i] + encodeURIComponent(fullUrl);
      const res = await fetch(proxyUrl, { signal: AbortSignal.timeout(8_000) });
      if (res.ok) {
        const data = await res.json();
        // Memoriza o proxy que funcionou
        state.proxyIndex = CORS_PROXIES.indexOf(proxies[i]);
        return data;
      }
    } catch (_) {}
  }

  throw new Error(`Todos os proxies falharam para ${path}`);
}

// ── Season ID ─────────────────────────────────────────────────
async function fetchSeasonId() {
  try {
    const data = await sofaFetch(`/unique-tournament/${SOFA.tourneyId}/seasons`);
    // Pega a season mais recente (primeira da lista)
    const seasons = data.seasons || [];
    // Procura especificamente 2026
    const s2026 = seasons.find(s => s.year === '2026' || s.name?.includes('2026'));
    return (s2026 || seasons[0])?.id || null;
  } catch (err) {
    console.warn('[Copa] Não conseguiu buscar season:', err.message);
    return null;
  }
}

// ── Jogos ao vivo + hoje ──────────────────────────────────────
async function fetchLiveAndToday() {
  const today = new Date().toISOString().slice(0, 10);

  // Jogos ao vivo do torneio
  const [liveData, todayData] = await Promise.all([
    sofaFetch(`/sport/football/events/live`).catch(() => ({ events: [] })),
    sofaFetch(`/sport/football/scheduled-events/${today}`).catch(() => ({ events: [] })),
  ]);

  // Filtra apenas jogos da Copa 2026 (tournamentId 77)
  const isWC = e =>
    e.tournament?.uniqueTournament?.id === SOFA.tourneyId ||
    e.season?.id === SOFA.seasonId;

  const live  = (liveData.events || []).filter(isWC).map(normalizeSofa);
  const today2 = (todayData.events || []).filter(isWC).map(normalizeSofa);

  const liveIds = new Set(live.map(m => m.id));
  state.liveMatches = [...live, ...today2.filter(m => !liveIds.has(m.id))];
  state.isLive = live.length > 0;

  const indicator = document.getElementById('live-indicator');
  if (indicator) indicator.style.display = state.isLive ? 'flex' : 'none';

  renderLiveTab();
}

// ── Todos os jogos do torneio ─────────────────────────────────
async function fetchAllMatches() {
  if (!SOFA.seasonId) return;
  try {
    // Busca por rounds: Copa 2026 tem ~35 rodadas (104 jogos + mata-mata)
    const rounds = Array.from({ length: 35 }, (_, i) => i + 1);
    const results = await Promise.all(
      rounds.map(r =>
        sofaFetch(`/unique-tournament/${SOFA.tourneyId}/season/${SOFA.seasonId}/events/round/${r}`)
          .catch(() => ({ events: [] }))
      )
    );
    state.matches = results.flatMap(d => (d.events || []).map(normalizeSofa));
    renderCalendar();
    renderResults();
  } catch (err) {
    console.warn('[Copa] fetchAllMatches:', err.message);
  }
}

// ── Classificação ─────────────────────────────────────────────
async function fetchStandings() {
  if (!SOFA.seasonId) return;
  try {
    const data = await sofaFetch(
      `/unique-tournament/${SOFA.tourneyId}/season/${SOFA.seasonId}/standings/total`
    );

    const groups = {};
    (data.standings || []).forEach(standing => {
      const name = standing.name || ''; // ex: "Group A"
      const match = name.match(/Group\s+([A-L])/i);
      if (!match) return;
      const letter = match[1].toUpperCase();
      groups[letter] = (standing.rows || []).map(r => ({
        team:   r.team?.name || '?',
        flag:   getFlag(r.team?.name || ''),
        played: r.matches    || 0,
        won:    r.wins       || 0,
        drawn:  r.draws      || 0,
        lost:   r.losses     || 0,
        gf:     r.scoresFor  || 0,
        ga:     r.scoresAgainst || 0,
        gd:     (r.scoresFor || 0) - (r.scoresAgainst || 0),
        points: r.points     || 0,
      }));
    });

    if (Object.keys(groups).length > 0) {
      state.standings = groups;
      renderGroups();
    }
  } catch (err) {
    console.warn('[Copa] fetchStandings:', err.message);
  }
}

// ── Normaliza evento SofaScore → formato interno ─────────────
function normalizeSofa(e) {
  const sc  = e.homeScore?.current;
  const sc2 = e.awayScore?.current;
  const hasScore = sc !== undefined && sc !== null;

  const statusCode = e.status?.code;
  let status = 'upcoming';
  // SofaScore: 0=não iniciado, 6=ao vivo, 7=intervalo, 100=encerrado
  if (statusCode === 6 || statusCode === 7 || statusCode === 31)  status = 'live';
  else if (statusCode === 100 || statusCode === 110) status = 'finished';

  const startDate = new Date((e.startTimestamp || 0) * 1000);
  const dateStr   = startDate.toISOString().slice(0, 10);
  const timeStr   = startDate.toLocaleTimeString('pt-BR', {
    timeZone: 'America/Sao_Paulo', hour: '2-digit', minute: '2-digit',
  });

  const roundStr = e.roundInfo?.name || e.roundInfo?.round?.toString() || '';
  const groupM   = roundStr.match(/Group\s+([A-L])/i);
  const group    = groupM ? groupM[1].toUpperCase() : null;

  const homeName = e.homeTeam?.name || '?';
  const awayName = e.awayTeam?.name || '?';

  const minute = e.time?.played
    ? `${e.time.played}'`
    : e.status?.description || null;

  return {
    id:        e.id,
    group,
    phase:     detectPhase(roundStr),
    highlight: /brazil|brasil/i.test(homeName) || /brazil|brasil/i.test(awayName),
    home: { name: homeName, flag: getFlag(homeName), code: homeName.slice(0, 3).toUpperCase() },
    away: { name: awayName, flag: getFlag(awayName), code: awayName.slice(0, 3).toUpperCase() },
    date:     dateStr,
    time:     timeStr,
    timezone: 'BRT',
    venue:    e.venue?.stadium?.name || '',
    city:     e.venue?.city?.name   || '',
    status,
    score:    hasScore ? { home: sc, away: sc2 } : null,
    minute,
    events:   [],
  };
}

function detectPhase(round) {
  const r = (round || '').toLowerCase();
  if (r.includes('group'))                                  return 'grupos';
  if (r.includes('round of 32') || r.includes('32'))       return 'oitavas';
  if (r.includes('round of 16') || r.includes('16'))       return 'oitavas';
  if (r.includes('quarter'))                                return 'quartas';
  if (r.includes('semi'))                                   return 'semi';
  if (r.includes('3rd') || r.includes('third'))            return 'terceiro';
  if (r.includes('final'))                                  return 'final';
  return 'grupos';
}

// ── Auto Refresh ──────────────────────────────────────────────
function startAutoRefresh() {
  stopAutoRefresh();
  const interval = state.isLive ? 30_000 : 60_000;
  state.refreshInterval = setInterval(async () => {
    await fetchLiveAndToday();
    if (state.isLive) await fetchAllMatches();
    updateLastUpdateTime();
    startAutoRefresh(); // reajusta intervalo
  }, interval);
}

function stopAutoRefresh() {
  if (state.refreshInterval) { clearInterval(state.refreshInterval); state.refreshInterval = null; }
}

// ── Demo Data ─────────────────────────────────────────────────
function loadDemoData() {
  state.matches     = DEMO_MATCHES;
  state.liveMatches = DEMO_MATCHES.filter(m => m.status === 'live');
  state.isLive      = state.liveMatches.length > 0;
  state.standings   = {};
  Object.keys(GROUPS).forEach(g => {
    state.standings[g] = GROUPS[g].teams.map((team, i) => ({
      team, flag: GROUPS[g].flags[i],
      played: 0, won: 0, drawn: 0, lost: 0, gf: 0, ga: 0, gd: 0, points: 0,
    }));
  });
  renderAll();
}

function renderAll() {
  renderLiveTab();
  renderCalendar();
  renderResults();
  renderGroups();
}

// ── Tabs ──────────────────────────────────────────────────────
function showTab(tab) {
  state.activeTab = tab;
  document.querySelectorAll('.tab-section').forEach(s => s.classList.remove('active'));
  document.querySelectorAll('.nav-tab').forEach(b => b.classList.remove('active'));
  document.getElementById(`tab-${tab}`)?.classList.add('active');
  document.querySelector(`[data-tab="${tab}"]`)?.classList.add('active');
}

// ── Ao Vivo / Hoje ────────────────────────────────────────────
function renderLiveTab() {
  const container = document.getElementById('live-games-container');
  if (!container) return;

  let html = '';

  if (state.usingDemo) {
    html += renderCountdownCard();
    html += renderMatchSection('📅 Jogos do Brasil na Copa 2026', DEMO_MATCHES.filter(m => m.highlight));
    html += `<div class="demo-notice">📡 Aguardando conexão com SofaScore para dados ao vivo…</div>`;
  } else {
    const live     = state.liveMatches.filter(m => m.status === 'live');
    const upcoming = state.liveMatches.filter(m => m.status === 'upcoming');
    const finished = state.liveMatches.filter(m => m.status === 'finished');

    if (live.length)     html += renderMatchSection('🔴 Ao Vivo Agora', live);
    if (upcoming.length) html += renderMatchSection('📅 Hoje — Próximos', upcoming);
    if (finished.length) html += renderMatchSection('✅ Hoje — Encerrados', finished);

    if (!live.length && !upcoming.length && !finished.length) {
      html += renderCountdownCard();
      html += `<div class="empty-state"><div class="empty-icon">📭</div><p>Nenhum jogo hoje</p></div>`;
    }
  }

  container.innerHTML = html;
}

// ── Countdown Card ────────────────────────────────────────────
function renderCountdownCard() {
  const now  = new Date();
  const diff = COPA_START - now;
  if (diff <= 0) return '<div class="countdown-card"><div class="countdown-label">🏆 A Copa está acontecendo!</div></div>';

  const days  = Math.floor(diff / 86400000);
  const hours = Math.floor((diff % 86400000) / 3600000);
  const mins  = Math.floor((diff % 3600000) / 60000);
  const secs  = Math.floor((diff % 60000) / 1000);

  return `<div class="countdown-card" id="countdown-card">
    <div class="countdown-label">⏱️ Copa começa em</div>
    <div class="countdown-numbers">
      <div class="countdown-unit"><span class="cnt-num" id="cnt-days">${days}</span><span class="cnt-lbl">dias</span></div>
      <div class="countdown-sep">:</div>
      <div class="countdown-unit"><span class="cnt-num" id="cnt-hours">${String(hours).padStart(2,'0')}</span><span class="cnt-lbl">horas</span></div>
      <div class="countdown-sep">:</div>
      <div class="countdown-unit"><span class="cnt-num" id="cnt-mins">${String(mins).padStart(2,'0')}</span><span class="cnt-lbl">min</span></div>
      <div class="countdown-sep">:</div>
      <div class="countdown-unit"><span class="cnt-num" id="cnt-secs">${String(secs).padStart(2,'0')}</span><span class="cnt-lbl">seg</span></div>
    </div>
    <div class="countdown-sub">11 de junho · Azteca · Cidade do México</div>
  </div>`;
}

function renderCountdown() {
  const diff = COPA_START - new Date();
  if (diff <= 0) return;
  const set = (id, val, pad) => {
    const el = document.getElementById(id);
    if (el) el.textContent = pad ? String(val).padStart(2, '0') : val;
  };
  set('cnt-days',  Math.floor(diff / 86400000));
  set('cnt-hours', Math.floor((diff % 86400000) / 3600000), true);
  set('cnt-mins',  Math.floor((diff % 3600000) / 60000), true);
  set('cnt-secs',  Math.floor((diff % 60000) / 1000), true);
}

// ── Match Card ────────────────────────────────────────────────
function renderMatchSection(title, matches) {
  if (!matches.length) return '';
  return `<div class="match-section">
    <div class="match-section-header">${title}</div>
    ${matches.map(renderMatchCard).join('')}
  </div>`;
}

function renderMatchCard(m) {
  const isLive     = m.status === 'live';
  const isFinished = m.status === 'finished';
  const isBrasil   = m.highlight;

  const scoreHtml = m.score
    ? `<div class="score-display ${isLive ? 'score-live' : ''}">
        <span class="score-num">${m.score.home}</span>
        <span class="score-sep">—</span>
        <span class="score-num">${m.score.away}</span>
       </div>`
    : `<div class="score-display score-upcoming">
        <span class="match-time">${m.time}</span>
        <span class="match-tz">${m.timezone}</span>
       </div>`;

  const statusBadge = isLive
    ? `<span class="badge badge-live"><span class="pulse-dot"></span>${m.minute || 'AO VIVO'}</span>`
    : isFinished
    ? `<span class="badge badge-done">FT</span>`
    : `<span class="badge badge-upcoming">${m.time} BRT</span>`;

  const groupLabel = m.group ? `Grupo ${m.group}` : (m.phase || '');

  return `<div class="match-card ${isBrasil ? 'match-brazil' : ''} ${isLive ? 'match-live-card' : ''}">
    <div class="match-card-top">
      <div class="match-meta">
        <span class="group-badge">${groupLabel}</span>
        ${statusBadge}
      </div>
      <div class="match-venue">${m.city || m.venue}</div>
    </div>
    <div class="match-teams">
      <div class="team-side team-home">
        <span class="team-flag">${m.home.flag}</span>
        <span class="team-name">${m.home.name}</span>
      </div>
      ${scoreHtml}
      <div class="team-side team-away">
        <span class="team-name">${m.away.name}</span>
        <span class="team-flag">${m.away.flag}</span>
      </div>
    </div>
  </div>`;
}

// ── Calendário ────────────────────────────────────────────────
function renderCalendar() {
  const container = document.getElementById('calendar-container');
  if (!container) return;

  const phaseFilter = document.getElementById('phase-filter')?.value || 'todos';
  const groupFilter = document.getElementById('group-filter')?.value || 'todos';

  let matches = [...state.matches].sort((a, b) =>
    a.date !== b.date ? a.date.localeCompare(b.date) : a.time.localeCompare(b.time)
  );

  if (phaseFilter !== 'todos') matches = matches.filter(m => m.phase === phaseFilter);
  if (groupFilter !== 'todos') matches = matches.filter(m => m.group === groupFilter);

  if (!matches.length) {
    container.innerHTML = `<div class="empty-state"><div class="empty-icon">🗓️</div><p>Nenhum jogo encontrado</p></div>`;
    return;
  }

  const byDate = {};
  matches.forEach(m => { (byDate[m.date] = byDate[m.date] || []).push(m); });

  container.innerHTML = Object.keys(byDate).sort().map(date =>
    `<div class="date-group">
      <div class="date-label">${formatDateLabel(date)}</div>
      ${byDate[date].map(renderMatchCard).join('')}
    </div>`
  ).join('');
}

// ── Resultados ────────────────────────────────────────────────
function renderResults() {
  const container = document.getElementById('results-container');
  if (!container) return;

  const finished = state.matches.filter(m => m.status === 'finished');

  if (!finished.length) {
    container.innerHTML = `<div class="empty-state">
      <div class="empty-icon">⏳</div>
      <p>Nenhum resultado ainda</p>
      <p class="empty-sub">Os resultados aparecerão aqui após os jogos</p>
    </div>`;
    return;
  }

  const byDate = {};
  finished.forEach(m => { (byDate[m.date] = byDate[m.date] || []).push(m); });

  container.innerHTML = Object.keys(byDate).sort().reverse().map(date =>
    `<div class="date-group">
      <div class="date-label">${formatDateLabel(date)}</div>
      ${byDate[date].map(renderMatchCard).join('')}
    </div>`
  ).join('');
}

// ── Grupos ────────────────────────────────────────────────────
function renderGroups() {
  const container = document.getElementById('groups-container');
  if (!container) return;

  const groups = Object.keys(state.standings).sort();

  if (!groups.length) {
    container.innerHTML = `<div class="empty-state"><div class="empty-icon">🏆</div><p>Carregando grupos...</p></div>`;
    return;
  }

  container.innerHTML = groups.map(g => {
    const teams    = state.standings[g] || [];
    const hasBrasil = teams.some(t => /brazil|brasil/i.test(t.team));

    return `<div class="group-table-card${hasBrasil ? ' group-brasil' : ''}">
      <div class="group-table-header">GRUPO ${g}${hasBrasil ? ' 🇧🇷' : ''}</div>
      <table class="group-table">
        <thead>
          <tr>
            <th class="th-team">Seleção</th>
            <th title="Jogos">J</th><th title="Vitórias">V</th><th title="Empates">E</th>
            <th title="Derrotas">D</th><th title="Gols marcados">GP</th>
            <th title="Gols sofridos">GC</th><th title="Saldo">SG</th>
            <th title="Pontos" class="th-pts">PTS</th>
          </tr>
        </thead>
        <tbody>
          ${teams.map((t, i) => {
            const isBr = /brazil|brasil/i.test(t.team);
            return `<tr class="${i < 2 ? 'qualify-row' : ''}${isBr ? ' brazil-row' : ''}">
              <td class="td-team">
                <span class="pos-num">${i + 1}</span>
                <span class="team-flag-sm">${t.flag}</span>
                <span class="team-name-sm">${t.team}</span>
              </td>
              <td>${t.played}</td><td>${t.won}</td><td>${t.drawn}</td><td>${t.lost}</td>
              <td>${t.gf}</td><td>${t.ga}</td>
              <td>${t.gd >= 0 ? '+' : ''}${t.gd}</td>
              <td class="td-pts"><strong>${t.points}</strong></td>
            </tr>`;
          }).join('')}
        </tbody>
      </table>
      <div class="qualify-legend"><span class="qualify-dot"></span>Avançam para a próxima fase</div>
    </div>`;
  }).join('');
}

// ── Helpers ───────────────────────────────────────────────────
function renderTodayDate() {
  const el = document.getElementById('today-date');
  if (el) el.textContent = new Date().toLocaleDateString('pt-BR', {
    weekday: 'long', day: 'numeric', month: 'long',
  });
}

function formatDateLabel(dateStr) {
  const date     = new Date(dateStr + 'T12:00:00');
  const today    = new Date().toISOString().slice(0, 10);
  const tomorrow = new Date(Date.now() + 86400000).toISOString().slice(0, 10);
  if (dateStr === today)    return '🔥 Hoje';
  if (dateStr === tomorrow) return '⏭️ Amanhã';
  return date.toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' });
}

function setLoadingState(on) {
  state.loading = on;
  const el = document.getElementById('refresh-indicator');
  if (el) el.style.opacity = on ? '1' : '0';
}

function updateLastUpdateTime() {
  const el = document.getElementById('last-update');
  if (el && state.lastUpdate) {
    el.textContent = `Atualizado às ${state.lastUpdate.toLocaleTimeString('pt-BR', {
      hour: '2-digit', minute: '2-digit', second: '2-digit',
    })}`;
  }
}

function showToast(msg) {
  const toast = document.getElementById('toast');
  if (!toast) return;
  toast.textContent = msg;
  toast.classList.add('show');
  setTimeout(() => toast.classList.remove('show'), 3500);
}
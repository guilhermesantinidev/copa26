// ============================================================
// COPA DO MUNDO 2026 — App Principal
// Integração: API-Football (RapidAPI) + fallback demo
// Auto-refresh a cada 30s durante jogos ao vivo
// ============================================================

// ── Configuração da API ──────────────────────────────────────
const API_CONFIG = {
  // Obtenha sua chave em: https://rapidapi.com/api-sports/api/api-football
  key: localStorage.getItem('apikey_football') || '',
  host: 'api-football-v1.p.rapidapi.com',
  baseUrl: 'https://api-football-v1.p.rapidapi.com/v3',
  // ID da Copa do Mundo 2026 na API-Football (será 1 para WC)
  leagueId: 1,   // World Cup
  season: 2026,
};

// ── Estado Global ────────────────────────────────────────────
let state = {
  matches: [],
  liveMatches: [],
  standings: {},
  activeTab: 'ao-vivo',
  lastUpdate: null,
  refreshInterval: null,
  isLive: false,
  usingDemo: true,
  loading: false,
};

// ── Init ─────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  renderTodayDate();
  renderCountdown();
  setInterval(renderCountdown, 1000);

  if (API_CONFIG.key) {
    state.usingDemo = false;
    fetchAll();
    startAutoRefresh();
  } else {
    loadDemoData();
    showApiKeyBanner();
  }

  showTab('ao-vivo');
});

// ── API Key Management ───────────────────────────────────────
function showApiKeyBanner() {
  const banner = document.getElementById('api-key-banner');
  if (banner) banner.style.display = 'flex';
}

function saveApiKey() {
  const input = document.getElementById('api-key-input');
  const key = input.value.trim();
  if (!key) return;
  localStorage.setItem('apikey_football', key);
  API_CONFIG.key = key;
  state.usingDemo = false;
  document.getElementById('api-key-banner').style.display = 'none';
  showToast('✅ Chave salva! Buscando dados ao vivo...');
  fetchAll();
  startAutoRefresh();
}

// ── Fetch All Data ───────────────────────────────────────────
async function fetchAll() {
  try {
    setLoadingState(true);
    await Promise.all([
      fetchLiveMatches(),
      fetchTodayMatches(),
      fetchFixtures(),
      fetchStandings(),
    ]);
    state.lastUpdate = new Date();
    updateLastUpdateTime();
    setLoadingState(false);
  } catch (err) {
    console.error('Erro ao buscar dados:', err);
    setLoadingState(false);
    if (state.matches.length === 0) loadDemoData();
  }
}

async function apiGet(endpoint, params = {}) {
  const url = new URL(`${API_CONFIG.baseUrl}${endpoint}`);
  Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));

  const res = await fetch(url.toString(), {
    headers: {
      'X-RapidAPI-Key': API_CONFIG.key,
      'X-RapidAPI-Host': API_CONFIG.host,
    }
  });

  if (!res.ok) throw new Error(`API error: ${res.status}`);
  const data = await res.json();
  if (data.errors && Object.keys(data.errors).length > 0) {
    throw new Error(JSON.stringify(data.errors));
  }
  return data.response || [];
}

// ── Live Matches ─────────────────────────────────────────────
async function fetchLiveMatches() {
  const data = await apiGet('/fixtures', {
    live: 'all',
    league: API_CONFIG.leagueId,
    season: API_CONFIG.season,
  });
  state.liveMatches = data.map(normalizeMatch);
  state.isLive = state.liveMatches.length > 0;
  document.getElementById('live-indicator').style.display = state.isLive ? 'flex' : 'none';
  renderLiveTab();
}

// ── Today's Matches ──────────────────────────────────────────
async function fetchTodayMatches() {
  const today = new Date().toISOString().slice(0, 10);
  const data = await apiGet('/fixtures', {
    date: today,
    league: API_CONFIG.leagueId,
    season: API_CONFIG.season,
  });
  const todayMatches = data.map(normalizeMatch);
  // Merge with live (live has more data)
  const liveIds = new Set(state.liveMatches.map(m => m.id));
  const notLive = todayMatches.filter(m => !liveIds.has(m.id));
  state.liveMatches = [...state.liveMatches, ...notLive];
  renderLiveTab();
}

// ── All Fixtures ─────────────────────────────────────────────
async function fetchFixtures() {
  const data = await apiGet('/fixtures', {
    league: API_CONFIG.leagueId,
    season: API_CONFIG.season,
  });
  state.matches = data.map(normalizeMatch);
  renderCalendar();
  renderResults();
}

// ── Standings ────────────────────────────────────────────────
async function fetchStandings() {
  const data = await apiGet('/standings', {
    league: API_CONFIG.leagueId,
    season: API_CONFIG.season,
  });
  // data[0] contains league standings
  if (data[0]?.league?.standings) {
    const groups = {};
    data[0].league.standings.forEach(group => {
      const groupName = group[0]?.group?.replace('Group ', '') || '?';
      groups[groupName] = group.map(t => ({
        team: t.team.name,
        flag: getFlag(t.team.name),
        played: t.all.played,
        won: t.all.win,
        drawn: t.all.draw,
        lost: t.all.lose,
        gf: t.all.goals.for,
        ga: t.all.goals.against,
        gd: t.goalsDiff,
        points: t.points,
      }));
    });
    state.standings = groups;
    renderGroups();
  }
}

// ── Normalize Match from API ─────────────────────────────────
function normalizeMatch(m) {
  const status = m.fixture?.status?.short || 'NS';
  const elapsed = m.fixture?.status?.elapsed;

  let appStatus = 'upcoming';
  if (['1H', '2H', 'HT', 'ET', 'P', 'BT'].includes(status)) appStatus = 'live';
  else if (['FT', 'AET', 'PEN'].includes(status)) appStatus = 'finished';

  const fixtureDate = new Date(m.fixture?.date);
  const dateStr = fixtureDate.toISOString().slice(0, 10);
  // Convert to BRT (UTC-3)
  const brtTime = new Date(fixtureDate.getTime() - 0); // keep original, display as BRT
  const hours = brtTime.toLocaleTimeString('pt-BR', { timeZone: 'America/Sao_Paulo', hour: '2-digit', minute: '2-digit' });

  const events = (m.events || []).map(ev => ({
    type: ev.type,
    detail: ev.detail,
    minute: ev.time?.elapsed,
    player: ev.player?.name,
    team: ev.team?.name,
  }));

  const group = m.league?.round?.includes('Group') 
    ? m.league.round.split('Group ')[1]?.[0] 
    : null;

  return {
    id: m.fixture?.id,
    group: group,
    phase: detectPhase(m.league?.round || ''),
    highlight: ['Brazil', 'Brasil'].includes(m.teams?.home?.name) || ['Brazil', 'Brasil'].includes(m.teams?.away?.name),
    home: {
      name: m.teams?.home?.name || '?',
      flag: getFlag(m.teams?.home?.name),
      code: m.teams?.home?.name?.slice(0, 3).toUpperCase(),
    },
    away: {
      name: m.teams?.away?.name || '?',
      flag: getFlag(m.teams?.away?.name),
      code: m.teams?.away?.name?.slice(0, 3).toUpperCase(),
    },
    date: dateStr,
    time: hours,
    timezone: 'BRT',
    venue: m.fixture?.venue?.name || '',
    city: m.fixture?.venue?.city || '',
    status: appStatus,
    score: appStatus !== 'upcoming' ? {
      home: m.goals?.home ?? 0,
      away: m.goals?.away ?? 0,
    } : null,
    minute: elapsed ? `${elapsed}'` : getStatusLabel(status),
    events,
  };
}

function detectPhase(round) {
  if (round.includes('Group')) return 'grupos';
  if (round.includes('Round of 16') || round.includes('16')) return 'oitavas';
  if (round.includes('Quarter')) return 'quartas';
  if (round.includes('Semi')) return 'semi';
  if (round.includes('Final') && !round.includes('Semi')) return 'final';
  return 'grupos';
}

function getStatusLabel(short) {
  const map = { 'NS': null, 'HT': 'Intervalo', 'FT': 'Encerrado', 'AET': 'Prorrogação', 'PEN': 'Pênaltis', 'PST': 'Adiado' };
  return map[short] || short;
}

// ── Auto Refresh ─────────────────────────────────────────────
function startAutoRefresh() {
  stopAutoRefresh();
  state.refreshInterval = setInterval(async () => {
    // Se há jogo ao vivo, atualiza tudo; senão, só verifica ao vivo
    if (state.isLive) {
      await fetchAll();
    } else {
      await fetchLiveMatches();
      await fetchTodayMatches();
    }
  }, 30000); // 30 segundos
}

function stopAutoRefresh() {
  if (state.refreshInterval) clearInterval(state.refreshInterval);
}

// ── Demo Data (sem chave de API) ─────────────────────────────
function loadDemoData() {
  state.matches = DEMO_MATCHES;
  state.liveMatches = DEMO_MATCHES.filter(m => m.status === 'live');
  // Build demo standings
  Object.keys(GROUPS).forEach(g => {
    state.standings[g] = GROUPS[g].teams.map((team, i) => ({
      team,
      flag: GROUPS[g].flags[i],
      played: 0, won: 0, drawn: 0, lost: 0,
      gf: 0, ga: 0, gd: 0, points: 0,
    }));
  });
  renderAll();
}

// ── Render All ───────────────────────────────────────────────
function renderAll() {
  renderLiveTab();
  renderCalendar();
  renderResults();
  renderGroups();
}

// ── Tab Navigation ───────────────────────────────────────────
function showTab(tab) {
  state.activeTab = tab;
  document.querySelectorAll('.tab-section').forEach(s => s.classList.remove('active'));
  document.querySelectorAll('.nav-tab').forEach(b => b.classList.remove('active'));
  document.getElementById(`tab-${tab}`)?.classList.add('active');
  document.querySelector(`[data-tab="${tab}"]`)?.classList.add('active');
}

// ── Today / Live Tab ─────────────────────────────────────────
function renderLiveTab() {
  const container = document.getElementById('live-games-container');
  if (!container) return;

  const today = new Date().toISOString().slice(0, 10);
  const todayMatches = state.usingDemo
    ? state.matches
    : state.matches.filter(m => m.date === today);

  const live = todayMatches.filter(m => m.status === 'live');
  const upcoming = todayMatches.filter(m => m.status === 'upcoming');
  const finished = todayMatches.filter(m => m.status === 'finished');

  let html = '';

  if (state.usingDemo) {
    html += `<div class="demo-notice">
      <span>📡 Modo demonstração — <a href="#" onclick="openApiModal()">Configure sua chave de API</a> para dados ao vivo</span>
    </div>`;
    // Show countdown
    html += renderCountdownCard();
    html += renderMatchSection('📅 Próximos Jogos do Brasil', state.matches.filter(m => m.highlight));
  } else {
    if (live.length > 0) html += renderMatchSection('🔴 Ao Vivo Agora', live);
    if (upcoming.length > 0) html += renderMatchSection('📅 Hoje — Próximos', upcoming);
    if (finished.length > 0) html += renderMatchSection('✅ Hoje — Encerrados', finished);
    if (live.length === 0 && upcoming.length === 0 && finished.length === 0) {
      html += `<div class="empty-state"><div class="empty-icon">📭</div><p>Nenhum jogo hoje</p></div>`;
    }
  }

  container.innerHTML = html;
}

function renderCountdownCard() {
  const now = new Date();
  const diff = COPA_START - now;
  if (diff <= 0) return '';
  const days = Math.floor(diff / 86400000);
  const hours = Math.floor((diff % 86400000) / 3600000);
  const mins = Math.floor((diff % 3600000) / 60000);
  const secs = Math.floor((diff % 60000) / 1000);
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
    <div class="countdown-sub">11 de junho · Los Angeles</div>
  </div>`;
}

function renderCountdown() {
  const now = new Date();
  const diff = COPA_START - now;
  if (diff <= 0) return;
  const days = Math.floor(diff / 86400000);
  const hours = Math.floor((diff % 86400000) / 3600000);
  const mins = Math.floor((diff % 3600000) / 60000);
  const secs = Math.floor((diff % 60000) / 1000);
  const set = (id, val, pad=false) => {
    const el = document.getElementById(id);
    if (el) el.textContent = pad ? String(val).padStart(2,'0') : val;
  };
  set('cnt-days', days);
  set('cnt-hours', hours, true);
  set('cnt-mins', mins, true);
  set('cnt-secs', secs, true);
}

function renderMatchSection(title, matches) {
  if (!matches.length) return '';
  return `<div class="match-section">
    <div class="match-section-header">${title}</div>
    ${matches.map(renderMatchCard).join('')}
  </div>`;
}

function renderMatchCard(m) {
  const isLive = m.status === 'live';
  const isFinished = m.status === 'finished';
  const isBrasil = m.highlight;

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
    ? `<span class="badge badge-live"><span class="pulse-dot"></span>${m.minute}</span>`
    : isFinished
    ? `<span class="badge badge-done">FT</span>`
    : `<span class="badge badge-upcoming">${m.time}</span>`;

  const eventsHtml = m.events?.length
    ? `<div class="match-events">${m.events.slice(0, 6).map(ev => {
        const icon = ev.type === 'Goal' ? '⚽' : ev.type === 'Card' && ev.detail?.includes('Yellow') ? '🟨' : ev.type === 'Card' ? '🟥' : '🔄';
        return `<span class="event-chip">${icon} ${ev.minute}' ${ev.player?.split(' ').pop() || ''}</span>`;
      }).join('')}</div>`
    : '';

  return `<div class="match-card ${isBrasil ? 'match-brazil' : ''} ${isLive ? 'match-live-card' : ''}">
    <div class="match-card-top">
      <div class="match-meta">
        ${m.group ? `<span class="group-badge">Grupo ${m.group}</span>` : `<span class="group-badge">${m.phase}</span>`}
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
    ${eventsHtml}
  </div>`;
}

// ── Calendar Tab ─────────────────────────────────────────────
function renderCalendar() {
  const container = document.getElementById('calendar-container');
  if (!container) return;

  const phaseFilter = document.getElementById('phase-filter')?.value || 'todos';
  const groupFilter = document.getElementById('group-filter')?.value || 'todos';

  let matches = state.matches.filter(m => m.status === 'upcoming' || m.status === 'live');
  if (phaseFilter !== 'todos') matches = matches.filter(m => m.phase === phaseFilter);
  if (groupFilter !== 'todos') matches = matches.filter(m => m.group === groupFilter);

  if (!matches.length) {
    container.innerHTML = `<div class="empty-state"><div class="empty-icon">🗓️</div><p>Nenhum jogo encontrado</p></div>`;
    return;
  }

  // Group by date
  const byDate = {};
  matches.forEach(m => {
    if (!byDate[m.date]) byDate[m.date] = [];
    byDate[m.date].push(m);
  });

  container.innerHTML = Object.keys(byDate).sort().map(date => {
    const label = formatDateLabel(date);
    return `<div class="date-group">
      <div class="date-label">${label}</div>
      ${byDate[date].map(renderMatchCard).join('')}
    </div>`;
  }).join('');
}

// ── Results Tab ──────────────────────────────────────────────
function renderResults() {
  const container = document.getElementById('results-container');
  if (!container) return;

  const finished = state.matches.filter(m => m.status === 'finished');

  if (!finished.length) {
    container.innerHTML = `<div class="empty-state"><div class="empty-icon">⏳</div><p>Nenhum resultado ainda</p><p class="empty-sub">Os resultados aparecerão aqui após os jogos</p></div>`;
    return;
  }

  const byDate = {};
  finished.forEach(m => {
    if (!byDate[m.date]) byDate[m.date] = [];
    byDate[m.date].push(m);
  });

  container.innerHTML = Object.keys(byDate).sort().reverse().map(date => {
    const label = formatDateLabel(date);
    return `<div class="date-group">
      <div class="date-label">${label}</div>
      ${byDate[date].map(renderMatchCard).join('')}
    </div>`;
  }).join('');
}

// ── Groups Tab ───────────────────────────────────────────────
function renderGroups() {
  const container = document.getElementById('groups-container');
  if (!container) return;

  const groups = Object.keys(state.standings).sort();
  if (!groups.length) {
    container.innerHTML = `<div class="empty-state"><div class="empty-icon">🏆</div><p>Carregando grupos...</p></div>`;
    return;
  }

  container.innerHTML = groups.map(g => {
    const teams = state.standings[g] || [];
    return `<div class="group-table-card">
      <div class="group-table-header">GRUPO ${g}</div>
      <table class="group-table">
        <thead>
          <tr>
            <th class="th-team">Seleção</th>
            <th title="Jogos">J</th>
            <th title="Vitórias">V</th>
            <th title="Empates">E</th>
            <th title="Derrotas">D</th>
            <th title="Gols marcados">GP</th>
            <th title="Gols sofridos">GC</th>
            <th title="Saldo">SG</th>
            <th title="Pontos" class="th-pts">PTS</th>
          </tr>
        </thead>
        <tbody>
          ${teams.map((t, i) => `
            <tr class="${i < 2 ? 'qualify-row' : ''} ${['Brazil','Brasil'].includes(t.team) ? 'brazil-row' : ''}">
              <td class="td-team">
                <span class="pos-num">${i + 1}</span>
                <span class="team-flag-sm">${t.flag}</span>
                <span class="team-name-sm">${t.team}</span>
              </td>
              <td>${t.played}</td>
              <td>${t.won}</td>
              <td>${t.drawn}</td>
              <td>${t.lost}</td>
              <td>${t.gf}</td>
              <td>${t.ga}</td>
              <td>${t.gd >= 0 ? '+' : ''}${t.gd}</td>
              <td class="td-pts"><strong>${t.points}</strong></td>
            </tr>`).join('')}
        </tbody>
      </table>
      <div class="qualify-legend"><span class="qualify-dot"></span>Classificam para oitavas</div>
    </div>`;
  }).join('');
}

// ── Helpers ──────────────────────────────────────────────────
function renderTodayDate() {
  const el = document.getElementById('today-date');
  if (el) el.textContent = new Date().toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' });
}

function formatDateLabel(dateStr) {
  const date = new Date(dateStr + 'T12:00:00');
  const today = new Date();
  const tomorrow = new Date(today);
  tomorrow.setDate(today.getDate() + 1);
  const todayStr = today.toISOString().slice(0, 10);
  const tomorrowStr = tomorrow.toISOString().slice(0, 10);
  if (dateStr === todayStr) return '🔥 Hoje';
  if (dateStr === tomorrowStr) return '⏭️ Amanhã';
  return date.toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' });
}

function setLoadingState(loading) {
  state.loading = loading;
  const indicator = document.getElementById('refresh-indicator');
  if (indicator) indicator.style.opacity = loading ? '1' : '0';
}

function updateLastUpdateTime() {
  const el = document.getElementById('last-update');
  if (el && state.lastUpdate) {
    el.textContent = `Atualizado ${state.lastUpdate.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}`;
  }
}

function showToast(msg) {
  const toast = document.getElementById('toast');
  if (!toast) return;
  toast.textContent = msg;
  toast.classList.add('show');
  setTimeout(() => toast.classList.remove('show'), 3000);
}

function openApiModal() {
  document.getElementById('api-key-banner').style.display = 'flex';
}

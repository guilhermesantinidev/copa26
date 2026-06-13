// ============================================================
// COPA DO MUNDO 2026 — App Principal v5
// Fonte primária : football-data.org (gratuito, CORS liberado,
//                  sem proxy, 10 req/min no plano free)
//   - Competition ID : CWC2026  (a verificar após início)
//   - Endpoint jogos : /v4/competitions/CWC2026/matches
//   - Endpoint grupos: /v4/competitions/CWC2026/standings
// Fallback          : dados demo (DEMO_MATCHES / GROUPS)
// ============================================================

const FAVS_KEY   = 'copa26_favs';
const FDORG_KEY  = 'copa26_fdorg_key';   // chave football-data.org

// football-data.org — Competition code para Copa do Mundo 2026
const FD = {
  base:    'https://api.football-data.org/v4',
  comp:    'WC',       // código oficial; confirmado na API
};

function getApiKey()   { return localStorage.getItem(FDORG_KEY) || ''; }
function setApiKey(k)  {
  if (k) localStorage.setItem(FDORG_KEY, k.trim());
  else   localStorage.removeItem(FDORG_KEY);
}

// ── Mapa de fusos por cidade/estádio ─────────────────────────
const VENUE_TZ = {
  'Nova York / NJ':   'America/New_York',  'New York':        'America/New_York',
  'Boston':           'America/New_York',  'Philadelphia':    'America/New_York',
  'Miami':            'America/New_York',  'Atlanta':         'America/New_York',
  'Dallas':           'America/Chicago',   'Kansas City':     'America/Chicago',
  'Houston':          'America/Chicago',
  'Los Angeles':      'America/Los_Angeles','Pasadena':       'America/Los_Angeles',
  'San Francisco':    'America/Los_Angeles','Seattle':        'America/Los_Angeles',
  'Denver':           'America/Denver',
  'Toronto':          'America/Toronto',   'Vancouver':       'America/Vancouver',
  'Cidade do México': 'America/Mexico_City','Guadalajara':    'America/Mexico_City',
  'Monterrey':        'America/Monterrey',
};
const TZ_LABEL = {
  'America/New_York':    'ET',  'America/Chicago':     'CT',
  'America/Denver':      'MT',  'America/Los_Angeles': 'PT',
  'America/Toronto':     'ET',  'America/Vancouver':   'PT',
  'America/Mexico_City': 'CT',  'America/Monterrey':   'CT',
};

// ── Estado global ─────────────────────────────────────────────
const state = {
  matches:         [],
  liveMatches:     [],
  standings:       {},
  activeTab:       'ao-vivo',
  lastUpdate:      null,
  refreshInterval: null,
  isLive:          false,
  usingDemo:       true,
  loading:         false,
  prevScores:      {},
  favTeams:        new Set(JSON.parse(localStorage.getItem(FAVS_KEY) || '[]')),
  _fetching:       false,
};

// ── Init ──────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  renderTodayDate();
  renderCountdown();
  setInterval(renderCountdown, 1000);

  loadDemoData();          // conteúdo imediato
  fetchLiveData();         // tenta API real
  startAutoRefresh();
  showTab('ao-vivo');

  renderBrasilWidget();
  setInterval(renderBrasilWidget, 30_000);
  initNotifBanner();
  initSearchKeyboard();
  initFavsModal();
  initApiKeyModal();
});

// ══════════════════════════════════════════════════════════════
// FOOTBALL-DATA.ORG  — Camada de dados principal
// Plano free: token obrigatório mas gratuito (cadastro rápido),
// CORS liberado (header X-Auth-Token), 10 req/min.
// ══════════════════════════════════════════════════════════════

async function fdFetch(path) {
  const key = getApiKey();
  const headers = { 'Accept': 'application/json' };
  if (key) headers['X-Auth-Token'] = key;

  const res = await fetch(FD.base + path, {
    headers,
    signal: AbortSignal.timeout(12_000),
  });

  console.log(`[Copa] football-data.org ${path} → HTTP ${res.status}`);

  if (res.status === 400) throw new Error('Competição ainda não disponível na API (400)');
  if (res.status === 401) throw new Error('Token inválido (401) — verifique sua chave');
  if (res.status === 403) throw new Error('Acesso negado (403) — plano free não cobre este endpoint');
  if (res.status === 429) throw new Error('Limite atingido (429) — aguarde um minuto');
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

// ── Busca todos os jogos ──────────────────────────────────────
async function fdFetchMatches() {
  // /v4/competitions/WC/matches retorna todos os jogos da competição
  const data = await fdFetch(`/competitions/${FD.comp}/matches`);
  const matches = data.matches || [];
  if (!matches.length) throw new Error('football-data.org: nenhum jogo retornado');

  state.matches = matches.map(normalizeFD);
  console.log(`[Copa] football-data.org: ${state.matches.length} jogos`);
  renderCalendar();
  renderResults();
}

// ── Busca classificação dos grupos ────────────────────────────
async function fdFetchStandings() {
  try {
    const data = await fdFetch(`/competitions/${FD.comp}/standings`);
    const sectionGroups = (data.standings || []).filter(s => s.type === 'TOTAL');

    if (!sectionGroups.length) return;

    const standings = {};
    sectionGroups.forEach(section => {
      // group field ex: "GROUP_A"
      const letter = (section.group || '').replace(/^GROUP_/, '').toUpperCase();
      if (!letter || letter.length > 2) return;
      standings[letter] = (section.table || []).map(row => {
        const name = row.team?.name || '?';
        return {
          team:   name,
          flag:   getFlag(name),
          played: row.playedGames || 0,
          won:    row.won         || 0,
          drawn:  row.draw        || 0,
          lost:   row.lost        || 0,
          gf:     row.goalsFor    || 0,
          ga:     row.goalsAgainst|| 0,
          gd:     row.goalDifference || 0,
          points: row.points      || 0,
        };
      });
    });

    if (Object.keys(standings).length) {
      state.standings = standings;
      renderGroups();
    }
  } catch (err) {
    console.warn('[Copa] fdFetchStandings:', err.message);
  }
}

// ── Normaliza jogo football-data.org → formato interno ────────
function normalizeFD(m) {
  const homeName = m.homeTeam?.name || m.homeTeam?.shortName || '?';
  const awayName = m.awayTeam?.name || m.awayTeam?.shortName || '?';

  const startDate = new Date(m.utcDate || Date.now());
  const dateStr   = startDate.toISOString().slice(0, 10);
  const timeStr   = startDate.toLocaleTimeString('pt-BR', {
    timeZone: 'America/Sao_Paulo', hour: '2-digit', minute: '2-digit',
  });

  // Status: SCHEDULED, TIMED, IN_PLAY, PAUSED, FINISHED, SUSPENDED, POSTPONED
  const rawStatus = m.status || 'SCHEDULED';
  let status = 'upcoming';
  if (['IN_PLAY', 'PAUSED', 'LIVE'].includes(rawStatus))   status = 'live';
  else if (['FINISHED', 'AWARDED'].includes(rawStatus))     status = 'finished';

  // Placar — fullTime para encerrados, score para ao vivo
  const sc = m.score || {};
  const hs  = sc.fullTime?.home  ?? sc.halfTime?.home  ?? null;
  const as_ = sc.fullTime?.away  ?? sc.halfTime?.away  ?? null;
  const hasScore = hs !== null && status !== 'upcoming';

  // Minuto ao vivo: football-data não retorna minuto no plano free
  const minute = status === 'live'
    ? (rawStatus === 'PAUSED' ? 'Intervalo' : 'AO VIVO')
    : null;

  // Grupo / fase a partir de stage e group
  const stage    = m.stage || '';
  const groupRaw = m.group || '';                 // ex: "GROUP_A"
  const groupM   = groupRaw.match(/([A-L])$/i);
  const group    = groupM ? groupM[1].toUpperCase() : null;

  return {
    id:        m.id,
    group,
    phase:     detectPhase(stage),
    highlight: /brazil|brasil/i.test(homeName) || /brazil|brasil/i.test(awayName),
    home: { name: homeName, flag: getFlag(homeName), code: m.homeTeam?.tla || homeName.slice(0,3).toUpperCase() },
    away: { name: awayName, flag: getFlag(awayName), code: m.awayTeam?.tla || awayName.slice(0,3).toUpperCase() },
    date:     dateStr,
    time:     timeStr,
    timezone: 'BRT',
    venue:    m.venue || '',
    city:     '',
    status,
    score:    hasScore ? { home: Number(hs), away: Number(as_) } : null,
    minute,
    events:   [],
  };
}

// ── Busca principal (orquestrador) ────────────────────────────
async function fetchLiveData() {
  if (state._fetching) return;
  state._fetching = true;

  try {
    setLoadingState(true);

    await fdFetchMatches();
    await fdFetchStandings();
    updateLiveAndToday();
    state.usingDemo  = false;
    state.lastUpdate = new Date();
    updateLastUpdateTime();
    updateApiKeyStatusDot();
    showToast('✅ Dados conectados (football-data.org)');
  } catch (err) {
    console.warn('[Copa] football-data.org falhou:', err.message);
    if (!state.usingDemo) {
      showToast('⚠️ ' + err.message);
    } else {
      showToast('📡 Modo demonstração — configure sua chave gratuita');
    }
    updateApiKeyStatusDot();
  } finally {
    state._fetching  = false;
    setLoadingState(false);
  }
}

// ── Atualização leve (só jogos ao vivo) ───────────────────────
async function fetchLiveOnly() {
  try {
    // football-data não tem endpoint /matches?status=live no free;
    // buscamos todos e filtramos — a resposta é cacheada no servidor por ~1 min
    await fdFetchMatches();
    updateLiveAndToday();
    state.lastUpdate = new Date();
    updateLastUpdateTime();
  } catch (err) {
    console.warn('[Copa] fetchLiveOnly:', err.message);
  }
}

// ── Detecta fase a partir do campo stage ─────────────────────
function detectPhase(stage) {
  const s = (stage || '').toLowerCase();
  if (s.includes('group'))                              return 'grupos';
  if (s.includes('round_of_32') || s.includes('32'))   return 'oitavas';
  if (s.includes('round_of_16') || s.includes('16'))   return 'oitavas';
  if (s.includes('quarter'))                            return 'quartas';
  if (s.includes('semi'))                               return 'semi';
  if (s.includes('3rd') || s.includes('third'))        return 'terceiro';
  if (s.includes('final'))                              return 'final';
  return 'grupos';
}

// ── Atualiza ao vivo / hoje a partir de state.matches ────────
function updateLiveAndToday() {
  const today = new Date().toISOString().slice(0, 10);
  const live    = state.matches.filter(m => m.status === 'live');
  const today2  = state.matches.filter(m => m.date === today);

  const liveIds = new Set(live.map(m => m.id));
  const newLiveMatches = [...live, ...today2.filter(m => !liveIds.has(m.id))];

  // Detecta gols
  const goalEvents = [];
  newLiveMatches.forEach(m => {
    if (!m.score) return;
    const prev = state.prevScores[m.id];
    if (prev && (m.score.home !== prev.home || m.score.away !== prev.away)) {
      goalEvents.push(m.id);
    }
    state.prevScores[m.id] = { home: m.score.home, away: m.score.away };
  });

  state.liveMatches = newLiveMatches;
  state.isLive      = live.length > 0;

  const indicator = document.getElementById('live-indicator');
  if (indicator) indicator.style.display = state.isLive ? 'flex' : 'none';

  renderLiveTab();

  goalEvents.forEach(id => {
    triggerGoalAnimation(id);
    const m = state.liveMatches.find(x => String(x.id) === String(id));
    if (m) gaEvent('goal_detected', { match: m.home.name + ' x ' + m.away.name });
  });
}

// ── Auto Refresh ──────────────────────────────────────────────
function startAutoRefresh() {
  stopAutoRefresh();
  // Ao vivo: 60s · sem jogos ao vivo: 5 min (respeita 10 req/min free)
  const interval = state.isLive ? 60_000 : 5 * 60_000;
  state.refreshInterval = setInterval(async () => {
    if (state.usingDemo) {
      await fetchLiveData();
    } else if (state.isLive) {
      await fetchLiveOnly();
    } else {
      await fetchLiveData();
    }
    // Reajusta intervalo se o estado ao vivo mudou (sem criar timer extra)
    const newInterval = state.isLive ? 60_000 : 5 * 60_000;
    if (newInterval !== interval) startAutoRefresh();
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
  renderBrasilWidget();
}

// ── Tabs ──────────────────────────────────────────────────────
function showTab(tab) {
  state.activeTab = tab;
  gaEvent('tab_view', { tab_name: tab });
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
  const hasFavs = state.favTeams.size > 0;

  if (state.usingDemo) {
    html += renderCountdownCard();
    if (hasFavs) {
      const favMatches = DEMO_MATCHES.filter(m =>
        state.favTeams.has(m.home.name) || state.favTeams.has(m.away.name)
      );
      if (favMatches.length) html += renderMatchSection('⭐ Meus Times', favMatches);
    }
    html += renderMatchSection('📅 Jogos do Brasil na Copa 2026', DEMO_MATCHES.filter(m => m.highlight));
    html += `<div class="demo-notice">📡 Configure sua chave gratuita em <a href="https://www.football-data.org/client/register" target="_blank" rel="noopener">football-data.org</a> para dados ao vivo.</div>`;
  } else {
    const live     = state.liveMatches.filter(m => m.status === 'live');
    const upcoming = state.liveMatches.filter(m => m.status === 'upcoming');
    const finished = state.liveMatches.filter(m => m.status === 'finished');

    if (hasFavs) {
      const favLive = live.filter(m =>
        state.favTeams.has(m.home.name) || state.favTeams.has(m.away.name)
      );
      const favUp = upcoming.filter(m =>
        state.favTeams.has(m.home.name) || state.favTeams.has(m.away.name)
      );
      if (favLive.length || favUp.length) {
        html += renderMatchSection('⭐ Meus Times', [...favLive, ...favUp]);
      }
    }

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

// ── Match Section / Card ──────────────────────────────────────
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
        <span class="match-tz">BRT</span>
       </div>`;

  const statusBadge = isLive
    ? `<span class="badge badge-live"><span class="pulse-dot"></span>${m.minute || 'AO VIVO'}</span>`
    : isFinished
    ? `<span class="badge badge-done">FT</span>`
    : `<span class="badge badge-upcoming">${m.time} <abbr title="Horário de Brasília">BRT</abbr></span>`;

  const groupLabel = m.group ? `Grupo ${m.group}` : (m.phase || '');

  // Horário local da sede
  const localTimeHtml = (!m.score && m.date && m.time)
    ? (() => {
        try {
          const tz = VENUE_TZ[m.city] || VENUE_TZ[m.venue] || null;
          if (!tz) return '';
          const brtDate = new Date(`${m.date}T${m.time}:00-03:00`);
          const localStr = brtDate.toLocaleTimeString('pt-BR', {
            timeZone: tz, hour: '2-digit', minute: '2-digit',
          });
          return `<div class="match-local-time">🌎 ${localStr} horário local (${TZ_LABEL[tz] || tz})</div>`;
        } catch { return ''; }
      })()
    : '';

  return `<div class="match-card ${isBrasil ? 'match-brazil' : ''} ${isLive ? 'match-live-card' : ''}" data-match-id="${m.id}">
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
    ${localTimeHtml}
    <div class="match-card-footer">
      <button class="share-btn" onclick="shareMatch('${m.id}')" aria-label="Compartilhar jogo">
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/></svg>
        Compartilhar
      </button>
    </div>
  </div>`;
}

// ── Calendário ────────────────────────────────────────────────
function renderCalendar() {
  const container = document.getElementById('calendar-container');
  if (!container) return;

  const phaseFilter = document.getElementById('phase-filter')?.value || 'todos';
  const groupFilter = document.getElementById('group-filter')?.value || 'todos';
  const teamFilter  = document.getElementById('team-filter')?.value  || 'todos';

  let matches = [...state.matches].sort((a, b) =>
    a.date !== b.date ? a.date.localeCompare(b.date) : a.time.localeCompare(b.time)
  );

  if (phaseFilter !== 'todos') matches = matches.filter(m => m.phase === phaseFilter);
  if (groupFilter !== 'todos') matches = matches.filter(m => m.group === groupFilter);
  if (teamFilter  !== 'todos') matches = matches.filter(m =>
    m.home.name === teamFilter || m.away.name === teamFilter
  );

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
    const now      = new Date();
    const diff     = COPA_START - now;
    const daysLeft = diff > 0 ? Math.ceil(diff / 86400000) : 0;
    const msg = diff > 0
      ? `A Copa começa em <strong>${daysLeft} dia${daysLeft !== 1 ? 's' : ''}</strong>!`
      : 'Os primeiros resultados aparecem aqui após cada jogo.';
    container.innerHTML = `<div class="empty-state empty-results">
      <div class="empty-icon">⚽</div>
      <p>${msg}</p>
      <p class="empty-sub">Abertura: 11 jun · Azteca · Cidade do México</p>
      <p class="empty-sub">Brasil estreia: <strong>13 jun × Marrocos</strong> · MetLife Stadium</p>
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
    const teams     = state.standings[g] || [];
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

// ── Helpers gerais ────────────────────────────────────────────
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

// ══════════════════════════════════════════════════════════════
// WIDGET BRASIL
// ══════════════════════════════════════════════════════════════
function renderBrasilWidget() {
  const widget = document.getElementById('brasil-widget');
  const inner  = document.getElementById('widget-inner');
  if (!widget || !inner) return;

  const allMatches = [...state.matches, ...state.liveMatches];

  let match = allMatches.find(m => m.highlight && m.status === 'live');
  if (!match) {
    match = allMatches
      .filter(m => m.highlight && m.status === 'upcoming')
      .sort((a, b) => a.date.localeCompare(b.date) || a.time.localeCompare(b.time))[0];
  }

  if (!match) {
    widget.style.display = 'none';
    document.body.classList.add('no-widget');
    return;
  }

  widget.style.display = 'flex';
  document.body.classList.remove('no-widget');

  const isLive = match.status === 'live';
  const isBr   = name => /brasil|brazil/i.test(name);

  const homeClass = isBr(match.home.name) ? 'style="color:var(--green)"' : '';
  const awayClass = isBr(match.away.name) ? 'style="color:var(--green)"' : '';

  let centerHtml;
  if (match.score) {
    centerHtml = `
      <div class="widget-score-box ${isLive ? 'is-live' : ''}">
        <span class="widget-score-num">${match.score.home}</span>
        <span class="widget-score-sep">–</span>
        <span class="widget-score-num">${match.score.away}</span>
      </div>
      ${isLive ? `<div class="widget-minute"><span class="pulse-dot" style="display:inline-block;margin-right:4px"></span>${match.minute || 'AO VIVO'}</div>` : ''}`;
  } else {
    const d = new Date(match.date + 'T12:00:00');
    const today    = new Date().toISOString().slice(0, 10);
    const tomorrow = new Date(Date.now() + 86400000).toISOString().slice(0, 10);
    const dateLabel = match.date === today    ? 'Hoje'
                    : match.date === tomorrow ? 'Amanhã'
                    : d.toLocaleDateString('pt-BR', { day: 'numeric', month: 'short' });
    centerHtml = `
      <div class="widget-time-box">
        <span class="widget-time">${match.time}</span>
        <span class="widget-date">${dateLabel} · BRT</span>
      </div>`;
  }

  inner.innerHTML = `
    <div class="widget-team">
      <span class="widget-flag">${match.home.flag}</span>
      <span class="widget-name" ${homeClass}>${match.home.name}</span>
    </div>
    ${centerHtml}
    <div class="widget-team away">
      <span class="widget-name" ${awayClass}>${match.away.name}</span>
      <span class="widget-flag">${match.away.flag}</span>
    </div>`;
}

// ══════════════════════════════════════════════════════════════
// BUSCA GLOBAL
// ══════════════════════════════════════════════════════════════
function openSearch() {
  const overlay = document.getElementById('search-overlay');
  const input   = document.getElementById('search-input');
  if (!overlay || !input) return;
  overlay.classList.add('open');
  input.focus();
}

function closeSearch() {
  document.getElementById('search-overlay')?.classList.remove('open');
  clearSearch();
}

function clearSearch() {
  const input = document.getElementById('search-input');
  if (input) input.value = '';
  document.getElementById('search-clear')?.classList.remove('visible');
  document.getElementById('search-results').innerHTML = `
    <div class="search-hint">
      <div class="hint-icon">🔍</div>
      <p>Digite o nome de um time,<br>cidade ou data</p>
    </div>`;
}

function initSearchKeyboard() {
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape') closeSearch();
    if ((e.ctrlKey || e.metaKey) && e.key === 'k') { e.preventDefault(); openSearch(); }
  });
}

function handleSearch(query) {
  const clearBtn = document.getElementById('search-clear');
  if (clearBtn) clearBtn.classList.toggle('visible', query.length > 0);

  const results = document.getElementById('search-results');
  if (!results) return;

  const q = query.trim().toLowerCase();
  if (q.length === 2) gaEvent('search', { search_term: q });
  if (q.length < 2) {
    results.innerHTML = `
      <div class="search-hint">
        <div class="hint-icon">🔍</div>
        <p>Digite o nome de um time,<br>cidade ou data</p>
      </div>`;
    return;
  }

  const allMatches = [...state.matches].filter(m =>
    m.home.name.toLowerCase().includes(q) ||
    m.away.name.toLowerCase().includes(q) ||
    (m.city  || '').toLowerCase().includes(q) ||
    (m.venue || '').toLowerCase().includes(q) ||
    m.date.includes(q) ||
    formatDateLabel(m.date).toLowerCase().includes(q)
  ).sort((a, b) => a.date.localeCompare(b.date) || a.time.localeCompare(b.time));

  if (!allMatches.length) {
    results.innerHTML = `<div class="search-no-results">😕 Nenhum jogo encontrado para "<strong>${query}</strong>"</div>`;
    return;
  }

  const byDate = {};
  allMatches.forEach(m => { (byDate[m.date] = byDate[m.date] || []).push(m); });
  results.innerHTML = Object.keys(byDate).sort().map(date =>
    `<div class="date-group">
      <div class="date-label">${formatDateLabel(date)}</div>
      ${byDate[date].map(renderMatchCard).join('')}
    </div>`
  ).join('');
}

// ══════════════════════════════════════════════════════════════
// NOTIFICAÇÕES PUSH
// ══════════════════════════════════════════════════════════════
const NOTIF_KEY       = 'copa26_notif';
const NOTIF_DISMISSED = 'copa26_notif_dismissed';

function initNotifBanner() {
  if (!('Notification' in window)) return;
  if (Notification.permission !== 'default') return;
  if (sessionStorage.getItem(NOTIF_DISMISSED)) return;
  setTimeout(() => {
    document.getElementById('notif-banner')?.classList.add('visible');
  }, 4000);
}

async function requestNotifPermission() {
  document.getElementById('notif-banner')?.classList.remove('visible');
  try {
    const permission = await Notification.requestPermission();
    if (permission === 'granted') {
      localStorage.setItem(NOTIF_KEY, '1');
      showToast('🔔 Notificações ativadas! Você será avisado sobre jogos do Brasil.');
      scheduleMatchNotifications();
    } else {
      showToast('Notificações não permitidas pelo navegador.');
    }
  } catch (err) {
    console.warn('[Notif]', err);
  }
}

function dismissNotifBanner() {
  document.getElementById('notif-banner')?.classList.remove('visible');
  sessionStorage.setItem(NOTIF_DISMISSED, '1');
}

function scheduleMatchNotifications() {
  if (Notification.permission !== 'granted') return;
  const brasilMatches = state.matches.filter(m => m.highlight && m.status === 'upcoming');
  brasilMatches.forEach(m => {
    const matchTime = new Date(`${m.date}T${m.time}:00-03:00`).getTime();
    const notify15  = matchTime - 15 * 60 * 1000;
    const now       = Date.now();
    if (notify15 > now) {
      setTimeout(() => {
        new Notification('⚽ Brasil joga em 15 minutos!', {
          body: `${m.home.flag} ${m.home.name} × ${m.away.name} ${m.away.flag} · ${m.time} BRT`,
          icon: 'icons/icon-192.png',
          tag:  `match-${m.id}`,
        });
      }, notify15 - now);
    }
  });
}

// ══════════════════════════════════════════════════════════════
// COMPARTILHAMENTO
// ══════════════════════════════════════════════════════════════
function shareMatch(matchId) {
  const m = [...state.matches, ...state.liveMatches].find(x => String(x.id) === String(matchId));
  if (!m) return;
  const scoreStr = m.score ? `${m.score.home}–${m.score.away}` : m.time + ' BRT';
  const text = `${m.home.flag} ${m.home.name} ${scoreStr} ${m.away.name} ${m.away.flag}\n📅 ${formatDateLabel(m.date)} · ${m.city || m.venue}\n\n🏆 Copa do Mundo 2026`;
  const url  = window.location.href.split('?')[0];
  gaEvent('share_match', { match_id: String(matchId) });
  if (navigator.share) {
    navigator.share({ title: 'Copa do Mundo 2026', text, url }).catch(() => {});
  } else {
    navigator.clipboard?.writeText(text + '\n' + url).then(() => {
      showToast('📋 Copiado para a área de transferência!');
    }).catch(() => showToast('Compartilhamento não suportado neste navegador.'));
  }
}

// ══════════════════════════════════════════════════════════════
// FAVORITAR SELEÇÕES
// ══════════════════════════════════════════════════════════════
function loadFavs() {
  try { return new Set(JSON.parse(localStorage.getItem(FAVS_KEY) || '[]')); }
  catch { return new Set(); }
}

function saveFavs() {
  localStorage.setItem(FAVS_KEY, JSON.stringify([...state.favTeams]));
}

function toggleFav(teamName) {
  if (state.favTeams.has(teamName)) state.favTeams.delete(teamName);
  else state.favTeams.add(teamName);
  saveFavs();
  renderFavsModal();
  renderLiveTab();
  renderBrasilWidget();
}

function openFavsModal()  { document.getElementById('favs-modal')?.classList.add('open'); }
function closeFavsModal() { document.getElementById('favs-modal')?.classList.remove('open'); }

function renderFavsModal() {
  const grid = document.getElementById('favs-grid');
  if (!grid) return;

  const allTeams = [];
  Object.keys(GROUPS).sort().forEach(g => {
    GROUPS[g].teams.forEach((team, i) => {
      allTeams.push({ name: team, flag: GROUPS[g].flags[i], group: g });
    });
  });

  grid.innerHTML = allTeams.map(t => {
    const isFav = state.favTeams.has(t.name);
    return `<button class="fav-team-btn ${isFav ? 'is-fav' : ''}" onclick="toggleFav('${t.name.replace(/'/g, "\\'")}')">
      <span class="fav-flag">${t.flag}</span>
      <span class="fav-name">${t.name}</span>
      ${isFav ? '<span class="fav-check">★</span>' : ''}
    </button>`;
  }).join('');

  const count = state.favTeams.size;
  const badge = document.getElementById('favs-count');
  if (badge) {
    badge.textContent = count > 0 ? count : '';
    badge.style.display = count > 0 ? 'flex' : 'none';
  }
}

function initFavsModal() { renderFavsModal(); }

// ══════════════════════════════════════════════════════════════
// CONFIGURAÇÃO DA CHAVE — football-data.org
// ══════════════════════════════════════════════════════════════
function initApiKeyModal() {
  updateApiKeyStatusDot();
}

function updateApiKeyStatusDot() {
  const dot = document.getElementById('apikey-status-dot');
  if (!dot) return;
  dot.classList.toggle('connected',  !!getApiKey() && !state.usingDemo);
  dot.classList.toggle('configured', !!getApiKey() &&  state.usingDemo);
}

function openApiKeyModal() {
  const input = document.getElementById('apikey-input');
  if (input) input.value = getApiKey();
  const feedback = document.getElementById('apikey-feedback');
  if (feedback) feedback.innerHTML = '';
  document.getElementById('apikey-modal')?.classList.add('open');
}

function closeApiKeyModal() {
  document.getElementById('apikey-modal')?.classList.remove('open');
}

async function saveApiKeyAction() {
  const input    = document.getElementById('apikey-input');
  const feedback = document.getElementById('apikey-feedback');
  const key      = (input?.value || '').trim();

  if (!key) {
    if (feedback) feedback.textContent = '⚠️ Cole uma chave válida.';
    return;
  }

  setApiKey(key);
  if (feedback) feedback.textContent = '🔄 Verificando chave football-data.org…';

  try {
    // Testa a chave buscando informações da competição
    const data = await fdFetch(`/competitions/${FD.comp}`);
    const name = data.name || 'Copa do Mundo';
    if (feedback) feedback.textContent = `✅ Conectado! ${name}`;
    state.usingDemo = true; // força re-fetch completo
    await fetchLiveData();
    startAutoRefresh();
    setTimeout(closeApiKeyModal, 1200);
  } catch (err) {
    if (feedback) feedback.innerHTML =
      `⚠️ ${err.message}<br><small>Cadastre-se gratuitamente em <a href="https://www.football-data.org/client/register" target="_blank" rel="noopener">football-data.org</a> para obter seu token.</small>`;
  }
  updateApiKeyStatusDot();
}

function removeApiKeyAction() {
  setApiKey('');
  const input    = document.getElementById('apikey-input');
  if (input) input.value = '';
  const feedback = document.getElementById('apikey-feedback');
  if (feedback) feedback.textContent = 'Chave removida. Voltando para modo demonstração.';
  state.usingDemo = true;
  stopAutoRefresh();
  loadDemoData();
  updateApiKeyStatusDot();
}

// ══════════════════════════════════════════════════════════════
// ANIMAÇÃO DE GOL
// ══════════════════════════════════════════════════════════════
function triggerGoalAnimation(matchId) {
  const card = document.querySelector(`[data-match-id="${matchId}"]`);
  if (!card || card.classList.contains('goal-flash')) return;

  const overlay = document.createElement('div');
  overlay.className = 'goal-overlay';
  overlay.innerHTML = `<span class="goal-emoji">⚽</span><span class="goal-text">GOL!</span>`;
  card.appendChild(overlay);
  card.classList.add('goal-flash');

  setTimeout(() => {
    card.classList.remove('goal-flash');
    overlay.remove();
  }, 2800);

  showToast('⚽ GOL!');
}

// ══════════════════════════════════════════════════════════════
// GOOGLE ANALYTICS
// ══════════════════════════════════════════════════════════════
function gaEvent(name, params = {}) {
  if (typeof gtag === 'function') gtag('event', name, params);
}
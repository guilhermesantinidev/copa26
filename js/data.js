// ============================================================
// COPA DO MUNDO 2026 — Dados Base
// Grupos reais do sorteio realizado em dezembro 2025
// Brasil: Grupo G · Sede: EUA, Canadá, México
// ============================================================

// Grupos reais da Copa 2026
const GROUPS = {
  A: { teams: ['México',       'África do Sul', 'Coreia do Sul', 'Dinamarca'],   flags: ['🇲🇽','🇿🇦','🇰🇷','🇩🇰'] },
  B: { teams: ['Canadá',       'Catar',         'Suíça',         'Itália'],       flags: ['🇨🇦','🇶🇦','🇨🇭','🇮🇹'] },
  C: { teams: ['EUA',          'Paraguai',      'Austrália',     'Turquia'],      flags: ['🇺🇸','🇵🇾','🇦🇺','🇹🇷'] },
  D: { teams: ['Alemanha',     'Curaçao',       'Costa do Marfim','Equador'],    flags: ['🇩🇪','🇨🇼','🇨🇮','🇪🇨'] },
  E: { teams: ['Holanda',      'Japão',         'Tunísia',       'Ucrânia'],     flags: ['🇳🇱','🇯🇵','🇹🇳','🇺🇦'] },
  F: { teams: ['Bélgica',      'Egito',         'Irã',           'Nova Zelândia'],flags: ['🇧🇪','🇪🇬','🇮🇷','🇳🇿'] },
  G: { teams: ['Brasil',       'Marrocos',      'Haiti',         'Escócia'],     flags: ['🇧🇷','🇲🇦','🇭🇹','🏴󠁧󠁢󠁳󠁣󠁴󠁿'] },
  H: { teams: ['Espanha',      'Cabo Verde',    'Arábia Saudita','Uruguai'],     flags: ['🇪🇸','🇨🇻','🇸🇦','🇺🇾'] },
  I: { teams: ['França',       'Senegal',       'Noruega',       'Iraque'],      flags: ['🇫🇷','🇸🇳','🇳🇴','🇮🇶'] },
  J: { teams: ['Argentina',    'Argélia',       'Áustria',       'Jordânia'],    flags: ['🇦🇷','🇩🇿','🇦🇹','🇯🇴'] },
  K: { teams: ['Portugal',     'Uzbequistão',   'Colômbia',      'Rep. D. Congo'],flags: ['🇵🇹','🇺🇿','🇨🇴','🇨🇩'] },
  L: { teams: ['Inglaterra',   'Croácia',       'Gana',          'Panamá'],      flags: ['🏴󠁧󠁢󠁥󠁮󠁧󠁿','🇭🇷','🇬🇭','🇵🇦'] },
};

// Datas oficiais
const COPA_START = new Date('2026-06-11T15:00:00-05:00'); // Abertura — Azteca, México City
const COPA_FINAL = new Date('2026-07-19T17:00:00-04:00'); // Final — MetLife, NJ

// Jogos do Brasil (demo / fallback)
const DEMO_MATCHES = [
  {
    id: 101, group: 'G', phase: 'grupos', highlight: true,
    home: { name: 'Brasil',   flag: '🇧🇷', code: 'BRA' },
    away: { name: 'Marrocos', flag: '🇲🇦', code: 'MAR' },
    date: '2026-06-13', time: '16:00', timezone: 'BRT',
    venue: 'MetLife Stadium', city: 'Nova York / NJ',
    status: 'upcoming', score: null, minute: null, events: []
  },
  {
    id: 102, group: 'G', phase: 'grupos', highlight: true,
    home: { name: 'Brasil', flag: '🇧🇷', code: 'BRA' },
    away: { name: 'Haiti',  flag: '🇭🇹', code: 'HAI' },
    date: '2026-06-19', time: '16:00', timezone: 'BRT',
    venue: 'AT&T Stadium', city: 'Dallas',
    status: 'upcoming', score: null, minute: null, events: []
  },
  {
    id: 103, group: 'G', phase: 'grupos', highlight: true,
    home: { name: 'Brasil',  flag: '🇧🇷', code: 'BRA' },
    away: { name: 'Escócia', flag: '🏴󠁧󠁢󠁳󠁣󠁴󠁿', code: 'SCO' },
    date: '2026-06-24', time: '16:00', timezone: 'BRT',
    venue: 'MetLife Stadium', city: 'Nova York / NJ',
    status: 'upcoming', score: null, minute: null, events: []
  },
  // Outros jogos de abertura
  {
    id: 1, group: 'A', phase: 'grupos',
    home: { name: 'México',         flag: '🇲🇽', code: 'MEX' },
    away: { name: 'África do Sul',  flag: '🇿🇦', code: 'RSA' },
    date: '2026-06-11', time: '16:00', timezone: 'BRT',
    venue: 'Estadio Azteca', city: 'Cidade do México',
    status: 'upcoming', score: null, minute: null, events: []
  },
  {
    id: 2, group: 'B', phase: 'grupos',
    home: { name: 'Canadá', flag: '🇨🇦', code: 'CAN' },
    away: { name: 'Catar',  flag: '🇶🇦', code: 'QAT' },
    date: '2026-06-12', time: '20:00', timezone: 'BRT',
    venue: 'BMO Field', city: 'Toronto',
    status: 'upcoming', score: null, minute: null, events: []
  },
  {
    id: 3, group: 'C', phase: 'grupos',
    home: { name: 'EUA',      flag: '🇺🇸', code: 'USA' },
    away: { name: 'Paraguai', flag: '🇵🇾', code: 'PAR' },
    date: '2026-06-12', time: '22:00', timezone: 'BRT',
    venue: 'SoFi Stadium', city: 'Los Angeles',
    status: 'upcoming', score: null, minute: null, events: []
  },
  {
    id: 4, group: 'J', phase: 'grupos',
    home: { name: 'Argentina', flag: '🇦🇷', code: 'ARG' },
    away: { name: 'Argélia',   flag: '🇩🇿', code: 'ALG' },
    date: '2026-06-14', time: '22:00', timezone: 'BRT',
    venue: 'Hard Rock Stadium', city: 'Miami',
    status: 'upcoming', score: null, minute: null, events: []
  },
  {
    id: 5, group: 'I', phase: 'grupos',
    home: { name: 'França',  flag: '🇫🇷', code: 'FRA' },
    away: { name: 'Senegal', flag: '🇸🇳', code: 'SEN' },
    date: '2026-06-15', time: '19:00', timezone: 'BRT',
    venue: 'AT&T Stadium', city: 'Dallas',
    status: 'upcoming', score: null, minute: null, events: []
  },
  {
    id: 6, group: 'H', phase: 'grupos',
    home: { name: 'Espanha', flag: '🇪🇸', code: 'ESP' },
    away: { name: 'Uruguai', flag: '🇺🇾', code: 'URU' },
    date: '2026-06-15', time: '22:00', timezone: 'BRT',
    venue: 'Rose Bowl', city: 'Pasadena',
    status: 'upcoming', score: null, minute: null, events: []
  },
  {
    id: 7, group: 'K', phase: 'grupos',
    home: { name: 'Portugal',  flag: '🇵🇹', code: 'POR' },
    away: { name: 'Colômbia',  flag: '🇨🇴', code: 'COL' },
    date: '2026-06-16', time: '19:00', timezone: 'BRT',
    venue: 'Lumen Field', city: 'Seattle',
    status: 'upcoming', score: null, minute: null, events: []
  },
  {
    id: 8, group: 'L', phase: 'grupos',
    home: { name: 'Inglaterra', flag: '🏴󠁧󠁢󠁥󠁮󠁧󠁿', code: 'ENG' },
    away: { name: 'Gana',       flag: '🇬🇭', code: 'GHA' },
    date: '2026-06-17', time: '22:00', timezone: 'BRT',
    venue: 'Gillette Stadium', city: 'Boston',
    status: 'upcoming', score: null, minute: null, events: []
  },
];

// Mapa nome → bandeira (PT e EN)
const FLAG_MAP = {
  // Americas
  'Brazil': '🇧🇷',   'Brasil': '🇧🇷',
  'Argentina': '🇦🇷',
  'France': '🇫🇷',   'França': '🇫🇷',
  'Germany': '🇩🇪',  'Alemanha': '🇩🇪',
  'Spain': '🇪🇸',    'Espanha': '🇪🇸',
  'Portugal': '🇵🇹',
  'England': '🏴󠁧󠁢󠁥󠁮󠁧󠁿', 'Inglaterra': '🏴󠁧󠁢󠁥󠁮󠁧󠁿',
  'Netherlands': '🇳🇱', 'Holanda': '🇳🇱',
  'Belgium': '🇧🇪',  'Bélgica': '🇧🇪',
  'Croatia': '🇭🇷',  'Croácia': '🇭🇷',
  'Morocco': '🇲🇦',  'Marrocos': '🇲🇦',
  'Senegal': '🇸🇳',
  'Japan': '🇯🇵',    'Japão': '🇯🇵',
  'South Korea': '🇰🇷', 'Korea Republic': '🇰🇷', 'Coreia do Sul': '🇰🇷',
  'Mexico': '🇲🇽',   'México': '🇲🇽',
  'United States': '🇺🇸', 'EUA': '🇺🇸', 'USA': '🇺🇸',
  'Canada': '🇨🇦',   'Canadá': '🇨🇦',
  'Ecuador': '🇪🇨',  'Equador': '🇪🇨',
  'Uruguay': '🇺🇾',  'Uruguai': '🇺🇾',
  'Poland': '🇵🇱',   'Polônia': '🇵🇱',
  'Serbia': '🇷🇸',   'Sérvia': '🇷🇸',
  'Switzerland': '🇨🇭', 'Suíça': '🇨🇭',
  'Denmark': '🇩🇰',  'Dinamarca': '🇩🇰',
  'Australia': '🇦🇺', 'Austrália': '🇦🇺',
  'Ghana': '🇬🇭',    'Gana': '🇬🇭',
  'Tunisia': '🇹🇳',  'Tunísia': '🇹🇳',
  'Saudi Arabia': '🇸🇦', 'Arábia Saudita': '🇸🇦',
  'Iran': '🇮🇷',     'Irã': '🇮🇷',
  'Scotland': '🏴󠁧󠁢󠁳󠁣󠁴󠁿', 'Escócia': '🏴󠁧󠁢󠁳󠁣󠁴󠁿',
  'Qatar': '🇶🇦',    'Catar': '🇶🇦',
  'Italy': '🇮🇹',    'Itália': '🇮🇹',
  'Colombia': '🇨🇴', 'Colômbia': '🇨🇴',
  'Paraguay': '🇵🇾', 'Paraguai': '🇵🇾',
  'Turkey': '🇹🇷',   'Turquia': '🇹🇷',
  'Ukraine': '🇺🇦',  'Ucrânia': '🇺🇦',
  'Norway': '🇳🇴',   'Noruega': '🇳🇴',
  'Austria': '🇦🇹',  'Áustria': '🇦🇹',
  'Algeria': '🇩🇿',  'Argélia': '🇩🇿',
  'Egypt': '🇪🇬',    'Egito': '🇪🇬',
  'New Zealand': '🇳🇿', 'Nova Zelândia': '🇳🇿',
  'Haiti': '🇭🇹',
  'South Africa': '🇿🇦', 'África do Sul': '🇿🇦',
  'Ivory Coast': '🇨🇮', "Côte d'Ivoire": '🇨🇮', 'Costa do Marfim': '🇨🇮',
  'Curacao': '🇨🇼',  'Curaçao': '🇨🇼',
  'Jordan': '🇯🇴',   'Jordânia': '🇯🇴',
  'Iraq': '🇮🇶',     'Iraque': '🇮🇶',
  'Cape Verde': '🇨🇻', 'Cabo Verde': '🇨🇻',
  'Uzbekistan': '🇺🇿', 'Uzbequistão': '🇺🇿',
  'DR Congo': '🇨🇩', 'Rep. D. Congo': '🇨🇩',
  'Panama': '🇵🇦',   'Panamá': '🇵🇦',
  'Ghana': '🇬🇭',
};

function getFlag(name) {
  return FLAG_MAP[name] || '🏳️';
}

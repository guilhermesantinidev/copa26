// ============================================================
// COPA DO MUNDO 2026 — Dados Base
// data.js: grupos, seleções, jogos da fase de grupos
// Os dados ao vivo vêm da API; estes são o fallback/estrutura
// ============================================================

const GROUPS = {
  A: { teams: ['Qatar', 'Ecuador', 'Senegal', 'Netherlands'], flags: ['🇶🇦','🇪🇨','🇸🇳','🇳🇱'] },
  B: { teams: ['England', 'Iran', 'United States', 'Wales'], flags: ['🏴󠁧󠁢󠁥󠁮󠁧󠁿','🇮🇷','🇺🇸','🏴󠁧󠁢󠁷󠁬󠁳󠁿'] },
  C: { teams: ['Argentina', 'Saudi Arabia', 'Mexico', 'Poland'], flags: ['🇦🇷','🇸🇦','🇲🇽','🇵🇱'] },
  D: { teams: ['France', 'Australia', 'Denmark', 'Tunisia'], flags: ['🇫🇷','🇦🇺','🇩🇰','🇹🇳'] },
  E: { teams: ['Spain', 'Costa Rica', 'Germany', 'Japan'], flags: ['🇪🇸','🇨🇷','🇩🇪','🇯🇵'] },
  F: { teams: ['Belgium', 'Canada', 'Morocco', 'Croatia'], flags: ['🇧🇪','🇨🇦','🇲🇦','🇭🇷'] },
  G: { teams: ['Brazil', 'Serbia', 'Switzerland', 'Cameroon'], flags: ['🇧🇷','🇷🇸','🇨🇭','🇨🇲'] },
  H: { teams: ['Portugal', 'Ghana', 'Uruguay', 'South Korea'], flags: ['🇵🇹','🇬🇭','🇺🇾','🇰🇷'] },
  I: { teams: ['Netherlands', 'Senegal', 'Ecuador', 'Qatar'], flags: ['🇳🇱','🇸🇳','🇪🇨','🇶🇦'] },
  J: { teams: ['England', 'Wales', 'Iran', 'United States'], flags: ['🏴󠁧󠁢󠁥󠁮󠁧󠁿','🏴󠁧󠁢󠁷󠁬󠁳󠁿','🇮🇷','🇺🇸'] },
  K: { teams: ['France', 'Denmark', 'Tunisia', 'Australia'], flags: ['🇫🇷','🇩🇰','🇹🇳','🇦🇺'] },
  L: { teams: ['Poland', 'Saudi Arabia', 'Argentina', 'Mexico'], flags: ['🇵🇱','🇸🇦','🇦🇷','🇲🇽'] },
};

// Copa do Mundo 2026 começa em 11 de junho de 2026
const COPA_START = new Date('2026-06-11T15:00:00-05:00'); // horário de abertura (LA)
const COPA_FINAL = new Date('2026-07-19T17:00:00-04:00'); // final em NY/NJ

// Jogos de demonstração (fallback sem API)
const DEMO_MATCHES = [
  {
    id: 1, group: 'G', phase: 'grupos', highlight: true,
    home: { name: 'Brasil', flag: '🇧🇷', code: 'BRA' },
    away: { name: 'Croácia', flag: '🇭🇷', code: 'CRO' },
    date: '2026-06-13', time: '15:00', timezone: 'BRT',
    venue: 'SoFi Stadium', city: 'Los Angeles',
    status: 'upcoming', score: null, minute: null,
    events: []
  },
  {
    id: 2, group: 'G', phase: 'grupos', highlight: true,
    home: { name: 'Brasil', flag: '🇧🇷', code: 'BRA' },
    away: { name: 'Costa Rica', flag: '🇨🇷', code: 'CRC' },
    date: '2026-06-19', time: '12:00', timezone: 'BRT',
    venue: 'AT&T Stadium', city: 'Dallas',
    status: 'upcoming', score: null, minute: null,
    events: []
  },
  {
    id: 3, group: 'G', phase: 'grupos', highlight: true,
    home: { name: 'Brasil', flag: '🇧🇷', code: 'BRA' },
    away: { name: 'Alemanha', flag: '🇩🇪', code: 'GER' },
    date: '2026-06-23', time: '16:00', timezone: 'BRT',
    venue: 'MetLife Stadium', city: 'Nova York',
    status: 'upcoming', score: null, minute: null,
    events: []
  },
  {
    id: 4, group: 'A', phase: 'grupos',
    home: { name: 'EUA', flag: '🇺🇸', code: 'USA' },
    away: { name: 'Sérvia', flag: '🇷🇸', code: 'SRB' },
    date: '2026-06-12', time: '21:00', timezone: 'BRT',
    venue: 'MetLife Stadium', city: 'Nova York',
    status: 'upcoming', score: null, minute: null,
    events: []
  },
  {
    id: 5, group: 'B', phase: 'grupos',
    home: { name: 'Argentina', flag: '🇦🇷', code: 'ARG' },
    away: { name: 'Marrocos', flag: '🇲🇦', code: 'MAR' },
    date: '2026-06-13', time: '21:00', timezone: 'BRT',
    venue: 'Allegiant Stadium', city: 'Las Vegas',
    status: 'upcoming', score: null, minute: null,
    events: []
  },
  {
    id: 6, group: 'C', phase: 'grupos',
    home: { name: 'França', flag: '🇫🇷', code: 'FRA' },
    away: { name: 'Espanha', flag: '🇪🇸', code: 'ESP' },
    date: '2026-06-14', time: '18:00', timezone: 'BRT',
    venue: 'AT&T Stadium', city: 'Dallas',
    status: 'upcoming', score: null, minute: null,
    events: []
  },
  {
    id: 7, group: 'D', phase: 'grupos',
    home: { name: 'Inglaterra', flag: '🏴󠁧󠁢󠁥󠁮󠁧󠁿', code: 'ENG' },
    away: { name: 'Portugal', flag: '🇵🇹', code: 'POR' },
    date: '2026-06-15', time: '21:00', timezone: 'BRT',
    venue: 'Rose Bowl', city: 'Los Angeles',
    status: 'upcoming', score: null, minute: null,
    events: []
  },
  {
    id: 8, group: 'E', phase: 'grupos',
    home: { name: 'Alemanha', flag: '🇩🇪', code: 'GER' },
    away: { name: 'Japão', flag: '🇯🇵', code: 'JPN' },
    date: '2026-06-16', time: '15:00', timezone: 'BRT',
    venue: 'Levi\'s Stadium', city: 'San Francisco',
    status: 'upcoming', score: null, minute: null,
    events: []
  },
];

// Mapeamento de nomes PT/EN para bandeiras
const FLAG_MAP = {
  'Brazil': '🇧🇷', 'Brasil': '🇧🇷',
  'Argentina': '🇦🇷',
  'France': '🇫🇷', 'França': '🇫🇷',
  'Germany': '🇩🇪', 'Alemanha': '🇩🇪',
  'Spain': '🇪🇸', 'Espanha': '🇪🇸',
  'Portugal': '🇵🇹',
  'England': '🏴󠁧󠁢󠁥󠁮󠁧󠁿', 'Inglaterra': '🏴󠁧󠁢󠁥󠁮󠁧󠁿',
  'Netherlands': '🇳🇱', 'Holanda': '🇳🇱',
  'Belgium': '🇧🇪', 'Bélgica': '🇧🇪',
  'Croatia': '🇭🇷', 'Croácia': '🇭🇷',
  'Morocco': '🇲🇦', 'Marrocos': '🇲🇦',
  'Senegal': '🇸🇳',
  'Japan': '🇯🇵', 'Japão': '🇯🇵',
  'South Korea': '🇰🇷', 'Coreia do Sul': '🇰🇷',
  'Mexico': '🇲🇽', 'México': '🇲🇽',
  'United States': '🇺🇸', 'EUA': '🇺🇸', 'USA': '🇺🇸',
  'Canada': '🇨🇦', 'Canadá': '🇨🇦',
  'Ecuador': '🇪🇨', 'Equador': '🇪🇨',
  'Uruguay': '🇺🇾', 'Uruguai': '🇺🇾',
  'Poland': '🇵🇱', 'Polônia': '🇵🇱',
  'Serbia': '🇷🇸', 'Sérvia': '🇷🇸',
  'Switzerland': '🇨🇭', 'Suíça': '🇨🇭',
  'Denmark': '🇩🇰', 'Dinamarca': '🇩🇰',
  'Australia': '🇦🇺', 'Austrália': '🇦🇺',
  'Ghana': '🇬🇭',
  'Cameroon': '🇨🇲', 'Camarões': '🇨🇲',
  'Tunisia': '🇹🇳', 'Tunísia': '🇹🇳',
  'Saudi Arabia': '🇸🇦', 'Arábia Saudita': '🇸🇦',
  'Iran': '🇮🇷',
  'Wales': '🏴󠁧󠁢󠁷󠁬󠁳󠁿',
  'Costa Rica': '🇨🇷',
  'Qatar': '🇶🇦',
  'Ivory Coast': '🇨🇮', 'Costa do Marfim': '🇨🇮',
  'Nigeria': '🇳🇬',
  'Colombia': '🇨🇴', 'Colômbia': '🇨🇴',
  'Chile': '🇨🇱',
  'Peru': '🇵🇪',
  'Venezuela': '🇻🇪',
  'Paraguay': '🇵🇾',
  'Bolivia': '🇧🇴', 'Bolívia': '🇧🇴',
  'Egypt': '🇪🇬', 'Egito': '🇪🇬',
  'Algeria': '🇩🇿', 'Argélia': '🇩🇿',
  'Turkey': '🇹🇷', 'Turquia': '🇹🇷',
  'Ukraine': '🇺🇦', 'Ucrânia': '🇺🇦',
  'Slovakia': '🇸🇰', 'Eslováquia': '🇸🇰',
  'Albania': '🇦🇱', 'Albânia': '🇦🇱',
  'Slovenia': '🇸🇮', 'Eslovênia': '🇸🇮',
  'Romania': '🇷🇴', 'Romênia': '🇷🇴',
  'Honduras': '🇭🇳',
  'Panama': '🇵🇦', 'Panamá': '🇵🇦',
  'New Zealand': '🇳🇿', 'Nova Zelândia': '🇳🇿',
};

function getFlag(name) {
  return FLAG_MAP[name] || '🏳️';
}

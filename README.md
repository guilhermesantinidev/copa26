# ⚽ Copa do Mundo 2026 — PWA

App web progressivo (PWA) para acompanhar a Copa do Mundo FIFA 2026 com calendário, resultados e placares ao vivo.

## 🚀 Como publicar no GitHub Pages

### 1. Crie o repositório

```bash
git init
git add .
git commit -m "feat: Copa do Mundo 2026 PWA"
git branch -M main
git remote add origin https://github.com/SEU-USUARIO/copa2026.git
git push -u origin main
```

### 2. Ative o GitHub Pages

- Vá em **Settings → Pages**
- Em **Source**, selecione `main` / `/ (root)`
- Clique em **Save**
- Aguarde ~1 min; seu app estará em `https://SEU-USUARIO.github.io/copa2026/`

### 3. (Opcional) Adicione os ícones PWA

Coloque dois arquivos PNG na pasta `icons/`:
- `icons/icon-192.png` — 192×192 px
- `icons/icon-512.png` — 512×512 px

Você pode gerar ícones em: https://maskable.app/editor

---

## 📡 Dados ao vivo

O app funciona em modo demonstração sem nenhuma configuração. Para ativar dados em tempo real:

1. Crie uma conta gratuita em [RapidAPI](https://rapidapi.com/api-sports/api/api-football)
2. Assine o plano **Free** da API-Football (100 req/dia)
3. Abra o app → clique em **"Configurar chave de API"**
4. Cole sua chave e salve — os dados serão atualizados a cada 30 segundos

---

## 📁 Estrutura do projeto

```
copa2026/
├── index.html          # HTML principal
├── manifest.json       # Manifesto PWA
├── sw.js               # Service Worker (cache offline)
├── .nojekyll           # Necessário para GitHub Pages
├── css/
│   └── style.css       # Estilos (dark theme, gold accents)
├── js/
│   ├── data.js         # Dados base: grupos, times, jogos demo
│   └── app.js          # Lógica: API, estado, renderização
└── icons/
    ├── icon-192.png    # Ícone PWA (você fornece)
    └── icon-512.png    # Ícone PWA (você fornece)
```

---

## ✨ Funcionalidades

- 🔴 **Ao Vivo** — placares em tempo real com eventos (gols, cartões)
- 📅 **Calendário** — todos os jogos com filtro por fase e grupo
- ✅ **Resultados** — histórico de partidas encerradas
- 🏆 **Grupos** — tabela classificatória dos 12 grupos
- ⏱️ **Contagem regressiva** para o início da Copa
- 📲 **Instalável** como app no celular (PWA)
- 🌐 **Funciona offline** após a primeira visita

---

## 🛠️ Tecnologias

- HTML5 / CSS3 / JavaScript puro (sem frameworks)
- PWA: Service Worker + Web App Manifest
- API: [API-Football v3](https://rapidapi.com/api-sports/api/api-football) via RapidAPI
- Hospedagem: GitHub Pages (gratuito)

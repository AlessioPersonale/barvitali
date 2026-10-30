const http = require('http');
const fs = require('fs');
const path = require('path');
const os = require('os');
const QRCode = require('qrcode');

const PORT = process.env.PORT || 3000;
const PUBLIC = path.join(__dirname, 'public');
const CACHE = path.join(__dirname, 'data', 'google.json');

// Google Places API (New): chiave e ID del locale.
// Senza chiave il sito mostra l'ultima istantanea salvata qui sotto.
const API_KEY = process.env.GOOGLE_API_KEY;
let PLACE_ID = process.env.GOOGLE_PLACE_ID;
const PLACE_QUERY = 'Bar Vitali, Piazza della Vittoria 7, Lecco';
const POLL_MS = (Number(process.env.POLL_MINUTES) || 10) * 60 * 1000;
// Voto minimo per mostrare una recensione sul sito.
const MIN_RATING = Number(process.env.MIN_RATING) || 4;

// Istantanea da Google Maps (29/10/2026).
const SNAPSHOT = {
  stats: { count: 504, avg: 4.5 },
  reviews: [
    { name: 'Bello Maestro', rating: 5, text: 'Promosso! Bella location che dà sulla piazza, rione di Lecco sembra di stare in un paese. Buone birre, prezzi normali e stuzzichini ad accompagnare.' },
    { name: 'MARIA ROSA BENAGLIA', rating: 5, text: "Abbiamo pranzato in questo posto fuori in piazzetta ,panini deliziosi, vino doc, c'è di tutto un po' . Prezzi abbordabili e personale veloce. I due titolari molto preparati sui vini e cibo. Da provare dopo una bella gita sul Resegone." },
    { name: 'Chiara', rating: 5, text: 'Il mio bar preferito a Lecco ed è anche il primo in cui sono stata per puro caso quando ci sono venuta la prima volta. Birrette buone, ottima compagnia e piadine super!' },
    { name: 'Vivien 84', rating: 5, text: "Fantastico bar.. Panini ottimi, così come il vino e i taglieri.. Ci si sente sempre coccolati perché oltre a prezzi contenuti ed onesti, durante l'aperitivo ti portano sempre qualcosa di buono da mangiare. Ci si sente come a casa!!" },
    { name: 'Patrizia Alderighi', rating: 5, text: 'È uno dei pochissimi locali dove puoi stare tranquillo perché ha un insonorizzazione eccezionale e puoi tranquillamente parlare e sentire chi è con te. E ha un grande varietà di cibo per tutti i gusti E il personale super gentile e disponibile ad ogni richiesta' },
    { name: 'Guidi Alberto', rating: 4, text: "Ambiente sobrio, servizio cortese e veloce. Pranzo lí una volta a settimana e sempre c'é una buona scelta di primi del giorno, oltre ai panini, piadine e insalatone come da menù. Ottimo l esterno in piazzetta ora che arriva l estate" },
    { name: 'Edmund Dantes', rating: 5, text: "Sono stato qualche tempo fa per visitare Lecco e Como con un' amica stretta e devo dire che questo bar \" vecchia scuola\" ti fa sentire a casa. Oltre alla qualità del cibo e ai prezzi contenuti, il servizio è veramente esaustivo e idem per i dipendenti. Tutti bravi lavoratori!" },
  ].map((r, i) => ({ id: 'snap' + i, ...r })),
};

let state = SNAPSHOT;
try {
  const saved = JSON.parse(fs.readFileSync(CACHE, 'utf8'));
  if (saved && saved.stats && Array.isArray(saved.reviews)) state = saved;
} catch {}

function persist() {
  fs.mkdirSync(path.dirname(CACHE), { recursive: true });
  fs.writeFileSync(CACHE, JSON.stringify(state, null, 2));
}

const clients = new Set();
function broadcast(event, data) {
  const msg = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
  for (const res of clients) res.write(msg);
}

async function places(url, init, fieldMask) {
  const res = await fetch(url, {
    ...init,
    headers: { 'Content-Type': 'application/json', 'X-Goog-Api-Key': API_KEY, 'X-Goog-FieldMask': fieldMask, ...(init && init.headers) },
  });
  if (!res.ok) throw new Error(`Google ${res.status}: ${await res.text()}`);
  return res.json();
}

async function resolvePlaceId() {
  const d = await places('https://places.googleapis.com/v1/places:searchText', {
    method: 'POST',
    body: JSON.stringify({ textQuery: PLACE_QUERY, languageCode: 'it' }),
  }, 'places.id,places.displayName');
  if (!d.places || !d.places.length) throw new Error('Locale non trovato su Google');
  console.log(`Place ID: ${d.places[0].id} (impostalo in GOOGLE_PLACE_ID)`);
  return d.places[0].id;
}

async function refresh() {
  if (!PLACE_ID) PLACE_ID = await resolvePlaceId();
  const d = await places(`https://places.googleapis.com/v1/places/${PLACE_ID}?languageCode=it`, null, 'rating,userRatingCount,reviews');

  const stats = { count: d.userRatingCount, avg: Math.round(d.rating * 10) / 10 };
  const known = new Set(state.reviews.map(r => r.id));
  // Google restituisce al massimo 5 recensioni: le nuove vanno in coda.
  const fresh = (d.reviews || [])
    .filter(r => r.rating >= MIN_RATING && r.text && r.text.text)
    .map(r => ({
      id: r.name,
      name: (r.authorAttribution && r.authorAttribution.displayName) || 'Cliente Google',
      rating: r.rating,
      text: (r.originalText || r.text).text,
      at: r.publishTime,
    }))
    .filter(r => !known.has(r.id))
    .sort((a, b) => String(a.at).localeCompare(String(b.at)));

  const changed = stats.count !== state.stats.count || stats.avg !== state.stats.avg;
  if (!changed && !fresh.length) return;

  state = { stats, reviews: state.reviews.concat(fresh) };
  persist();
  if (fresh.length) for (const review of fresh) broadcast('review', { review, stats });
  else broadcast('stats', { stats });
  console.log(`Google: ${stats.count} recensioni, ${stats.avg}★, ${fresh.length} nuove`);
}

function poll() {
  refresh().catch(err => console.error('Aggiornamento Google non riuscito:', err.message));
}

const TYPES = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css', '.jpg': 'image/jpeg', '.png': 'image/png', '.svg': 'image/svg+xml' };

const server = http.createServer((req, res) => {
  const url = new URL(req.url, 'http://x');

  if (url.pathname === '/api/events') {
    res.writeHead(200, { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache', Connection: 'keep-alive' });
    res.write('retry: 5000\n\n');
    clients.add(res);
    req.on('close', () => clients.delete(res));
    return;
  }

  if (url.pathname === '/api/reviews') {
    res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
    return res.end(JSON.stringify(state));
  }

  const file = path.normalize(path.join(PUBLIC, decodeURIComponent(url.pathname === '/' ? '/index.html' : url.pathname)));
  if (!file.startsWith(PUBLIC)) { res.writeHead(403); return res.end(); }
  fs.readFile(file, (err, buf) => {
    if (err) { res.writeHead(404, { 'Content-Type': 'text/plain' }); return res.end('Not found'); }
    res.writeHead(200, { 'Content-Type': TYPES[path.extname(file)] || 'application/octet-stream' });
    res.end(buf);
  });
});

function lanIp() {
  for (const list of Object.values(os.networkInterfaces()))
    for (const i of list) if (i.family === 'IPv4' && !i.internal) return i.address;
  return 'localhost';
}

server.on('error', err => {
  if (err.code === 'EADDRINUSE') {
    console.error(`La porta ${PORT} è già in uso: chiudi l'altro server o avvia con PORT=3001.`);
    process.exit(1);
  }
  throw err;
});

server.listen(PORT, async () => {
  // Online (Render imposta RENDER) il QR punta al sito vero; in locale all'indirizzo della rete di casa.
  const site = process.env.SITE_URL || (process.env.RENDER ? 'https://www.barvitalilecco.it' : `http://${lanIp()}:${PORT}`);
  const svg = await QRCode.toString(`${site}/lingua.html`, { type: 'svg', margin: 1, color: { dark: '#14110F', light: '#FFF6E5' } });
  fs.writeFileSync(path.join(PUBLIC, 'qr.svg'), svg);
  console.log(`Bar Vitali: http://localhost:${PORT}`);
  console.log(`QR -> ${site}/lingua.html  (imposta SITE_URL per l'indirizzo pubblico)`);
  if (API_KEY) {
    poll();
    setInterval(poll, POLL_MS);
  } else {
    console.log('GOOGLE_API_KEY non impostata: mostro l\'ultima istantanea delle recensioni Google.');
  }
});

# Come mettere online Bar Vitali (barvitalilecco.it)

Il sito è un piccolo server Node.js: serve un hosting che lo esegua. Qui sotto i passi con Render, uno dei servizi più semplici. Railway o Fly.io funzionano allo stesso modo.

## 1. Carica il progetto su GitHub
1. Crea un account su github.com (gratis) e un nuovo repository **privato**, per esempio `bar-vitali`.
2. Carica tutto il contenuto di questa cartella. Il file `.gitignore` esclude già `node_modules` e `data`.
3. **Non caricare mai la chiave Google**: va solo nelle variabili d'ambiente (passo 2).

## 2. Crea il servizio su Render
1. Su render.com crea un account, poi **New → Web Service** e collega il repository.
2. Impostazioni:
   - **Build Command:** `npm install`
   - **Start Command:** `npm start`
3. In **Environment** aggiungi:

| Nome | Valore |
|---|---|
| `SITE_URL` | `https://barvitalilecco.it` |
| `GOOGLE_API_KEY` | la nuova chiave Google (vedi sotto) |
| `POLL_MINUTES` | `60` |

4. Il piano gratuito "si addormenta" dopo un po' senza visite: alla prima apertura il sito è lento. Per un bar conviene un piano a pagamento (qualche euro al mese) che resta sempre acceso.

## 3. Collega il dominio di Register.it
1. In Render, nel servizio: **Settings → Custom Domains → Add**, inserisci `barvitalilecco.it` e anche `www.barvitalilecco.it`.
2. Render mostra i record DNS da creare (di solito un record per il dominio senza `www` e un `CNAME` per `www`).
3. In Register.it apri il pannello del dominio, **Gestione DNS**, e inserisci quei record uguali a quelli mostrati da Render. Togli eventuali record che puntano alla pagina "in costruzione" di Register.it.
4. Attendi da pochi minuti ad alcune ore, poi in Render premi **Verify**. Il certificato HTTPS si attiva da solo.

## 4. QR code del tavolo
- All'avvio il server crea `public/qr.svg`: il QR punta a `https://barvitalilecco.it/lingua.html` (pagina di scelta lingua, poi il menu).
- Scarica `https://barvitalilecco.it/qr.svg` e stampalo per i tavoli.
- Prima di stamparlo controlla che `SITE_URL` sia impostato, altrimenti il QR punta a un indirizzo interno.

## 5. Chiave Google (consigliato)
La chiave usata durante i test è stata scritta in chat: cancellala nella console Google Cloud e creane una nuova, limitata a "Places API (New)". Mettila solo in `GOOGLE_API_KEY` su Render.
I testi delle recensioni arrivano da Google solo con la fatturazione attiva sul progetto; senza, il sito mostra le recensioni già salvate.

## Prima di pubblicare, da sostituire con i dati veri
- Orari di pranzo, aperitivo e cena (ora sono ipotesi).
- Evento "Prossimamente" (ora è un segnaposto).
- Prezzi e allergeni del menu (ora sono di esempio).
- Traduzioni in inglese, tedesco e francese: farle rivedere da un madrelingua.

## Per provare in locale
```
npm install
npm start
```
Poi apri http://localhost:3000.

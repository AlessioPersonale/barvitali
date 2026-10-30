# Sito statico gratuito con il tuo dominio (Netlify)

Il sito in `public/` funziona anche senza il server Node: le recensioni si leggono dal file fisso `public/reviews.json`. Si pubblica gratis, sempre acceso, con `www.barvitalilecco.it`.

## 1. Carica il progetto aggiornato su GitHub
Da PowerShell nella cartella del progetto, un comando alla volta:

```
git add .
git commit -m "Versione statica"
git push
```

## 2. Crea il sito su Netlify
1. Vai su netlify.com e registrati con il tuo account GitHub.
2. **Add new site → Import an existing project → GitHub** e scegli il repository `barvitali`.
3. Lascia vuoto il comando di build. La cartella da pubblicare è `public` (la indica già il file `netlify.toml`).
4. Premi **Deploy**. Dopo un minuto ottieni un indirizzo provvisorio tipo `qualcosa.netlify.app`: aprilo e controlla che il sito sia a posto prima di toccare il dominio.

## 3. Collega il dominio
1. In Netlify: **Domain management → Add a domain** e scrivi `barvitalilecco.it`.
2. Imposta `www.barvitalilecco.it` come dominio principale.
3. Netlify mostra i record DNS da usare. Annotali.

## 4. Cambia i record in Register.it (Gestione DNS)
Cambia **solo questi due**, con i valori mostrati da Netlify:
- il record `A` di `barvitalilecco.it` (ora `216.24.57.1`, quello di Render);
- il record `CNAME` di `www` (ora `barvitali.onrender.com`).

Non toccare gli altri record (posta, `NS`, `SOA`…).
Quando il DNS è aggiornato, in Netlify il certificato HTTPS si attiva da solo (di solito entro un'ora).

## 5. Dopo
- Il QR resta valido: punta già a `https://www.barvitalilecco.it/lingua.html`.
- Puoi sospendere o cancellare il servizio su Render per non avere due siti.
- Ogni push su GitHub ripubblica il sito in automatico.

## Come aggiornare le recensioni
Apri `public/reviews.json`, aggiungi una recensione in fondo all'elenco e aggiorna `count` e `avg` in `stats`. Poi `git add .`, `git commit`, `git push`.

## Cosa cambia rispetto alla versione con server
- Non c'è l'aggiornamento automatico dalle recensioni di Google: si aggiornano a mano.
- Il resto (animazioni, lingue, tema, filtri, mappa, fascia oraria) funziona uguale.

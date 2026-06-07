# 🔧 VeloService PRO — Instrucțiuni de instalare

## Ce ai primit
Un pachet complet gata de publicat ca aplicație web.
După publicare, aplicația se poate instala pe telefon ca orice aplicație normală.

---

## PASUL 1 — Personalizează datele service-ului tău

Deschide fișierul `src/App.jsx` cu Notepad (click dreapta → Deschide cu → Notepad).

Caută această secțiune (aproape de începutul fișierului):

```
const SERVICE = {
  nume: "VeloService PRO",
  adresa: "Str. Bicicliștilor 7, București",
  tel: "021 555 1234",
  email: "contact@veloservice.ro",
  cui: "RO12345678",
  zileGratuite: 7,
  taxaZi: 10,
};
```

Înlocuiește cu datele tale reale. Salvează fișierul.

---

## PASUL 2 — Creează cont gratuit pe Vercel

1. Mergi pe **https://vercel.com**
2. Apasă **Sign Up**
3. Alege **Continue with GitHub** (sau email)
4. Creează-ți cont gratuit

---

## PASUL 3 — Publică aplicația (drag & drop, fără cod!)

1. Pe Vercel, apasă **Add New → Project**
2. În stânga jos caută opțiunea **"Deploy from your computer"** sau **"Upload"**
3. **Trage acest folder** (`veloservice-pro`) direct în pagina Vercel
4. Vercel detectează automat că e React și îl compilează
5. Apasă **Deploy**
6. Aștepți ~2 minute
7. Primești un link de genul: `https://velo-service-abc123.vercel.app`

---

## PASUL 4 — Instalează pe telefon

### iPhone:
1. Deschide link-ul în **Safari**
2. Apasă butonul **Share** (pătratul cu săgeată în sus)
3. Alege **"Add to Home Screen"**
4. Apasă **Add**
5. Aplicația apare pe ecranul principal ca orice app!

### Android:
1. Deschide link-ul în **Chrome**
2. Apasă meniul **⋮** (trei puncte, dreapta sus)
3. Alege **"Add to Home screen"** sau **"Install app"**
4. Apasă **Add**

---

## ⚠️ Important despre date

Momentan datele se salvează **local în browser** (nu se pierd la închidere, dar se pierd dacă ștergi datele browserului).

Pentru salvare permanentă în cloud (recomandat pentru utilizare reală), scrie-mi și îți adaug o bază de date gratuită Firebase — durează ~30 minute.

---

## Probleme? Întrebări?
Revino la conversația cu Claude și descrie problema — te ajut pas cu pas.

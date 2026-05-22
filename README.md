# Mika — Scoring Mikado

Application PWA de scoring Mikado par reconnaissance photo (Claude Vision).

## Installation en 5 étapes

### Prérequis
- Node.js 18+ : https://nodejs.org
- Un compte Vercel (gratuit) : https://vercel.com
- Une clé API Anthropic : https://console.anthropic.com

---

### 1. Installer les dépendances
```bash
npm install
```

### 2. Tester en local
```bash
npm run dev
```
Ouvre http://localhost:5173 dans Chrome.

### 3. Builder l'app
```bash
npm run build
```

### 4. Déployer sur Vercel
```bash
npm install -g vercel
vercel --prod
```
Vercel te donne une URL publique, ex : `https://mika-app.vercel.app`

### 5. Installer sur Android
1. Ouvre l'URL sur Chrome Android
2. Menu Chrome (⋮) → **"Ajouter à l'écran d'accueil"**
3. Confirme → l'icône 🎋 apparaît sur ton écran
4. Ouvre l'app → entre ta clé API au premier lancement

---

## Utilisation

1. Pose les baguettes gagnées **séparées** sur un **fond sombre**
2. Appuie sur la zone photo → l'appareil photo s'ouvre
3. Prends la photo vue de dessus
4. Appuie **"Analyser les baguettes"**
5. Corrige si besoin avec **+/−** puis lis le score

## Barème
| Type | Motif | Points |
|------|-------|--------|
| A | Bleu–Rouge–Bleu (BRB) | 10 |
| B | Rayures diagonales | 20 |
| C | 1 Bleu + 1 Rouge espacés | 2 |
| D | Rouge–Bleu–Rouge–Bleu–Rouge | 5 |
| E | Bleu–Jaune–Rouge | 3 |

**Total partie : 145 pts**

## Paramètres
Appuie sur ⚙️ en haut à droite pour modifier la clé API.

# ⛪ Église Unie — Plateforme de Gestion de Département

Plateforme moderne, responsive et mobile pour la centralisation et la coordination des membres, des pôles, des événements, des indisponibilités, des checklists opérationnelles et de la validation des services.

---

## 📸 3 Expériences Utilisateur Implémentées (Conformes aux Maquettes)

1. **🖥️ Version Web — Écran Large (Desktop)**
   - Tableau de bord complet avec 4 indicateurs KPI (*Membres actifs, Pôles, Événements à venir, Heures de service*).
   - Courbe d'aperçu des services mensuels et statistiques annuelles.
   - Calendrier départemental avec vue Mois / Semaine / Liste et codes couleur par pôle.
   - Panneau latéral avec besoins requis par pôle (*ex: Louange 6/10, Accueil 4/6...*).
   - Moteur d'affectation avec **détection automatique des conflits** (indisponibilités déclarées, doubles affectations sur même créneau horaire).
   - Module de gestion des checklists avec étapes enrichies (texte, photos et vidéos de démonstration).
   - Tableau de suivi des validations de service avec relance manuelle (*"Renvoyer"*) et export.

2. **📱 Version Web Responsive — Petit Écran**
   - Grille 2x2 optimisée pour tablettes et smartphones.
   - Listes interactives de prochains événements et demandes d'adhésion avec actions rapides.
   - Barre de navigation basse (5 onglets : *Accueil, Calendrier, Membres, Événements, Menu*).

3. **📲 Version Application Mobile (Simulateur Web & Code React Native Expo)**
   - Dashboard membre avec salutation personnalisée et anniversaires du jour.
   - Suivi de la checklist en direct pendant le service avec jauge de progression (*ex: 6/7 - 86%*).
   - Consultation des détails d'étape avec photo et vidéo d'exemple.
   - **Validation de service avec commentaire obligatoire** (compteur 0/300 caractères) et écran de célébration.
   - Simulation des notifications push de rappel en fin de journée (21h00 et 22h00).

---

## 🛠️ Stack Technique

- **Full-stack Web & API** : Next.js 14 (App Router, React 18, TypeScript)
- **Base de données & Backend** : Convex (base de données réactive + fonctions serverless + authentification)
- **Styles & UI** : Tailwind CSS, Lucide Icons, Recharts, Canvas Confetti
- **Application Mobile Native** : React Native avec Expo (`/mobile`)

---

## 🚀 Démarrage Rapide

### 1. Installation des dépendances
```bash
npm install
```

### 2. Initialisation de la base de données & Jeu de données de démo
```bash
npm run db:push
npm run db:seed
```

### 3. Lancement du serveur de développement
```bash
npm run dev
```
Ouvrez [http://localhost:3000](http://localhost:3000) dans votre navigateur.

### 4. Lancement de l'application mobile Expo (Optionnel)
```bash
cd mobile
npm install
npx expo start
```

---

## 👥 Profils de Démo Intégrés

Vous pouvez basculer instantanément de rôle depuis la barre latérale ou l'en-tête :
- **David Kouassi** : Responsable Département / Administrateur
- **Marie Dupont** : Responsable du Pôle Louange
- **Sophie Martin** : Membre (Chantre Lead)
- **David K.** : Membre (Clavier avec indisponibilité déclarée pour tester la détection des conflits)

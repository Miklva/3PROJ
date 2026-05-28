# 🏠 KazaERP - ERP Alimentaire & Cuisine Intelligente pour le Foyer

Bienvenue dans **KazaERP**, l'outil ultime de gestion des réserves de nourriture, d'optimisation des courses et de suggestion intelligente de menus pour votre foyer. Conçu avec une interface sombre glassmorphic premium, cette application est entièrement responsive, fluide et optimisée pour une utilisation sur mobile, tablette et ordinateur.

---

## ✨ Fonctionnalités Majeures

- **📊 Tableau de Bord Intuitif** : Visualisez en temps réel la valeur estimée de votre stock, le nombre d'articles restants, les alertes de stocks faibles et le nombre de personnes dans le foyer.
- **📦 Gestion de Stock Moderne** :
  - Catégorisation automatique avec icônes dynamiques.
  - Décompte instantané grâce aux boutons rapides `+` et `-` pour enregistrer vos consommations quotidiennes.
  - Sauvegarde sécurisée et performante des données et photos dans votre navigateur via **IndexedDB** (pas de limite de taille).
- **📷 Prise de Photo et Galerie** : Capturez l'image de vos aliments en direct avec la caméra de votre smartphone/ordinateur, importez un fichier local ou sélectionnez une icône thématique dans notre galerie prédéfinie.
- **🛒 Liste de Courses Intelligente** :
  - Génération automatique des articles manquants dès qu'un produit descend en dessous de son seuil d'alerte configuré.
  - Possibilité d'ajouter manuellement des besoins.
  - Partage de la liste en un clic par SMS, WhatsApp, Mail ou presse-papier.
  - Validation des achats en un clic ("Courses faites") qui recharge automatiquement le stock de votre ERP !
- **🧠 Assistant Culinaire KazaChef AI** :
  - Analyse intelligente de vos stocks réels et propositions de recettes adaptées à ce qui est disponible immédiatement dans vos placards (anti-gaspillage).
  - Prédiction de vos courses à venir selon la fréquence de consommation de votre famille.
  - Zone de clavardage (Chat interactif) pour discuter directement avec KazaChef de vos idées de repas.

---

## 🚀 Démarrage Rapide

L'application est entièrement autonome et s'exécute directement dans le navigateur sans nécessiter de serveur distant complexe !

### Option 1 : Double-Clic (Le plus simple)
1. Naviguez dans le dossier `/Users/rayansouici/Desktop/maison/` sur votre Mac.
2. Double-cliquez sur le fichier [index.html](file:///Users/rayansouici/Desktop/maison/index.html) pour l'ouvrir instantanément dans votre navigateur préféré (Chrome, Safari, Firefox).

### Option 2 : Lancer un Serveur Local (Recommandé pour la caméra)
L'accès à l'appareil photo du smartphone/ordinateur nécessite des raisons de sécurité de fonctionner soit sur `localhost`, soit via HTTPS. Lancer un serveur local est donc fortement recommandé.

#### Avec Node.js (npm) :
Exécutez la commande suivante dans votre terminal dans le dossier du projet :
```bash
npx serve
```
Puis ouvrez l'adresse qui s'affiche (généralement `http://localhost:3000`).

#### Avec Python :
Exécutez cette commande dans votre terminal :
```bash
python3 -m http.server 8000
```
Puis ouvrez l'adresse `http://localhost:8000`.

---

## 🛠️ Architecture Technique

- **Structure** : HTML5 sémantique.
- **Design System** : Vanilla CSS3 avec HSL colors, glassmorphism (`backdrop-filter`), animations micro-interactives et adaptabilité mobile avancée.
- **Logique & Moteur** : Vanilla JavaScript ES6+.
- **Base de Données** : IndexedDB locale autonome.
- **Icônes** : Lucide Icons (CDN).
- **Polices** : Google Fonts (Outfit).

---

## 💡 Prochaine Phase (Intégration d'une vraie IA)

Dans un second temps, il sera très simple d'interfacer le fichier `app.js` avec une clé API (comme Gemini de Google) pour remplacer le moteur de simulation KazaChef par un véritable modèle de langage multimodal. Ce dernier pourra alors analyser les photos réelles de vos plats ou tickets de caisse pour en extraire les informations et remplir le stock automatiquement !

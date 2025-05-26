# Guide d'utilisation - Nest Chat Websocket

## Description
Cette application est un chat en temps réel développé avec NestJS pour le backend et NextJS pour le frontend. Elle permet aux utilisateurs de s'inscrire, se connecter, et discuter en temps réel avec d'autres utilisateurs connectés. Chaque utilisateur peut personnaliser la couleur de son profil, qui sera visible par tous les autres utilisateurs.

## Fonctionnalités
- Inscription et connexion des utilisateurs
- Chat en temps réel via websockets
- Personnalisation de la couleur du profil
- Liste des utilisateurs connectés
- Stockage des données dans des fichiers CSV

## Prérequis
- Node.js (version 18 ou supérieure)
- npm (version 9 ou supérieure)

## Installation et lancement

1. Clonez le repository dans un dossier de votre choix
2. Ouvrez deux terminaux dans le dossier racine du projet

### Backend (NestJS)
```bash
cd backend
npm install
npm run start:dev
```

### Frontend (NextJS)
```bash
cd frontend
npm install
npm run dev
```

3. Accédez à l'application dans votre navigateur :
   - Frontend : http://localhost:3001
   - Backend API : http://localhost:3000

## Utilisation
1. Créez un compte en accédant à la page d'inscription
2. Connectez-vous avec vos identifiants
3. Vous serez redirigé vers l'interface de chat
4. Pour changer la couleur de votre profil, cliquez sur le point de couleur à côté de votre nom d'utilisateur
5. Envoyez des messages en utilisant le champ de texte en bas de l'écran

## Structure du projet
- `/backend` : API NestJS avec authentification et websockets
- `/frontend` : Interface utilisateur NextJS

## Technologies utilisées
- Backend : NestJS, WebSockets, JWT
- Frontend : NextJS, React, TailwindCSS
- Stockage : Fichiers CSV

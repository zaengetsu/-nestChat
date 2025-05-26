FROM node:20-alpine

WORKDIR /app

# Copier les fichiers de dépendances
COPY package*.json ./

# Installer les dépendances
RUN npm install

# Copier le reste des fichiers
COPY . .

# Créer le dossier data pour les fichiers CSV
RUN mkdir -p data

# Exposer le port
EXPOSE 3000

# Commande de démarrage
CMD ["npm", "run", "start"]

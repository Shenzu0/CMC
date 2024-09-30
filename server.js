// Importation des modules
const express = require('express');
const path = require('path');

// Initialisation de l'application Express
const app = express();

// Définition du port (3000 par défaut)
const PORT = process.env.PORT || 3000;

// Définir le dossier public pour servir les fichiers statiques
app.use(express.static(path.join(__dirname, 'public')));

// Route principale pour l'accueil
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Lancement du serveur
app.listen(PORT, () => {
  console.log(`Le serveur tourne sur le port ${PORT}`);
});

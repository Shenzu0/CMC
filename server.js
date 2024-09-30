// Importation des modules
const express = require('express');
const path = require('path');
const mysql = require('mysql2');
const multer = require('multer'); // Pour gérer l'upload de fichiers
const bodyParser = require('body-parser');
const dotenv = require('dotenv');

// Charger les variables d'environnement
dotenv.config();

// Initialisation de l'application Express
const app = express();
const PORT = process.env.PORT || 3000;

// Définir le dossier public pour servir les fichiers statiques
app.use(express.static(path.join(__dirname, 'public')));
app.use(bodyParser.json());

// Connexion à la base de données MySQL
const db = mysql.createConnection({
  host: 'localhost',
  user: 'root', // Remplace par ton utilisateur MySQL
  password: '', // Remplace par ton mot de passe MySQL
  database: 'cmc mode'
});

// Connexion à MySQL
db.connect((err) => {
  if (err) {
    console.error('Erreur de connexion à MySQL:', err);
  } else {
    console.log('Connecté à la base de données MySQL');
  }
});

// Configuration de multer pour l'upload des images
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/');
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + '-' + file.originalname);
  }
});
const upload = multer({ storage: storage });

// Route principale pour l'accueil
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Route pour obtenir les vêtements depuis la base de données
app.get('/api/vetements', (req, res) => {
  const sql = 'SELECT * FROM vêtements';
  db.query(sql, (err, results) => {
    if (err) {
      return res.status(500).json({ error: 'Erreur lors de la récupération des vêtements' });
    }
    res.json(results);
  });
});

// Route pour modifier l'image de fond (background)
app.post('/upload-background-image', upload.single('image'), (req, res) => {
  const section = req.body.section;
  const imageUrl = `/uploads/${req.file.filename}`;

  // Ici, on pourrait sauvegarder l'URL de l'image dans la base de données ou un fichier de configuration
  res.json({ success: true, filePath: imageUrl });
});

// Route pour modifier l'image d'un vêtement
app.post('/upload-vetement-image', upload.single('image'), (req, res) => {
  const id = req.body.id;
  const imageUrl = `/uploads/${req.file.filename}`;

  const sql = 'UPDATE vêtements SET image_url = ? WHERE id = ?';
  db.query(sql, [imageUrl, id], (err, result) => {
    if (err) {
      return res.status(500).json({ error: 'Erreur lors de la mise à jour de l\'image du vêtement' });
    }
    res.json({ success: true, filePath: imageUrl });
  });
});

// Lancement du serveur
app.listen(PORT, () => {
  console.log(`Le serveur tourne sur le port ${PORT}`);
});


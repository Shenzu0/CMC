// Importation des modules
const express = require('express');
const path = require('path');
const mysql = require('mysql2');
const bodyParser = require('body-parser');
const multer = require('multer'); // Pour gérer l'upload de fichiers
const session = require('express-session');
const dotenv = require('dotenv');

// Charger les variables d'environnement
dotenv.config();

// Initialisation de l'application Express
const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Configuration de la session avec une durée de vie de 24 heures
app.use(session({
    secret: 'secret-key', // Remplace par une clé secrète plus sécurisée en production
    resave: false,
    saveUninitialized: false,
    cookie: { maxAge: 24 * 60 * 60 * 1000 }, // 24 heures de durée pour le cookie de session
}));

// Connexion à la base de données MySQL
const db = mysql.createConnection({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME
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

// Servir le dossier public pour les fichiers statiques (HTML, CSS, JS)
app.use(express.static(path.join(__dirname, 'public')));

// Middleware pour vérifier si l'utilisateur est un admin
function checkAdminSession(req, res, next) {
    if (req.session.isAdmin) {
        return next();
    } else {
        return res.status(401).send('Non autorisé');
    }
}

// Route principale pour l'accueil
app.get('/', (req, res) => {
    console.log('Route GET / hit');
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Authentification Admin - Route pour la page de connexion
app.get('/login', (req, res) => {
    console.log('Route GET /login hit');
    res.sendFile(path.join(__dirname, 'public', 'login.html'));
});

// Route pour gérer la connexion admin
app.post('/api/login', (req, res) => {
    const { username, password } = req.body;
    console.log(`Tentative de connexion avec: username=${username}, password=${password}`);

    // Vérification de l'utilisateur admin avec des valeurs en clair
    if (username === 'admin' && password === 'admin') {
        // Création de la session pour l'utilisateur admin
        req.session.isAdmin = true;
        req.session.username = username;
        console.log('Connexion réussie');

        // Redirection vers index.html
        return res.json({ success: true, message: 'Connexion réussie', redirect: '/index.html' });
    } else {
        console.log('Nom d\'utilisateur ou mot de passe incorrect');
        return res.status(401).json({ error: 'Nom d\'utilisateur ou mot de passe incorrect' });
    }
});

// Route pour déconnexion admin
app.post('/api/logout', (req, res) => {
    console.log('Tentative de déconnexion');
    req.session.destroy((err) => {
        if (err) {
            console.error('Erreur lors de la déconnexion:', err);
            return res.status(500).json({ error: 'Erreur lors de la déconnexion' });
        }
        console.log('Déconnexion réussie');
        res.json({ success: true, message: 'Déconnexion réussie' });
    });
});

// Route pour obtenir les vêtements depuis MySQL
app.get('/api/vetements', (req, res) => {
    console.log('Récupération des vêtements');
    const sql = 'SELECT * FROM vêtements';
    db.query(sql, (err, results) => {
        if (err) {
            console.error('Erreur lors de la récupération des vêtements:', err);
            return res.status(500).json({ error: 'Erreur lors de la récupération des vêtements' });
        }
        console.log('Vêtements récupérés:', results);
        res.json(results);
    });
});

// Route pour modifier l'image de fond (background)
app.post('/upload-background-image', upload.single('image'), (req, res) => {
  const section = req.body.section;
  const imageUrl = `/uploads/${req.file.filename}`;

  console.log(`Image de fond uploadée pour la section: ${section}, chemin de l'image: ${imageUrl}`);

  // Sauvegarder l'URL de l'image dans la base de données
  const sql = 'REPLACE INTO background_images (section_id, image_url) VALUES (?, ?)';
  db.query(sql, [section, imageUrl], (err, result) => {
      if (err) {
          console.error('Erreur lors de la mise à jour de l\'image de fond:', err);
          return res.status(500).json({ error: 'Erreur lors de la mise à jour de l\'image de fond' });
      }
      console.log('Image de fond mise à jour avec succès');
      res.json({ success: true, filePath: imageUrl });
  });
});

// Route pour obtenir les images de fond depuis MySQL
app.get('/get-background-images', (req, res) => {
  const sql = 'SELECT section_id, image_url FROM background_images';
  db.query(sql, (err, results) => {
      if (err) {
          console.error('Erreur lors de la récupération des images de fond:', err);
          return res.status(500).json({ error: 'Erreur lors de la récupération des images de fond' });
      }

      // Convertir les résultats en un objet { section_id: image_url }
      const images = {};
      results.forEach(row => {
          images[row.section_id] = row.image_url;
      });

      res.json(images);
  });
});


// Route pour modifier l'image d'un vêtement
app.post('/upload-vetement-image', upload.single('image'), (req, res) => {
    const id = req.body.id;
    const imageUrl = `/uploads/${req.file.filename}`;

    console.log(`Modification de l'image du vêtement avec id: ${id}, nouvelle image: ${imageUrl}`);

    const sql = 'UPDATE vêtements SET image_url = ? WHERE id = ?';
    db.query(sql, [imageUrl, id], (err, result) => {
        if (err) {
            console.error('Erreur lors de la mise à jour de l\'image du vêtement:', err);
            return res.status(500).json({ error: 'Erreur lors de la mise à jour de l\'image du vêtement' });
        }
        console.log('Image de vêtement mise à jour avec succès');
        res.json({ success: true, filePath: imageUrl });
    });
});

// Route pour vérifier si l'utilisateur est toujours connecté
app.get('/check-session', (req, res) => {
    if (req.session.isAdmin) {
        res.json({ isAdmin: true });
    } else {
        res.json({ isAdmin: false });
    }
});

app.get('/get-background-images', (req, res) => {
  const images = {
      hero: '/path/to/hero.jpg',
      about: '/path/to/about.jpg',
      blog: '/path/to/blog.jpg'
  };
  res.json(images);
});
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));


// Route pour ajouter un vêtement
app.post('/api/vetements', upload.single('image'), (req, res) => {
  const { titre, description } = req.body; // Utilise 'titre' et 'description' (conforme à la base de données)
  const imageUrl = req.file ? `/uploads/${req.file.filename}` : '';

  const sql = 'INSERT INTO vêtements (titre, description, image_url) VALUES (?, ?, ?)';
  db.query(sql, [titre, description, imageUrl], (err, result) => {
      if (err) {
          console.error('Erreur lors de l\'ajout du vêtement:', err);
          return res.status(500).json({ error: 'Erreur lors de l\'ajout du vêtement' });
      }
      console.log('Vêtement ajouté avec succès:', result);
      res.json({ success: true });
  });
});

// Route pour modifier un vêtement
app.put('/api/vetements/:id', upload.single('image'), (req, res) => {
  const id = req.params.id;
  const { titre, description } = req.body;
  const imageUrl = req.file ? `/uploads/${req.file.filename}` : '';

  const sql = 'UPDATE vêtements SET titre = ?, description = ?, image_url = ? WHERE id = ?';
  db.query(sql, [titre, description, imageUrl, id], (err, result) => {
      if (err) {
          console.error('Erreur lors de la modification du vêtement:', err);
          return res.status(500).json({ error: 'Erreur lors de la modification du vêtement' });
      }
      console.log('Vêtement modifié avec succès:', result);
      res.json({ success: true });
  });
});

// Route pour supprimer un vêtement
app.delete('/api/vetements/:id', (req, res) => {
  const productId = req.params.id;

  const sql = 'DELETE FROM vêtements WHERE id = ?';
  db.query(sql, [productId], (err, result) => {
      if (err) {
          console.error(`Erreur SQL lors de la suppression du produit avec l'ID ${productId}:`, err);
          return res.status(500).json({ error: 'Erreur lors de la suppression du produit' });
      }

      if (result.affectedRows === 0) {
          console.warn(`Produit avec l'ID ${productId} non trouvé.`);
          return res.status(404).json({ error: 'Produit non trouvé' });
      }

      console.log(`Produit avec l'ID ${productId} supprimé avec succès`);
      res.json({ success: true, message: 'Produit supprimé avec succès' });
  });
});

// Route pour récupérer un vêtement par son ID
app.get('/api/vetements/:id', (req, res) => {
  const productId = req.params.id;

  const sql = 'SELECT * FROM vêtements WHERE id = ?';
  db.query(sql, [productId], (err, result) => {
      if (err) {
          console.error('Erreur lors de la récupération du produit:', err);
          return res.status(500).json({ error: 'Erreur lors de la récupération du produit' });
      }

      if (result.length === 0) {
          return res.status(404).json({ error: 'Produit non trouvé' });
      }

      console.log('Produit récupéré:', result[0]);
      res.json(result[0]);
  });
});

// Route pour récupérer les produits de l'accueil (index)
app.get('/api/produits-index', (req, res) => {
  const sql = 'SELECT * FROM produits_index';
  db.query(sql, (err, results) => {
      if (err) {
          console.error('Erreur lors de la récupération des produits de l\'index:', err);
          return res.status(500).json({ error: 'Erreur lors de la récupération des produits de l\'index' });
      }
      res.json(results);
  });
});

// Route pour ajouter un produit à l'accueil
app.post('/api/produits-index', upload.single('image'), (req, res) => {
  const { titre, description } = req.body;
  const imageUrl = req.file ? `/uploads/${req.file.filename}` : '';

  const sql = 'INSERT INTO produits_index (titre, description, image_url) VALUES (?, ?, ?)';
  db.query(sql, [titre, description, imageUrl], (err, result) => {
      if (err) {
          console.error('Erreur lors de l\'ajout du produit à l\'index:', err);
          return res.status(500).json({ error: 'Erreur lors de l\'ajout du produit à l\'index' });
      }
      res.json({ success: true });
  });
});


// Route pour modifier un produit de l'accueil
app.put('/api/produits-index/:id', upload.single('image'), (req, res) => {
  const id = req.params.id;
  const { titre, description } = req.body;
  const imageUrl = req.file ? `/uploads/${req.file.filename}` : '';

  const sql = 'UPDATE produits_index SET titre = ?, description = ?, image_url = ? WHERE id = ?';
  db.query(sql, [titre, description, imageUrl, id], (err, result) => {
      if (err) {
          console.error('Erreur lors de la modification du produit à l\'index:', err);
          return res.status(500).json({ error: 'Erreur lors de la modification du produit à l\'index' });
      }
      res.json({ success: true });
  });
});

// Route pour supprimer un produit de l'accueil
app.delete('/api/produits-index/:id', (req, res) => {
  const id = req.params.id;

  const sql = 'DELETE FROM produits_index WHERE id = ?';
  db.query(sql, [id], (err, result) => {
      if (err) {
          console.error('Erreur lors de la suppression du produit à l\'index:', err);
          return res.status(500).json({ error: 'Erreur lors de la suppression du produit à l\'index' });
      }

      if (result.affectedRows === 0) {
          return res.status(404).json({ error: 'Produit non trouvé' });
      }

      res.json({ success: true, message: 'Produit supprimé avec succès' });
  });
});



// Lancement du serveur
app.listen(PORT, () => {
    console.log(`Le serveur tourne sur le port ${PORT}`);
});

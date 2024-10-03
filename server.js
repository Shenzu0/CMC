// Importation des modules
const express = require('express');
const path = require('path');
const mysql = require('mysql2');
const bodyParser = require('body-parser');
const multer = require('multer'); // Pour gérer l'upload de fichiers
const session = require('express-session');
const dotenv = require('dotenv');
const { OAuth2Client } = require('google-auth-library');
const client = new OAuth2Client('815007391612-1pssr0jnhe9oaqtsvjlalq2p3uut312l.apps.googleusercontent.com');
const cors = require('cors');



// Charger les variables d'environnement
dotenv.config();

// Initialisation de l'application Express
const app = express();
const PORT = process.env.PORT || 3000;

// Utiliser cors pour permettre uniquement les requêtes provenant de localhost en mode test
app.use(cors({
  origin: 'http://localhost:3000',
  methods: ['GET', 'POST'],
  credentials: true
}));

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
  const { titre, description } = req.body;
  if (!titre) {
    return res.status(400).json({ error: 'Le titre ne peut pas être vide' });
  }

  const imageUrl = req.file ? `/uploads/${req.file.filename}` : '';
  const sql = 'INSERT INTO vêtements (titre, description, image_url) VALUES (?, ?, ?)';
  db.query(sql, [titre, description, imageUrl], (err, result) => {
    if (err) {
      console.error('Erreur lors de l\'ajout du vêtement:', err);
      return res.status(500).json({ error: 'Erreur lors de l\'ajout du vêtement' });
    }
    res.json({ success: true });
  });
});

// Route pour modifier un vêtement
app.put('/api/vetements/:id', (req, res) => {
  const id = req.params.id;
  const { titre, description, image_url, prix } = req.body;

  const sql = `
      UPDATE vêtements 
      SET 
          titre = COALESCE(?, titre), 
          description = COALESCE(?, description), 
          image_url = COALESCE(?, image_url), 
          prix = COALESCE(?, prix) 
      WHERE id = ?`;

  db.query(sql, [titre, description, image_url, prix, id], (err, result) => {
      if (err) {
          console.error('Erreur lors de la modification du vêtement:', err);
          return res.status(500).json({ error: 'Erreur lors de la modification du vêtement' });
      }
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

// Route pour obtenir la description de la page "About"
app.get('/api/page-info/about', (req, res) => {
  const sql = 'SELECT * FROM page_info WHERE page_type = "about"';
  db.query(sql, (err, result) => {
      if (err) {
          console.error('Erreur lors de la récupération de la description:', err);
          return res.status(500).json({ error: 'Erreur lors de la récupération de la description' });
      }
      if (result.length === 0) {
          return res.status(404).json({ error: 'Description non trouvée' });
      }
      res.json(result[0]);
  });
});

// Route pour mettre à jour la description de la page "About"
app.put('/api/page-info/about', (req, res) => {
  const { description } = req.body;
  const sql = 'UPDATE page_info SET description = ? WHERE page_type = "about"';
  db.query(sql, [description], (err, result) => {
      if (err) {
          console.error('Erreur lors de la mise à jour de la description:', err);
          return res.status(500).json({ error: 'Erreur lors de la mise à jour de la description' });
      }
      res.json({ success: true });
  });
});

/// Routes pour les FAQs
// Récupérer toutes les FAQs
app.get('/api/faqs', (req, res) => {
  const sql = 'SELECT * FROM faqs'; // Utilisation de la table 'faqs'
  db.query(sql, (err, results) => {
      if (err) {
          console.error('Erreur lors de la récupération des FAQs:', err);
          return res.status(500).json({ error: 'Erreur lors de la récupération des FAQs' });
      }
      res.json(results);
  });
});

// Ajouter une nouvelle FAQ
app.post('/api/faqs', checkAdminSession, (req, res) => {
  const { question, reponse } = req.body;  // 'reponse' doit correspondre à la colonne dans votre table MySQL
  if (!question || !reponse) {
      return res.status(400).json({ error: 'Question et réponse sont obligatoires.' });
  }
  
  const sql = 'INSERT INTO faqs (question, reponse) VALUES (?, ?)';
  db.query(sql, [question, reponse], (err, result) => {
      if (err) {
          console.error('Erreur lors de l\'ajout de la FAQ:', err);
          return res.status(500).json({ error: 'Erreur lors de l\'ajout de la FAQ' });
      }
      res.json({ success: true });
  });
});


// Modifier une FAQ existante
app.put('/api/faqs/:id', checkAdminSession, (req, res) => {
  const id = req.params.id;
  const { question, answer } = req.body;
  const sql = 'UPDATE faqs SET question = ?, reponse = ? WHERE id = ?'; // Utilisation de la table 'faqs' et la colonne 'reponse'
  db.query(sql, [question, answer, id], (err, result) => {
      if (err) {
          console.error('Erreur lors de la mise à jour de la FAQ:', err);
          return res.status(500).json({ error: 'Erreur lors de la mise à jour de la FAQ' });
      }
      res.json({ success: true });
  });
});

// Supprimer une FAQ
app.delete('/api/faqs/:id', checkAdminSession, (req, res) => {
  const id = req.params.id;
  const sql = 'DELETE FROM faqs WHERE id = ?'; // Utilisation de la table 'faqs'
  db.query(sql, [id], (err, result) => {
      if (err) {
          console.error('Erreur lors de la suppression de la FAQ:', err);
          return res.status(500).json({ error: 'Erreur lors de la suppression de la FAQ' });
      }
      res.json({ success: true });
  });
});

// Récupérer tous les articles avec leurs commentaires
app.get('/api/articles', (req, res) => {
  const sql = `
    SELECT a.id as article_id, a.titre, a.contenu, a.image_url, a.created_at, a.updated_at,
           c.id as comment_id, c.name as comment_name, c.commentaire, c.created_at as comment_created_at
    FROM blog_articles a
    LEFT JOIN blog_comments c ON a.id = c.article_id
  `;

  db.query(sql, (err, results) => {
    if (err) {
      console.error('Erreur lors de la récupération des articles et des commentaires:', err);
      return res.status(500).json({ error: 'Erreur lors de la récupération des articles et des commentaires' });
    }

    // Organiser les articles avec leurs commentaires
    const articlesMap = new Map();

    results.forEach(row => {
      if (!articlesMap.has(row.article_id)) {
        articlesMap.set(row.article_id, {
          id: row.article_id,
          titre: row.titre,
          contenu: row.contenu,
          image_url: row.image_url,
          created_at: row.created_at,
          updated_at: row.updated_at,
          comments: [],
        });
      }

      if (row.comment_id) {
        articlesMap.get(row.article_id).comments.push({
          id: row.comment_id,
          name: row.comment_name,
          commentaire: row.commentaire,
          created_at: row.comment_created_at,
        });
      }
    });

    const articlesWithComments = Array.from(articlesMap.values());
    res.json(articlesWithComments);
  });
});



// Ajouter un nouvel article
app.post('/api/articles', upload.single('image'), (req, res) => {
  const { titre, contenu } = req.body;
  const imageUrl = req.file ? `/uploads/${req.file.filename}` : null;
  const sql = 'INSERT INTO blog_articles (titre, contenu, image_url) VALUES (?, ?, ?)';
  db.query(sql, [titre, contenu, imageUrl], (err, result) => {
      if (err) {
          console.error('Erreur lors de l\'ajout de l\'article:', err);
          return res.status(500).json({ error: 'Erreur lors de l\'ajout de l\'article' });
      }
      res.json({ success: true });
  });
});

// Modifier un article de blog
app.put('/api/articles/:id', upload.single('image'), (req, res) => {
  const { id } = req.params;
  const { titre, contenu } = req.body; // Correspond aux noms de colonnes de la base de données
  const imageUrl = req.file ? `/uploads/${req.file.filename}` : req.body.imageUrl;
  const sql = 'UPDATE blog_articles SET titre = ?, contenu = ?, image_url = ? WHERE id = ?';
  db.query(sql, [titre, contenu, imageUrl, id], (err, result) => {
      if (err) {
          console.error('Erreur lors de la mise à jour de l\'article:', err);
          return res.status(500).json({ error: 'Erreur lors de la mise à jour de l\'article' });
      }
      res.json({ success: true });
  });
});

// Supprimer un article de blog
app.delete('/api/articles/:id', (req, res) => {
  const articleId = req.params.id;
  
  const sql = 'DELETE FROM blog_articles WHERE id = ?';
  db.query(sql, [articleId], (err, result) => {
    if (err) {
      console.error('Erreur lors de la suppression de l\'article:', err);
      return res.status(500).json({ error: 'Erreur lors de la suppression de l\'article' });
    }

    // Vérifier si l'article a bien été supprimé
    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Article non trouvé' });
    }

    res.json({ success: true, message: 'Article supprimé avec succès' });
  });
});


/// Ajouter un commentaire à un article de blog
app.post('/api/articles/:id/comments', (req, res) => {
  const { name, text } = req.body;
  const articleId = req.params.id;

  if (!name || !text) {
    console.error('Nom ou commentaire manquant');
    return res.status(400).json({ error: 'Le nom et le commentaire sont obligatoires' });
  }

  const sql = 'INSERT INTO blog_comments (article_id, name, commentaire) VALUES (?, ?, ?)';
  db.query(sql, [articleId, name, text], (err, result) => {
    if (err) {
      console.error('Erreur lors de l\'ajout du commentaire:', err);
      return res.status(500).json({ error: 'Erreur lors de l\'ajout du commentaire' });
    }
    res.json({ success: true });
  });
});


// Supprimer un commentaire d'un article de blog
app.delete('/api/articles/:articleId/comments/:commentId', (req, res) => {
  const { articleId, commentId } = req.params;
  const sql = 'DELETE FROM blog_comments WHERE id = ? AND article_id = ?';
  db.query(sql, [commentId, articleId], (err, result) => {
      if (err) {
          console.error('Erreur lors de la suppression du commentaire:', err);
          return res.status(500).json({ error: 'Erreur lors de la suppression du commentaire' });
      }
      res.json({ success: true });
  });
});

// Route pour enregistrer un message de contact
app.post('/api/contact', (req, res) => {
  const { name, email, message } = req.body;

  if (!name || !email || !message) {
      return res.status(400).json({ error: 'Tous les champs sont obligatoires.' });
  }

  const sql = 'INSERT INTO contact_messages (name, email, message) VALUES (?, ?, ?)';
  db.query(sql, [name, email, message], (err, result) => {
      if (err) {
          console.error('Erreur lors de l\'enregistrement du message:', err);
          return res.status(500).json({ error: 'Erreur lors de l\'enregistrement du message.' });
      }

      res.json({ success: true, message: 'Message enregistré avec succès.' });
  });
});

// Route pour vérifier le jeton Google
app.post('/api/verify-google-token', async (req, res) => {
  const { token } = req.body;
  try {
    console.log("Token reçu pour vérification:", token);  // Ajoute un log ici pour voir si le token est bien reçu

    const ticket = await client.verifyIdToken({
      idToken: token,
      audience: '815007391612-1pssr0jnhe9oaqtsvjlalq2p3uut312l.apps.googleusercontent.com',
    });
    const payload = ticket.getPayload();
    
    console.log("Payload reçu de Google:", payload);  // Ajoute un log ici pour vérifier le contenu du payload

    const user = {
      googleId: payload.sub,
      email: payload.email,
      name: payload.name
    };

    // Retourner les informations de l'utilisateur
    res.json({ success: true, user });
  } catch (error) {
    console.error('Erreur lors de la vérification du token Google:', error);  // Log détaillé en cas d'erreur
    res.status(401).json({ success: false });
  }
});

// Lancement du serveur
app.listen(PORT, () => {
    console.log(`Le serveur tourne sur le port ${PORT}`);
});

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

// Configuration de la session
app.use(session({
    secret: 'secret-key', // Remplace par une clé secrète plus sécurisée en production
    resave: false,
    saveUninitialized: true,
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

    // Ici, on pourrait sauvegarder l'URL de l'image dans la base de données ou un fichier de configuration
    res.json({ success: true, filePath: imageUrl });
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

// Lancement du serveur
app.listen(PORT, () => {
    console.log(`Le serveur tourne sur le port ${PORT}`);
});

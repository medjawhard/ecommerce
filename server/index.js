require('dotenv').config();
const express = require('express');
const cors = require('cors'); 
const { Client } = require('pg');
const { GoogleGenerativeAI } = require("@google/generative-ai");

const app = express();
const port = process.env.PORT || 3000;

// 1. Configuration CORS plus sécurisée
const corsOptions = {
  origin: process.env.FRONTEND_URL || 'http://localhost:5173',
  optionsSuccessStatus: 200
};

app.use(cors(corsOptions));
app.use(express.json());

// 2. Configuration Base de Données
const client = new Client({
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_NAME,
  password: process.env.DB_PASSWORD,
  port: process.env.DB_PORT || 5432,
  ssl: process.env.DB_SSL ? { rejectUnauthorized: false } : false
});

// Gestion améliorée de la connexion BDD
async function connectDatabase() {
  try {
    await client.connect();
    console.log('✅ Connecté à PostgreSQL');
    
    // Vérification de la structure de la table
    await client.query(`
      CREATE TABLE IF NOT EXISTS products (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        description TEXT,
        price DECIMAL(10,2) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    
    console.log('✅ Table "products" vérifiée/créée');
    
  } catch (err) {
    console.error('❌ Erreur connexion BDD:', err);
    process.exit(1); // Arrêt en cas d'échec critique
  }
}

// 3. Configuration Gemini
const genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY);
const model = genAI.getGenerativeModel({ 
  model: "gemini-pro",
  generationConfig: {
    temperature: 0.3, // Moins créatif, plus précis
    maxOutputTokens: 150,
  }
});

// Fonction pour nettoyer et parser la réponse de Gemini
function parseGeminiResponse(text) {
  try {
    // Enlève les backticks et le mot "json" s'ils existent
    const cleanText = text.replace(/```json|```/g, '').trim();
    return JSON.parse(cleanText);
  } catch (error) {
    console.error('❌ Erreur parsing JSON:', error, 'Texte reçu:', text);
    return {};
  }
}

// --- ROUTE INTELLIGENTE AMÉLIORÉE ---
app.post('/api/chat/client', async (req, res) => {
  try {
    const { message } = req.body;
    
    if (!message || typeof message !== 'string') {
      return res.status(400).json({ 
        error: "Message requis et doit être une chaîne de caractères" 
      });
    }
    
    console.log("📩 Message reçu du client :", message);

    // A. Prompt amélioré pour Gemini
    const prompt = `
      Tu es un assistant spécialisé dans la recherche e-commerce.
      Analyse cette requête utilisateur : "${message}"
      
      EXTRAIT les informations suivantes :
      1. Le type de produit recherché (ex: 'chaussures', 'ordinateur portable', 'livre')
      2. Le budget maximum si mentionné (uniquement un nombre)
      
      Réponds UNIQUEMENT au format JSON avec cette structure :
      {
        "search": "terme de recherche principal",
        "max_price": nombre ou null
      }
      
      Exemples :
      - "Je cherche des chaussures de sport à moins de 100€" => {"search": "chaussures de sport", "max_price": 100}
      - "Montre-moi des téléphones" => {"search": "téléphone", "max_price": null}
      - "Bonjour" => {"search": "", "max_price": null}
    `;

    // Génération avec Gemini
    const result = await model.generateContent(prompt);
    const response = await result.response;
    const filters = parseGeminiResponse(response.text());
    
    console.log("🤖 Filtres extraits :", filters);

    // B. Construction de la requête SQL dynamique
    let sql = `SELECT id, name, description, price FROM products WHERE 1=1`;
    const params = [];
    let paramIndex = 1;

    if (filters.search && filters.search.trim() !== '') {
      sql += ` AND (
        name ILIKE $${paramIndex} OR 
        description ILIKE $${paramIndex} OR
        name ILIKE $${paramIndex + 1}
      )`;
      params.push(`%${filters.search}%`);
      params.push(`%${filters.search.split(' ')[0]}%`); // Recherche sur premier mot
      paramIndex += 2;
    }
    
    if (filters.max_price && !isNaN(filters.max_price)) {
      sql += ` AND price <= $${paramIndex}`;
      params.push(parseFloat(filters.max_price));
      paramIndex++;
    }

    sql += ` ORDER BY price ASC LIMIT 10`;

    console.log("📊 SQL exécuté :", sql, "Paramètres:", params);

    // C. Exécution de la requête
    const dbResult = await client.query(sql, params);
    
    // D. Construction de la réponse
    const responseMessage = dbResult.rows.length > 0 
      ? `J'ai trouvé ${dbResult.rows.length} produit(s) correspondant à votre recherche.`
      : "Aucun produit ne correspond à votre recherche. Essayez avec d'autres termes.";

    res.json({
      success: true,
      message: responseMessage,
      products: dbResult.rows,
      filtersApplied: {
        search: filters.search || null,
        max_price: filters.max_price || null
      }
    });

  } catch (error) {
    console.error("❌ Erreur serveur :", error);
    
    res.status(500).json({
      success: false,
      message: "Une erreur technique est survenue. Veuillez réessayer.",
      error: process.env.NODE_ENV === 'development' ? error.message : undefined,
      products: []
    });
  }
});

// Route de test améliorée avec pagination
app.get('/api/products', async (req, res) => {
  try {
    const { page = 1, limit = 10 } = req.query;
    const offset = (page - 1) * limit;
    
    const result = await client.query(
      'SELECT id, name, description, price FROM products ORDER BY id LIMIT $1 OFFSET $2',
      [limit, offset]
    );
    
    const countResult = await client.query('SELECT COUNT(*) FROM products');
    const total = parseInt(countResult.rows[0].count);
    
    res.json({
      success: true,
      data: result.rows,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({
      success: false,
      message: "Erreur lors de la récupération des produits"
    });
  }
});

// Route de santé pour vérifier le serveur
app.get('/health', async (req, res) => {
  try {
    await client.query('SELECT 1');
    res.json({ 
      status: 'healthy',
      database: 'connected',
      gemini: process.env.GOOGLE_API_KEY ? 'configured' : 'missing'
    });
  } catch (error) {
    res.status(500).json({ 
      status: 'unhealthy',
      database: 'disconnected',
      error: error.message 
    });
  }
});

// Gestion des erreurs 404
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: "Route non trouvée"
  });
});

// Démarrage du serveur
async function startServer() {
  await connectDatabase();
  
  app.listen(port, () => {
    console.log(`🚀 Serveur lancé sur http://localhost:${port}`);
    console.log(`📊 Route de santé: http://localhost:${port}/health`);
    console.log(`🛍️  Route produits: http://localhost:${port}/api/products`);
  });
}

// Gestion des erreurs non capturées
process.on('unhandledRejection', (error) => {
  console.error('⚠️  Rejet non géré:', error);
});

process.on('uncaughtException', (error) => {
  console.error('⚠️  Exception non capturée:', error);
  process.exit(1);
});

startServer();
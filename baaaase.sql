-- -----------------------------------------------------
-- 1. NETTOYAGE (On repart sur des bases saines)
-- -----------------------------------------------------
DROP TABLE IF EXISTS product_variants;
DROP TABLE IF EXISTS products;

-- -----------------------------------------------------
-- 2. TABLE PARENT : Le "Cerveau" (Pour l'IA et l'Affichage)
-- -----------------------------------------------------
CREATE TABLE products (
    id SERIAL PRIMARY KEY,
    name VARCHAR(150) NOT NULL,    -- Nom commercial (ex: Robe d'été)
    brand VARCHAR(50),             -- Marque (ex: Zara)
    category VARCHAR(50),          -- Catégorie (ex: Robes)
    description TEXT,              -- Description marketing
    image_url TEXT,                -- Image principale
    
    -- LE SUPER-POUVOIR (JSONB)
    -- Ici, on stocke tout ce qui aide l'IA à "comprendre" le vêtement
    -- Ex: { "style": "Bohème", "saison": "Eté", "matiere": "Lin", "occasion": "Mariage" }
    attributes JSONB DEFAULT '{}', 
    
    created_at TIMESTAMP DEFAULT NOW()
);

-- -----------------------------------------------------
-- 3. TABLE ENFANT : Le "Physique" (Pour le Panier et le Stock)
-- -----------------------------------------------------
CREATE TABLE product_variants (
    id SERIAL PRIMARY KEY,
    product_id INTEGER REFERENCES products(id) ON DELETE CASCADE,
    
    -- L'objet précis
    size VARCHAR(20),              -- XS, M, 42, Unique...
    color VARCHAR(50),             -- Nom de la couleur (ex: Rouge Rubis)
    color_hex VARCHAR(7),          -- Code couleur pour l'affichage (ex: #E0115F)
    
    -- L'argent et le stock (SQL Strict obligatoire ici)
    price DECIMAL(10, 2) NOT NULL, -- Prix (peut varier selon la taille ou matière)
    promo_price DECIMAL(10, 2),    -- Prix soldé (NULL si pas de promo)
    stock_quantity INTEGER DEFAULT 0,
    
    sku VARCHAR(50) UNIQUE         -- Code unique gestion (ex: ZARA-ROBE-RED-M)
);

-- -----------------------------------------------------
-- 4. L'ACCÉLÉRATEUR (Index GIN)
-- -----------------------------------------------------
-- C'est ce qui permet à l'IA de fouiller dans le JSON instantanément
CREATE INDEX idx_products_attributes ON products USING GIN (attributes);


-- -----------------------------------------------------
-- 5. JEU DE DONNÉES DE DÉMONSTRATION
-- -----------------------------------------------------

-- A. On crée le produit "Parent" (Une Robe)
INSERT INTO products (name, brand, category, description, image_url, attributes) 
VALUES (
    'Robe Fleurie Bohème', 
    'Mango', 
    'Robe', 
    'Une robe légère parfaite pour les journées ensoleillées.',
    'https://images.unsplash.com/photo-1572804013309-59a88b7e92f1?w=500',
    '{ "style": "Bohème", "saison": "Eté", "motif": "Fleurs", "longueur": "Mi-longue", "matiere": "Viscose" }'
);

-- B. On crée les variantes (Les stocks réels pour cette robe - ID 1)
INSERT INTO product_variants (product_id, size, color, color_hex, price, stock_quantity, sku) VALUES
(1, 'S', 'Rouge Corail', '#FF7F50', 49.99, 5, 'MNGO-ROBE-S'),
(1, 'M', 'Rouge Corail', '#FF7F50', 49.99, 12, 'MNGO-ROBE-M'),
(1, 'L', 'Rouge Corail', '#FF7F50', 49.99, 0, 'MNGO-ROBE-L'); -- Rupture de stock !

-- A. On crée un deuxième produit (Un Manteau)
INSERT INTO products (name, brand, category, description, image_url, attributes) 
VALUES (
    'Parka Grand Froid', 
    'North Face', 
    'Manteau', 
    'Protection extrême pour les hivers rigoureux.',
    'https://images.unsplash.com/photo-1591047139829-d91aecb6caea?w=500',
    '{ "style": "Sport", "saison": "Hiver", "temperature": "Extreme", "impermeable": true }'
);

-- B. Variantes du Manteau (ID 2)
INSERT INTO product_variants (product_id, size, color, color_hex, price, promo_price, stock_quantity, sku) VALUES
(2, 'L', 'Noir', '#000000', 299.00, 250.00, 3, 'NF-PARKA-BLK-L'),
(2, 'XL', 'Kaki', '#556B2F', 299.00, NULL, 8, 'NF-PARKA-GRN-XL');
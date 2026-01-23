from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base

# Ton URL de connexion avec le mot de passe 'admin'
SQLALCHEMY_DATABASE_URL = "postgresql://postgres:admin@localhost/smartshop_db"

# Le moteur
engine = create_engine(SQLALCHEMY_DATABASE_URL)

# La session (l'outil pour faire des requêtes)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# La base pour créer les modèles
Base = declarative_base()

# Fonction pour récupérer la DB (on l'utilisera dans main.py)
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
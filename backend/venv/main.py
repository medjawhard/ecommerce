from fastapi import FastAPI, Depends, HTTPException
from fastapi.middleware.cors import CORSMiddleware # <--- IMPORTEZ CECI
from sqlalchemy.orm import Session
import models
from database import engine, get_db

models.Base.metadata.create_all(bind=engine)

app = FastAPI()

# --- CONFIGURATION CORS (AUTORISER LE FRONTEND) ---
origins = [
    "http://localhost:5173", # L'adresse de votre site React
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
# --------------------------------------------------

@app.get("/")
def read_root():
    return {"message": "API SmartShop en ligne ! 🚀"}

@app.post("/products/")
def create_product(name: str, price: float, description: str, db: Session = Depends(get_db)):
    new_product = models.Product(name=name, price=price, description=description)
    db.add(new_product)
    db.commit()
    db.refresh(new_product)
    return new_product

@app.get("/products/")
def read_products(db: Session = Depends(get_db)):
    products = db.query(models.Product).all()
    return products
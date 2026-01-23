import os
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Optional
from dotenv import load_dotenv
from google import genai

load_dotenv()
app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

client = genai.Client(api_key=os.getenv("GEMINI_API_KEY"))

# On simplifie la réception des données pour éviter l'erreur 422/500
class ChatRequest(BaseModel):
    message: str
    history: Optional[List[dict]] = [] # On accepte une liste de dictionnaires bruts

@app.post("/api/chat")
async def chat_endpoint(request: ChatRequest):
    try:
        # 1. Formatage manuel de l'historique pour Google GenAI
        formatted_history = []
        for msg in request.history:
            # On vérifie que le message a bien le bon format
            role = "user" if msg.get("role") == "user" else "model"
            content = msg.get("parts", "")
            
            # Format attendu par le SDK : {"role": "...", "parts": [{"text": "..."}]}
            formatted_history.append({
                "role": role,
                "parts": [{"text": content}]
            })

        # 2. Création de la session avec historique
        chat_session = client.chats.create(
            model="gemini-2.5-flash",
            config={
                "system_instruction": "Tu es l'assistant de 'SmartShop', une boutique de mode chic et moderne. "
            "TON STYLE : "
            "- Sois chaleureux, poli et utilise des émojis (✨, 👗, 👟, 🛍️). "
            "- Tes réponses doivent être COURTES et percutantes (pas de longs paragraphes). "
            "- Pose toujours une question à la fin pour aider le client. "
            "- Ne fais pas de listes ennuyeuses, parle comme un styliste personnel. "
            "- Si l'utilisateur est impoli, reste professionnel et élégant."
            },
            history=formatted_history
        )

        # 3. Envoi du nouveau message
        response = chat_session.send_message(request.message)
        
        return {"reply": response.text}
    
    except Exception as e:
        print(f"DEBUG ERROR: {e}")
        raise HTTPException(status_code=500, detail=str(e))
    
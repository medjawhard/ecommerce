import os
from dotenv import load_dotenv
from google import genai

# 1. Chargement
load_dotenv()
api_key = os.getenv("GEMINI_API_KEY")

# 2. Client (On reste simple)
client = genai.Client(api_key=api_key)

def run_test():
    try:
        print("--- Test Gemini 2.5 Flash (Mode Simple) ---")
        
        # On met l'instruction système directement dans le prompt 
        # pour éviter l'erreur 400 de structure JSON
        prompt_complet = "Consigne: Tu es un assistant e-commerce en français. \n\n Question: Bonjour, confirme que tu fonctionnes."
        
        response = client.models.generate_content(
            model="gemini-2.5-flash",
            contents=prompt_complet
        )
        
        print("\n✅ TEST RÉUSSI !")
        print(f"Réponse : {response.text}")

    except Exception as e:
        print(f"\n❌ Erreur : {e}")

if __name__ == "__main__":
    run_test()
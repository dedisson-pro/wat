import os
import json
import base64
import requests as http_requests
from groq import Groq

GROQ_API_KEY = os.getenv("GROQ_API_KEY")
if not GROQ_API_KEY:
    print("WARNING: GROQ_API_KEY manquante")

client = Groq(api_key=GROQ_API_KEY)

SYSTEM_PROMPT = """Tu es WhatAPlant, un agent IA expert en botanique, agronomie et medecine traditionnelle africaine.
Tu analyses les plantes et fournis des rapports complets en francais.
Sois precis et mentionne toujours de consulter un professionnel pour usage medical."""

def get_wikimedia_image(query: str):
    """Cherche une image sur Wikimedia Commons (gratuit, sans cle)."""
    try:
        resp = http_requests.get(
            "https://en.wikipedia.org/w/api.php",
            params={
                "action": "query",
                "titles": query,
                "prop": "pageimages",
                "format": "json",
                "pithumbsize": 400,
                "redirects": 1
            },
            timeout=10
        )
        data = resp.json()
        pages = data.get("query", {}).get("pages", {})
        for page in pages.values():
            thumb = page.get("thumbnail", {}).get("source")
            if thumb:
                return thumb
    except Exception as e:
        print(f"Wikimedia error: {e}")
    return None

def analyze_plant(plant_info: dict) -> dict:
    """Genere un rapport complet sur la plante via Groq."""
    prompt = (
        "Analyse la plante : " + str(plant_info.get("scientific_name")) +
        " (" + str(plant_info.get("common_name")) + "), famille " +
        str(plant_info.get("family")) + ", confiance " +
        str(plant_info.get("confidence")) + "%.\n"
        "Reponds UNIQUEMENT avec ce JSON sans texte avant ou apres :\n"
        '{"health_status":"...","is_edible":"Oui/Non/Partiellement","edible_details":"...",'
        '"recipe_suggestions":["recette 1","recette 2","recette 3"],'
        '"is_medicinal":"Oui/Non","medicinal_details":"...",'
        '"is_toxic":"Oui/Non/Partiellement","toxic_details":"...",'
        '"is_invasive":"Oui/Non","environmental_impact":"...","summary":"..."}'
    )
    try:
        response = client.chat.completions.create(
            model="llama-3.3-70b-versatile",
            messages=[
                {"role": "system", "content": SYSTEM_PROMPT},
                {"role": "user", "content": prompt}
            ],
            temperature=0.3,
            max_tokens=1500
        )
        content = response.choices[0].message.content.strip()
        if content.startswith("```"):
            content = content.split("```")[1]
            if content.startswith("json"):
                content = content[4:]
        result = json.loads(content)

        # Images via Wikimedia (gratuit, sans cle, fonctionne sur Railway)
        plant_name = plant_info.get("common_name") or plant_info.get("scientific_name", "plant")
        recipes = result.get("recipe_suggestions", [])
        recipe_images = []
        for recipe in recipes[:3]:
            img_url = get_wikimedia_image(recipe) or get_wikimedia_image(plant_name)
            recipe_images.append({"name": recipe, "image_url": img_url})
        result["recipe_images"] = recipe_images
        return result

    except Exception as e:
        return {"error": str(e), "summary": "Analyse IA indisponible.", "recipe_images": []}

def chat_with_agent(plant_context: dict, user_message: str, history: list) -> dict:
    """Conversation contextuelle avec l'agent IA."""
    context = (
        "Plante : " + str(plant_context.get("scientific_name")) +
        " (" + str(plant_context.get("common_name")) + "). " +
        "Rapport : " + str(plant_context.get("ai_report", ""))
    )
    messages = [{"role": "system", "content": SYSTEM_PROMPT + "\n\n" + context}]
    for msg in history[-6:]:
        messages.append(msg)
    messages.append({"role": "user", "content": user_message})

    try:
        response = client.chat.completions.create(
            model="llama-3.3-70b-versatile",
            messages=messages,
            temperature=0.5,
            max_tokens=800
        )
        reply_text = response.choices[0].message.content

        # Image Wikimedia si l'utilisateur parle de recette
        recipe_keywords = ["recette", "sauce", "preparer", "cuisiner", "plat", "decoction", "infusion"]
        image_url = None
        if any(kw in user_message.lower() for kw in recipe_keywords):
            plant_name = plant_context.get("common_name", "plant")
            image_url = get_wikimedia_image(plant_name)

        return {"reply": reply_text, "image_url": image_url}
    except Exception as e:
        return {"reply": "Erreur : " + str(e), "image_url": None}

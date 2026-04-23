import cv2
import numpy as np
import requests
import os

PLANTNET_API_KEY = os.getenv("PLANTNET_API_KEY")
PLANTNET_URL = "https://my-api.plantnet.org/v2/identify/all"

if not PLANTNET_API_KEY:
    print("⚠️  PLANTNET_API_KEY manquante — les scans ne fonctionneront pas")

def preprocess_image(image_bytes: bytes) -> bytes:
    """Améliore la qualité de l'image avec OpenCV avant envoi à PlantNet."""
    nparr = np.frombuffer(image_bytes, np.uint8)
    img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
    if img is None:
        return image_bytes
    h, w = img.shape[:2]
    if max(h, w) > 1200:
        scale = 1200 / max(h, w)
        img = cv2.resize(img, (int(w * scale), int(h * scale)), interpolation=cv2.INTER_AREA)
    lab = cv2.cvtColor(img, cv2.COLOR_BGR2LAB)
    l, a, b = cv2.split(lab)
    clahe = cv2.createCLAHE(clipLimit=2.0, tileGridSize=(8, 8))
    l = clahe.apply(l)
    img = cv2.cvtColor(cv2.merge((l, a, b)), cv2.COLOR_LAB2BGR)
    _, buf = cv2.imencode(".jpg", img, [cv2.IMWRITE_JPEG_QUALITY, 85])
    return buf.tobytes()

def identify_plant(image_bytes: bytes) -> dict:
    """Envoie l'image à PlantNet et retourne le résultat brut."""
    if not PLANTNET_API_KEY:
        return {"error": "Clé API PlantNet manquante"}
    processed = preprocess_image(image_bytes)
    files = [("images", ("plant.jpg", processed, "image/jpeg"))]
    params = {"api-key": PLANTNET_API_KEY, "lang": "fr", "include-related-images": "false"}
    try:
        resp = requests.post(PLANTNET_URL, files=files, params=params, timeout=30)
        resp.raise_for_status()
        return resp.json()
    except requests.exceptions.HTTPError as e:
        return {"error": f"PlantNet HTTP {resp.status_code} : {e}"}
    except Exception as e:
        return {"error": str(e)}

def parse_plantnet_result(result: dict) -> dict:
    """Extrait les infos essentielles du résultat PlantNet."""
    if "error" in result:
        return result
    results = result.get("results", [])
    if not results:
        return {"error": "Aucune plante identifiée"}
    best = results[0]
    species = best.get("species", {})
    common_names = species.get("commonNames", [])
    return {
        "scientific_name": species.get("scientificNameWithoutAuthor", "Inconnu"),
        "common_name": common_names[0] if common_names else "Inconnu",
        "family": species.get("family", {}).get("scientificNameWithoutAuthor", "Inconnue"),
        "confidence": round(best.get("score", 0) * 100, 1),
        "all_results": [
            {"scientific_name": r.get("species", {}).get("scientificNameWithoutAuthor"),
             "score": round(r.get("score", 0) * 100, 1)}
            for r in results[:3]
        ]
    }

import json
import time

from google import genai
from google.genai import types

from config import GEMINI_API_KEY, GEMINI_MODEL

# Har marketplace ke rules
RULES = {
    "etsy":    {"title_max": 140, "tags": 13},
    "amazon":  {"title_max": 200, "tags": 7},
    "ebay":    {"title_max": 80,  "tags": 5},
    "shopify": {"title_max": 70,  "tags": 10},
}


def generate_listing(image_bytes: bytes, mime_type: str, marketplace: str, keywords: str = "") -> dict:
    if not GEMINI_API_KEY:
        raise ValueError("GEMINI_API_KEY .env mein nahi mili")

    rules = RULES[marketplace]
    client = genai.Client(
        api_key=GEMINI_API_KEY,
        http_options=types.HttpOptions(timeout=60_000),  # 60 second se zyada nahi rukega
    )

    prompt = f"""
You are an expert e-commerce SEO copywriter.
Look at the product photo and write a listing for {marketplace.upper()}.

Rules:
- title: at most {rules['title_max']} characters, SEO friendly, starts with the main keyword
- short_description: 1-2 sentences
- description: 120-200 words, clear and persuasive, no false claims
- tags: exactly {rules['tags']} short keyword phrases (max 20 characters each)
- attributes: object with product_type, color, material, style (use "unknown" if not visible)
Seller keywords to include if relevant: {keywords or "none"}

Return ONLY JSON with keys:
title, short_description, description, tags, attributes
"""

    response = None
    for attempt in range(3):
        try:
            response = client.models.generate_content(
                model=GEMINI_MODEL,
                contents=[types.Part.from_bytes(data=image_bytes, mime_type=mime_type), prompt],
                config=types.GenerateContentConfig(response_mime_type="application/json"),
            )
            break
        except Exception as e:
            msg = str(e)
            busy = "503" in msg or "UNAVAILABLE" in msg
            if busy and attempt < 2:
                time.sleep(3 * (attempt + 1))  # 3 sec, phir 6 sec ruk kar dobara
                continue
            raise
    data = json.loads(response.text)

    # AI ki galti pakro: rules zabardasti lagao
    data["title"] = data["title"][: rules["title_max"]]
    data["tags"] = [t[:20] for t in data["tags"]][: rules["tags"]]
    data["marketplace"] = marketplace
    return data
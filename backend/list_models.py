from google import genai
from config import GEMINI_API_KEY

client = genai.Client(api_key=GEMINI_API_KEY)
for m in client.models.list():
    actions = m.supported_actions or []
    if "generateContent" in actions:
        print(m.name)
        
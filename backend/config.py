import os
from dotenv import load_dotenv

# .env file se settings parho
load_dotenv()

SECRET_KEY = os.getenv("SECRET_KEY", "badal-do-ye-development-key")
ALGORITHM = "HS256"
TOKEN_EXPIRE_MINUTES = 60 * 24  # token 1 din tak chalega
# database.py
from motor.motor_asyncio import AsyncIOMotorClient

# Replace <password> with your Atlas DB user's password
MONGO_URL = "mongodb+srv://ardhyak102:Lovemyself@sharesphere0.sqzrmma.mongodb.net/?retryWrites=true&w=majority&appName=sharesphere0"

# Initialize MongoDB client
client = AsyncIOMotorClient(MONGO_URL)

# Select a database (you can name it anything, e.g., 'ShareSphereDB')
db = client["ShareSphereDB"]

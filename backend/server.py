from fastapi import FastAPI, APIRouter, HTTPException, Depends, status, UploadFile, File, Form
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pydantic import BaseModel, Field, EmailStr
from typing import List, Optional, Dict, Any
import uuid
from datetime import datetime, timezone, timedelta
from passlib.context import CryptContext
import jwt
from enum import Enum
import shutil
import cloudinary
import cloudinary.uploader
import os
from pathlib import Path


ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
MONGO_URL = os.environ['MONGO_URL']
DB_NAME = os.environ['DB_NAME']
client=None
db=None

# Create the main app without a prefix
app = FastAPI()

@app.on_event("startup")
async def startup_db_client():
    global client, db
    print("Connecting to MongoDB...")
    if not MONGO_URL or not DB_NAME:
        print("❌ MONGO_URL or DB_NAME not set in environment variables")
        return
    try:
        client = AsyncIOMotorClient(MONGO_URL, serverSelectionTimeoutMS=5000)
        db = client[DB_NAME]
        # Actually test the connection
        await client.admin.command('ping')
        print(f"✅ Connected to MongoDB successfully: database-->{DB_NAME}")
    except Exception as e:
        print(f"❌ Failed to connect to MongoDB: {e}")
        db = None

# Create a router with the /api prefix
api_router = APIRouter(prefix="/api")

# Password hashing
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

# JWT settings
SECRET_KEY = "your-secret-key-here"
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 30

# Security
security = HTTPBearer()

# Configure Cloudinary
cloudinary.config(
    cloud_name=os.getenv("CLOUD_NAME"),
    api_key=os.getenv("CLOUD_API_KEY"),
    api_secret=os.getenv("CLOUD_API_SECRET")
)

# Categories
CATEGORIES = [
    "Tools", "Electronics", "Outdoor", "Home & Kitchen", 
    "Books & Stationery", "Sports & Fitness", "Event Gear", "Miscellaneous"
]

# Enums
class TransactionStatus(str, Enum):
    PENDING = "pending"
    APPROVED = "approved"
    REJECTED = "rejected"
    DELIVERED = "delivered"
    RETURNED = "returned"
    COMPLETED = "completed"

class DamageSeverity(str, Enum):
    NONE = "none"
    LIGHT = "light"
    MEDIUM = "medium"
    HIGH = "high"
    SEVERE = "severe"

class ComplaintType(str, Enum):
    DELIVERY = "delivery"
    DAMAGE = "damage"
    BEHAVIOR = "behavior"
    OTHER = "other"

# Pydantic Models
class UserCreate(BaseModel):
    email: EmailStr
    username: str
    password: str
    location: str
    phone: str

class UserLogin(BaseModel):
    email_or_username: str
    password: str

class User(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    email: str
    username: str
    location: str
    phone: str
    tokens: int = 100
    stars: float = 0.0
    success_rate: float = 0.0
    complaints_count: int = 0
    is_banned: bool = False
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    profile_image: Optional[str] = None

class UserProfile(BaseModel):
    id: str
    username: str
    location: str
    phone: str
    email: str
    tokens: int
    stars: float
    success_rate: float
    complaints_count: int
    profile_image: Optional[str] = None

class Item(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    title: str
    description: str
    category: str
    value: int  # Max 100000
    token_per_day: int
    owner_id: str
    images: List[str] = []
    availability_start: datetime
    availability_end: datetime
    is_available: bool = True
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class ItemCreate(BaseModel):
    title: str
    description: str
    category: str
    value: int
    token_per_day: int
    availability_start: str
    availability_end: str

class Transaction(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    item_id: str
    borrower_id: str
    owner_id: str
    days: int
    total_tokens: int
    start_date: datetime
    end_date: datetime
    status: TransactionStatus = TransactionStatus.PENDING
    owner_confirmed_delivery: bool = False
    borrower_confirmed_delivery: bool = False
    owner_confirmed_return: bool = False
    borrower_confirmed_return: bool = False
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class TransactionRequest(BaseModel):
    item_id: str
    days: int
    start_date: str
    end_date: str

class Review(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    transaction_id: str
    reviewer_id: str
    reviewed_user_id: str
    stars: int
    comment: Optional[str] = None
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class ReviewCreate(BaseModel):
    transaction_id: str
    reviewed_user_id: str
    stars: int
    comment: Optional[str] = None

class Complaint(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    complainant_id: str
    complained_user_id: str
    transaction_id: str
    type: ComplaintType
    description: str
    proof_images: List[str] = []
    is_valid: bool = False
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class ComplaintCreate(BaseModel):
    complained_user_id: str
    transaction_id: str
    type: str
    description: str

class Notification(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str
    title: str
    message: str
    type: str
    related_id: Optional[str] = None
    is_read: bool = False
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class Message(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    transaction_id: str
    sender_id: str
    receiver_id: str
    message: str
    timestamp: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class MessageCreate(BaseModel):
    transaction_id: str
    receiver_id: str
    message: str

class Penalty(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str
    transaction_id: str
    amount: int
    reason: str
    is_paid: bool = False
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

# Helper functions
def hash_password(password: str) -> str:
    return pwd_context.hash(password)

def verify_password(plain_password: str, hashed_password: str) -> bool:
    return pwd_context.verify(plain_password, hashed_password)

def create_access_token(data: dict):
    to_encode = data.copy()
    expire = datetime.now(timezone.utc) + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt

async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)):
    try:
        payload = jwt.decode(credentials.credentials, SECRET_KEY, algorithms=[ALGORITHM])
        user_id: str = payload.get("sub")
        if user_id is None:
            raise HTTPException(status_code=401, detail="Invalid token")
        user = await db.users.find_one({"id": user_id})
        if user is None:
            raise HTTPException(status_code=401, detail="User not found")
        return User(**user)
    except jwt.PyJWTError:
        raise HTTPException(status_code=401, detail="Invalid token")

def calculate_token_value(base_value: int, category: str) -> int:
    """Calculate suggested token value based on item value and category"""
    base_tokens = max(1, base_value // 1000)  # 1 token per 1000 value
    category_multipliers = {
        "Electronics": 1.5,
        "Tools": 1.2,
        "Event Gear": 1.3,
        "Sports & Fitness": 1.1,
        "Outdoor": 1.2,
        "Home & Kitchen": 1.0,
        "Books & Stationery": 0.8,
        "Miscellaneous": 1.0
    }
    multiplier = category_multipliers.get(category, 1.0)
    return int(base_tokens * multiplier)

async def create_notification(user_id: str, title: str, message: str, type: str, related_id: str = None):
    notification = Notification(
        user_id=user_id,
        title=title,
        message=message,
        type=type,
        related_id=related_id
    )
    await db.notifications.insert_one(notification.dict())

async def update_user_stats(user_id: str):
    """Update user's stars and success rate"""
    # Get all reviews for this user
    reviews = await db.reviews.find({"reviewed_user_id": user_id}).to_list(None)
    if reviews:
        avg_stars = sum(review["stars"] for review in reviews) / len(reviews)
        await db.users.update_one({"id": user_id}, {"$set": {"stars": avg_stars}})
    
    # Calculate success rate
    total_transactions = await db.transactions.count_documents({"$or": [{"borrower_id": user_id}, {"owner_id": user_id}]})
    completed_transactions = await db.transactions.count_documents({
        "$or": [{"borrower_id": user_id}, {"owner_id": user_id}],
        "status": TransactionStatus.COMPLETED
    })
    
    if total_transactions > 0:
        success_rate = (completed_transactions / total_transactions) * 100
        await db.users.update_one({"id": user_id}, {"$set": {"success_rate": success_rate}})

# Authentication Routes
@api_router.post("/auth/register")
async def register(user_data: UserCreate):
    # Check if user exists
    existing_user = await db.users.find_one({"$or": [{"email": user_data.email}, {"username": user_data.username}]})
    if existing_user:
        raise HTTPException(status_code=400, detail="User already exists")
    
    # Create user
    hashed_password = hash_password(user_data.password)
    user = User(
        email=user_data.email,
        username=user_data.username,
        location=user_data.location,
        phone=user_data.phone
    )
    
    user_dict = user.dict()
    user_dict["password"] = hashed_password
    await db.users.insert_one(user_dict)
    
    # Create access token
    access_token = create_access_token(data={"sub": user.id})
    
    return {"access_token": access_token, "token_type": "bearer", "user": UserProfile(**user.dict())}

@api_router.post("/auth/login")
async def login(user_data: UserLogin):
    # Find user
    user = await db.users.find_one({"$or": [{"email": user_data.email_or_username}, {"username": user_data.email_or_username}]})
    if not user or not verify_password(user_data.password, user["password"]):
        raise HTTPException(status_code=401, detail="Invalid credentials")
    
    if user.get("is_banned", False):
        raise HTTPException(status_code=403, detail="Account is banned")
    
    # Create access token
    access_token = create_access_token(data={"sub": user["id"]})
    
    return {"access_token": access_token, "token_type": "bearer", "user": UserProfile(**user)}

@api_router.get("/auth/me", response_model=UserProfile)
async def get_me(current_user: User = Depends(get_current_user)):
    return UserProfile(**current_user.dict())

# File Upload Route (IMPROVED)
@api_router.post("/upload-images")
async def upload_images(
    files: list[UploadFile] = File(...),
    current_user: User = Depends(get_current_user)  # IMPROVED: Use correct type
):
    if len(files) < 1 or len(files) > 5:
        raise HTTPException(status_code=400, detail="You must upload between 1 and 5 images")
    
    uploaded_files = []
    for file in files:
        if not file.content_type.startswith('image/'):
            raise HTTPException(status_code=400, detail="Only image files are allowed")
        
        # Upload directly to Cloudinary under user-specific folder (IMPROVED)
        result = cloudinary.uploader.upload(
            file.file, 
            folder=f"users/{current_user.id}/uploads/"
        )
        file_url = result["secure_url"]  # Public URL
        uploaded_files.append(file_url)
    
    return {"uploaded_files": uploaded_files}


# Item Routes
@api_router.post("/items", response_model=Item)
async def create_item(
    title: str = Form(...),
    description: str = Form(...),
    category: str = Form(...),
    value: int = Form(...),
    token_per_day: int = Form(...),
    availability_start: str = Form(...),
    availability_end: str = Form(...),
    images: List[str] = Form(...),
    current_user: User = Depends(get_current_user)
):
    if value > 100000:
        raise HTTPException(status_code=400, detail="Item value cannot exceed ₹1,00,000")
    
    if category not in CATEGORIES:
        raise HTTPException(status_code=400, detail="Invalid category")
    
    if len(images) < 1 or len(images) > 5:
        raise HTTPException(status_code=400, detail="Item must have between 1 and 5 images")
    
    item = Item(
        title=title,
        description=description,
        category=category,
        value=value,
        token_per_day=token_per_day,
        owner_id=current_user.id,
        images=images,
        availability_start=datetime.fromisoformat(availability_start),
        availability_end=datetime.fromisoformat(availability_end)
    )
    
    await db.items.insert_one(item.dict())
    return item

@api_router.get("/items", response_model=List[Item])
async def get_items(
    category: Optional[str] = None,
    location: Optional[str] = None,
    search: Optional[str] = None
):
    query = {"is_available": True}
    
    if category:
        query["category"] = category
    
    if search:
        query["$or"] = [
            {"title": {"$regex": search, "$options": "i"}},
            {"description": {"$regex": search, "$options": "i"}}
        ]
    
    items = await db.items.find(query).to_list(None)
    
    # Filter by location if provided
    if location:
        item_ids = [item["id"] for item in items]
        users = await db.users.find({"id": {"$in": [item["owner_id"] for item in items]}}).to_list(None)
        location_filtered_user_ids = [user["id"] for user in users if location.lower() in user["location"].lower()]
        items = [item for item in items if item["owner_id"] in location_filtered_user_ids]
    
    return [Item(**item) for item in items]

@api_router.get("/items/{item_id}", response_model=Item)
async def get_item(item_id: str):
    item = await db.items.find_one({"id": item_id})
    if not item:
        raise HTTPException(status_code=404, detail="Item not found")
    return Item(**item)

@api_router.get("/my-items", response_model=List[Item])
async def get_my_items(current_user: User = Depends(get_current_user)):
    items = await db.items.find({"owner_id": current_user.id}).to_list(None)
    return [Item(**item) for item in items]

# Transaction Routes
@api_router.post("/transactions/request")
async def request_item(
    transaction_data: TransactionRequest,
    current_user: User = Depends(get_current_user)
):
    # Get item
    item = await db.items.find_one({"id": transaction_data.item_id})
    if not item:
        raise HTTPException(status_code=404, detail="Item not found")
    
    if item["owner_id"] == current_user.id:
        raise HTTPException(status_code=400, detail="Cannot borrow your own item")
    
    # Calculate total tokens
    total_tokens = item["token_per_day"] * transaction_data.days
    
    if current_user.tokens < total_tokens:
        raise HTTPException(status_code=400, detail="Insufficient tokens")
    
    # Create transaction
    transaction = Transaction(
        item_id=transaction_data.item_id,
        borrower_id=current_user.id,
        owner_id=item["owner_id"],
        days=transaction_data.days,
        total_tokens=total_tokens,
        start_date=datetime.fromisoformat(transaction_data.start_date),
        end_date=datetime.fromisoformat(transaction_data.end_date)
    )
    
    await db.transactions.insert_one(transaction.dict())
    
    # Create notification for owner
    await create_notification(
        item["owner_id"],
        "New Borrow Request",
        f"{current_user.username} wants to borrow {item['title']}",
        "request",
        transaction.id
    )
    
    return {"message": "Request sent successfully", "transaction_id": transaction.id}

@api_router.get("/transactions/pending", response_model=List[Dict])
async def get_pending_requests(current_user: User = Depends(get_current_user)):
    transactions = await db.transactions.find({
        "owner_id": current_user.id,
        "status": TransactionStatus.PENDING
    }).to_list(None)
    
    result = []
    for transaction in transactions:
        item = await db.items.find_one({"id": transaction["item_id"]})
        borrower = await db.users.find_one({"id": transaction["borrower_id"]})
        result.append({
            "transaction": Transaction(**transaction),
            "item": Item(**item) if item else None,
            "borrower": UserProfile(**borrower) if borrower else None
        })
    
    return result

@api_router.post("/transactions/{transaction_id}/approve")
async def approve_request(
    transaction_id: str,
    current_user: User = Depends(get_current_user)
):
    transaction = await db.transactions.find_one({"id": transaction_id, "owner_id": current_user.id})
    if not transaction:
        raise HTTPException(status_code=404, detail="Transaction not found")
    
    # Update transaction status
    await db.transactions.update_one(
        {"id": transaction_id},
        {"$set": {"status": TransactionStatus.APPROVED}}
    )
    
    # Create notifications
    await create_notification(
        transaction["borrower_id"],
        "Request Approved",
        f"Your request for {transaction['item_id']} has been approved",
        "approval",
        transaction_id
    )
    
    return {"message": "Request approved"}

@api_router.post("/transactions/{transaction_id}/reject")
async def reject_request(
    transaction_id: str,
    current_user: User = Depends(get_current_user)
):
    transaction = await db.transactions.find_one({"id": transaction_id, "owner_id": current_user.id})
    if not transaction:
        raise HTTPException(status_code=404, detail="Transaction not found")
    
    # Update transaction status
    await db.transactions.update_one(
        {"id": transaction_id},
        {"$set": {"status": TransactionStatus.REJECTED}}
    )
    
    # Create notification
    await create_notification(
        transaction["borrower_id"],
        "Request Rejected",
        f"Your request has been rejected",
        "rejection",
        transaction_id
    )
    
    return {"message": "Request rejected"}

@api_router.get("/my-activities")
async def get_my_activities(current_user: User = Depends(get_current_user)):
    # Get transactions as borrower
    borrower_transactions = await db.transactions.find({"borrower_id": current_user.id}).to_list(None)
    
    # Get transactions as owner
    owner_transactions = await db.transactions.find({"owner_id": current_user.id}).to_list(None)
    
    # Get items for transactions
    all_item_ids = set()
    for t in borrower_transactions + owner_transactions:
        all_item_ids.add(t["item_id"])
    
    items = await db.items.find({"id": {"$in": list(all_item_ids)}}).to_list(None)
    items_dict = {item["id"]: item for item in items}
    
    result = {
        "as_borrower": [],
        "as_owner": []
    }
    
    for t in borrower_transactions:
        item = items_dict.get(t["item_id"])
        result["as_borrower"].append({
            "transaction": Transaction(**t),
            "item": Item(**item) if item else None
        })
    
    for t in owner_transactions:
        item = items_dict.get(t["item_id"])
        result["as_owner"].append({
            "transaction": Transaction(**t),
            "item": Item(**item) if item else None
        })
    
    return result

# Delivery confirmation with improved token management
@api_router.post("/transactions/{transaction_id}/confirm-delivery")
async def confirm_delivery(
    transaction_id: str,
    current_user: User = Depends(get_current_user)
):
    transaction = await db.transactions.find_one({"id": transaction_id})
    if not transaction:
        raise HTTPException(status_code=404, detail="Transaction not found")
    
    update_data = {}
    if transaction["owner_id"] == current_user.id:
        update_data["owner_confirmed_delivery"] = True
    elif transaction["borrower_id"] == current_user.id:
        update_data["borrower_confirmed_delivery"] = True
    else:
        raise HTTPException(status_code=403, detail="Not authorized")
    
    await db.transactions.update_one({"id": transaction_id}, {"$set": update_data})
    
    # Check if both confirmed
    updated_transaction = await db.transactions.find_one({"id": transaction_id})
    if updated_transaction["owner_confirmed_delivery"] and updated_transaction["borrower_confirmed_delivery"]:
        # Get current borrower details
        borrower = await db.users.find_one({"id": transaction["borrower_id"]})
        
        # Check if borrower has sufficient tokens
        if borrower["tokens"] >= transaction["total_tokens"]:
            # Deduct tokens from borrower and credit to owner
            await db.users.update_one(
                {"id": transaction["borrower_id"]},
                {"$inc": {"tokens": -transaction["total_tokens"]}}
            )
            await db.users.update_one(
                {"id": transaction["owner_id"]},
                {"$inc": {"tokens": transaction["total_tokens"]}}
            )
            
            # Update transaction status
            await db.transactions.update_one(
                {"id": transaction_id},
                {"$set": {"status": TransactionStatus.DELIVERED}}
            )
            
            # Notify both users
            await create_notification(
                transaction["borrower_id"],
                "Delivery Confirmed",
                "Item delivery confirmed. Tokens deducted.",
                "delivery",
                transaction_id
            )
            await create_notification(
                transaction["owner_id"],
                "Delivery Confirmed",
                "Item delivery confirmed. Tokens credited.",
                "delivery",
                transaction_id
            )
        else:
            # Create penalty for insufficient tokens
            penalty_amount = transaction["total_tokens"] - borrower["tokens"]
            penalty = Penalty(
                user_id=transaction["borrower_id"],
                transaction_id=transaction_id,
                amount=penalty_amount,
                reason="Insufficient tokens at delivery confirmation"
            )
            await db.penalties.insert_one(penalty.dict())
            
            # Deduct available tokens and set balance to 0
            await db.users.update_one(
                {"id": transaction["borrower_id"]},
                {"$set": {"tokens": 0}}
            )
            
            # Credit owner with borrower's available tokens
            await db.users.update_one(
                {"id": transaction["owner_id"]},
                {"$inc": {"tokens": borrower["tokens"]}}
            )
            
            # Update transaction status
            await db.transactions.update_one(
                {"id": transaction_id},
                {"$set": {"status": TransactionStatus.DELIVERED}}
            )
            
            # Notify users about insufficient tokens
            await create_notification(
                transaction["borrower_id"],
                "Insufficient Tokens - Penalty Created",
                f"Partial payment made. Penalty of {penalty_amount} tokens created.",
                "penalty",
                transaction_id
            )
            await create_notification(
                transaction["owner_id"],
                "Partial Payment Received",
                f"Received {borrower['tokens']} tokens. Remaining {penalty_amount} tokens pending.",
                "partial_payment",
                transaction_id
            )
    
    return {"message": "Delivery confirmation recorded"}

# Return confirmation with improved penalty management
@api_router.post("/transactions/{transaction_id}/confirm-return")
async def confirm_return(
    transaction_id: str,
    damage_severity: str = "none",
    current_user: User = Depends(get_current_user)
):
    transaction = await db.transactions.find_one({"id": transaction_id})
    if not transaction:
        raise HTTPException(status_code=404, detail="Transaction not found")
    
    update_data = {}
    if transaction["owner_id"] == current_user.id:
        update_data["owner_confirmed_return"] = True
    elif transaction["borrower_id"] == current_user.id:
        update_data["borrower_confirmed_return"] = True
    else:
        raise HTTPException(status_code=403, detail="Not authorized")
    
    await db.transactions.update_one({"id": transaction_id}, {"$set": update_data})
    
    # Check if both confirmed
    updated_transaction = await db.transactions.find_one({"id": transaction_id})
    if updated_transaction["owner_confirmed_return"] and updated_transaction["borrower_confirmed_return"]:
        # Handle damage penalties with improved token management
        if damage_severity != "none" and transaction["owner_id"] == current_user.id:
            item = await db.items.find_one({"id": transaction["item_id"]})
            penalty_amount = 0
            
            if damage_severity == "light":
                penalty_amount = item["value"] // 4
            elif damage_severity == "medium":
                penalty_amount = item["value"] // 3
            elif damage_severity == "high":
                penalty_amount = item["value"] // 2
            elif damage_severity == "severe":
                penalty_amount = item["value"]
            
            if penalty_amount > 0:
                # Get current borrower details
                borrower = await db.users.find_one({"id": transaction["borrower_id"]})
                
                if borrower["tokens"] >= penalty_amount:
                    # Sufficient tokens - deduct penalty
                    await db.users.update_one(
                        {"id": transaction["borrower_id"]},
                        {"$inc": {"tokens": -penalty_amount}}
                    )
                    await db.users.update_one(
                        {"id": transaction["owner_id"]},
                        {"$inc": {"tokens": penalty_amount}}
                    )
                    
                    # Create paid penalty record
                    penalty = Penalty(
                        user_id=transaction["borrower_id"],
                        transaction_id=transaction_id,
                        amount=penalty_amount,
                        reason=f"Damage severity: {damage_severity}",
                        is_paid=True
                    )
                    await db.penalties.insert_one(penalty.dict())
                else:
                    # Insufficient tokens - create penalty and partial payment
                    remaining_penalty = penalty_amount - borrower["tokens"]
                    
                    # Create penalty record for remaining amount
                    penalty = Penalty(
                        user_id=transaction["borrower_id"],
                        transaction_id=transaction_id,
                        amount=remaining_penalty,
                        reason=f"Damage severity: {damage_severity} - Insufficient tokens"
                    )
                    await db.penalties.insert_one(penalty.dict())
                    
                    # Transfer borrower's available tokens to owner
                    if borrower["tokens"] > 0:
                        await db.users.update_one(
                            {"id": transaction["owner_id"]},
                            {"$inc": {"tokens": borrower["tokens"]}}
                        )
                        await db.users.update_one(
                            {"id": transaction["borrower_id"]},
                            {"$set": {"tokens": 0}}
                        )
                    
                    # Notify about penalty
                    await create_notification(
                        transaction["borrower_id"],
                        "Damage Penalty - Insufficient Tokens",
                        f"Damage penalty: {penalty_amount} tokens. Paid: {borrower['tokens']}, Pending: {remaining_penalty}",
                        "penalty",
                        transaction_id
                    )
        
        # Update transaction status to completed (ready for feedback)
        await db.transactions.update_one(
            {"id": transaction_id},
            {"$set": {"status": TransactionStatus.COMPLETED}}
        )
        
        # Update user stats
        await update_user_stats(transaction["borrower_id"])
        await update_user_stats(transaction["owner_id"])
        
        return {"message": "Return confirmation recorded", "feedback_required": True, "transaction_completed": True}
    
    return {"message": "Return confirmation recorded", "feedback_required": False}

# Reviews
@api_router.post("/reviews")
async def create_review(
    review_data: ReviewCreate,
    current_user: User = Depends(get_current_user)
):
    # Check if transaction exists and user is part of it
    transaction = await db.transactions.find_one({"id": review_data.transaction_id})
    if not transaction:
        raise HTTPException(status_code=404, detail="Transaction not found")
    
    if current_user.id not in [transaction["borrower_id"], transaction["owner_id"]]:
        raise HTTPException(status_code=403, detail="Not authorized")
    
    # Create review
    review = Review(
        transaction_id=review_data.transaction_id,
        reviewer_id=current_user.id,
        reviewed_user_id=review_data.reviewed_user_id,
        stars=review_data.stars,
        comment=review_data.comment
    )
    
    await db.reviews.insert_one(review.dict())
    
    # Update user stats
    await update_user_stats(review_data.reviewed_user_id)
    
    return {"message": "Review created successfully"}

@api_router.get("/reviews/{user_id}", response_model=List[Review])
async def get_user_reviews(user_id: str):
    reviews = await db.reviews.find({"reviewed_user_id": user_id}).to_list(None)
    return [Review(**review) for review in reviews]

# Complaints
@api_router.post("/complaints")
async def create_complaint(
    complaint_data: ComplaintCreate,
    current_user: User = Depends(get_current_user)
):
    complaint = Complaint(
        complainant_id=current_user.id,
        complained_user_id=complaint_data.complained_user_id,
        transaction_id=complaint_data.transaction_id,
        type=ComplaintType(complaint_data.type),
        description=complaint_data.description
    )
    
    await db.complaints.insert_one(complaint.dict())
    
    # For demo purposes, mark complaint as valid and update user
    await db.complaints.update_one({"id": complaint.id}, {"$set": {"is_valid": True}})
    
    # Update complained user
    user = await db.users.find_one({"id": complaint_data.complained_user_id})
    new_complaints_count = user["complaints_count"] + 1
    
    # Halve stars
    new_stars = user["stars"] / 2
    
    await db.users.update_one(
        {"id": complaint_data.complained_user_id},
        {
            "$set": {
                "complaints_count": new_complaints_count,
                "stars": new_stars,
                "is_banned": new_complaints_count >= 20
            }
        }
    )
    
    return {"message": "Complaint filed successfully"}

@api_router.get("/complaints/{user_id}", response_model=List[Complaint])
async def get_user_complaints(user_id: str):
    complaints = await db.complaints.find({"complained_user_id": user_id}).to_list(None)
    return [Complaint(**complaint) for complaint in complaints]

# Messages/Chat
@api_router.post("/messages")
async def send_message(
    message_data: MessageCreate,
    current_user: User = Depends(get_current_user)
):
    message = Message(
        transaction_id=message_data.transaction_id,
        sender_id=current_user.id,
        receiver_id=message_data.receiver_id,
        message=message_data.message
    )
    
    await db.messages.insert_one(message.dict())
    
    # Create notification
    await create_notification(
        message_data.receiver_id,
        "New Message",
        f"New message from {current_user.username}",
        "message",
        message_data.transaction_id
    )
    
    return {"message": "Message sent"}

@api_router.get("/messages/{transaction_id}")
async def get_messages(
    transaction_id: str,
    current_user: User = Depends(get_current_user)
):
    # Verify user is part of transaction
    transaction = await db.transactions.find_one({"id": transaction_id})
    if not transaction or current_user.id not in [transaction["borrower_id"], transaction["owner_id"]]:
        raise HTTPException(status_code=403, detail="Not authorized")
    
    messages = await db.messages.find({"transaction_id": transaction_id}).sort("timestamp", 1).to_list(None)
    return [Message(**message) for message in messages]

@api_router.get("/chat-list")
async def get_chat_list(current_user: User = Depends(get_current_user)):
    # Get all transactions where user is involved
    transactions = await db.transactions.find({
        "$or": [{"borrower_id": current_user.id}, {"owner_id": current_user.id}],
        "status": {"$in": [TransactionStatus.APPROVED, TransactionStatus.DELIVERED]}
    }).to_list(None)
    
    chat_list = []
    for transaction in transactions:
        # Get the other user
        other_user_id = transaction["borrower_id"] if transaction["owner_id"] == current_user.id else transaction["owner_id"]
        other_user = await db.users.find_one({"id": other_user_id})
        item = await db.items.find_one({"id": transaction["item_id"]})
        
        chat_list.append({
            "transaction_id": transaction["id"],
            "other_user": UserProfile(**other_user) if other_user else None,
            "item": Item(**item) if item else None
        })
    
    return chat_list

# Notifications
@api_router.get("/notifications", response_model=List[Notification])
async def get_notifications(current_user: User = Depends(get_current_user)):
    notifications = await db.notifications.find({"user_id": current_user.id}).sort("created_at", -1).to_list(None)
    return [Notification(**notification) for notification in notifications]

@api_router.post("/notifications/{notification_id}/read")
async def mark_notification_read(
    notification_id: str,
    current_user: User = Depends(get_current_user)
):
    await db.notifications.update_one(
        {"id": notification_id, "user_id": current_user.id},
        {"$set": {"is_read": True}}
    )
    return {"message": "Notification marked as read"}

@api_router.delete("/notifications/{notification_id}")
async def delete_notification(
    notification_id: str,
    current_user: User = Depends(get_current_user)
):
    result = await db.notifications.delete_one(
        {"id": notification_id, "user_id": current_user.id}
    )
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Notification not found")
    return {"message": "Notification deleted"}

# Penalties
@api_router.get("/penalties", response_model=List[Penalty])
async def get_my_penalties(current_user: User = Depends(get_current_user)):
    penalties = await db.penalties.find({"user_id": current_user.id}).to_list(None)
    return [Penalty(**penalty) for penalty in penalties]

# Process pending penalties when user receives tokens
@api_router.post("/process-pending-penalties")
async def process_pending_penalties(current_user: User = Depends(get_current_user)):
    # Get all unpaid penalties for user
    penalties = await db.penalties.find({"user_id": current_user.id, "is_paid": False}).to_list(None)
    
    if not penalties:
        return {"message": "No pending penalties"}
    
    user = await db.users.find_one({"id": current_user.id})
    available_tokens = user["tokens"]
    processed_penalties = []
    
    for penalty in penalties:
        if available_tokens >= penalty["amount"]:
            # Pay this penalty
            available_tokens -= penalty["amount"]
            
            # Update penalty as paid
            await db.penalties.update_one(
                {"id": penalty["id"]},
                {"$set": {"is_paid": True}}
            )
            
            # Get the creditor (owner) and credit tokens
            transaction = await db.transactions.find_one({"id": penalty["transaction_id"]})
            if transaction:
                await db.users.update_one(
                    {"id": transaction["owner_id"]},
                    {"$inc": {"tokens": penalty["amount"]}}
                )
            
            processed_penalties.append(penalty["id"])
        else:
            break  # Not enough tokens for this penalty
    
    # Update user's token balance
    await db.users.update_one(
        {"id": current_user.id},
        {"$set": {"tokens": available_tokens}}
    )
    
    return {
        "message": f"Processed {len(processed_penalties)} penalties",
        "processed_penalties": processed_penalties
    }

# Update item
@api_router.put("/items/{item_id}")
async def update_item(
    item_id: str,
    title: str = Form(...),
    description: str = Form(...),
    category: str = Form(...),
    value: int = Form(...),
    token_per_day: int = Form(...),
    availability_start: str = Form(...),
    availability_end: str = Form(...),
    current_user: User = Depends(get_current_user)
):
    # Check if item exists and user owns it
    item = await db.items.find_one({"id": item_id, "owner_id": current_user.id})
    if not item:
        raise HTTPException(status_code=404, detail="Item not found or not owned by user")
    
    if value > 100000:
        raise HTTPException(status_code=400, detail="Item value cannot exceed ₹1,00,000")
    
    if category not in CATEGORIES:
        raise HTTPException(status_code=400, detail="Invalid category")
    
    # Update item
    update_data = {
        "title": title,
        "description": description,
        "category": category,
        "value": value,
        "token_per_day": token_per_day,
        "availability_start": datetime.fromisoformat(availability_start),
        "availability_end": datetime.fromisoformat(availability_end)
    }
    
    await db.items.update_one({"id": item_id}, {"$set": update_data})
    
    # Get updated item
    updated_item = await db.items.find_one({"id": item_id})
    return Item(**updated_item)

# Delete item
@api_router.delete("/items/{item_id}")
async def delete_item(item_id: str, current_user: User = Depends(get_current_user)):
    # Check if item exists and user owns it
    item = await db.items.find_one({"id": item_id, "owner_id": current_user.id})
    if not item:
        raise HTTPException(status_code=404, detail="Item not found or not owned by user")
    
    # Check if item has active transactions
    active_transactions = await db.transactions.find({
        "item_id": item_id,
        "status": {"$in": [TransactionStatus.PENDING, TransactionStatus.APPROVED, TransactionStatus.DELIVERED]}
    }).to_list(None)
    
    if active_transactions:
        raise HTTPException(status_code=400, detail="Cannot delete item with active transactions")
    
    # Delete the item
    result = await db.items.delete_one({"id": item_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Item not found")
    
    # Delete images from Cloudinary
    for url in item.get('images', []):
        public_id = url.split('/')[-1].split('.')[0]  # Extract public_id
        try:
            cloudinary.uploader.destroy(public_id)
        except Exception as e:
            logger.error(f"Failed to delete image {url}: {e}")
    
    return {"message": "Item deleted successfully"}

# Toggle item availability
@api_router.patch("/items/{item_id}/toggle-availability")
async def toggle_item_availability(item_id: str, current_user: User = Depends(get_current_user)):
    # Check if item exists and user owns it
    item = await db.items.find_one({"id": item_id, "owner_id": current_user.id})
    if not item:
        raise HTTPException(status_code=404, detail="Item not found or not owned by user")
    
    # Toggle availability
    new_availability = not item["is_available"]
    await db.items.update_one({"id": item_id}, {"$set": {"is_available": new_availability}})
    
    return {"message": f"Item {'enabled' if new_availability else 'disabled'} successfully", "is_available": new_availability}

# Update user profile
@api_router.put("/auth/profile")
async def update_profile(
    username: str = Form(...),
    location: str = Form(...),
    phone: str = Form(...),
    password: Optional[str] = Form(None),
    current_user: User = Depends(get_current_user)
):
    # Check if username is already taken by another user
    existing_user = await db.users.find_one({"username": username, "id": {"$ne": current_user.id}})
    if existing_user:
        raise HTTPException(status_code=400, detail="Username already taken")
    
    # Prepare update data
    update_data = {
        "username": username,
        "location": location,
        "phone": phone
    }
    
    # Update password if provided
    if password and password.strip():
        update_data["password"] = hash_password(password)
    
    # Update user
    await db.users.update_one({"id": current_user.id}, {"$set": update_data})
    
    # Get updated user
    updated_user = await db.users.find_one({"id": current_user.id})
    return UserProfile(**updated_user)

# Delete user account
@api_router.delete("/auth/account")
async def delete_account(current_user: User = Depends(get_current_user)):
    # Check for active transactions
    active_transactions = await db.transactions.find({
        "$or": [{"borrower_id": current_user.id}, {"owner_id": current_user.id}],
        "status": {"$in": [TransactionStatus.PENDING, TransactionStatus.APPROVED, TransactionStatus.DELIVERED]}
    }).to_list(None)
    
    if active_transactions:
        raise HTTPException(status_code=400, detail="Cannot delete account with active transactions. Please complete or cancel all active transactions first.")
    
    # Delete user's items (but keep transaction history for other users)
    await db.items.delete_many({"owner_id": current_user.id})
    
    # Mark user as deleted (instead of actual deletion to preserve transaction history)
    await db.users.update_one(
        {"id": current_user.id}, 
        {"$set": {"is_banned": True, "username": f"deleted_user_{current_user.id[:8]}", "email": f"deleted_{current_user.id}@deleted.com"}}
    )
    
    return {"message": "Account deleted successfully"}

# Categories
@api_router.get("/categories")
async def get_categories():
    return {"categories": CATEGORIES}

# Suggested token value
@api_router.get("/suggested-tokens")
async def get_suggested_tokens(value: int, category: str):
    suggested = calculate_token_value(value, category)
    return {"suggested_tokens": suggested}



@app.api_route("/", methods=["GET", "HEAD"])
async def root():
    return {"message": "Backend is live! Use /api/* endpoints."}

@app.get("/health")
async def health_check():
    """Health check endpoint for Render"""
    return {"status": "healthy", "timestamp": datetime.now(timezone.utc).isoformat()}

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include the router in the main app
app.include_router(api_router)

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

@app.on_event("shutdown")
async def shutdown_db_client():
    global client
    if client:
        client.close()
        print("MongoDB connection closed")

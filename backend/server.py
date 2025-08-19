#server.py
from fastapi import FastAPI, APIRouter, Depends, HTTPException, status, UploadFile, File, Form
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from fastapi.staticfiles import StaticFiles
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
from passlib.context import CryptContext
from jose import JWTError, jwt
from datetime import datetime, timedelta
from pathlib import Path
from pydantic import BaseModel, Field, EmailStr
from typing import List, Optional, Dict, Any
from enum import Enum
import os
import uuid
import shutil
import logging
from dotenv import load_dotenv
from fastapi.responses import FileResponse
from fastapi.responses import HTMLResponse
# Setup
ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# Constants
SECRET_KEY = os.environ.get('SECRET_KEY', 'your-secret-key-change-in-production')
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 30
UPLOAD_DIR = ROOT_DIR / "uploads"
UPLOAD_DIR.mkdir(exist_ok=True)
print(f"📁 Upload folder ready at {UPLOAD_DIR}")
# React build folder
BUILD_DIR = ROOT_DIR.parent / "frontend" / "build"
print(f"📦 React build folder set to {BUILD_DIR}")

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]
print("✅ Connected to MongoDB")

# Security
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
security = HTTPBearer()
print("🔐 Security setup complete")

app = FastAPI(title="ShareSphere API", version="1.0.0")
print("🚀 Server starting...")
api_router = APIRouter(prefix="/api")

# Serve uploaded files
app.mount("/uploads", StaticFiles(directory=str(UPLOAD_DIR)), name="uploads")
# Serve React static files FIRST - this is crucial for MIME types
app.mount("/static", StaticFiles(directory=BUILD_DIR / "static"), name="static")
app.mount("/items/static", StaticFiles(directory=BUILD_DIR / "static"), name="items_static")
app.mount("/frontend", StaticFiles(directory=BUILD_DIR, html=True), name="frontend")


@app.get("/items/add", include_in_schema=False)
async def add_item_page():
    print("➡ Add Item page requested: /items/add")
    # Read the index.html and modify static paths to be absolute
    with open(BUILD_DIR / "index.html", "r") as f:
        html_content = f.read()
    
    # Replace relative static paths with absolute ones
    html_content = html_content.replace('href="/static/', 'href="https://sharesphere-com.onrender.com/static/')
    html_content = html_content.replace('src="/static/', 'src="https://sharesphere-com.onrender.com/static/')
    
    return HTMLResponse(content=html_content)

# Enums
class TransactionStatus(str, Enum):
    REQUESTED = "requested"
    APPROVED = "approved"
    ACTIVE = "active"
    RETURNED = "returned"
    COMPLETED = "completed"
    REJECTED = "rejected"
    DISPUTED = "disputed"

class ItemCondition(str, Enum):
    EXCELLENT = "excellent"
    GOOD = "good"
    FAIR = "fair"
    POOR = "poor"

class ItemCategory(str, Enum):
    TOOLS = "tools"
    ELECTRONICS = "electronics"
    OUTDOOR_GEAR = "outdoor_gear"
    BOOKS = "books"
    APPLIANCES = "appliances"
    SPORTS = "sports"
    OTHER = "other"

class NotificationType(str, Enum):
    TRANSACTION_REQUEST = "transaction_request"
    TRANSACTION_APPROVED = "transaction_approved"
    TRANSACTION_REJECTED = "transaction_rejected"
    TRANSACTION_RETURNED = "transaction_returned"
    TRANSACTION_COMPLETED = "transaction_completed"
    MESSAGE_RECEIVED = "message_received"
    SYSTEM = "system"

# Models
class UserCreate(BaseModel):
    email: EmailStr
    password: str
    name: str
    phone: str
    address: str

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class UserProfile(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    email: EmailStr
    name: str
    phone: str
    address: str
    tokens: int = 50
    stars: int = 0
    profile_image: Optional[str] = None
    verified: bool = False
    created_at: datetime = Field(default_factory=datetime.utcnow)
    total_lends: int = 0
    total_borrows: int = 0
    successful_transactions: int = 0

class UserUpdate(BaseModel):
    name: Optional[str] = None
    phone: Optional[str] = None
    address: Optional[str] = None

class Token(BaseModel):
    access_token: str
    token_type: str

class ItemCreate(BaseModel):
    name: str
    description: str
    category: ItemCategory
    condition: ItemCondition
    value: float
    token_cost: int
    available_from: datetime
    available_until: datetime

class ItemUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    condition: Optional[ItemCondition] = None
    token_cost: Optional[int] = None
    available_from: Optional[datetime] = None
    available_until: Optional[datetime] = None

class Item(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    description: str
    category: ItemCategory
    condition: ItemCondition
    value: float
    token_cost: int
    owner_id: str
    owner_name: str
    images: List[str] = []
    available_from: datetime
    available_until: datetime
    is_available: bool = True
    created_at: datetime = Field(default_factory=datetime.utcnow)

class TransactionCreate(BaseModel):
    item_id: str
    pickup_contact: Dict[str, str]  # name, phone, email, address
    return_contact: Dict[str, str]
    requested_from: datetime
    requested_until: datetime

class TransactionUpdate(BaseModel):
    status: Optional[TransactionStatus] = None
    return_condition: Optional[ItemCondition] = None
    damage_notes: Optional[str] = None
    lender_notes: Optional[str] = None

class Transaction(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    item_id: str
    item_name: str
    borrower_id: str
    borrower_name: str
    lender_id: str
    lender_name: str
    status: TransactionStatus
    token_cost: int
    pickup_contact: Dict[str, str]
    return_contact: Dict[str, str]
    requested_from: datetime
    requested_until: datetime
    approved_at: Optional[datetime] = None
    started_at: Optional[datetime] = None
    returned_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None
    return_condition: Optional[ItemCondition] = None
    damage_notes: Optional[str] = None
    lender_notes: Optional[str] = None
    created_at: datetime = Field(default_factory=datetime.utcnow)

class MessageCreate(BaseModel):
    receiver_id: str
    content: str
    transaction_id: Optional[str] = None

class Message(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    sender_id: str
    sender_name: str
    receiver_id: str
    receiver_name: str
    content: str
    transaction_id: Optional[str] = None
    created_at: datetime = Field(default_factory=datetime.utcnow)
    read: bool = False

class Notification(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str
    type: NotificationType
    title: str
    message: str
    data: Optional[Dict[str, Any]] = None
    read: bool = False
    created_at: datetime = Field(default_factory=datetime.utcnow)

# Auth utilities
def verify_password(plain_password, hashed_password):
    return pwd_context.verify(plain_password, hashed_password)

def get_password_hash(password):
    return pwd_context.hash(password)

def create_access_token(data: dict, expires_delta: Optional[timedelta] = None):
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=15)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt
    
@app.get("/")
async def home():
    try:
        collections = await db.list_collection_names()
        return {"msg": "FastAPI + MongoDB is running 🚀", "collections": collections}
    except Exception as e:
        return {"error": str(e)}

async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)):
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        token = credentials.credentials
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        user_id: str = payload.get("sub")
        if user_id is None:
            raise credentials_exception
    except JWTError:
        raise credentials_exception
    
    user = await db.users.find_one({"id": user_id})
    if user is None:
        raise credentials_exception
    return UserProfile(**user)

# Utility functions
async def create_notification(user_id: str, type: NotificationType, title: str, message: str, data: Optional[Dict] = None):
    notification = Notification(
        user_id=user_id,
        type=type,
        title=title,
        message=message,
        data=data
    )
    await db.notifications.insert_one(notification.dict())

async def adjust_tokens_and_stars(user_id: str, token_change: int, star_change: int):
    await db.users.update_one(
        {"id": user_id},
        {"$inc": {"tokens": token_change, "stars": star_change}}
    )

# Keep your existing /auth/register
@api_router.post("/auth/register", response_model=Dict[str, str])
async def register(user: UserCreate):
    # existing code
    existing_user = await db.users.find_one({"email": user.email})
    if existing_user:
        raise HTTPException(status_code=400, detail="Email already registered")
    
    hashed_password = get_password_hash(user.password)
    user_profile = UserProfile(
        email=user.email,
        name=user.name,
        phone=user.phone,
        address=user.address
    )
    
    user_dict = user_profile.dict()
    user_dict["password"] = hashed_password
    await db.users.insert_one(user_dict)
    
    return {"message": "User registered successfully", "user_id": user_profile.id}

# Add this new endpoint pointing to the same function
@api_router.post("/register", response_model=Dict[str, str])
async def register_shortcut(user: UserCreate):
    return await register(user)

@api_router.post("/auth/login", response_model=Token)
async def login(user: UserLogin):
    db_user = await db.users.find_one({"email": user.email})
    if not db_user or not verify_password(user.password, db_user["password"]):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password"
        )
    
    access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        data={"sub": db_user["id"]}, expires_delta=access_token_expires
    )
    return {"access_token": access_token, "token_type": "bearer"}

@api_router.get("/auth/me", response_model=UserProfile)
async def get_current_user_profile(current_user: UserProfile = Depends(get_current_user)):
    return current_user

# User endpoints
@api_router.put("/users/profile", response_model=UserProfile)
async def update_profile(
    profile_update: UserUpdate,
    current_user: UserProfile = Depends(get_current_user)
):
    update_data = {k: v for k, v in profile_update.dict().items() if v is not None}
    if update_data:
        await db.users.update_one({"id": current_user.id}, {"$set": update_data})
    
    updated_user = await db.users.find_one({"id": current_user.id})
    return UserProfile(**updated_user)

@api_router.get("/users/{user_id}", response_model=UserProfile)
async def get_user_profile(user_id: str):
    user = await db.users.find_one({"id": user_id})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Remove sensitive information
    user_data = UserProfile(**user)
    return user_data

# Item endpoints
@api_router.post("/items", response_model=Item)
async def create_item(
    name: str = Form(...),
    description: str = Form(...),
    category: ItemCategory = Form(...),
    condition: ItemCondition = Form(...),
    value: float = Form(...),
    token_cost: int = Form(...),
    available_from: str = Form(...),
    available_until: str = Form(...),
    images: List[UploadFile] = File(...),  # Made required
    current_user: UserProfile = Depends(get_current_user)
):
    # Validate that at least one image is provided
    if not images or len(images) == 0 or (len(images) == 1 and not images[0].filename):
        raise HTTPException(status_code=400, detail="At least one image is required")
    
    # Validate value cap
    if value > 100000:
        raise HTTPException(status_code=400, detail="Item value cannot exceed ₹1,00,000")
    
    # Parse dates
    try:
        available_from_dt = datetime.fromisoformat(available_from.replace('Z', '+00:00'))
        available_until_dt = datetime.fromisoformat(available_until.replace('Z', '+00:00'))
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid date format")
    
    # Save images
    image_paths = []
    for image in images:
        if image.filename:
            file_extension = Path(image.filename).suffix
            unique_filename = f"{uuid.uuid4()}{file_extension}"
            file_path = UPLOAD_DIR / unique_filename
            
            with open(file_path, "wb") as buffer:
                shutil.copyfileobj(image.file, buffer)
            
            image_paths.append(f"/uploads/{unique_filename}")
    
    # Create item
    item = Item(
        name=name,
        description=description,
        category=category,
        condition=condition,
        value=value,
        token_cost=token_cost,
        owner_id=current_user.id,
        owner_name=current_user.name,
        images=image_paths,
        available_from=available_from_dt,
        available_until=available_until_dt
    )
    
    await db.items.insert_one(item.dict())
    return item

@api_router.get("/items", response_model=List[Item])
async def get_items(
    category: Optional[ItemCategory] = None,
    search: Optional[str] = None,
    available_only: bool = True,
    skip: int = 0,
    limit: int = 20
):
    filter_query = {}
    
    if category:
        filter_query["category"] = category
        
    if available_only:
        filter_query["is_available"] = True
        # For now, just check if item is marked as available
        # Later we can add stricter date filtering if needed
    
    if search:
        filter_query["$or"] = [
            {"name": {"$regex": search, "$options": "i"}},
            {"description": {"$regex": search, "$options": "i"}}
        ]
    
    items = await db.items.find(filter_query).skip(skip).limit(limit).to_list(limit)
    return [Item(**item) for item in items]

@api_router.get("/items/{item_id}", response_model=Item)
async def get_item(item_id: str):
    item = await db.items.find_one({"id": item_id})
    if not item:
        raise HTTPException(status_code=404, detail="Item not found")
    return Item(**item)

@api_router.put("/items/{item_id}", response_model=Item)
async def update_item(
    item_id: str,
    item_update: ItemUpdate,
    current_user: UserProfile = Depends(get_current_user)
):
    item = await db.items.find_one({"id": item_id})
    if not item:
        raise HTTPException(status_code=404, detail="Item not found")
    
    if item["owner_id"] != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized to update this item")
    
    update_data = {k: v for k, v in item_update.dict().items() if v is not None}
    if update_data:
        await db.items.update_one({"id": item_id}, {"$set": update_data})
    
    updated_item = await db.items.find_one({"id": item_id})
    return Item(**updated_item)

@api_router.delete("/items/{item_id}")
async def delete_item(
    item_id: str,
    current_user: UserProfile = Depends(get_current_user)
):
    item = await db.items.find_one({"id": item_id})
    if not item:
        raise HTTPException(status_code=404, detail="Item not found")
    
    if item["owner_id"] != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized to delete this item")
    
    await db.items.delete_one({"id": item_id})
    return {"message": "Item deleted successfully"}

@api_router.get("/items/my/listings", response_model=List[Item])
async def get_my_items(current_user: UserProfile = Depends(get_current_user)):
    items = await db.items.find({"owner_id": current_user.id}).to_list(100)
    return [Item(**item) for item in items]

# Transaction endpoints
@api_router.post("/transactions", response_model=Transaction)
async def create_transaction(
    transaction: TransactionCreate,
    current_user: UserProfile = Depends(get_current_user)
):
    # Get item details
    item = await db.items.find_one({"id": transaction.item_id})
    if not item:
        raise HTTPException(status_code=404, detail="Item not found")
    
    if item["owner_id"] == current_user.id:
        raise HTTPException(status_code=400, detail="Cannot borrow your own item")
    
    if not item["is_available"]:
        raise HTTPException(status_code=400, detail="Item is not available")
    
    # Check if user has enough tokens
    if current_user.tokens < item["token_cost"]:
        raise HTTPException(status_code=400, detail="Insufficient tokens")
    
    # Get lender details
    lender = await db.users.find_one({"id": item["owner_id"]})
    
    # Create transaction
    new_transaction = Transaction(
        item_id=transaction.item_id,
        item_name=item["name"],
        borrower_id=current_user.id,
        borrower_name=current_user.name,
        lender_id=item["owner_id"],
        lender_name=lender["name"],
        status=TransactionStatus.REQUESTED,
        token_cost=item["token_cost"],
        pickup_contact=transaction.pickup_contact,
        return_contact=transaction.return_contact,
        requested_from=transaction.requested_from,
        requested_until=transaction.requested_until
    )
    
    await db.transactions.insert_one(new_transaction.dict())
    
    # Create notification for lender
    await create_notification(
        item["owner_id"],
        NotificationType.TRANSACTION_REQUEST,
        "New Borrow Request",
        f"{current_user.name} wants to borrow your {item['name']}",
        {"transaction_id": new_transaction.id, "item_id": transaction.item_id}
    )
    
    return new_transaction

@api_router.put("/transactions/{transaction_id}", response_model=Transaction)
async def update_transaction(
    transaction_id: str,
    transaction_update: TransactionUpdate,
    current_user: UserProfile = Depends(get_current_user)
):
    transaction = await db.transactions.find_one({"id": transaction_id})
    if not transaction:
        raise HTTPException(status_code=404, detail="Transaction not found")
    
    # Only lender can approve/reject, borrower can mark as returned
    if transaction_update.status in [TransactionStatus.APPROVED, TransactionStatus.REJECTED, TransactionStatus.COMPLETED]:
        if transaction["lender_id"] != current_user.id:
            raise HTTPException(status_code=403, detail="Only lender can approve/reject/complete transactions")
    elif transaction_update.status == TransactionStatus.RETURNED:
        if transaction["borrower_id"] != current_user.id:
            raise HTTPException(status_code=403, detail="Only borrower can mark as returned")
    
    update_data = {}
    current_status = transaction["status"]
    
    if transaction_update.status:
        update_data["status"] = transaction_update.status
        
        if transaction_update.status == TransactionStatus.APPROVED:
            update_data["approved_at"] = datetime.utcnow()
            # Deduct tokens from borrower
            await adjust_tokens_and_stars(transaction["borrower_id"], -transaction["token_cost"], 0)
            # Mark item as unavailable
            await db.items.update_one({"id": transaction["item_id"]}, {"$set": {"is_available": False}})
            
            # Notify borrower
            await create_notification(
                transaction["borrower_id"],
                NotificationType.TRANSACTION_APPROVED,
                "Request Approved",
                f"Your request for {transaction['item_name']} has been approved",
                {"transaction_id": transaction_id}
            )
            
        elif transaction_update.status == TransactionStatus.REJECTED:
            # Notify borrower
            await create_notification(
                transaction["borrower_id"],
                NotificationType.TRANSACTION_REJECTED,
                "Request Rejected",
                f"Your request for {transaction['item_name']} has been rejected",
                {"transaction_id": transaction_id}
            )
            
        elif transaction_update.status == TransactionStatus.RETURNED:
            update_data["returned_at"] = datetime.utcnow()
            if transaction_update.return_condition:
                update_data["return_condition"] = transaction_update.return_condition
            if transaction_update.damage_notes:
                update_data["damage_notes"] = transaction_update.damage_notes
                
            # Notify lender
            await create_notification(
                transaction["lender_id"],
                NotificationType.TRANSACTION_RETURNED,
                "Item Returned",
                f"{transaction['borrower_name']} has returned your {transaction['item_name']}",
                {"transaction_id": transaction_id}
            )
            
        elif transaction_update.status == TransactionStatus.COMPLETED:
            update_data["completed_at"] = datetime.utcnow()
            if transaction_update.lender_notes:
                update_data["lender_notes"] = transaction_update.lender_notes
            
            # Calculate token/star adjustments based on return condition
            item_condition = transaction.get("return_condition", ItemCondition.GOOD)
            borrower_token_change = 0
            borrower_star_change = 0
            lender_token_change = transaction["token_cost"]  # Lender gets the tokens
            lender_star_change = 1  # Base star for successful transaction
            
            if item_condition in [ItemCondition.FAIR, ItemCondition.POOR]:
                # Damage penalty
                if item_condition == ItemCondition.FAIR:
                    damage_penalty = transaction["token_cost"] // 2
                    borrower_star_change = -1
                else:  # POOR condition
                    damage_penalty = transaction["token_cost"]
                    borrower_star_change = -2
                
                borrower_token_change = -damage_penalty
                lender_token_change += damage_penalty
                lender_star_change += 1  # Extra star for damage compensation
            else:
                # Good return - reward both parties
                borrower_token_change = 1
                borrower_star_change = 1
            
            # Apply adjustments
            await adjust_tokens_and_stars(transaction["borrower_id"], borrower_token_change, borrower_star_change)
            await adjust_tokens_and_stars(transaction["lender_id"], lender_token_change, lender_star_change)
            
            # Update user statistics
            await db.users.update_one({"id": transaction["borrower_id"]}, {"$inc": {"total_borrows": 1, "successful_transactions": 1}})
            await db.users.update_one({"id": transaction["lender_id"]}, {"$inc": {"total_lends": 1, "successful_transactions": 1}})
            
            # Mark item as available again
            await db.items.update_one({"id": transaction["item_id"]}, {"$set": {"is_available": True}})
            
            # Notify borrower
            await create_notification(
                transaction["borrower_id"],
                NotificationType.TRANSACTION_COMPLETED,
                "Transaction Completed",
                f"Your borrow of {transaction['item_name']} has been completed",
                {"transaction_id": transaction_id}
            )
    
    if transaction_update.return_condition:
        update_data["return_condition"] = transaction_update.return_condition
    if transaction_update.damage_notes:
        update_data["damage_notes"] = transaction_update.damage_notes
    if transaction_update.lender_notes:
        update_data["lender_notes"] = transaction_update.lender_notes
    
    if update_data:
        await db.transactions.update_one({"id": transaction_id}, {"$set": update_data})
    
    updated_transaction = await db.transactions.find_one({"id": transaction_id})
    return Transaction(**updated_transaction)

@api_router.get("/transactions", response_model=List[Transaction])
async def get_transactions(
    status: Optional[TransactionStatus] = None,
    as_borrower: Optional[bool] = None,
    as_lender: Optional[bool] = None,
    current_user: UserProfile = Depends(get_current_user)
):
    filter_query = {}
    
    if as_borrower is True and as_lender is not True:
        filter_query["borrower_id"] = current_user.id
    elif as_lender is True and as_borrower is not True:
        filter_query["lender_id"] = current_user.id
    else:
        filter_query["$or"] = [
            {"borrower_id": current_user.id},
            {"lender_id": current_user.id}
        ]
    
    if status:
        filter_query["status"] = status
    
    transactions = await db.transactions.find(filter_query).sort("created_at", -1).to_list(100)
    return [Transaction(**transaction) for transaction in transactions]

@api_router.get("/transactions/{transaction_id}", response_model=Transaction)
async def get_transaction(
    transaction_id: str,
    current_user: UserProfile = Depends(get_current_user)
):
    transaction = await db.transactions.find_one({"id": transaction_id})
    if not transaction:
        raise HTTPException(status_code=404, detail="Transaction not found")
    
    if transaction["borrower_id"] != current_user.id and transaction["lender_id"] != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized to view this transaction")
    
    return Transaction(**transaction)

# Message endpoints
@api_router.post("/messages", response_model=Message)
async def send_message(
    message: MessageCreate,
    current_user: UserProfile = Depends(get_current_user)
):
    # Get receiver details
    receiver = await db.users.find_one({"id": message.receiver_id})
    if not receiver:
        raise HTTPException(status_code=404, detail="Receiver not found")
    
    new_message = Message(
        sender_id=current_user.id,
        sender_name=current_user.name,
        receiver_id=message.receiver_id,
        receiver_name=receiver["name"],
        content=message.content,
        transaction_id=message.transaction_id
    )
    
    await db.messages.insert_one(new_message.dict())
    
    # Create notification for receiver
    await create_notification(
        message.receiver_id,
        NotificationType.MESSAGE_RECEIVED,
        f"New message from {current_user.name}",
        message.content[:100] + "..." if len(message.content) > 100 else message.content,
        {"message_id": new_message.id, "sender_id": current_user.id}
    )
    
    return new_message

@api_router.get("/messages/conversations", response_model=List[Dict[str, Any]])
async def get_conversations(current_user: UserProfile = Depends(get_current_user)):
    # Get all conversations for the user
    pipeline = [
        {
            "$match": {
                "$or": [
                    {"sender_id": current_user.id},
                    {"receiver_id": current_user.id}
                ]
            }
        },
        {
            "$sort": {"created_at": -1}
        },
        {
            "$group": {
                "_id": {
                    "$cond": [
                        {"$eq": ["$sender_id", current_user.id]},
                        "$receiver_id",
                        "$sender_id"
                    ]
                },
                "last_message": {"$first": "$$ROOT"},
                "unread_count": {
                    "$sum": {
                        "$cond": [
                            {
                                "$and": [
                                    {"$eq": ["$receiver_id", current_user.id]},
                                    {"$eq": ["$read", False]}
                                ]
                            },
                            1,
                            0
                        ]
                    }
                }
            }
        }
    ]
    
    conversations = await db.messages.aggregate(pipeline).to_list(100)
    
    # Get user details for each conversation
    result = []
    for conv in conversations:
        other_user = await db.users.find_one({"id": conv["_id"]})
        if other_user:
            result.append({
                "user_id": conv["_id"],
                "user_name": other_user["name"],
                "user_image": other_user.get("profile_image"),
                "last_message": conv["last_message"],
                "unread_count": conv["unread_count"]
            })
    
    return result

@api_router.get("/messages/conversation/{user_id}", response_model=List[Message])
async def get_conversation(
    user_id: str,
    current_user: UserProfile = Depends(get_current_user)
):
    messages = await db.messages.find({
        "$or": [
            {"sender_id": current_user.id, "receiver_id": user_id},
            {"sender_id": user_id, "receiver_id": current_user.id}
        ]
    }).sort("created_at", 1).to_list(100)
    
    # Mark messages as read
    await db.messages.update_many(
        {"sender_id": user_id, "receiver_id": current_user.id, "read": False},
        {"$set": {"read": True}}
    )
    
    return [Message(**message) for message in messages]

# Notification endpoints
@api_router.get("/notifications", response_model=List[Notification])
async def get_notifications(
    unread_only: bool = False,
    current_user: UserProfile = Depends(get_current_user)
):
    filter_query = {"user_id": current_user.id}
    if unread_only:
        filter_query["read"] = False
    
    notifications = await db.notifications.find(filter_query).sort("created_at", -1).limit(50).to_list(50)
    return [Notification(**notification) for notification in notifications]

@api_router.put("/notifications/{notification_id}/read")
async def mark_notification_read(
    notification_id: str,
    current_user: UserProfile = Depends(get_current_user)
):
    result = await db.notifications.update_one(
        {"id": notification_id, "user_id": current_user.id},
        {"$set": {"read": True}}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Notification not found")
    return {"message": "Notification marked as read"}

@api_router.put("/notifications/read-all")
async def mark_all_notifications_read(current_user: UserProfile = Depends(get_current_user)):
    await db.notifications.update_many(
        {"user_id": current_user.id, "read": False},
        {"$set": {"read": True}}
    )
    return {"message": "All notifications marked as read"}

# Statistics endpoints
@api_router.get("/stats/community")
async def get_community_stats(current_user: UserProfile = Depends(get_current_user)):
    try:
        # Count total registered users
        total_users = await db.users.count_documents({})
        
        # Count users with at least one transaction (active users)
        active_users = await db.users.count_documents({
            "$or": [
                {"total_lends": {"$gt": 0}},
                {"total_borrows": {"$gt": 0}}
            ]
        })
        
        # Count total successful transactions
        total_transactions = await db.transactions.count_documents({
            "status": TransactionStatus.COMPLETED
        })
        
        return {
            "totalUsers": total_users,
            "activeUsers": max(active_users, 1),  # At least 1 (current user)
            "totalTransactions": total_transactions
        }
    except Exception as e:
        logger.error(f"Error fetching community stats: {e}")
        return {
            "totalUsers": 1,
            "activeUsers": 1,
            "totalTransactions": 0
        }

# Health check
@api_router.get("/health")
async def health_check():
    return {"status": "healthy", "timestamp": datetime.utcnow()}

# Include router
app.include_router(api_router)
print("🛣️ API router included")

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins = ["https://sharesphere-com.onrender.com"],

    allow_methods=["*"],
    allow_headers=["*"],
)
print("🌐 CORS middleware added")

# Logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()



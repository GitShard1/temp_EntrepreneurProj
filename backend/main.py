import os
import httpx
from datetime import datetime, timedelta
from fastapi import FastAPI, HTTPException
from fastapi.responses import RedirectResponse, JSONResponse
from pymongo import MongoClient
from pydantic import BaseModel
from dotenv import load_dotenv
from jose import jwt

load_dotenv()

app = FastAPI()

# GitHub OAuth Configuration
GITHUB_CLIENT_ID = os.getenv("GITHUB_CLIENT_ID")
GITHUB_CLIENT_SECRET = os.getenv("GITHUB_CLIENT_SECRET")
GITHUB_AUTHORIZE_URL = "https://github.com/login/oauth/authorize"
GITHUB_TOKEN_URL = "https://github.com/login/oauth/access_token"
GITHUB_USER_URL = "https://api.github.com/user"

# JWT Configuration
SECRET_KEY = os.getenv("SECRET_KEY")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 30

from pymongo.mongo_client import MongoClient

MONGO_USERNAME = os.getenv("MONGO_USERNAME")
MONGO_PASSWORD = os.getenv("MONGO_PASSWORD")
uri = F"mongodb+srv://{MONGO_USERNAME}:{MONGO_PASSWORD}@cluster0.ncuqrpz.mongodb.net/?appName=Cluster0"

# Create a new client and connect to the server
client = MongoClient(uri)

# Send a ping to confirm a successful connection
try:
    client.admin.command('ping')
    print("Pinged your deployment. You successfully connected to MongoDB!")
except Exception as e:
    print(e)

# MongoDB connection (replace with your connection string)
db = client["mydatabase"]
collection = db["items"]

class Item(BaseModel):
    name: str
    description: str = None

@app.get("/")
def read_root():
    return {"message": "Hello from FastAPI"}

@app.post("/items/")
def create_item(item: Item):
    item_dict = item.dict()
    result = collection.insert_one(item_dict)
    return {"id": str(result.inserted_id), **item_dict}

@app.get("/items/")
def read_items():
    items = list(collection.find({}, {"_id": 0}))
    return {"items": items}




# GitHub OAuth Helper Functions
def create_access_token(data: dict, expires_delta: timedelta = None):
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=15)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt

async def get_github_user(code: str):
    """Exchange GitHub OAuth code for user info"""
    async with httpx.AsyncClient() as client:
        # Exchange code for access token
        token_response = await client.post(
            GITHUB_TOKEN_URL,
            data={
                "client_id": GITHUB_CLIENT_ID,
                "client_secret": GITHUB_CLIENT_SECRET,
                "code": code,
            },
            headers={"Accept": "application/json"}
        )
        
        if token_response.status_code != 200:
            raise HTTPException(status_code=400, detail="Failed to get GitHub token")
        
        token_data = token_response.json()
        access_token = token_data.get("access_token")
        
        if not access_token:
            raise HTTPException(status_code=400, detail="No access token received")
        
        # Get user info from GitHub
        user_response = await client.get(
            GITHUB_USER_URL,
            headers={
                "Authorization": f"Bearer {access_token}",
                "Accept": "application/json"
            }
        )
        
        if user_response.status_code != 200:
            raise HTTPException(status_code=400, detail="Failed to get GitHub user")
        
        return user_response.json()


# GitHub OAuth Endpoints
@app.get("/auth/github")
def github_login():
    """Redirect to GitHub for OAuth authorization"""
    params = {
        "client_id": GITHUB_CLIENT_ID,
        "redirect_uri": "http://localhost:8000/auth/github/callback",
        "scope": "user:email",
        "state": "random-state"
    }
    query_string = "&".join([f"{k}={v}" for k, v in params.items()])
    return RedirectResponse(url=f"{GITHUB_AUTHORIZE_URL}?{query_string}")

@app.get("/auth/github/callback")
async def github_callback(code: str, state: str = None):
    """Handle GitHub OAuth callback"""
    if not code:
        raise HTTPException(status_code=400, detail="Missing code")
    
    try:
        # Get GitHub user info
        github_user = await get_github_user(code)
        
        # Get or create user in MongoDB
        users = db["users"]
        user = users.find_one({"github_id": github_user["id"]})
        
        if not user:
            # Create new user
            user_data = {
                "github_id": github_user["id"],
                "username": github_user["login"],
                "email": github_user.get("email"),
                "avatar_url": github_user.get("avatar_url"),
                "created_at": datetime.utcnow()
            }
            users.insert_one(user_data)
            user = user_data
        else:
            # Update existing user
            users.update_one(
                {"github_id": github_user["id"]},
                {"$set": {"last_login": datetime.utcnow()}}
            )
        
        # Create JWT token
        access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
        access_token = create_access_token(
            data={"sub": str(user.get("_id"))},
            expires_delta=access_token_expires
        )
        
        # Return token (redirect to frontend with token)
        return JSONResponse({
            "access_token": access_token,
            "token_type": "bearer",
            "user": {
                "username": user["username"],
                "email": user.get("email"),
                "avatar_url": user.get("avatar_url")
            }
        })
    
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))
    return redirect(f"{GITHUB_AUTHORIZE_URL}?client_id={params['client_id']}&redirect_uri={params['redirect_uri']}&scope={params['scope']}")


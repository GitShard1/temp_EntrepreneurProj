import os
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
from pymongo import MongoClient
from pydantic import BaseModel
from dotenv import load_dotenv

load_dotenv()

app = FastAPI(title="Divergence API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

MONGO_USERNAME = os.getenv("MONGO_USERNAME")
MONGO_PASSWORD = os.getenv("MONGO_PASSWORD")
uri = F"mongodb+srv://{MONGO_USERNAME}:{MONGO_PASSWORD}@cluster0.ncuqrpz.mongodb.net/?appName=Cluster0"

@asynccontextmanager
async def lifespan(app: FastAPI):
    app.mongodb_client = AsyncIOMotorClient(uri)
    app.mongodb = app.mongodb_client.divergence
    print("Connected to MongoDB!")

    yield

    app.mongodb_client.close()
    print("Disconnected from MongoDB")

app = FastAPI(
    title="Divergence API",
    lifespan=lifespan
)

# CORS - allow Next.js frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Health check
@app.get("/")
async def root():
    return {
        "message": "Divergence API is running",
        "status": "healthy"
    }
@app.get("/test-db")
async def test_db():
    """Test endpoint to verify MongoDB connection"""
    try:
        # Try to list collections
        collections = await app.mongodb.list_collection_names()
        return {
            "status": "connected",
            "database": "divergence",
            "collections": collections
        }
    except Exception as e:
        return {
            "status": "error",
            "message": str(e)
        }
    
@app.post('/api/projects')
def save_project():
    pass
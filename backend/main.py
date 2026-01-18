import os
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
from pymongo import MongoClient
from pydantic import BaseModel
from dotenv import load_dotenv
from models.project import ProjectCreate
import uuid

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
    
@app.post('/api/projects/create')
async def create_project(project: ProjectCreate):
    projects_collection = app.mongodb["projects"]
    
    project_id = str(uuid.uuid4())

    project_data = {
        "project_id": project_id,
        "name": project.name,
        "goal": project.goal,
        "dueDate": project.dueDate,
        "mode": project.mode,
        "teamMembers": project.teamMembers,
        "hasPM": project.hasPM,
        "repoOption": project.repoOption,
        "existingRepoUrl": project.existingRepoUrl
    }

    await projects_collection.insert_one(project_data)


    return {
        "projectId": project_id,
        "status": "created"
    }
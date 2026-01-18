import os
import httpx
from contextlib import asynccontextmanager
from datetime import datetime, timedelta
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import RedirectResponse, JSONResponse
from motor.motor_asyncio import AsyncIOMotorClient
from pydantic import BaseModel
from dotenv import load_dotenv
from models.project import ProjectCreate
import uuid
from jose import jwt

load_dotenv()



GITHUB_CLIENT_ID = os.getenv("GITHUB_CLIENT_ID")
GITHUB_CLIENT_SECRET = os.getenv("GITHUB_CLIENT_SECRET")
GITHUB_AUTHORIZE_URL = "https://github.com/login/oauth/authorize"
GITHUB_TOKEN_URL = "https://github.com/login/oauth/access_token"
GITHUB_USER_URL = "https://api.github.com/user"

SECRET_KEY = os.getenv("SECRET_KEY")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 30

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

@app.get("/health")
async def health_check():
   return {
       "status": "healthy",
       "mongodb": "connected" if hasattr(app, 'mongodb_client') else "disconnected"
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





@app.get("/api/projects/{project_id}")
async def get_project(project_id: str):
   if not hasattr(app, 'projects_collection'):
       raise HTTPException(status_code=500, detail="Database not connected")
  
   project = await app.projects_collection.find_one({"id": project_id})
   if not project:
       raise HTTPException(status_code=404, detail="Project not found")
  
   del project["_id"]
   return project


@app.get("/api/projects")
async def list_projects():
   if not hasattr(app, 'projects_collection'):
       raise HTTPException(status_code=500, detail="Database not connected")
  
   projects = await app.projects_collection.find({}, {"_id": 0}).to_list(length=100)
   return {"projects": projects, "count": len(projects)}





# GitHub OAuth
def create_access_token(data: dict, expires_delta: timedelta = None):
   to_encode = data.copy()
   expire = datetime.utcnow() + (expires_delta or timedelta(minutes=15))
   to_encode.update({"exp": expire})
   return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)


async def get_github_user(code: str):
   async with httpx.AsyncClient() as client:
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
           raise HTTPException(status_code=400, detail="Failed to get token")
      
       token_data = token_response.json()
       access_token = token_data.get("access_token")
      
       if not access_token:
           raise HTTPException(status_code=400, detail="No access token")
      
       user_response = await client.get(
           GITHUB_USER_URL,
           headers={"Authorization": f"Bearer {access_token}", "Accept": "application/json"}
       )
      
       if user_response.status_code != 200:
           raise HTTPException(status_code=400, detail="Failed to get user")
      
       return user_response.json()


@app.get("/auth/github")
def github_login():
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
   if not code:
       raise HTTPException(status_code=400, detail="Missing code")
  
   try:
       github_user = await get_github_user(code)
       user = await app.users_collection.find_one({"github_id": github_user["id"]})
      
       if not user:
           user_data = {
               "github_id": github_user["id"],
               "username": github_user["login"],
               "email": github_user.get("email"),
               "avatar_url": github_user.get("avatar_url"),
               "created_at": datetime.utcnow()
           }
           await app.users_collection.insert_one(user_data)
           user = user_data
       else:
           await app.users_collection.update_one(
               {"github_id": github_user["id"]},
               {"$set": {"last_login": datetime.utcnow()}}
           )
      
       access_token = create_access_token(
           data={"sub": str(user.get("_id"))},
           expires_delta=timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
       )
      
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
       print(f"✗ Error: {e}")
       raise HTTPException(status_code=400, detail=str(e))


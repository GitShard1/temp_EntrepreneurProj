import os
import sys
import subprocess
import json
import certifi
import httpx
from contextlib import asynccontextmanager
from datetime import datetime, timedelta
from fastapi import FastAPI, HTTPException, Depends, Header
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import RedirectResponse, JSONResponse
from fastapi.staticfiles import StaticFiles
from motor.motor_asyncio import AsyncIOMotorClient
from pydantic import BaseModel
from dotenv import load_dotenv
from models.project import ProjectCreate
import uuid
from jose import jwt
from pathlib import Path


load_dotenv()


def get_current_user(authorization: str = Header(None)) -> str:
    """Extract username from JWT token in Authorization header"""
    if not authorization:
        raise HTTPException(status_code=401, detail="Missing authorization header")
    
    try:
        scheme, token = authorization.split()
        if scheme.lower() != "bearer":
            raise HTTPException(status_code=401, detail="Invalid authorization scheme")
        
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        username = payload.get("username")
        if not username:
            raise HTTPException(status_code=401, detail="Invalid token")
        return username
    except ValueError:
        raise HTTPException(status_code=401, detail="Invalid authorization header format")
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid token")


# GitHub OAuth Configuration


ca = certifi.where()

GITHUB_CLIENT_ID = os.getenv("GITHUB_CLIENT_ID")
GITHUB_CLIENT_SECRET = os.getenv("GITHUB_CLIENT_SECRET")
GITHUB_AUTHORIZE_URL = "https://github.com/login/oauth/authorize"
GITHUB_TOKEN_URL = "https://github.com/login/oauth/access_token"
GITHUB_USER_URL = "https://api.github.com/user"

SECRET_KEY = os.getenv("SECRET_KEY")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60

MONGO_USERNAME = os.getenv("MONGO_USERNAME")
MONGO_PASSWORD = os.getenv("MONGO_PASSWORD")
uri = F"mongodb+srv://{MONGO_USERNAME}:{MONGO_PASSWORD}@cluster0.ncuqrpz.mongodb.net/?appName=Cluster0"

@asynccontextmanager
async def lifespan(app: FastAPI):
    app.mongodb_client = AsyncIOMotorClient(
        uri, 
        tlsCAFile=ca,
        tlsAllowInvalidCertificates=True)
    app.mongodb = app.mongodb_client.divergence
    app.users_collection = app.mongodb.users
    app.projects_collection = app.mongodb.projects
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

"""
# Health check
@app.get("/")
async def root():
    return {
        "message": "Divergence API is running",
        "status": "healthy"
    }
"""

# Redirect root to index.html
@app.get("/")
async def root():
    return RedirectResponse(url="/ui/index.html")


@app.get("/health")
async def health_check():
   return {
       "status": "healthy",
       "mongodb": "connected" if hasattr(app, 'mongodb_client') else "disconnected"
   }

@app.post('/api/projects')
async def create_project(project: ProjectCreate):
    try:
        
        projects_collection = app.mongodb.projects
        
        project_id = str(uuid.uuid4())

        project_data = {
            "project_id": project_id,
            "name": project.name,
            "goal": project.goal,
            "dueDate": project.dueDate,
            "mode": project.mode,
            "teamMembers": project.teamMembers,
            "repoOption": project.repoOption,
            "existingRepoUrl": project.existingRepoUrl
        }

        await projects_collection.insert_one(project_data)


        return {
            "projectId": project_id,
            "status": "created"
        }
    except Exception as e:
        print(f"✗ Error creating project: {e}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))

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
           data={"username": user["username"]},
           expires_delta=timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
       )
      
       # Redirect to frontend with token in URL
       frontend_url = f"http://localhost:3000/home?token={access_token}&username={user['username']}"
       return RedirectResponse(url=frontend_url)
   except Exception as e:
       print(f"✗ Error: {e}")
       raise HTTPException(status_code=400, detail=str(e))




# Translation    =================================================================


# Process GitHub user data endpoint
@app.post("/process-github/{github_username}")
async def process_github_user(github_username: str, current_user: str = Depends(get_current_user)):
    """Process GitHub user data - only if logged in as that user"""

    # Only allow processing if logged in as that user
    if current_user != github_username:
        raise HTTPException(status_code=403, detail="You can only process your own GitHub data")
    
    try:
        return process_github_user_main(github_username)
        
    except subprocess.TimeoutExpired:
        raise HTTPException(status_code=408, detail="Processing timeout - operation took too long")
    except Exception as e:
        print(f"Processing error: {str(e)}")
        raise HTTPException(status_code=400, detail=f"Processing failed: {str(e)}")



def process_github_user_main(github_username):
    print(f"Starting processing pipeline for user: {github_username}")

   
    """
    Process steps:
    1. GithubFetchPythonValt2.py - top 5 repos to txt > RESULTS.txt
    2. filtering.py - Filter > filtered.json
    3. translation.py - Translate to skills & stats > translated.json
    
    Only the authenticated user can process their own GitHub data.
    """
    

    translation_dir = Path(__file__).parent / "translation"
    # same as os.path.join(os.path.dirname(__file__), "translation")

    # Step 1: Run GithubFetchPythonValt2.py
    print("Step 1: Fetching GitHub repositories...")
    github_fetch_python_valt2 = translation_dir / "GithubFetchPythonValt2.py"
    
    username_url = f"https://github.com/{github_username}"
    
    result1 = subprocess.run(
        #argument order: [smthn] [filename] [args...]
        [sys.executable, str(github_fetch_python_valt2), username_url],
        capture_output=True,
        text=True,
        cwd=str(translation_dir),
        timeout=120
    )
    
    if result1.returncode != 0:
        print(f"GithubFetch error: {result1.stderr}")
        raise HTTPException(status_code=400, detail=f"GitHub fetch failed: {result1.stderr}")
    
    print("✓ GitHub repositories fetched successfully")
    
    # Step 2: Run filtering.py
    print("Step 2: Filtering and cleaning data...")
    filtering_script = translation_dir / "filtering.py"
    RESULTS_txt_file = translation_dir / "RESULTS.txt"  
    print(f"DEBUG: RESULTS_txt_file path: {RESULTS_txt_file}")
    result2 = subprocess.run(   
        [sys.executable, str(filtering_script), str(RESULTS_txt_file)],
        capture_output=True,
        text=True,
        cwd=str(translation_dir),
        timeout=60
    )
    
    if result2.returncode != 0:
        print(f"Filtering error: {result2.stderr}")
        raise HTTPException(status_code=400, detail=f"Filtering failed: {result2.stderr}")
    
    print("✓ Data filtered successfully")
    
    # Step 3: Run translation.py
    print("Step 3: Translating to developer profile...")
    translation_script = translation_dir / "translation.py"
    filtered_json_file = translation_dir / "filtered.json"
    
    result3 = subprocess.run(
        [sys.executable, str(translation_script), str(filtered_json_file)],
        capture_output=True,
        text=True,
        cwd=str(translation_dir),
        timeout=60
    )
    
    if result3.returncode != 0:
        print(f"Translation error: {result3.stderr}")
        raise HTTPException(status_code=400, detail=f"Translation failed: {result3.stderr}")
    
    print("✓ Developer profile translated successfully")
    
    # Load the results
    filtered_file = translation_dir / "filtered.json"
    translated_file = translation_dir / "translated.json"
    
    filtered_data = None
    translated_data = None
    

    if filtered_file.exists():
        with open(filtered_file, 'r') as f:
            filtered_data = json.load(f)
    
    if translated_file.exists():
        with open(translated_file, 'r') as f:
            translated_data = json.load(f)
    
    # Store in MongoDB as 'user_github_results' collection
    # Note: This is a sync function, MongoDB operations removed to avoid blocking
    # Consider making this async or moving DB operations to the async caller
    
    print(" DONE DONE DONE DONE DONE DONE DONE DONE DONE DONE DONE DONE DONE DONE DONE DONE")
    print("Translated FILE:",translated_file)

    return JSONResponse({
        "status": "success",
        "message": f"Successfully processed {github_username}",
        "github_username": github_username,
        "translated_data": translated_data
    })


@app.get("/get-filtered-data/{github_username}")
async def get_filtered_data(github_username: str, current_user: str = Depends(get_current_user)):
    """Get filtered data for a GitHub user - reads from filtered.json"""
    
    if current_user != github_username:
        raise HTTPException(status_code=403, detail="You can only access your own data")
    
    # Look in the translation directory
    filtered_file = Path(__file__).parent / "translation" / "filtered.json"
    
    if not filtered_file.exists():
        raise HTTPException(status_code=404, detail="No filtered data found for this user")
    
    try:
        with open(filtered_file, 'r', encoding='utf-8') as f:
            filtered_data = json.load(f)
        
        # Get user info from MongoDB to fill in profile data
        user = await app.users_collection.find_one({"username": github_username})
        
        # Ensure the data has the expected structure for the frontend
        if not filtered_data.get("profile"):
            filtered_data["profile"] = {}
        
        # Fill in profile data from MongoDB if available
        if user:
            filtered_data["profile"]["avatar"] = filtered_data["profile"].get("avatar") or user.get("avatar_url", "")
            filtered_data["profile"]["nameUser"] = filtered_data["profile"].get("nameUser") or user.get("username")
            filtered_data["profile"]["username"] = github_username
        
        # Ensure other required fields exist
        if "statsHome" not in filtered_data:
            filtered_data["statsHome"] = {
                "totalProjects": 0,
                "totalRating": 0.0,
                "totalLanguages": 0
            }
        
        if "projects" not in filtered_data:
            filtered_data["projects"] = {"top": [], "new": []}
        
        if "recentWorks" not in filtered_data:
            filtered_data["recentWorks"] = []
        
        return JSONResponse(filtered_data)
    except json.JSONDecodeError as e:
        raise HTTPException(status_code=500, detail=f"Invalid JSON in filtered file: {str(e)}")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error reading filtered data: {str(e)}")


@app.get("/auth/github/user")
async def get_current_github_user(current_user: str = Depends(get_current_user)):
    """Get current authenticated user's GitHub profile from MongoDB"""
    
    user = await app.users_collection.find_one({"username": current_user})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Remove MongoDB _id field
    user.pop("_id", None)
    return JSONResponse(user)


@app.get("/get-translated-data/{github_username}")
async def get_translated_data(github_username: str, current_user: str = Depends(get_current_user)):
    """Get translated profile data for a GitHub user - reads from translated.json"""
    
    if current_user != github_username:
        raise HTTPException(status_code=403, detail="You can only access your own data")
    
    # Look in the translation directory
    translated_file = Path(__file__).parent / "translation" / "translated.json"
    
    if not translated_file.exists():
        raise HTTPException(status_code=404, detail="No translated data found for this user")
    
    try:
        with open(translated_file, 'r', encoding='utf-8') as f:
            translated_data = json.load(f)
        
        # Get user info from MongoDB to fill in profile data
        user = await app.users_collection.find_one({"username": github_username})
        
        # Ensure the data has the expected structure
        if not translated_data.get("profile"):
            translated_data["profile"] = {}
        
        # Fill in profile data from MongoDB if missing
        if user:
            translated_data["profile"]["name"] = translated_data["profile"].get("name") or user.get("username")
            translated_data["profile"]["username"] = github_username
            translated_data["profile"]["avatarUrl"] = translated_data["profile"].get("avatarUrl") or user.get("avatar_url", "")
            translated_data["profile"]["bio"] = translated_data["profile"].get("bio") or "No bio available"
        
        # Ensure other required fields exist
        if "skills" not in translated_data:
            translated_data["skills"] = {"radar": []}
        if "languages" not in translated_data:
            translated_data["languages"] = []
        if "frameworks" not in translated_data:
            translated_data["frameworks"] = []
        if "libraries" not in translated_data:
            translated_data["libraries"] = []
        
        return JSONResponse(translated_data)
    except json.JSONDecodeError as e:
        raise HTTPException(status_code=500, detail=f"Invalid JSON in translated file: {str(e)}")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error reading translated data: {str(e)}")
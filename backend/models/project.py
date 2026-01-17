from pydantic import BaseModel, Field
from typing import List, Optional
from datetime import datetime
from enum import Enum

class ProjectMode(str, Enum):
    SOLO = "solo"
    COLLAB = "collab"

class RepoOption(str, Enum):
    NEW = "new"
    EXISTING = "existing"

class MemberRole(str, Enum):
    OWNER = "owner"
    MEMBER = "member"

class ProjectMember(BaseModel):
    userId: str
    githubUsername: str
    role: MemberRole
    isPM: bool = False 

class Project(BaseModel):
    """Complete project document stored in MongoDB"""
    # Basic info
    id: str = Field(..., description="Unique project ID (UUID)")
    name: str = Field(..., min_length=1, max_length=100)
    goal: str = Field(..., min_length=10, max_length=500)
    description: str = Field(default="", max_length=2000)
    
    # Timeline
    timelineWeeks: int = Field(..., ge=1, le=52)
    dueDate: datetime
    
    # Team
    mode: ProjectMode
    ownerId: str 
    members: List[ProjectMember] = Field(default_factory=list)
    
    # GitHub
    githubRepoUrl: Optional[str] = None
    githubRepoName: Optional[str] = None
    isNewRepo: bool = False 
    
    # Scoping state
    scopingComplete: bool = False
    scopingConfidenceScore: Optional[float] = None 
    
    # Tasks
    tasksGenerated: bool = False
    
    # Metadata
    createdAt: datetime = Field(default_factory=datetime.now)
    updatedAt: datetime = Field(default_factory=datetime.now)

class ProjectCreate(BaseModel):
    """Data from frontend when creating project"""
    # Basic info
    name: str = Field(..., min_length=1, max_length=100)
    goal: str = Field(..., min_length=10, max_length=500)
    dueDate: datetime
    mode: ProjectMode
    
    # Team (only for COLLAB mode)
    teamMembers: Optional[List[str]] = [] 
    hasPM: Optional[bool] = False
    
    # Repo
    repoOption: RepoOption
    existingRepoUrl: Optional[str] = None

class ProjectResponse(BaseModel):
    """Response after creating project"""
    projectId: str
    message: str
    repoUrl: Optional[str] = None
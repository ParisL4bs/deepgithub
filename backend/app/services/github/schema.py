from enum import Enum
from typing import List, Optional, Dict, Any
from pydantic import BaseModel, Field


class RepoStatus(str, Enum):
    NOT_INDEXED = "not_indexed"
    PENDING = "pending"
    INDEXED = "indexed"
    FAILED = "failed"


class RepositoryOwner(BaseModel):
    login: str
    id: int
    avatar_url: str


class RepositoryInfo(BaseModel):
    id: int
    name: str
    full_name: str
    description: Optional[str] = None
    default_branch: str
    stars: int
    forks: int
    created_at: str
    updated_at: str
    size: int
    owner: RepositoryOwner


class FileNode(BaseModel):
    path: str
    type: str
    content: Optional[str] = None
    size: Optional[int] = None


class RepositoryStatusResponse(BaseModel):
    status: RepoStatus
    file_count: Optional[int] = None
    indexed_at: Optional[str] = None
    message: Optional[str] = None


class IndexingRequest(BaseModel):
    owner: str
    repo: str
    branch: Optional[str] = None


class CheckoutResponse(BaseModel):
    cache_name: str


class ChatRequest(BaseModel):
    message: str
    context: Optional[Dict[str, Any]] = None


class ChatResponse(BaseModel):
    response: str
    code_snippets: List[Dict[str, Any]] = Field(default_factory=list)
    source_files: List[Dict[str, str]] = Field(default_factory=list)


class FileDescription(BaseModel):
    path: str
    description: str
    type: str
    size: Optional[int] = None
    language: Optional[str] = None


class DocsResponse(BaseModel):
    repository: RepositoryInfo
    files: List[FileDescription]

class RepoStatus(str, Enum):
    NOT_INDEXED = "not_indexed"
    PENDING = "pending"
    INDEXED = "indexed"
    FAILED = "failed"


class RepositoryOwner(BaseModel):
    login: str
    id: int
    avatar_url: str


class RepositoryInfo(BaseModel):
    id: int
    name: str
    full_name: str
    description: Optional[str] = None
    default_branch: str
    stars: int
    forks: int
    created_at: str
    updated_at: str
    size: int
    owner: RepositoryOwner

class FileDescription(BaseModel):
    path: str
    description: str
    type: str
    size: Optional[int] = None
    language: Optional[str] = None

class RepoStatus(str, Enum):
    NOT_INDEXED = "not_indexed"
    PENDING = "pending"
    INDEXED = "indexed"
    FAILED = "failed"


class RepositoryOwner(BaseModel):
    login: str
    id: int
    avatar_url: str


class RepositoryInfo(BaseModel):
    id: int
    name: str
    full_name: str
    description: Optional[str] = None
    default_branch: str
    stars: int
    forks: int
    created_at: str
    updated_at: str
    size: int
    owner: RepositoryOwner

class FileDescription(BaseModel):
    path: str
    description: str
    type: str
    size: Optional[int] = None
    language: Optional[str] = None
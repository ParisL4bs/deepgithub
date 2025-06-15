from pydantic import BaseModel
from typing import Optional, Dict, Any, List


class ChatRequest(BaseModel):
    message: str
    context: Optional[Dict[str, Any]] = None


class ChatResponse(BaseModel):
    response: str
    code_snippets: Optional[List[Dict[str, Any]]] = None
    source_files: Optional[List[Dict[str, str]]] = None


class RepositoryStatusResponse(BaseModel):
    status: str
    file_count: Optional[int] = None
    indexed_at: Optional[str] = None
    message: Optional[str] = None


class AgentRequest(BaseModel):
    prompt: str
    context: Optional[Dict[str, Any]] = None


class AgentResponse(BaseModel):
    response: str
    agent_id: str
    execution_time: float
    metadata: Optional[Dict[str, Any]] = None 
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
import logging

from app.database import get_async_session
from app.services.github.schema import ChatRequest, ChatResponse
from app.services.chat.service import ChatService

router = APIRouter(prefix="/chat", tags=["chat"])

logger = logging.getLogger(__name__)

# Initialize service
chat_service = ChatService()


@router.post("/{owner}/{repo}", response_model=ChatResponse)
async def chat_with_repository(
    owner: str,
    repo: str,
    chat_request: ChatRequest,
    session: AsyncSession = Depends(get_async_session),
):
    """
    Chat with a repository using AI-powered understanding of the codebase.
    """
    try:
        return await chat_service.chat_with_repository(owner, repo, chat_request, session)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e)) 
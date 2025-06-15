from fastapi import APIRouter, HTTPException
import logging

from app.services.github.schema import  AgentRequest, AgentResponse
from app.services.chat.service import ChatService
from app.services.agent.service import AgentService

router = APIRouter(prefix="/chat", tags=["chat"])

logger = logging.getLogger(__name__)

# Initialize services
chat_service = ChatService()
agent_service = AgentService()



@router.post("/agent", response_model=AgentResponse)
async def trigger_agent(
    agent_request: AgentRequest,
):
    """
    Simple mock endpoint that takes a prompt and triggers an agent.
    """
    try:
        return await agent_service.process_prompt(agent_request)
    except Exception as e:
        logger.error(f"Error processing agent request: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Agent processing failed: {str(e)}") 
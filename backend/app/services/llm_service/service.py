from typing import Any, Dict, List, Optional, Literal
import google.generativeai as genai
from pydantic import BaseModel, Field
from jinja2 import Environment, FileSystemLoader
from pathlib import Path
from app.services.llm_service.schema import LLMModel
class Message(BaseModel):
    role: Literal["user", "assistant"]
    content: str

class ChatRequest(BaseModel):
    messages: List[Message]
    temperature: float = Field(default=0.7, ge=0.0, le=1.0)
    max_tokens: Optional[int] = Field(default=None, gt=0)

class ChatResponse(BaseModel):
    content: str
    model: LLMModel

class StructuredOutputRequest(BaseModel):
    prompt: str
    temperature: float = Field(default=0.7, ge=0.0, le=1.0)

class TemplateManager:
    """
    Handles loading and rendering of Jinja2 templates.
    """
    def __init__(self, default_search_dir: Path):
        # default_search_dir is the root from which template paths are resolved.
        # e.g. if path is "prompts/file.jinja2", default_search_dir is script's dir.
        self.default_search_dir = default_search_dir

    def render_template(self, template_relative_path: str, context: dict = None) -> str:
        """
        Loads and renders a Jinja2 template.
        template_relative_path is relative to the default_search_dir.
        """
        if context is None:
            context = {}

        full_template_relative_path = self.default_search_dir / template_relative_path
        
        template_dir_for_loader = full_template_relative_path.parent
        template_file_name = full_template_relative_path.name

        if not full_template_relative_path.exists():
            raise FileNotFoundError(f"Template file not found: {full_template_relative_path} (resolved from base {self.default_search_dir})")

        env = Environment(loader=FileSystemLoader(searchpath=str(template_dir_for_loader)))
        template = env.get_template(template_file_name)
        return template.render(context)

class GeminiService:
    def __init__(self, api_key: str):
        """Initialize the Gemini service with API key."""
        genai.configure(api_key=api_key)
        self.model = genai.GenerativeModel('gemini-pro')
        self.chat_model = genai.GenerativeModel('gemini-pro')

    async def get_chat_completion(
        self,
        request: ChatRequest,
    ) -> ChatResponse:
        """
        Get a chat completion from Gemini.
        
        Args:
            request: ChatRequest object containing messages and parameters
            
        Returns:
            ChatResponse object with the generated content
        """
        try:
            chat = self.chat_model.start_chat(history=[])
            
            # Convert messages to Gemini format
            for message in request.messages:
                if message.role == "user":
                    chat.send_message(message.content)
                elif message.role == "assistant":
                    chat.history.append({
                        "role": "model",
                        "parts": [message.content]
                    })
            
            response = chat.send_message(
                request.messages[-1].content,
                generation_config=genai.types.GenerationConfig(
                    temperature=request.temperature,
                    max_output_tokens=request.max_tokens
                )
            )
            
            return ChatResponse(content=response.text)
            
        except Exception as e:
            raise Exception(f"Error getting chat completion: {str(e)}")

    async def get_structured_output(
        self,
        request: StructuredOutputRequest,
        output_schema: BaseModel,
    ) -> Dict[str, Any]:
        """
        Get structured output from Gemini using function calling.
        
        Args:
            request: StructuredOutputRequest object containing prompt and parameters
            output_schema: Pydantic model defining the expected output structure
            
        Returns:
            Dictionary matching the output schema
        """
        try:
            # Convert Pydantic model to Gemini function schema
            function_schema = {
                "name": "get_structured_output",
                "description": "Get structured information based on the user's prompt",
                "parameters": {
                    "type": "object",
                    "properties": output_schema.schema()["properties"],
                    "required": output_schema.schema()["required"]
                }
            }

            # Create the function calling configuration
            generation_config = genai.types.GenerationConfig(
                temperature=request.temperature,
            )

            # Generate content with function calling
            response = self.model.generate_content(
                request.prompt,
                generation_config=generation_config,
                tools=[{"function_declarations": [function_schema]}]
            )

            # Extract the function call response
            if response.candidates[0].content.parts[0].function_call:
                function_call = response.candidates[0].content.parts[0].function_call
                result = output_schema.parse_raw(function_call.args)
                return result.dict()
            else:
                raise Exception("No structured output was generated")

        except Exception as e:
            raise Exception(f"Error getting structured output: {str(e)}")





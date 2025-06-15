from enum import Enum
from pydantic import BaseModel


class LLMModel(str, Enum):
    GEMINI_PRO = "gemini-pro"
    GEMINI_FLASH = "gemini-flash"
    GEMINI_1_5_PRO = "gemini-1.5-pro"
    GEMINI_1_5_FLASH = "gemini-1.5-flash"
    GEMINI_2_0_FLASH = "gemini-2.0-flash"
    GEMINI_2_5_PRO = "gemini-2.5-pro"
    
    
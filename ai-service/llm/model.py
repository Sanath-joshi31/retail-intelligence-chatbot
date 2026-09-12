import re
from typing import List, Dict, Any, Optional
from langchain_core.messages import BaseMessage, SystemMessage, HumanMessage, AIMessage
from config.settings import settings

class FallbackGroundedLLM:
    """
    Deterministic rule-grounded response generator used when
    OpenAI API is unreachable or no API key is provided.
    Extracts answers directly from provided context chunks.
    """
    def invoke(self, messages: List[BaseMessage]) -> AIMessage:
        prompt_text = ""
        for m in messages:
            prompt_text += f"{m.content}\n"
        
        # Check if context was passed
        context_match = re.search(r"Retrieved Context:\s*(.*?)\s*User Question:\s*(.*?)\s*Answer:", prompt_text, re.DOTALL)
        if context_match:
            context = context_match.group(1).strip()
            question = context_match.group(2).strip().lower()
            
            if not context or "No relevant enterprise knowledge found" in context:
                return AIMessage(content="I could not find specific information on this in our enterprise policies. Please check with store management or customer support.")

            # Synthesize answer from context sections
            lines = [line.strip() for line in context.split("\n") if line.strip() and not line.startswith("[Document")]
            
            # Stop words
            stop_words = {"what", "when", "where", "which", "how", "does", "have", "our", "your", "can", "the", "and", "for", "with", "this", "that", "from"}
            raw_keywords = re.findall(r"\b[a-zA-Z0-9_-]+\b", question)
            keywords = [w for w in raw_keywords if len(w) > 2 and w not in stop_words]
            
            matched_lines = []
            for line in lines:
                if any(kw in line.lower() for kw in keywords):
                    matched_lines.append(line)

            if matched_lines:
                key_points = "\n".join([f"• {line.lstrip('#*- ')}" for line in matched_lines[:5]])
                answer = f"Based on our enterprise policies:\n\n{key_points}\n\nPlease refer to the cited documentation for full details."
            else:
                answer = "I could not find specific information on this in our enterprise policies. Please check with store management or customer support."

            return AIMessage(content=answer)

        return AIMessage(content="I am your Retail Intelligence Assistant. How can I help you today?")

def get_llm(temperature: Optional[float] = None):
    temp = temperature if temperature is not None else settings.LLM_TEMPERATURE
    if settings.OPENAI_API_KEY and settings.OPENAI_API_KEY != "your-openai-api-key-here":
        try:
            from langchain_openai import ChatOpenAI
            return ChatOpenAI(
                model=settings.LLM_MODEL,
                temperature=temp,
                api_key=settings.OPENAI_API_KEY
            )
        except Exception:
            return FallbackGroundedLLM()
    return FallbackGroundedLLM()

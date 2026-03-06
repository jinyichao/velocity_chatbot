"""
V3: Direct LLM response — no intent classification, no guardrail.
Returns raw LLM output for any input.
"""

from openai import AsyncOpenAI
from app.config import settings

SYSTEM_PROMPT = (
    "You are Velocity Assistant, OCBC's business banking chatbot. "
    "Answer the user's question helpfully and concisely."
)


async def respond(message: str, history: list[dict]) -> str:
    client = AsyncOpenAI(
        api_key=settings.DASHSCOPE_API_KEY,
        base_url=settings.DASHSCOPE_BASE_URL,
    )
    messages = [{"role": "system", "content": SYSTEM_PROMPT}]
    for turn in history[-6:]:
        messages.append({"role": turn["role"], "content": turn["content"]})
    messages.append({"role": "user", "content": message})

    response = await client.chat.completions.create(
        model=settings.QWEN_MODEL,
        messages=messages,
        temperature=0.7,
        extra_body={"enable_thinking": False},
    )
    return response.choices[0].message.content

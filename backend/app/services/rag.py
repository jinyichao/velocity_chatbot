"""
LLM response generation (greeting and grounded response).
ChromaDB dependency removed for serverless compatibility.
"""

from openai import AsyncOpenAI
from app.config import settings

RESPONSE_SYSTEM_PROMPT = """You are Velocity Assistant, OCBC's business banking chatbot.
Answer the user's question using ONLY the provided context.
Be concise, professional, and accurate.
If the context does not contain enough information to answer, say so honestly.
Do not make up information."""


async def generate_greeting(message: str, history: list[dict]) -> str:
    """Generate a warm, friendly greeting without RAG context."""
    client = AsyncOpenAI(
        api_key=settings.DASHSCOPE_API_KEY,
        base_url=settings.DASHSCOPE_BASE_URL,
    )
    messages = [{
        "role": "system",
        "content": (
            "You are Velocity Assistant, OCBC's friendly business banking chatbot. "
            "Respond warmly and briefly to the user's greeting, and let them know "
            "you're here to help with their Velocity banking needs."
        ),
    }]
    for turn in history[-4:]:
        messages.append({"role": turn["role"], "content": turn["content"]})
    messages.append({"role": "user", "content": message})

    response = await client.chat.completions.create(
        model=settings.QWEN_MODEL,
        messages=messages,
        temperature=0.7,
        extra_body={"enable_thinking": False},
    )
    return response.choices[0].message.content


async def generate_out_of_scope(message: str) -> str:
    """Generate a dynamic out-of-scope reply that names the topic briefly."""
    client = AsyncOpenAI(
        api_key=settings.DASHSCOPE_API_KEY,
        base_url=settings.DASHSCOPE_BASE_URL,
    )
    response = await client.chat.completions.create(
        model=settings.QWEN_MODEL,
        messages=[
            {
                "role": "system",
                "content": (
                    "You are Velocity Assistant, a business banking chatbot for OCBC Velocity. "
                    "When a user asks something outside your scope, reply in ONE sentence using this exact pattern: "
                    "'I'm unable to answer your question regarding {3-5 word topic summary}. "
                    "Instead, may I assist you in managing your Velocity account mandates?' "
                    "Keep the topic summary short, factual, and neutral. Do not add anything else."
                ),
            },
            {"role": "user", "content": message},
        ],
        temperature=0.3,
        extra_body={"enable_thinking": False},
    )
    return response.choices[0].message.content


async def generate_response(
    message: str,
    intent: str,
    history: list[dict],
    context_docs: list[str],
) -> str:
    """Generate a grounded response from retrieved context."""
    context = "\n\n".join(context_docs) if context_docs else "No specific context available."
    messages = [{"role": "system", "content": RESPONSE_SYSTEM_PROMPT}]
    for turn in history[-6:]:
        messages.append({"role": turn["role"], "content": turn["content"]})
    messages.append({
        "role": "user",
        "content": f"Context:\n{context}\n\nUser question (category: {intent}):\n{message}",
    })

    client = AsyncOpenAI(
        api_key=settings.DASHSCOPE_API_KEY,
        base_url=settings.DASHSCOPE_BASE_URL,
    )
    response = await client.chat.completions.create(
        model=settings.QWEN_MODEL,
        messages=messages,
        temperature=0.3,
        extra_body={"enable_thinking": False},
    )
    return response.choices[0].message.content

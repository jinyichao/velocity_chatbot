"""
RAG pipeline: embeds queries, retrieves relevant chunks from ChromaDB,
and generates grounded responses using the LLM.
"""

import chromadb
from chromadb.utils.embedding_functions import DefaultEmbeddingFunction
from openai import AsyncOpenAI
from app.config import settings

COLLECTION_NAME = "velocity_kb"

RESPONSE_SYSTEM_PROMPT = """You are Velocity Assistant, OCBC's business banking chatbot.
Answer the user's question using ONLY the provided context.
Be concise, professional, and accurate.
If the context does not contain enough information to answer, say so honestly.
Do not make up information."""

_chroma_client: chromadb.ClientAPI | None = None
_collection: chromadb.Collection | None = None
_ef = DefaultEmbeddingFunction()


def get_collection() -> chromadb.Collection:
    global _chroma_client, _collection
    if _collection is None:
        _chroma_client = chromadb.PersistentClient(path=settings.CHROMA_PERSIST_DIR)
        _collection = _chroma_client.get_or_create_collection(
            name=COLLECTION_NAME,
            embedding_function=_ef,
        )
    return _collection


def retrieve(query: str, intent: str, n_results: int = 4) -> list[str]:
    """Retrieve relevant chunks for the given query and intent."""
    collection = get_collection()
    results = collection.query(
        query_texts=[query],
        n_results=n_results,
        where={"intent": intent} if collection.count() > 0 else None,
    )
    documents = results.get("documents", [[]])[0]
    return documents


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


async def generate_response(
    message: str,
    intent: str,
    history: list[dict],
    context_docs: list[str],
) -> str:
    """Generate a grounded response from retrieved context."""
    context = "\n\n".join(context_docs) if context_docs else "No specific context available."

    messages = [{"role": "system", "content": RESPONSE_SYSTEM_PROMPT}]

    # Include recent conversation history (last 6 turns)
    for turn in history[-6:]:
        messages.append({"role": turn["role"], "content": turn["content"]})

    messages.append({
        "role": "user",
        "content": (
            f"Context:\n{context}\n\n"
            f"User question (category: {intent}):\n{message}"
        ),
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

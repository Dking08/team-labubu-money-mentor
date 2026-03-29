"""Mem0 Memory Layer — Persistent user memory for AI agents."""
from config import settings

_memory = None
_fallback_store = {}  # Simple fallback if Mem0 fails


def _get_memory():
    """Initialize Mem0 with Groq as LLM backend."""
    global _memory
    if _memory is not None:
        return _memory
    try:
        from mem0 import Memory
        config = {
            "llm": {
                "provider": "groq",
                "config": {
                    "model": settings.fast_model,
                    "temperature": 0.1,
                    "api_key": settings.groq_api_key,
                },
            },
        }
        _memory = Memory.from_config(config)
        print("✅ Mem0 initialized with Groq backend")
        return _memory
    except Exception as e:
        print(f"⚠️ Mem0 init failed ({e}), using fallback memory")
        return None


def add_memory(user_id: str, content: str, metadata: dict = None):
    """Add a memory for a user."""
    mem = _get_memory()
    if mem:
        try:
            mem.add(content, user_id=user_id, metadata=metadata or {})
            return
        except Exception:
            pass
    # Fallback
    if user_id not in _fallback_store:
        _fallback_store[user_id] = []
    _fallback_store[user_id].append({"content": content, "metadata": metadata or {}})
    # Keep last 50
    _fallback_store[user_id] = _fallback_store[user_id][-50:]


def search_memory(user_id: str, query: str, limit: int = 5) -> str:
    """Search memories relevant to the query."""
    mem = _get_memory()
    if mem:
        try:
            results = mem.search(query=query, user_id=user_id, limit=limit)
            if results and isinstance(results, list):
                return "\n".join(
                    r.get("memory", r.get("text", str(r))) for r in results
                )
            elif results and isinstance(results, dict):
                memories = results.get("results", results.get("memories", []))
                return "\n".join(
                    m.get("memory", m.get("text", str(m))) for m in memories
                )
        except Exception:
            pass
    # Fallback: simple keyword match
    entries = _fallback_store.get(user_id, [])
    if not entries:
        return "No prior context."
    matches = [e["content"] for e in entries if any(w in e["content"].lower() for w in query.lower().split())]
    return "\n".join(matches[-limit:]) if matches else "\n".join(e["content"] for e in entries[-3:])


def get_all_memories(user_id: str) -> list:
    """Get all memories for a user."""
    mem = _get_memory()
    if mem:
        try:
            result = mem.get_all(user_id=user_id)
            if isinstance(result, list):
                return result
            return result.get("results", result.get("memories", []))
        except Exception:
            pass
    return _fallback_store.get(user_id, [])

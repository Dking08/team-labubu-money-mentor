"""LangGraph Multi-Agent Orchestrator — Routes queries to specialized agents."""
from langgraph.graph import StateGraph, END
from langchain_groq import ChatGroq
from langchain_core.messages import SystemMessage, HumanMessage
from typing import TypedDict, Optional, Any
from config import settings
import json

# ── State ─────────────────────────────────────────────
class OrchestratorState(TypedDict):
    messages: list
    user_id: str
    user_data: dict
    memory_context: str
    selected_agent: str
    agent_output: dict
    ui_command: dict


# ── Routing Prompt ────────────────────────────────────
ROUTING_PROMPT = """You are the AI Money Mentor orchestrator. Analyze the user's message and decide which specialized agent handles it best.

Available agents:
- fire_planner: FIRE planning, SIP calculations, financial roadmaps, investment planning, retirement planning
- money_health: Financial health check, wellness score, overall assessment
- tax_wizard: Tax planning, regime comparison, deductions, Form 16, salary structure
- life_event: Life events — bonus, marriage, baby, inheritance, job change, windfall money
- mf_xray: Mutual fund analysis, portfolio review, CAMS statement, XIRR, rebalancing
- couple_planner: Joint financial planning for couples, partner optimization

User memory context:
{memory_context}

Respond with ONLY the agent name (one of: fire_planner, money_health, tax_wizard, life_event, mf_xray, couple_planner). Nothing else."""


# ── Node Functions ────────────────────────────────────
def retrieve_memory(state: OrchestratorState) -> dict:
    """Fetch relevant memories for the user."""
    try:
        from memory.mem0_layer import search_memory
        user_id = state.get("user_id", "demo_user")
        last_msg = state["messages"][-1] if state["messages"] else ""
        context = search_memory(user_id, last_msg)
        return {"memory_context": context}
    except Exception:
        return {"memory_context": "No prior context available."}


def route_to_agent(state: OrchestratorState) -> dict:
    """Use LLM to decide which agent to route to."""
    llm = ChatGroq(
        model=settings.orchestrator_model,
        temperature=0,
        api_key=settings.groq_api_key,
    )
    user_msg = state["messages"][-1] if state["messages"] else ""
    memory = state.get("memory_context", "")
    messages = [
        SystemMessage(content=ROUTING_PROMPT.format(memory_context=memory)),
        HumanMessage(content=user_msg),
    ]
    response = llm.invoke(messages)
    agent = response.content.strip().lower().replace(" ", "_")
    valid = ["fire_planner", "money_health", "tax_wizard", "life_event", "mf_xray", "couple_planner"]
    if agent not in valid:
        agent = "life_event"  # sensible default
    return {"selected_agent": agent}


def decide_next(state: OrchestratorState) -> str:
    return state["selected_agent"]


# ── Agent node wrappers (sync wrappers for async agents) ──
import asyncio

def _run_async(coro):
    try:
        loop = asyncio.get_event_loop()
        if loop.is_running():
            import concurrent.futures
            with concurrent.futures.ThreadPoolExecutor() as pool:
                return pool.submit(asyncio.run, coro).result()
        return loop.run_until_complete(coro)
    except RuntimeError:
        return asyncio.run(coro)


def fire_node(state: OrchestratorState) -> dict:
    from agents.fire_planner import run_fire_planner
    result = _run_async(run_fire_planner(state.get("user_data", {}), state["messages"][-1]))
    return {"agent_output": result, "ui_command": result.get("ui_action", {})}


def health_node(state: OrchestratorState) -> dict:
    from agents.money_health import run_money_health
    result = _run_async(run_money_health(state.get("user_data", {}), state["messages"][-1]))
    return {"agent_output": result, "ui_command": result.get("ui_action", {})}


def tax_node(state: OrchestratorState) -> dict:
    from agents.tax_wizard import run_tax_wizard
    result = _run_async(run_tax_wizard(state.get("user_data", {}), state["messages"][-1]))
    return {"agent_output": result, "ui_command": result.get("ui_action", {})}


def life_event_node(state: OrchestratorState) -> dict:
    from agents.life_event import run_life_event
    result = _run_async(run_life_event(state.get("user_data", {}), state["messages"][-1]))
    return {"agent_output": result, "ui_command": result.get("ui_action", {})}


def mf_node(state: OrchestratorState) -> dict:
    from agents.mf_xray import run_mf_xray
    result = _run_async(run_mf_xray(state.get("user_data", {}), state["messages"][-1]))
    return {"agent_output": result, "ui_command": result.get("ui_action", {})}


def couple_node(state: OrchestratorState) -> dict:
    from agents.couple_planner import run_couple_planner
    result = _run_async(run_couple_planner(state.get("user_data", {}), state["messages"][-1]))
    return {"agent_output": result, "ui_command": result.get("ui_action", {})}


def save_memory(state: OrchestratorState) -> dict:
    """Save conversation to memory after agent response."""
    try:
        from memory.mem0_layer import add_memory
        user_id = state.get("user_id", "demo_user")
        msg = state["messages"][-1] if state["messages"] else ""
        output = state.get("agent_output", {})
        response_text = output.get("response_text", "")
        add_memory(user_id, f"User asked: {msg}\nAgent ({output.get('agent_name', 'unknown')}) responded with advice about {output.get('data', {}).keys()}")
    except Exception:
        pass
    return state


# ── Build Graph ───────────────────────────────────────
def build_orchestrator():
    graph = StateGraph(OrchestratorState)

    # Add nodes
    graph.add_node("retrieve_memory", retrieve_memory)
    graph.add_node("route", route_to_agent)
    graph.add_node("fire_planner", fire_node)
    graph.add_node("money_health", health_node)
    graph.add_node("tax_wizard", tax_node)
    graph.add_node("life_event", life_event_node)
    graph.add_node("mf_xray", mf_node)
    graph.add_node("couple_planner", couple_node)
    graph.add_node("save_memory", save_memory)

    # Edges
    graph.set_entry_point("retrieve_memory")
    graph.add_edge("retrieve_memory", "route")
    graph.add_conditional_edges(
        "route",
        decide_next,
        {
            "fire_planner": "fire_planner",
            "money_health": "money_health",
            "tax_wizard": "tax_wizard",
            "life_event": "life_event",
            "mf_xray": "mf_xray",
            "couple_planner": "couple_planner",
        },
    )
    for agent in ["fire_planner", "money_health", "tax_wizard", "life_event", "mf_xray", "couple_planner"]:
        graph.add_edge(agent, "save_memory")
    graph.add_edge("save_memory", END)

    return graph.compile()


# Singleton
_orchestrator = None

def get_orchestrator():
    global _orchestrator
    if _orchestrator is None:
        _orchestrator = build_orchestrator()
    return _orchestrator


async def process_message(user_id: str, message: str, user_data: dict = None) -> dict:
    """Main entry point — process user message through the orchestrator."""
    if user_data is None:
        from data.mock_data import get_mock_user
        user_data = get_mock_user()

    orchestrator = get_orchestrator()
    initial_state = {
        "messages": [message],
        "user_id": user_id,
        "user_data": user_data,
        "memory_context": "",
        "selected_agent": "",
        "agent_output": {},
        "ui_command": {},
    }

    result = orchestrator.invoke(initial_state)
    return result.get("agent_output", {"response_text": "I couldn't process that. Please try again."})

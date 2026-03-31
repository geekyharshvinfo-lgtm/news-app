import json
import asyncio
import os
import google.generativeai as genai
from google.generativeai.types import FunctionDeclaration, Tool
from tools import TOOL_FUNCTIONS

# Configure Gemini with your API key
genai.configure(api_key=os.getenv("GEMINI_API_KEY"))

SYSTEM_PROMPT = """You are an AI news curator. Your job is to find and rank the top 30 most 
important and interesting AI news stories from the last 24 hours.

You have access to two search tools. Use them strategically:
- Run 6 to 8 different searches covering different angles of AI news
- Cover: model releases, research breakthroughs, startup funding, product launches, 
  AI policy/regulation, big tech AI moves, open source AI, AI safety news
- Each search should use a different query to maximise coverage

After gathering results, rank and summarise them.

IMPORTANT: When you are done searching, return ONLY a valid JSON array (no markdown, no explanation).
Each item must have exactly these fields:
{
  "rank": 1,
  "title": "Article title",
  "url": "https://...",
  "summary": "Two sentence summary of what happened and why it matters.",
  "category": "one of: Models, Research, Startups, Products, Policy, Industry, Open Source, Safety",
  "importance": 8,
  "source": "Publication name"
}

Return exactly 30 items, ranked 1 (most important) to 30."""

# Gemini tool definitions — these tell the model what functions it can call
GEMINI_TOOLS = Tool(function_declarations=[
    FunctionDeclaration(
        name="search_tavily",
        description=(
            "Search the web for recent AI news using Tavily. "
            "Best for open-ended queries. Returns title, URL, snippet, date."
        ),
        parameters={
            "type": "object",
            "properties": {
                "query": {
                    "type": "string",
                    "description": "Search query, e.g. 'AI model release March 2026'",
                },
                "max_results": {
                    "type": "integer",
                    "description": "Number of results to return (default 10, max 15)",
                },
            },
            "required": ["query"],
        },
    ),
    FunctionDeclaration(
        name="search_newsapi",
        description=(
            "Search NewsAPI for recent AI headlines. "
            "Best for keyword-specific news. Returns title, URL, snippet, date, source name."
        ),
        parameters={
            "type": "object",
            "properties": {
                "query": {
                    "type": "string",
                    "description": "Keyword query, e.g. 'artificial intelligence startup'",
                },
                "max_results": {
                    "type": "integer",
                    "description": "Number of results to return (default 10, max 20)",
                },
            },
            "required": ["query"],
        },
    ),
])


async def run_agent() -> list[dict]:
    """Run the news agent using Gemini. Returns list of 30 ranked news stories."""

    model = genai.GenerativeModel(
        model_name="gemini-2.5-flash-lite",
        system_instruction=SYSTEM_PROMPT,
        tools=[GEMINI_TOOLS],
    )

    # Start the conversation
    chat = model.start_chat(history=[])

    user_message = (
        "Find the top 30 most important AI news stories from the last 24 hours. "
        "Use multiple searches to get broad coverage, then rank and return as JSON."
    )

    max_iterations = 12
    iteration = 0
    response = await chat.send_message_async(user_message)

    while iteration < max_iterations:
        iteration += 1
        print(f"Agent iteration {iteration}...")

        # Check if Gemini wants to call tools
        tool_calls = []
        for part in response.parts:
            if hasattr(part, "function_call") and part.function_call.name:
                tool_calls.append(part.function_call)

        if tool_calls:
            print(f"  Agent calling {len(tool_calls)} tool(s)...")

            # Execute all tool calls concurrently
            async def call_tool(fc):
                fn = TOOL_FUNCTIONS.get(fc.name)
                args = dict(fc.args)
                query = args.get("query", "")
                max_r = int(args.get("max_results", 10))
                print(f"    {fc.name}({query!r})")
                if fn:
                    result = await fn(query, max_r)
                else:
                    result = {"error": f"Tool {fc.name} not found"}
                print(f"    --> {fc.name} returned {str(result)[:100]}...")
                # Return a Gemini-format function response part
                return genai.protos.Part(
                    function_response=genai.protos.FunctionResponse(
                        name=fc.name,
                        response={"result": json.dumps(result)},
                    )
                )

            tool_response_parts = await asyncio.gather(*[call_tool(fc) for fc in tool_calls])

            # Send tool results back to Gemini
            response = await asyncio.to_thread(
                chat.send_message,
                list(tool_response_parts)
            )

        else:
            # No tool calls — Gemini is done, extract the text
            raw = response.text.strip()
            print(f"Agent raw response length: {len(raw)} chars")

            # Strip markdown code fences if present
            if raw.startswith("```"):
                raw = raw.split("```")[1]
                if raw.startswith("json"):
                    raw = raw[4:]
                raw = raw.strip()

            articles = json.loads(raw)
            print(f"Agent done. Returned {len(articles)} articles.")
            return articles[:30]

    raise RuntimeError("Agent exceeded max iterations without completing")

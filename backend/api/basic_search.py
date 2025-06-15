import os
from smolagents import CodeAgent, LiteLLMModel
from smolagents.default_tools import DuckDuckGoSearchTool
import dotenv

dotenv.load_dotenv()

ANTHROPIC_API_KEY = os.environ["ANTHROPIC_API_KEY"]

def create_deep_search_agent():
    """
    Creates and configures an agent for performing deep web searches.

    This function initializes a model and a web search tool, then assembles
    them into a CodeAgent capable of understanding a user's query, searching
    the web, and returning a comprehensive answer.

    Returns:
        CodeAgent: An instance of the smolagents CodeAgent.
    """
    # 1. Check for the Anthropic API key
    if "ANTHROPIC_API_KEY" not in os.environ:
        raise ValueError(
            "ANTHROPIC_API_KEY environment variable not set. "
            "Please set it to your Anthropic API key."
        )

    # 2. Initialize the model
    # We use LiteLLMModel to connect to over 100 LLM providers, including Anthropic.
    print("Initializing model: claude-sonnet-4-20250514...")
    model = LiteLLMModel(
        model_id="anthropic/claude-sonnet-4-20250514",
        api_key=ANTHROPIC_API_KEY,
        temperature=0.1,  # Lower temperature for more factual, less creative responses
    )

    # 3. Initialize the necessary tools
    # The DuckDuckGoSearchTool allows the agent to search the internet.
    print("Initializing tools...")
    search_tool = DuckDuckGoSearchTool()

    # 4. Create the agent
    # The CodeAgent thinks in Python code, which is effective for complex tasks.
    # We provide it with the model and the search tool.
    print("Creating the agent...")
    agent = CodeAgent(
        tools=[search_tool],
        model=model,
    )
    
    print("Agent created successfully!")
    return agent

if __name__ == "__main__":
    # Create the agent
    deep_search_agent = create_deep_search_agent()

    # Define the user's query for the deep search
    user_query = "What were the key technological advancements that led to the development of mRNA vaccines?"

    print(f"\nRunning agent with the following query:\n'{user_query}'\n")
    
    # Run the agent with the user's query
    final_answer = deep_search_agent.run(user_query)

    print("\n" + "="*30)
    print("      FINAL ANSWER")
    print("="*30)
    print(final_answer)
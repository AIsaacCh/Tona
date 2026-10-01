from mcp_alexa.instance import mcp
from mcp_alexa import tools  # noqa: F401 — el import registra las tools decoradas

if __name__ == "__main__":
    mcp.run(transport="streamable-http")
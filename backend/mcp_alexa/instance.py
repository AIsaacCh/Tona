import sys
import os

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from mcp.server.fastmcp import FastMCP

mcp = FastMCP(name="tona-alexa", stateless_http=True)
mcp.settings.streamable_http_path = "/"
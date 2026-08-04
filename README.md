# mcp-remoteok

RemoteOK MCP — remote-work job board (tech-heavy), keyless.

Part of [Pipeworx](https://pipeworx.io) — an MCP gateway connecting AI agents to 1394+ live data sources.

## Tools

| Tool | Description |
|------|-------------|
| `list_jobs` | List the most recent remote jobs from RemoteOK (a popular, tech-heavy remote-work job board; keyless). Returns the newest postings (id, position, company, location, tags, salary range, date, url) without the long HTML description. Salaries are USD when present (0 = not disclosed). |
| `search_jobs` | Keyword-search current RemoteOK remote-job listings. Matches the query (case-insensitive) against job position, company name, or any tag. Tech-heavy board; keyless. Returns matching postings (id, position, company, location, tags, salary range, date, url). Salaries are USD when present. |
| `get_job` | Get the full RemoteOK job posting for a given job id, including the full HTML description. Use an id returned by list_jobs or search_jobs. Only jobs in the current ~100 most-recent listings are available. Salaries are USD when present. |

## Quick Start

Add to your MCP client (Claude Desktop, Cursor, Windsurf, etc.):

```json
{
  "mcpServers": {
    "remoteok": {
      "url": "https://gateway.pipeworx.io/remoteok/mcp"
    }
  }
}
```

Or connect to the full Pipeworx gateway for access to all 1394+ data sources:

```json
{
  "mcpServers": {
    "pipeworx": {
      "url": "https://gateway.pipeworx.io/mcp"
    }
  }
}
```

## Using with ask_pipeworx

Instead of calling tools directly, you can ask questions in plain English:

```
ask_pipeworx({ question: "your question about Remoteok data" })
```

The gateway picks the right tool and fills the arguments automatically.

## More

- [Docs and guides](https://pipeworx.io/docs)
- [pipeworx.io](https://pipeworx.io)

## License

MIT

# Design research MCPs (optional, user-installed)

Kiro blocks agent writes to `.kiro/settings/`, so these are installed by you:

1. Command palette -> "Kiro: Open workspace MCP config (JSON)" and merge `mcp.design-research.example.json`.
2. Mobbin (`https://api.mobbin.com/mcp`): OAuth. A browser opens on first use; sign in. Needs a Mobbin Pro/Team plan.
3. Refero (`https://api.refero.design/mcp`): OAuth, or a bearer token. Needs a paid Refero plan.
   Export the token in your shell before starting Kiro: `export REFERO_MCP_TOKEN=...`, and approve the
   variable under Settings -> "Mcp Approved Env Vars". Never paste tokens into chat or commit them.
   Rotate any token that was shared in plain text.
4. Reconnect servers from the MCP panel, then ask the agent to research (styles first, then screens/flows).

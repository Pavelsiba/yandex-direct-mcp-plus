// Композиция сервера: единственное место, знающее про McpServer и транспорт.
import { readFileSync } from "node:fs"
import { dirname, join } from "node:path"
import { fileURLToPath } from "node:url"
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js"
import { SERVER_INSTRUCTIONS } from "#app/instructions"
import { hasItemErrors } from "#shared/lib/format"
import type { ToolDescriptor } from "#shared/lib/tool"

const packageRoot = join(dirname(fileURLToPath(import.meta.url)), "..", "..")

export function readVersion(): string {
  try {
    // biome-ignore lint/plugin: package.json, идентификаторов Директа здесь нет
    const pkg = JSON.parse(readFileSync(join(packageRoot, "package.json"), "utf8"))
    return typeof pkg.version === "string" ? pkg.version : "0.0.0"
  } catch {
    return "0.0.0"
  }
}

// Отказ всего запроса хендлер бросает, и isError ставит SDK. Частичный отказ приходит
// обычным текстом — без признака клиент принял бы его за успех.
const toCallResult = (text: string) => ({
  content: [{ type: "text" as const, text }],
  isError: hasItemErrors(text)
})

export function createServer(tools: readonly ToolDescriptor[]): McpServer {
  const server = new McpServer({ name: "yd-mcp", version: readVersion() }, { instructions: SERVER_INSTRUCTIONS })

  for (const tool of tools) {
    server.registerTool(
      tool.name,
      {
        title: tool.title,
        description: tool.description,
        inputSchema: tool.schema.shape,
        annotations: tool.annotations
      },
      async (params: unknown) => toCallResult(await tool.run(params))
    )
  }

  return server
}

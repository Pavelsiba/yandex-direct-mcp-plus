#!/usr/bin/env node
// Точка входа: поднимает сервер на stdio-транспорте и больше ничего не делает.
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js"
import { tools } from "#app/registry"
import { createServer, readVersion } from "#app/server"
import { isSandbox } from "#shared/config/env"

async function main(): Promise<void> {
  const server = createServer(tools)
  await server.connect(new StdioServerTransport())

  // stdout занят транспортом MCP — любые сообщения только в stderr.
  const mode = isSandbox() ? " [SANDBOX]" : ""
  console.error(
    `[yd-mcp] v${readVersion()} запущен${mode}. ${tools.length} инструментов. Требуется YANDEX_DIRECT_TOKEN.`
  )
}

main().catch((error) => {
  console.error("[yd-mcp] Ошибка запуска:", error)
  process.exit(1)
})

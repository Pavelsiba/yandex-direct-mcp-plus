#!/usr/bin/env node
// Точка входа удалённого сервера: Streamable HTTP вместо stdio, остальное — как в index.ts.
import { readHttpConfig } from "#app/http-access"
import { startHttpServer } from "#app/http-server"
import { tools } from "#app/registry"
import { readVersion } from "#app/server"

async function main(): Promise<void> {
  const config = readHttpConfig(process.env)
  const { url } = await startHttpServer(config, tools)

  console.error(
    `[yd-mcp] v${readVersion()} слушает ${url}/mcp. ${tools.length} инструментов. ` +
      `Допустимые хосты: ${config.allowedHosts.join(", ")}.`
  )
}

main().catch((error) => {
  console.error("[yd-mcp] Ошибка запуска:", error instanceof Error ? error.message : error)
  process.exit(1)
})

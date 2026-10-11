// Удалённый вход: Streamable HTTP без сессий. На каждый запрос — свой McpServer: состояния
// между вызовами у сервера нет, а общий экземпляр смешал бы ответы параллельных клиентов.
import { createServer as createHttpServer, type IncomingMessage, type ServerResponse } from "node:http"
import type { AddressInfo } from "node:net"
import { hostHeaderValidation, NodeStreamableHTTPServerTransport, originValidation } from "@modelcontextprotocol/node"
import { type HttpConfig, isAuthorized, matchRoute } from "#app/http-access"
import { createServer } from "#app/server"
import type { ToolDescriptor } from "#shared/lib/tool"

export type RunningHttpServer = { readonly url: string; readonly close: () => Promise<void> }

function reply(res: ServerResponse, status: number, body: string, headers: Record<string, string> = {}): void {
  res.writeHead(status, { "content-type": "text/plain; charset=utf-8", ...headers }).end(body)
}

async function serveMcp(tools: readonly ToolDescriptor[], req: IncomingMessage, res: ServerResponse): Promise<void> {
  const server = createServer(tools)
  const transport = new NodeStreamableHTTPServerTransport({ sessionIdGenerator: undefined })
  res.on("close", () => {
    void transport.close()
    void server.close()
  })
  await server.connect(transport)
  await transport.handleRequest(req, res)
}

export function startHttpServer(config: HttpConfig, tools: readonly ToolDescriptor[]): Promise<RunningHttpServer> {
  const validateHost = hostHeaderValidation([...config.allowedHosts])
  const validateOrigin = originValidation([...config.allowedHosts])

  const http = createHttpServer(async (req, res) => {
    const route = matchRoute(new URL(req.url ?? "/", "http://placeholder").pathname)

    // Без проверок хоста: healthcheck Docker ходит по IP контейнера и ничего не узнаёт.
    if (route.kind === "health") return reply(res, 200, "ok")
    if (route.kind === "unknown") return reply(res, 404, "Не найдено")

    if (!validateHost(req, res) || !validateOrigin(req, res)) return
    if (!isAuthorized(route, req.headers.authorization, config.secret)) {
      return reply(res, 401, "Нужен секрет: заголовок Authorization: Bearer <секрет> или путь /mcp/<секрет>", {
        "www-authenticate": "Bearer"
      })
    }
    // Без сессий потока уведомлений (GET) и закрытия сессии (DELETE) нет.
    if (req.method !== "POST") return reply(res, 405, "Только POST", { allow: "POST" })

    try {
      await serveMcp(tools, req, res)
    } catch (error) {
      console.error("[yd-mcp] Ошибка обработки запроса:", error)
      if (!res.headersSent) reply(res, 500, "Внутренняя ошибка сервера")
    }
  })

  return new Promise((resolve, reject) => {
    http.once("error", reject)
    http.listen(config.port, config.host, () => {
      const { port } = http.address() as AddressInfo
      resolve({
        url: `http://${config.host}:${port}`,
        close: () => new Promise((done) => http.close(() => done()))
      })
    })
  })
}

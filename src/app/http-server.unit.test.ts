import { request as httpRequest } from "node:http"
import { Client, StreamableHTTPClientTransport } from "@modelcontextprotocol/client"
import { afterAll, beforeAll, describe, expect, it } from "vitest"
import { z } from "zod"
import { type RunningHttpServer, startHttpServer } from "#app/http-server"
import { defineTool, READ } from "#shared/lib/tool"

const SECRET = "s".repeat(32)

const echoTool = defineTool({
  name: "echo",
  title: "Эхо",
  description: "Возвращает переданный текст",
  annotations: READ,
  schema: z.object({ text: z.string().meta({ description: "Текст" }) }),
  handler: async ({ text }) => text
})

let running: RunningHttpServer

beforeAll(async () => {
  running = await startHttpServer(
    { secret: SECRET, port: 0, host: "127.0.0.1", allowedHosts: ["127.0.0.1", "localhost"] },
    [echoTool]
  )
})

afterAll(() => running.close())

async function connect(path: string, headers: Record<string, string> = {}): Promise<Client> {
  const client = new Client({ name: "test", version: "0.0.0" })
  await client.connect(
    new StreamableHTTPClientTransport(new URL(`${running.url}${path}`), { requestInit: { headers } })
  )
  return client
}

// fetch подставляет Host сам и чужой задать не даёт — поэтому node:http.
function statusWithHost(host: string): Promise<number | undefined> {
  return new Promise((resolve, reject) => {
    const request = httpRequest(
      `${running.url}/mcp`,
      { method: "POST", headers: { host, authorization: `Bearer ${SECRET}` } },
      (response) => {
        response.resume()
        resolve(response.statusCode)
      }
    )
    request.on("error", reject).end()
  })
}

describe("удалённый сервер", () => {
  it("отвечает клиенту MCP с секретом в заголовке", async () => {
    const client = await connect("/mcp", { authorization: `Bearer ${SECRET}` })

    const result = await client.callTool({ name: "echo", arguments: { text: "привет" } })

    expect(result.content).toEqual([{ type: "text", text: "привет" }])
    await client.close()
  })

  it("отвечает клиенту MCP с секретом в пути", async () => {
    const client = await connect(`/mcp/${SECRET}`)

    const { tools } = await client.listTools()

    expect(tools.map((tool) => tool.name)).toEqual(["echo"])
    await client.close()
  })

  it("не пускает без секрета и с чужим секретом", async () => {
    const post = (path: string, headers: Record<string, string> = {}) =>
      fetch(`${running.url}${path}`, { method: "POST", headers: { "content-type": "application/json", ...headers } })

    expect((await post("/mcp")).status).toBe(401)
    expect((await post("/mcp", { authorization: "Bearer wrong-secret" })).status).toBe(401)
    expect((await post("/mcp/wrong-secret")).status).toBe(401)
  })

  it("отбивает чужой Host даже с верным секретом", async () => {
    expect(await statusWithHost("evil.example")).toBe(403)
  })

  it("без сессий принимает только POST", async () => {
    const response = await fetch(`${running.url}/mcp`, { headers: { authorization: `Bearer ${SECRET}` } })

    expect(response.status).toBe(405)
    expect(response.headers.get("allow")).toBe("POST")
  })

  it("отдаёт проверку живости без секрета и 404 на прочие пути", async () => {
    expect(await (await fetch(`${running.url}/health`)).text()).toBe("ok")
    expect((await fetch(`${running.url}/`)).status).toBe(404)
  })
})

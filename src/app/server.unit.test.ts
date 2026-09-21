import { Client } from "@modelcontextprotocol/sdk/client/index.js"
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js"
import { describe, expect, it } from "vitest"
import { tools } from "#app/registry"
import { createServer } from "#app/server"

async function connect() {
  const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair()
  const client = new Client({ name: "test", version: "0.0.0" })
  await createServer(tools).connect(serverTransport)
  await client.connect(clientTransport)
  return client
}

describe("сервер", () => {
  it("при подключении сообщает агенту, чего Директ через API не делает", async () => {
    const client = await connect()

    const instructions = client.getInstructions()

    expect(instructions).toContain("визитки")
    expect(instructions).toContain("динамические объявления")
    await client.close()
  })

  it("не предлагает инструмент создания визиток, который Директ отключил", async () => {
    const client = await connect()

    const { tools: listed } = await client.listTools()

    expect(listed.map((tool) => tool.name)).not.toContain("add_vcard")
    await client.close()
  })
})

import { Client } from "@modelcontextprotocol/sdk/client/index.js"
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js"
import { describe, expect, it } from "vitest"
import { z } from "zod"
import { tools } from "#app/registry"
import { createServer } from "#app/server"
import { formatResult } from "#shared/lib/format"
import { defineTool, type ToolDescriptor, WRITE } from "#shared/lib/tool"

const toolAnswering = (response: unknown) =>
  defineTool({
    name: "probe",
    title: "Проба",
    description: "Отдаёт заранее заданный ответ Директа",
    annotations: WRITE,
    schema: z.object({}),
    handler: async () => formatResult(response)
  })

async function connect(served: readonly ToolDescriptor[] = tools) {
  const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair()
  const client = new Client({ name: "test", version: "0.0.0" })
  await createServer(served).connect(serverTransport)
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

  it("проверяет параметры и правилами на весь объект, а не только на отдельные поля", async () => {
    const client = await connect()

    const result = await client.callTool({
      name: "set_time_targeting",
      arguments: {
        campaign_id: "1",
        schedule: [{ days: ["MON"], start_hour: 9, end_hour: 21 }],
        suspend_on_holidays: true,
        holiday_bid_percent: 50,
        dry_run: true
      }
    })

    expect(result.isError).toBe(true)
    expect(result.content).toEqual([
      expect.objectContaining({ text: expect.stringContaining("suspend_on_holidays=true") })
    ])
    await client.close()
  })

  it("помечает ошибкой вызов, в котором отказал хотя бы один объект", async () => {
    const client = await connect([
      toolAnswering({ result: { AddResults: [{ Id: 1 }, { Errors: [{ Code: 3500, Message: "Не поддерживается" }] }] } })
    ])

    const result = await client.callTool({ name: "probe", arguments: {} })

    expect(result.isError).toBe(true)
    await client.close()
  })

  it("не помечает ошибкой вызов, где все объекты прошли", async () => {
    const client = await connect([toolAnswering({ result: { AddResults: [{ Id: 1 }] } })])

    const result = await client.callTool({ name: "probe", arguments: {} })

    expect(result.isError).toBe(false)
    await client.close()
  })
})

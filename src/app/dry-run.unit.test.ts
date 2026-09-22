// biome-ignore-all lint/plugin: тест разбирает тело запроса; ID в фикстурах — сырой строкой
import { beforeEach, describe, expect, it } from "vitest"
import { z } from "zod"
import { tools } from "#app/registry"
import { PREVIEW_STRING_MAX } from "#shared/config/limits"
import type { ToolDescriptor } from "#shared/lib/tool"
import { installFetchMock, lastRawBody, mockFetch, okResponse } from "#testing/fetch-mock"

installFetchMock()

const CAMPAIGN_ID = "1915016273214320641"

function toolNamed(name: string): ToolDescriptor {
  const tool = tools.find((candidate) => candidate.name === name)
  if (!tool) throw new Error(`нет инструмента ${name}`)
  return tool
}

// Как вызывает SDK: сначала схема, потом run с уже разобранными параметрами.
const call = (name: string, args: Record<string, unknown>) => {
  const tool = toolNamed(name)
  return tool.run(tool.schema.parse(args))
}

const inputFields = (tool: ToolDescriptor) =>
  Object.keys((z.toJSONSchema(tool.schema, { io: "input" }) as { properties?: object }).properties ?? {})

describe("dry_run", () => {
  beforeEach(() => mockFetch.mockReset())

  it("есть у каждого пишущего инструмента и отсутствует у читающих", () => {
    for (const tool of tools) {
      expect(inputFields(tool).includes("dry_run"), tool.name).toBe(!tool.annotations.readOnlyHint)
    }
  })

  it("не отправляет запись и показывает её тело с ID без потери точности", async () => {
    const output = await call("update_campaign", { campaign_id: CAMPAIGN_ID, name: "Новое", dry_run: true })

    expect(mockFetch).not.toHaveBeenCalled()
    expect(output).toContain("campaigns.update")
    expect(output).toContain(`"Id": ${CAMPAIGN_ID}`)
    expect(output).toContain('"Name": "Новое"')
  })

  it("показывает все записи сценария, а не только первую", async () => {
    const output = await call("update_campaign", {
      campaign_id: CAMPAIGN_ID,
      status: "SUSPEND",
      daily_budget: 500,
      dry_run: true
    })

    expect(output).toContain("1. campaigns.suspend")
    expect(output).toContain("2. campaigns.update")
    expect(output).toContain('"Amount": 500000000')
  })

  it("читает по-настоящему, чтобы собрать запись по живым данным", async () => {
    mockFetch.mockResolvedValueOnce(
      okResponse(`{"result":{"Campaigns":[{"Id":${CAMPAIGN_ID},"NegativeKeywords":{"Items":["бесплатно"]}}]}}`)
    )

    const output = await call("set_campaign_negative_keywords", {
      campaign_id: CAMPAIGN_ID,
      negative_keywords: ["своими руками"],
      mode: "add",
      dry_run: true
    })

    expect(mockFetch).toHaveBeenCalledTimes(1)
    expect(lastRawBody()).toContain('"method":"get"')
    expect(output).toContain("campaigns.update")
    expect(output).toMatch(/"бесплатно",\s+"своими руками"/)
  })

  it("обрезает длинные строки вроде base64 картинки, не трогая короткие", async () => {
    const imageData = "A".repeat(PREVIEW_STRING_MAX + 500)

    const output = await call("manage_ad_images", {
      action: "add",
      images: [{ image_data: imageData, name: "баннер" }],
      dry_run: true
    })

    expect(output).not.toContain(imageData)
    expect(output).toContain(`всего ${imageData.length} символов`)
    expect(output).toContain('"Name": "баннер"')
  })

  it("отдаёт результат чтения, если записи в вызове не было", async () => {
    mockFetch.mockResolvedValueOnce(okResponse({ result: { AdImages: [{ AdImageHash: "abc" }] } }))

    const output = await call("manage_ad_images", { action: "get", dry_run: true })

    expect(output).toContain("запись не понадобилась")
    expect(output).toContain("abc")
  })

  it("без флага отправляет запись и не передаёт dry_run в Директ", async () => {
    mockFetch.mockResolvedValueOnce(okResponse({ result: { UpdateResults: [{ Id: 1 }] } }))

    await call("update_campaign", { campaign_id: CAMPAIGN_ID, name: "Новое", dry_run: false })

    expect(mockFetch).toHaveBeenCalledTimes(1)
    expect(lastRawBody()).not.toContain("dry_run")
  })

  it("проверяет параметры схемой и в режиме предпросмотра", () => {
    expect(() => toolNamed("update_campaign").schema.parse({ campaign_id: "12.5", dry_run: true })).toThrow()
  })
})

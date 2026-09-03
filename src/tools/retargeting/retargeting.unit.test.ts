// biome-ignore-all lint/plugin: тест разбирает тело запроса
import { beforeEach, describe, expect, it } from "vitest"
import { installFetchMock, lastRawBody, mockFetch, okResponse } from "#testing/fetch-mock"
import { handleAddRetargetingList, handleListRetargetingLists } from "./handler.js"
import { addRetargetingListSchema } from "./schema.js"

installFetchMock()

function lastBody() {
  return JSON.parse(lastRawBody())
}

describe("list_retargeting_lists", () => {
  beforeEach(() => mockFetch.mockReset())

  it("не отправляет SelectionCriteria, когда фильтров нет", async () => {
    mockFetch.mockResolvedValueOnce(okResponse({ result: { RetargetingLists: [] } }))

    await handleListRetargetingLists({})

    expect(lastBody().params.SelectionCriteria).toBeUndefined()
  })

  it("фильтрует по типу условия", async () => {
    mockFetch.mockResolvedValueOnce(okResponse({ result: { RetargetingLists: [] } }))

    await handleListRetargetingLists({ types: ["AUDIENCE"] })

    expect(lastBody().params.SelectionCriteria).toEqual({ Types: ["AUDIENCE"] })
  })
})

describe("add_retargeting_list", () => {
  beforeEach(() => mockFetch.mockReset())

  it("подставляет тип RETARGETING, когда он не назван", async () => {
    mockFetch.mockResolvedValueOnce(okResponse({ result: { AddResults: [] } }))
    const params = addRetargetingListSchema.parse({
      name: "Были на сайте",
      rules: [{ operator: "ALL", arguments: [{ external_id: "12345678" }] }]
    })

    await handleAddRetargetingList(params)

    const list = lastBody().params.RetargetingLists[0]
    expect(list.Type).toBe("RETARGETING")
    expect(list).not.toHaveProperty("Description")
    expect(list.Rules).toEqual([{ Operator: "ALL", Arguments: [{ ExternalId: 12345678 }] }])
  })

  it("передаёт срок жизни условия, когда он задан", async () => {
    mockFetch.mockResolvedValueOnce(okResponse({ result: { AddResults: [] } }))
    const params = addRetargetingListSchema.parse({
      name: "Смотрели крабов",
      type: "AUDIENCE",
      description: "Сегмент Аудиторий",
      rules: [{ operator: "ANY", arguments: [{ external_id: "12345678", membership_life_span: 30 }] }]
    })

    await handleAddRetargetingList(params)

    const list = lastBody().params.RetargetingLists[0]
    expect(list.Type).toBe("AUDIENCE")
    expect(list.Description).toBe("Сегмент Аудиторий")
    expect(list.Rules[0].Arguments[0]).toEqual({ ExternalId: 12345678, MembershipLifeSpan: 30 })
  })
})

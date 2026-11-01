// biome-ignore-all lint/plugin/no-native-json: тест разбирает тело запроса; проверка ID сравнивает сырую строку
import { beforeEach, describe, expect, it } from "vitest"
import { installFetchMock, lastRawBody, mockFetch, okResponse } from "#testing/fetch-mock"
import { handleCreateAdGroup, handleDeleteAdGroups, handleListAdGroups, handleUpdateAdGroup } from "./handler.js"
import { AD_GROUP_LIST_FIELDS, listAdGroupsSchema, updateAdGroupSchema } from "./schema.js"

installFetchMock()

function lastBody() {
  return JSON.parse(lastRawBody())
}

describe("list_ad_groups", () => {
  beforeEach(() => mockFetch.mockReset())

  it("отбирает группы по кампаниям, не потеряв точность ID", async () => {
    mockFetch.mockResolvedValueOnce(okResponse({ result: { AdGroups: [] } }))

    await handleListAdGroups({ campaign_ids: ["1915016273214320641"] })

    expect(lastRawBody()).toContain('"CampaignIds":[1915016273214320641]')
  })

  it("по умолчанию запрашивает узкий набор полей", async () => {
    mockFetch.mockResolvedValueOnce(okResponse({ result: { AdGroups: [] } }))

    await handleListAdGroups({ campaign_ids: ["123"] })

    expect(lastBody().params.FieldNames).toEqual(AD_GROUP_LIST_FIELDS)
  })

  it("запрашивает поля, перечисленные в fields", async () => {
    mockFetch.mockResolvedValueOnce(okResponse({ result: { AdGroups: [] } }))

    await handleListAdGroups({ campaign_ids: ["123"], fields: ["Id", "NegativeKeywords", "TrackingParams"] })

    expect(lastBody().params.FieldNames).toEqual(["Id", "NegativeKeywords", "TrackingParams"])
  })

  it("отклоняет поле, которого нет в AdGroupFieldEnum", () => {
    expect(listAdGroupsSchema.safeParse({ campaign_ids: ["123"], fields: ["Bid"] }).success).toBe(false)
  })
})

describe("create_ad_group", () => {
  beforeEach(() => mockFetch.mockReset())

  it("отправляет регионы числами, а кампанию — отдельным полем", async () => {
    mockFetch.mockResolvedValueOnce(okResponse({ result: { AddResults: [] } }))

    await handleCreateAdGroup({ campaign_id: "123", name: "Крабы", region_ids: ["225", "213"] })

    expect(lastBody().params.AdGroups[0].Name).toBe("Крабы")
    expect(lastRawBody()).toContain('"RegionIds":[225,213]')
  })

  it("доносит минус-регион до тела запроса, не потеряв знак", async () => {
    mockFetch.mockResolvedValueOnce(okResponse({ result: { AddResults: [] } }))

    await handleCreateAdGroup({ campaign_id: "123", name: "Крабы", region_ids: ["225", "-213"] })

    expect(lastRawBody()).toContain('"RegionIds":[225,-213]')
  })
})

describe("update_ad_group", () => {
  beforeEach(() => mockFetch.mockReset())

  it("отправляет в adgroups.update только заданные поля, не потеряв точность ID", async () => {
    mockFetch.mockResolvedValueOnce(okResponse({ result: { UpdateResults: [{ Id: "5612345678901234567" }] } }))

    await handleUpdateAdGroup(updateAdGroupSchema.parse({ ad_group_id: "5612345678901234567", name: "Раки живые" }))

    expect(lastBody().method).toBe("update")
    expect(lastRawBody()).toContain('"AdGroups":[{"Id":5612345678901234567,"Name":"Раки живые"}]')
  })

  it("отправляет регионы числами, сохранив минус-регион", async () => {
    mockFetch.mockResolvedValueOnce(okResponse({ result: { UpdateResults: [{ Id: 1 }] } }))

    await handleUpdateAdGroup(updateAdGroupSchema.parse({ ad_group_id: "1", region_ids: ["225", "-213"] }))

    expect(lastRawBody()).toContain('"RegionIds":[225,-213]')
  })

  it("передаёт разметку как есть, с подстановками Директа", async () => {
    mockFetch.mockResolvedValueOnce(okResponse({ result: { UpdateResults: [{ Id: 1 }] } }))

    await handleUpdateAdGroup(
      updateAdGroupSchema.parse({ ad_group_id: "1", tracking_params: "utm_source=yandex&utm_content={ad_id}" })
    )

    expect(lastBody().params.AdGroups[0]).toEqual({ Id: 1, TrackingParams: "utm_source=yandex&utm_content={ad_id}" })
  })

  it("снимает разметку пустой строкой, когда передан null", async () => {
    mockFetch.mockResolvedValueOnce(okResponse({ result: { UpdateResults: [{ Id: 1 }] } }))

    await handleUpdateAdGroup(updateAdGroupSchema.parse({ ad_group_id: "1", tracking_params: null }))

    expect(lastBody().params.AdGroups[0]).toEqual({ Id: 1, TrackingParams: "" })
  })

  it("отклоняет пустую строку разметки и пустой список регионов", () => {
    expect(updateAdGroupSchema.safeParse({ ad_group_id: "1", tracking_params: "" }).success).toBe(false)
    expect(updateAdGroupSchema.safeParse({ ad_group_id: "1", region_ids: [] }).success).toBe(false)
  })

  it("не ходит в API, когда менять нечего", async () => {
    await expect(handleUpdateAdGroup(updateAdGroupSchema.parse({ ad_group_id: "1" }))).rejects.toThrow(
      "Нечего обновлять"
    )
    expect(mockFetch).not.toHaveBeenCalled()
  })

  it("показывает отказ по группе ошибкой, а не успехом", async () => {
    mockFetch.mockResolvedValueOnce(
      okResponse({
        result: {
          UpdateResults: [{ Errors: [{ Code: 8800, Message: "Объект не найден", Details: "Группа не найдена" }] }]
        }
      })
    )

    const output = await handleUpdateAdGroup(updateAdGroupSchema.parse({ ad_group_id: "1", name: "Крабы" }))

    expect(output).toContain("8800")
  })
})

describe("delete_ad_groups", () => {
  beforeEach(() => mockFetch.mockReset())

  it("удаляет группы одним вызовом метода delete", async () => {
    mockFetch.mockResolvedValueOnce(okResponse({ result: { DeleteResults: [] } }))

    await handleDeleteAdGroups({ ad_group_ids: ["123", "456"] })

    expect(lastBody().method).toBe("delete")
    expect(lastRawBody()).toContain('"Ids":[123,456]')
  })
})

// biome-ignore-all lint/plugin: тест разбирает тело запроса
import { beforeEach, describe, expect, it } from "vitest"
import { installFetchMock, lastRawBody, mockFetch, okResponse } from "#testing/fetch-mock"
import {
  handleAddBidAdjustments,
  handleDeleteBidAdjustments,
  handleGetBidAdjustments,
  handleSetBidAdjustments
} from "./handler.js"

installFetchMock()

function lastBody() {
  return JSON.parse(lastRawBody())
}

describe("get_bid_adjustments", () => {
  beforeEach(() => mockFetch.mockReset())

  it("отказывается выбирать корректировки одним уровнем, без объектов", async () => {
    await expect(handleGetBidAdjustments({ levels: ["CAMPAIGN"] })).rejects.toThrow("campaign_ids")
    expect(mockFetch).not.toHaveBeenCalled()
  })

  it("запрашивает коэффициенты всех типов сразу: они лежат в разных полях", async () => {
    mockFetch.mockResolvedValueOnce(okResponse({ result: { BidModifiers: [] } }))

    await handleGetBidAdjustments({ campaign_ids: ["123"], levels: ["CAMPAIGN"], types: ["MOBILE_ADJUSTMENT"] })

    const { params } = lastBody()
    expect(params.SelectionCriteria).toEqual({
      Levels: ["CAMPAIGN"],
      CampaignIds: [123],
      Types: ["MOBILE_ADJUSTMENT"]
    })
    expect(params.MobileAdjustmentFieldNames).toContain("BidModifier")
    expect(params.DemographicsAdjustmentFieldNames).toContain("Gender")
  })
})

describe("add_bid_adjustments", () => {
  beforeEach(() => mockFetch.mockReset())

  it("требует ровно один уровень целей", async () => {
    const adjustments = [{ type: "DESKTOP_ADJUSTMENT" as const, bid_modifier: 120 }]

    await expect(handleAddBidAdjustments({ adjustments })).rejects.toThrow("campaign_ids ИЛИ ad_group_ids")
    await expect(handleAddBidAdjustments({ campaign_ids: ["1"], ad_group_ids: ["2"], adjustments })).rejects.toThrow(
      "campaign_ids ИЛИ ad_group_ids"
    )
    expect(mockFetch).not.toHaveBeenCalled()
  })

  it("кладёт каждую одиночную корректировку в свой элемент и повторяет их для каждой кампании", async () => {
    mockFetch.mockResolvedValueOnce(okResponse({ result: { AddResults: [] } }))

    await handleAddBidAdjustments({
      campaign_ids: ["111", "222"],
      adjustments: [
        { type: "MOBILE_ADJUSTMENT", bid_modifier: 130, operating_system_type: "IOS" },
        { type: "DESKTOP_ADJUSTMENT", bid_modifier: 90 }
      ]
    })

    expect(lastBody().method).toBe("add")
    expect(lastBody().params.BidModifiers).toEqual([
      { CampaignId: 111, MobileAdjustment: { BidModifier: 130, OperatingSystemType: "IOS" } },
      { CampaignId: 111, DesktopAdjustment: { BidModifier: 90 } },
      { CampaignId: 222, MobileAdjustment: { BidModifier: 130, OperatingSystemType: "IOS" } },
      { CampaignId: 222, DesktopAdjustment: { BidModifier: 90 } }
    ])
  })

  it("отправляет 19-значный ID кампании числом без потери точности", async () => {
    mockFetch.mockResolvedValueOnce(okResponse({ result: { AddResults: [] } }))

    await handleAddBidAdjustments({
      campaign_ids: ["1915016273214320641"],
      adjustments: [{ type: "DESKTOP_ADJUSTMENT", bid_modifier: 90 }]
    })

    expect(lastRawBody()).toContain('"CampaignId":1915016273214320641')
  })

  it("собирает корректировки-массивы одного вида в один элемент", async () => {
    mockFetch.mockResolvedValueOnce(okResponse({ result: { AddResults: [] } }))

    await handleAddBidAdjustments({
      ad_group_ids: ["500001"],
      adjustments: [
        { type: "DEMOGRAPHICS_ADJUSTMENT", bid_modifier: 101, gender: "GENDER_MALE", age: "AGE_25_34" },
        { type: "DEMOGRAPHICS_ADJUSTMENT", bid_modifier: 140, age: "AGE_45_54" },
        { type: "RETARGETING_ADJUSTMENT", bid_modifier: 201, retargeting_condition_id: "2004" }
      ]
    })

    expect(lastBody().params.BidModifiers).toEqual([
      {
        AdGroupId: 500001,
        DemographicsAdjustments: [
          { BidModifier: 101, Gender: "GENDER_MALE", Age: "AGE_25_34" },
          { BidModifier: 140, Age: "AGE_45_54" }
        ]
      },
      { AdGroupId: 500001, RetargetingAdjustments: [{ RetargetingConditionId: 2004, BidModifier: 201 }] }
    ])
  })

  it("не отправляет корректировку без обязательного среза", async () => {
    await expect(
      handleAddBidAdjustments({
        campaign_ids: ["1"],
        adjustments: [{ type: "REGIONAL_ADJUSTMENT", bid_modifier: 110 }]
      })
    ).rejects.toThrow("region_id")
    await expect(
      handleAddBidAdjustments({
        campaign_ids: ["1"],
        adjustments: [{ type: "DEMOGRAPHICS_ADJUSTMENT", bid_modifier: 110 }]
      })
    ).rejects.toThrow("gender и/или age")
    expect(mockFetch).not.toHaveBeenCalled()
  })

  it("не даёт срезу молча пропасть: поле не от того вида — ошибка, а не blanket-корректировка", async () => {
    await expect(
      handleAddBidAdjustments({
        campaign_ids: ["1"],
        adjustments: [{ type: "MOBILE_ADJUSTMENT", bid_modifier: 130, retargeting_condition_id: "2004" }]
      })
    ).rejects.toThrow("retargeting_condition_id")
    expect(mockFetch).not.toHaveBeenCalled()
  })

  it("считает предел по элементам запроса, а не по спискам по отдельности", async () => {
    const campaignIds = Array.from({ length: 400 }, (_, index) => String(index + 1))

    await expect(
      handleAddBidAdjustments({
        campaign_ids: campaignIds,
        adjustments: [
          { type: "DESKTOP_ADJUSTMENT", bid_modifier: 90 },
          { type: "MOBILE_ADJUSTMENT", bid_modifier: 130 },
          { type: "VIDEO_ADJUSTMENT", bid_modifier: 110 }
        ]
      })
    ).rejects.toThrow("1200 корректировок при пределе 1000")
    expect(mockFetch).not.toHaveBeenCalled()
  })

  it("разбирает per-item ошибку пакета: часть корректировок могла не пройти", async () => {
    mockFetch.mockResolvedValueOnce(
      okResponse({
        result: {
          AddResults: [
            { Id: 7 },
            { Errors: [{ Code: 5003, Message: "Недопустимое значение", Details: "BidModifier вне диапазона" }] }
          ]
        }
      })
    )

    const output = await handleAddBidAdjustments({
      campaign_ids: ["1"],
      adjustments: [
        { type: "DESKTOP_ADJUSTMENT", bid_modifier: 120 },
        { type: "VIDEO_ADJUSTMENT", bid_modifier: 130 }
      ]
    })

    expect(output).toContain("5003")
    expect(output).toContain("Недопустимое значение")
  })
})

describe("delete_bid_adjustments", () => {
  beforeEach(() => mockFetch.mockReset())

  it("удаляет корректировки по ID, не теряя точности длинных ID", async () => {
    mockFetch.mockResolvedValueOnce(okResponse({ result: { DeleteResults: [] } }))

    await handleDeleteBidAdjustments({ adjustment_ids: ["1915016273214320641"] })

    expect(lastBody().method).toBe("delete")
    expect(lastRawBody()).toContain('"Ids":[1915016273214320641]')
  })
})

describe("set_bid_adjustments", () => {
  beforeEach(() => mockFetch.mockReset())

  it("отправляет коэффициент процентами, без конвертации в микроединицы", async () => {
    mockFetch.mockResolvedValueOnce(okResponse({ result: { SetResults: [] } }))

    await handleSetBidAdjustments({ adjustments: [{ adjustment_id: "123", bid_modifier: 150 }] })

    expect(lastBody().method).toBe("set")
    expect(lastBody().params.BidModifiers).toEqual([{ Id: 123, BidModifier: 150 }])
  })
})

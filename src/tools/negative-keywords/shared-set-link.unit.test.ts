import { describe, expect, it } from "vitest"
import { buildCampaignLink, getCampaignSettingsKey } from "./shared-set-link.js"

describe("getCampaignSettingsKey", () => {
  it.each([
    ["TEXT_CAMPAIGN", "TextCampaign"],
    ["DYNAMIC_TEXT_CAMPAIGN", "DynamicTextCampaign"],
    ["MOBILE_APP_CAMPAIGN", "MobileAppCampaign"],
    ["UNIFIED_CAMPAIGN", "UnifiedCampaign"]
  ])("для %s отдаёт %s", (type, key) => {
    expect(getCampaignSettingsKey(type)).toBe(key)
  })

  it.each(["CPM_BANNER_CAMPAIGN", "SMART_CAMPAIGN", "CAMPAIGN_TYPE_ИЗ_БУДУЩЕГО", undefined])(
    "для %s не отдаёт ключа",
    (type) => {
      expect(getCampaignSettingsKey(type)).toBeUndefined()
    }
  )
})

describe("buildCampaignLink", () => {
  it("кладёт наборы внутрь объекта настроек, а не на верхний уровень", () => {
    expect(buildCampaignLink("714159718", "TEXT_CAMPAIGN", { Items: [1n, 2n] })).toEqual({
      Id: 714159718n,
      TextCampaign: { NegativeKeywordSharedSetIds: { Items: [1n, 2n] } }
    })
  })

  it("выбирает объект настроек по типу кампании", () => {
    expect(buildCampaignLink("1", "DYNAMIC_TEXT_CAMPAIGN", { Items: [5n] })).toHaveProperty(
      "DynamicTextCampaign.NegativeKeywordSharedSetIds.Items",
      [5n]
    )
  })

  it("не теряет точность 19-значного ID", () => {
    expect(buildCampaignLink("1234567890123456789", "TEXT_CAMPAIGN", null)).toHaveProperty("Id", 1234567890123456789n)
  })

  it("снятие привязок доносит как null, а не как пустой Items", () => {
    expect(buildCampaignLink("1", "TEXT_CAMPAIGN", null)).toHaveProperty(
      "TextCampaign.NegativeKeywordSharedSetIds",
      null
    )
  })

  it("падает на типе, который общих наборов не поддерживает, а не пропускает кампанию молча", () => {
    expect(() => buildCampaignLink("1", "SMART_CAMPAIGN", { Items: [5n] })).toThrow(/SMART_CAMPAIGN/)
  })

  it("падает, если тип прочитать не удалось", () => {
    expect(() => buildCampaignLink("1", undefined, { Items: [5n] })).toThrow(/неизвестный/)
  })
})

import { describe, expect, it } from "vitest"
import { buildCampaignLink } from "./shared-set-link.js"

describe("buildCampaignLink", () => {
  it.each([
    ["TEXT_CAMPAIGN", "TextCampaign"],
    ["DYNAMIC_TEXT_CAMPAIGN", "DynamicTextCampaign"],
    ["MOBILE_APP_CAMPAIGN", "MobileAppCampaign"],
    ["UNIFIED_CAMPAIGN", "UnifiedCampaign"]
  ])("для %s кладёт наборы в %s", (type, key) => {
    expect(buildCampaignLink("1", type, { Items: [5n] })).toHaveProperty(`${key}.NegativeKeywordSharedSetIds.Items`, [
      5n
    ])
  })

  // SMART_CAMPAIGN поддерживает UTM-разметку, но не общие наборы — списки типов у полей
  // разные, и общий на них один не годится.
  it.each(["CPM_BANNER_CAMPAIGN", "SMART_CAMPAIGN"])("тип %s отвергает", (type) => {
    expect(() => buildCampaignLink("1", type, { Items: [5n] })).toThrow(type)
  })

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

  it("падает, если тип прочитать не удалось", () => {
    expect(() => buildCampaignLink("1", undefined, { Items: [5n] })).toThrow(/неизвестный/)
  })
})

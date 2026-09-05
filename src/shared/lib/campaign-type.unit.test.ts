import { describe, expect, it } from "vitest"
import { getCampaignSettingsKey } from "#shared/lib/campaign-type"

describe("getCampaignSettingsKey", () => {
  it.each([
    ["TEXT_CAMPAIGN", "TextCampaign"],
    ["DYNAMIC_TEXT_CAMPAIGN", "DynamicTextCampaign"],
    ["MOBILE_APP_CAMPAIGN", "MobileAppCampaign"],
    ["SMART_CAMPAIGN", "SmartCampaign"],
    ["UNIFIED_CAMPAIGN", "UnifiedCampaign"],
    ["CPM_BANNER_CAMPAIGN", "CpmBannerCampaign"]
  ])("для %s отдаёт %s", (type, key) => {
    expect(getCampaignSettingsKey(type)).toBe(key)
  })

  it.each(["CAMPAIGN_TYPE_ИЗ_БУДУЩЕГО", "", undefined])("для %s не отдаёт ключа", (type) => {
    expect(getCampaignSettingsKey(type)).toBeUndefined()
  })
})

// Имя объекта настроек кампании по её типу. Какие типы поддерживают конкретное поле —
// у каждого поля своё, поэтому эти списки живут у того, кто поле пишет.
const CAMPAIGN_SETTINGS_KEYS = {
  TEXT_CAMPAIGN: "TextCampaign",
  DYNAMIC_TEXT_CAMPAIGN: "DynamicTextCampaign",
  MOBILE_APP_CAMPAIGN: "MobileAppCampaign",
  SMART_CAMPAIGN: "SmartCampaign",
  UNIFIED_CAMPAIGN: "UnifiedCampaign",
  CPM_BANNER_CAMPAIGN: "CpmBannerCampaign"
} as const

export type CampaignSettingsKey = (typeof CAMPAIGN_SETTINGS_KEYS)[keyof typeof CAMPAIGN_SETTINGS_KEYS]

/** Имя объекта настроек кампании; у типа, которого нет в таблице, — `undefined`. */
export const getCampaignSettingsKey = (type?: string): CampaignSettingsKey | undefined =>
  CAMPAIGN_SETTINGS_KEYS[type as keyof typeof CAMPAIGN_SETTINGS_KEYS]

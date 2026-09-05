// Часть полей кампании лежит не на верхнем уровне, а внутри объекта настроек, имя
// которого зависит от типа кампании: TrackingParams, BiddingStrategy,
// NegativeKeywordSharedSetIds и прочие. Тип в запросе на изменение не передаётся, поэтому
// сценарий читает его через campaigns.get и приводит сюда.
//
// Таблица отвечает только на вопрос «как называется объект настроек», и ответ этот общий
// для всех полей. А вот какие типы поддерживают конкретное поле — знание не общее:
// TrackingParams есть у SMART_CAMPAIGN, но нет у MOBILE_APP_CAMPAIGN, у
// NegativeKeywordSharedSetIds ровно наоборот. Поэтому список поддерживаемых типов
// остаётся у того, кто это поле пишет, а сюда не переезжает.
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

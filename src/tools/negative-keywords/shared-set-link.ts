// Привязка общих наборов к кампании устроена не так, как к группе. У группы
// NegativeKeywordSharedSetIds — поле верхнего уровня; у кампании оно спрятано внутрь
// объекта настроек, а имя этого объекта зависит от типа кампании (сверено с WSDL
// campaigns 05.09.2026: поле объявлено в TextCampaignBase, DynamicTextCampaignBase,
// UnifiedCampaignBase и MobileAppCampaignUpdateItem). Тип в запросе на привязку не
// передаётся, поэтому сценарий читает его перед записью, а здесь лежит чистая часть —
// таблица и сборка элемента, которые проверяются без сети.
import { apiId } from "#shared/lib/id"

const CAMPAIGN_SETTINGS_KEYS = {
  TEXT_CAMPAIGN: "TextCampaign",
  DYNAMIC_TEXT_CAMPAIGN: "DynamicTextCampaign",
  MOBILE_APP_CAMPAIGN: "MobileAppCampaign",
  UNIFIED_CAMPAIGN: "UnifiedCampaign"
} as const

/** Имя объекта настроек кампании; у типа без поддержки общих наборов — `undefined`. */
export const getCampaignSettingsKey = (type?: string): string | undefined =>
  CAMPAIGN_SETTINGS_KEYS[type as keyof typeof CAMPAIGN_SETTINGS_KEYS]

// Тип, которого нет в таблице, — это CPM_BANNER_CAMPAIGN, SMART_CAMPAIGN или значение,
// добавленное Яндексом позже. Молча пропустить такую кампанию нельзя: вызов вернул бы
// успех, а набор остался бы непривязанным.
// Готовое значение поля приходит параметром, а не собирается здесь: решение «пустой список —
// это null» одно на весь домен и принимается в хендлере.
export function buildCampaignLink(
  campaignId: string,
  campaignType: string | undefined,
  sharedSetIds: { Items: bigint[] } | null
): Record<string, unknown> {
  const settingsKey = getCampaignSettingsKey(campaignType)
  if (!settingsKey) {
    throw new Error(
      `Кампания ${campaignId} имеет тип ${campaignType ?? "неизвестный"}, а общие наборы минус-фраз поддерживают только ${Object.keys(CAMPAIGN_SETTINGS_KEYS).join(", ")}.`
    )
  }

  return { Id: apiId(campaignId), [settingsKey]: { NegativeKeywordSharedSetIds: sharedSetIds } }
}

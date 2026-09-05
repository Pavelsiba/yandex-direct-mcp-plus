// Привязка общих наборов к кампании устроена не так, как к группе. У группы
// NegativeKeywordSharedSetIds — поле верхнего уровня; у кампании оно спрятано внутрь
// объекта настроек, а имя этого объекта зависит от типа кампании и берётся из
// #shared/lib/campaign-type. Тип в запросе на привязку не передаётся, поэтому сценарий
// читает его перед записью, а здесь лежит чистая часть — проверка типа и сборка элемента.
import { getCampaignSettingsKey } from "#shared/lib/campaign-type"
import { apiId } from "#shared/lib/id"

// Свой список, а не общий: набор поддерживающих типов у каждого поля свой. Сверено с WSDL
// campaigns 05.09.2026 — NegativeKeywordSharedSetIds объявлен в TextCampaignBase,
// DynamicTextCampaignBase, UnifiedCampaignBase и MobileAppCampaignUpdateItem, но не в
// SmartCampaign и не в CpmBannerCampaign.
const SUPPORTED_TYPES = ["TEXT_CAMPAIGN", "DYNAMIC_TEXT_CAMPAIGN", "MOBILE_APP_CAMPAIGN", "UNIFIED_CAMPAIGN"]

// Тип, которого нет в списке, молча пропустить нельзя: вызов вернул бы успех, а набор
// остался бы непривязанным.
export function buildCampaignLink(
  campaignId: string,
  campaignType: string | undefined,
  sharedSetIds: { Items: bigint[] } | null
): Record<string, unknown> {
  const settingsKey =
    campaignType && SUPPORTED_TYPES.includes(campaignType) ? getCampaignSettingsKey(campaignType) : undefined

  if (!settingsKey) {
    throw new Error(
      `Кампания ${campaignId} имеет тип ${campaignType ?? "неизвестный"}, а общие наборы минус-фраз поддерживают только ${SUPPORTED_TYPES.join(", ")}.`
    )
  }

  return { Id: apiId(campaignId), [settingsKey]: { NegativeKeywordSharedSetIds: sharedSetIds } }
}

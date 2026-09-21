// Привязка наборов к кампании: в отличие от группы, поле лежит в объекте настроек,
// имя которого зависит от типа кампании. Здесь чистая часть — проверка типа и сборка.
import { getCampaignSettingsKey } from "#shared/lib/campaign-type"
import { apiId } from "#shared/lib/id"

// По WSDL: у смарт и CpmBanner поля нет. У каждого поля свой набор типов, общий список не годится.
const SUPPORTED_TYPES = ["TEXT_CAMPAIGN", "DYNAMIC_TEXT_CAMPAIGN", "MOBILE_APP_CAMPAIGN", "UNIFIED_CAMPAIGN"]

// Неподдерживаемый тип — ошибка: пропуск дал бы успех без привязки.
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

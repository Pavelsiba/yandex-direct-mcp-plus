import { DESTRUCTIVE, defineTool, IDEMPOTENT, READ } from "#shared/lib/tool"
import {
  handleGetCampaignNegativeKeywords,
  handleLinkNegativeKeywordSets,
  handleListNegativeKeywordSharedSets,
  handleManageNegativeKeywordSharedSets,
  handleSetAdGroupNegativeKeywords,
  handleSetCampaignNegativeKeywords
} from "./handler.js"
import {
  getCampaignNegativeKeywordsSchema,
  linkNegativeKeywordSetsSchema,
  listNegativeKeywordSharedSetsSchema,
  manageNegativeKeywordSharedSetsSchema,
  setAdGroupNegativeKeywordsSchema,
  setCampaignNegativeKeywordsSchema
} from "./schema.js"

export const getCampaignNegativeKeywordsTool = defineTool({
  name: "get_campaign_negative_keywords",
  title: "Получить минус-фразы кампаний",
  description: "Получить текущие минус-фразы кампаний по их ID.",
  annotations: READ,
  schema: getCampaignNegativeKeywordsSchema,
  handler: handleGetCampaignNegativeKeywords
})

export const setCampaignNegativeKeywordsTool = defineTool({
  name: "set_campaign_negative_keywords",
  title: "Минус-фразы кампании",
  description: "Задать минус-фразы на уровне кампании (заменяет текущий список; пустой массив очищает).",
  annotations: IDEMPOTENT,
  schema: setCampaignNegativeKeywordsSchema,
  handler: handleSetCampaignNegativeKeywords
})

export const setAdGroupNegativeKeywordsTool = defineTool({
  name: "set_ad_group_negative_keywords",
  title: "Минус-фразы группы",
  description: "Задать минус-фразы на уровне группы объявлений (заменяет текущий список; пустой массив очищает).",
  annotations: IDEMPOTENT,
  schema: setAdGroupNegativeKeywordsSchema,
  handler: handleSetAdGroupNegativeKeywords
})

export const listNegativeKeywordSharedSetsTool = defineTool({
  name: "list_negative_keyword_shared_sets",
  title: "Общие наборы минус-фраз",
  description: "Получить общие наборы минус-фраз аккаунта.",
  annotations: READ,
  schema: listNegativeKeywordSharedSetsSchema,
  handler: handleListNegativeKeywordSharedSets
})

export const manageNegativeKeywordSharedSetsTool = defineTool({
  name: "manage_negative_keyword_shared_sets",
  title: "Управление общими минус-фразами",
  description: "Создать, изменить или удалить общие наборы минус-фраз аккаунта.",
  annotations: DESTRUCTIVE,
  schema: manageNegativeKeywordSharedSetsSchema,
  handler: handleManageNegativeKeywordSharedSets
})

export const linkNegativeKeywordSetsTool = defineTool({
  name: "link_negative_keyword_sets",
  title: "Привязать общие минус-фразы",
  description: "Заменить привязки общих наборов минус-фраз у групп объявлений. Пустой set_ids очищает привязки.",
  annotations: IDEMPOTENT,
  schema: linkNegativeKeywordSetsSchema,
  handler: handleLinkNegativeKeywordSets
})

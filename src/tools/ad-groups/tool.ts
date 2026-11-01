import { DESTRUCTIVE, defineTool, IDEMPOTENT, READ, WRITE } from "#shared/lib/tool"
import { handleCreateAdGroup, handleDeleteAdGroups, handleListAdGroups, handleUpdateAdGroup } from "./handler.js"
import { createAdGroupSchema, deleteAdGroupsSchema, listAdGroupsSchema, updateAdGroupSchema } from "./schema.js"

export const listAdGroupsTool = defineTool({
  name: "list_ad_groups",
  title: "Список групп",
  description:
    "Группы объявлений выбранных кампаний: названия, регионы, статусы. По умолчанию возвращается узкий набор полей; " +
    "нужны другие (NegativeKeywords, NegativeKeywordSharedSetIds, TrackingParams, ServingStatus и прочие из " +
    "AdGroupFieldEnum) — перечислите их в fields.",
  annotations: READ,
  schema: listAdGroupsSchema,
  handler: handleListAdGroups
})

export const createAdGroupTool = defineTool({
  name: "create_ad_group",
  title: "Создать группу",
  description: "Создать группу объявлений в кампании с таргетингом по регионам (см. get_regions).",
  annotations: WRITE,
  schema: createAdGroupSchema,
  handler: handleCreateAdGroup
})

export const updateAdGroupTool = defineTool({
  name: "update_ad_group",
  title: "Обновить группу",
  description:
    "Изменить группу объявлений без пересоздания: название, регионы показа (полный список, заменяет прежний) и/или " +
    "UTM-разметку ссылок. Минус-фразы группы — set_ad_group_negative_keywords, наборы — link_negative_keyword_sets, " +
    "автотаргетинг — update_keywords.",
  annotations: IDEMPOTENT,
  schema: updateAdGroupSchema,
  handler: handleUpdateAdGroup
})

export const deleteAdGroupsTool = defineTool({
  name: "delete_ad_groups",
  title: "Удалить группы",
  description: "Удалить группы объявлений по их ID. ⚠️ Необратимо.",
  annotations: DESTRUCTIVE,
  schema: deleteAdGroupsSchema,
  handler: handleDeleteAdGroups
})

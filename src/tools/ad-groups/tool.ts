import { DESTRUCTIVE, defineTool, READ, WRITE } from "#shared/lib/tool"
import { handleCreateAdGroup, handleDeleteAdGroups, handleListAdGroups } from "./handler.js"
import { createAdGroupSchema, deleteAdGroupsSchema, listAdGroupsSchema } from "./schema.js"

export const listAdGroupsTool = defineTool({
  name: "list_ad_groups",
  title: "Список групп",
  description: "Группы объявлений выбранных кампаний: названия, регионы, статусы.",
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

export const deleteAdGroupsTool = defineTool({
  name: "delete_ad_groups",
  title: "Удалить группы",
  description: "Удалить группы объявлений по их ID. ⚠️ Необратимо.",
  annotations: DESTRUCTIVE,
  schema: deleteAdGroupsSchema,
  handler: handleDeleteAdGroups
})

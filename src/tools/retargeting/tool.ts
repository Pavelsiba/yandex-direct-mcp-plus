import { DESTRUCTIVE, defineTool, READ, WRITE } from "#shared/lib/tool"
import {
  handleAddRetargetingList,
  handleDeleteRetargetingLists,
  handleListRetargetingLists,
  handleUpdateRetargetingLists
} from "./handler.js"
import {
  addRetargetingListSchema,
  deleteRetargetingListsSchema,
  listRetargetingListsSchema,
  updateRetargetingListsSchema
} from "./schema.js"

export const listRetargetingListsTool = defineTool({
  name: "list_retargeting_lists",
  title: "Списки ретаргетинга",
  description: "Получить условия ретаргетинга и подбора аудитории с правилами и областью применения.",
  annotations: READ,
  schema: listRetargetingListsSchema,
  handler: handleListRetargetingLists
})

export const addRetargetingListTool = defineTool({
  name: "add_retargeting_list",
  title: "Создать список ретаргетинга",
  description: "Создать условие ретаргетинга из целей Метрики, сегментов или интересов.",
  annotations: WRITE,
  schema: addRetargetingListSchema,
  handler: handleAddRetargetingList
})

export const updateRetargetingListsTool = defineTool({
  name: "update_retargeting_lists",
  title: "Изменить списки ретаргетинга",
  description:
    "Изменить название, описание и правила условий ретаргетинга. Переданные правила заменяют прежние целиком: сначала прочитайте условие через list_retargeting_lists.",
  annotations: WRITE,
  schema: updateRetargetingListsSchema,
  handler: handleUpdateRetargetingLists
})

export const deleteRetargetingListsTool = defineTool({
  name: "delete_retargeting_lists",
  title: "Удалить списки ретаргетинга",
  description:
    "Удалить условия ретаргетинга и подбора аудитории по ID; удаление необратимо. Отказ по отдельному условию приходит строкой ❌ в ответе, остальные при этом удалены.",
  annotations: DESTRUCTIVE,
  schema: deleteRetargetingListsSchema,
  handler: handleDeleteRetargetingLists
})

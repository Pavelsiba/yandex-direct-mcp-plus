import { defineTool, READ, WRITE } from "#shared/lib/tool"
import { handleAddRetargetingList, handleListRetargetingLists } from "./handler.js"
import { addRetargetingListSchema, listRetargetingListsSchema } from "./schema.js"

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

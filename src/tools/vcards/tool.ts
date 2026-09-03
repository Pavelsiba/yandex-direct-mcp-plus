import { defineTool, READ, WRITE } from "#shared/lib/tool"
import { handleAddVcard, handleListVcards } from "./handler.js"
import { addVcardSchema, listVcardsSchema } from "./schema.js"

export const listVcardsTool = defineTool({
  name: "list_vcards",
  title: "Список визиток",
  description: "Получить виртуальные визитки по ID или найти их через объявления выбранных кампаний.",
  annotations: READ,
  schema: listVcardsSchema,
  handler: handleListVcards
})

export const addVcardTool = defineTool({
  name: "add_vcard",
  title: "Создать визитку",
  description: "Создать виртуальную визитку для кампании.",
  annotations: WRITE,
  schema: addVcardSchema,
  handler: handleAddVcard
})

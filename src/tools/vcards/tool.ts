import { DESTRUCTIVE, defineTool, READ, WRITE } from "#shared/lib/tool"
import { handleAddVcard, handleDeleteVcards, handleListVcards } from "./handler.js"
import { addVcardSchema, deleteVcardsSchema, listVcardsSchema } from "./schema.js"

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

export const deleteVcardsTool = defineTool({
  name: "delete_vcards",
  title: "Удалить визитки",
  description:
    "Удалить визитки по ID; удаление необратимо. Отказ по отдельной визитке приходит в ответе списком, а не ошибкой вызова.",
  annotations: DESTRUCTIVE,
  schema: deleteVcardsSchema,
  handler: handleDeleteVcards
})

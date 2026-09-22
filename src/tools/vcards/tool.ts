// Создания визиток нет намеренно: vcards.add в WSDL есть, но боевой API отвечает 3500.
import { DESTRUCTIVE, defineTool, READ } from "#shared/lib/tool"
import { handleDeleteVcards, handleListVcards } from "./handler.js"
import { deleteVcardsSchema, listVcardsSchema } from "./schema.js"

export const listVcardsTool = defineTool({
  name: "list_vcards",
  title: "Список визиток",
  description:
    "Получить виртуальные визитки по ID или найти их через объявления выбранных кампаний. Создавать визитки Директ через API не даёт — новая визитка заводится в интерфейсе Директа.",
  annotations: READ,
  schema: listVcardsSchema,
  handler: handleListVcards
})

export const deleteVcardsTool = defineTool({
  name: "delete_vcards",
  title: "Удалить визитки",
  description:
    "Удалить визитки по ID; удаление необратимо. Отказ по отдельной визитке приходит строкой ❌ в ответе, остальные при этом удалены.",
  annotations: DESTRUCTIVE,
  schema: deleteVcardsSchema,
  handler: handleDeleteVcards
})

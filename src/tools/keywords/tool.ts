import { DESTRUCTIVE, defineTool, IDEMPOTENT, READ, WRITE } from "#shared/lib/tool"
import { handleAddKeywords, handleListKeywords, handleManageKeywords, handleSetKeywordBids } from "./handler.js"
import { addKeywordsSchema, listKeywordsSchema, manageKeywordsSchema, setKeywordBidsSchema } from "./schema.js"

export const listKeywordsTool = defineTool({
  name: "list_keywords",
  title: "Список ключевых слов",
  description: "Ключевые фразы в группах объявлений: фразы, ставки (руб), статусы.",
  annotations: READ,
  schema: listKeywordsSchema,
  handler: handleListKeywords
})

export const addKeywordsTool = defineTool({
  name: "add_keywords",
  title: "Добавить ключевые слова",
  description: "Добавить ключевые фразы в группу объявлений.",
  annotations: WRITE,
  schema: addKeywordsSchema,
  handler: handleAddKeywords
})

export const manageKeywordsTool = defineTool({
  name: "manage_keywords",
  title: "Управление ключевыми словами",
  description: "Действие над ключевыми фразами: suspend/resume/delete. ⚠️ delete необратимо.",
  annotations: DESTRUCTIVE,
  schema: manageKeywordsSchema,
  handler: handleManageKeywords
})

export const setKeywordBidsTool = defineTool({
  name: "set_keyword_bids",
  title: "Установить ставки",
  description: "Установить ставки (поиск/сети, в рублях) на уровне фраз, групп или кампаний (сервис Bids).",
  annotations: IDEMPOTENT,
  schema: setKeywordBidsSchema,
  handler: handleSetKeywordBids
})

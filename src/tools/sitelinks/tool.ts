import { DESTRUCTIVE, defineTool, READ, WRITE } from "#shared/lib/tool"
import { handleDeleteSitelinks, handleListSitelinks, handleSetSitelinks } from "./handler.js"
import { deleteSitelinksSchema, listSitelinksSchema, setSitelinksSchema } from "./schema.js"

export const listSitelinksTool = defineTool({
  name: "list_sitelinks",
  title: "Список быстрых ссылок",
  description: "Получить все или выбранные наборы быстрых ссылок.",
  annotations: READ,
  schema: listSitelinksSchema,
  handler: handleListSitelinks
})

export const setSitelinksTool = defineTool({
  name: "set_sitelinks",
  title: "Создать быстрые ссылки",
  description: "Создать новый набор из 1–8 быстрых ссылок. Возвращает ID набора для привязки к объявлению.",
  annotations: WRITE,
  schema: setSitelinksSchema,
  handler: handleSetSitelinks
})

export const deleteSitelinksTool = defineTool({
  name: "delete_sitelinks",
  title: "Удалить быстрые ссылки",
  description: "Удалить наборы быстрых ссылок по ID. Набор, привязанный к объявлению, Директ удалить не даст.",
  annotations: DESTRUCTIVE,
  schema: deleteSitelinksSchema,
  handler: handleDeleteSitelinks
})

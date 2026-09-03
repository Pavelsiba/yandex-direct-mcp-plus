import { DESTRUCTIVE, defineTool, IDEMPOTENT, READ, WRITE } from "#shared/lib/tool"
import { handleCreateTextAd, handleListAds, handleManageAds, handleModerateAds, handleUpdateTextAd } from "./handler.js"
import { createTextAdSchema, listAdsSchema, manageAdsSchema, moderateAdsSchema, updateTextAdSchema } from "./schema.js"

export const listAdsTool = defineTool({
  name: "list_ads",
  title: "Список объявлений",
  description: "Объявления в группах: заголовки, тексты, ссылки, статусы.",
  annotations: READ,
  schema: listAdsSchema,
  handler: handleListAds
})

export const createTextAdTool = defineTool({
  name: "create_text_ad",
  title: "Создать объявление",
  description: "Создать текстовое объявление: заголовок (≤56), второй заголовок (≤30), текст (≤81), ссылка.",
  annotations: WRITE,
  schema: createTextAdSchema,
  handler: handleCreateTextAd
})

export const updateTextAdTool = defineTool({
  name: "update_text_ad",
  title: "Обновить объявление",
  description: "Обновить текстовое объявление: заголовок, текст, ссылка. Изменённое объявление уходит на модерацию.",
  annotations: IDEMPOTENT,
  schema: updateTextAdSchema,
  handler: handleUpdateTextAd
})

export const manageAdsTool = defineTool({
  name: "manage_ads",
  title: "Управление объявлениями",
  description: "Действие над объявлениями: suspend/resume/archive/unarchive/moderate/delete. ⚠️ delete необратимо.",
  annotations: DESTRUCTIVE,
  schema: manageAdsSchema,
  handler: handleManageAds
})

export const moderateAdsTool = defineTool({
  name: "moderate_ads",
  title: "Отправить объявления на модерацию",
  description: "Отправить выбранные объявления на модерацию.",
  annotations: IDEMPOTENT,
  schema: moderateAdsSchema,
  handler: handleModerateAds
})

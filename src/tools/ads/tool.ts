import { DESTRUCTIVE, defineTool, IDEMPOTENT, READ, WRITE } from "#shared/lib/tool"
import {
  handleCreateResponsiveAd,
  handleListAds,
  handleManageAds,
  handleModerateAds,
  handleUpdateResponsiveAd
} from "./handler.js"
import {
  createResponsiveAdSchema,
  listAdsSchema,
  manageAdsSchema,
  moderateAdsSchema,
  updateResponsiveAdSchema
} from "./schema.js"

export const listAdsTool = defineTool({
  name: "list_ads",
  title: "Список объявлений",
  description:
    "Объявления: все заголовки и тексты, ссылки, статусы, тип и подтип объявления, привязанные сайтлинки, " +
    "изображения и видео. Текстовые объявления Директ отдаёт комбинаторными (RESPONSIVE_AD). Причина отказа модерации приходит в StatusClarification. " +
    "Отбор по ID объявлений, группам или кампаниям — хотя бы одно из трёх; сужается состоянием, статусом и типом. " +
    "Без фильтра по состоянию архивные приходят наравне с активными. Список может быть неполным: объявления, тексты которых генерирует " +
    "нейросеть Яндекса, через API недоступны и в выдачу не попадают, а по ответу это никак не видно. Поэтому " +
    "«в группе только эти объявления» из ответа не следует — ни из пустого, ни из непустого; для полноты картины " +
    "сверяйтесь с интерфейсом Директа.",
  annotations: READ,
  schema: listAdsSchema,
  handler: handleListAds
})

export const createResponsiveAdTool = defineTool({
  name: "create_responsive_ad",
  title: "Создать комбинаторное объявление",
  description:
    "Создать комбинаторное объявление: от 1 до 7 заголовков (≤56 символов), от 1 до 3 текстов (≤81) и ссылка; " +
    "варианты показа Директ собирает из них сам. Текстовые объявления через API больше не создаются — " +
    "Директ заводит их комбинаторными. В группе — не больше 3 неархивных комбинаторных объявлений.",
  annotations: WRITE,
  schema: createResponsiveAdSchema,
  handler: handleCreateResponsiveAd
})

export const updateResponsiveAdTool = defineTool({
  name: "update_responsive_ad",
  title: "Обновить комбинаторное объявление",
  description:
    "Обновить комбинаторное объявление: заголовки, тексты, ссылка. Набор заголовков или текстов заменяется " +
    "целиком — передайте полный, вместе с теми, что не меняются; текущие показывает list_ads. " +
    "Изменённое объявление уходит на модерацию.",
  annotations: IDEMPOTENT,
  schema: updateResponsiveAdSchema,
  handler: handleUpdateResponsiveAd
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

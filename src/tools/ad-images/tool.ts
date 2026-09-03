import { DESTRUCTIVE, defineTool } from "#shared/lib/tool"
import { handleManageAdImages } from "./handler.js"
import { manageAdImagesSchema } from "./schema.js"

export const manageAdImagesTool = defineTool({
  name: "manage_ad_images",
  title: "Управление изображениями",
  description: "Загрузить, получить или удалить изображения объявлений (AdImages). Для add данные передаются в base64.",
  annotations: DESTRUCTIVE,
  schema: manageAdImagesSchema,
  handler: handleManageAdImages
})

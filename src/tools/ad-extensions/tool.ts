import { DESTRUCTIVE, defineTool, READ, WRITE } from "#shared/lib/tool"
import { handleAddAdExtensions, handleDeleteAdExtensions, handleListAdExtensions } from "./handler.js"
import { addAdExtensionsSchema, deleteAdExtensionsSchema, listAdExtensionsSchema } from "./schema.js"

export const listAdExtensionsTool = defineTool({
  name: "list_ad_extensions",
  title: "Список уточнений",
  description: "Получить уточнения (callouts) с их статусами и текстом.",
  annotations: READ,
  schema: listAdExtensionsSchema,
  handler: handleListAdExtensions
})

export const addAdExtensionsTool = defineTool({
  name: "add_ad_extensions",
  title: "Создать уточнения",
  description: "Создать уточнения (callouts), каждый текст до 25 символов.",
  annotations: WRITE,
  schema: addAdExtensionsSchema,
  handler: handleAddAdExtensions
})

export const deleteAdExtensionsTool = defineTool({
  name: "delete_ad_extensions",
  title: "Удалить уточнения",
  description: "Удалить уточнения по ID. ⚠️ Необратимо.",
  annotations: DESTRUCTIVE,
  schema: deleteAdExtensionsSchema,
  handler: handleDeleteAdExtensions
})

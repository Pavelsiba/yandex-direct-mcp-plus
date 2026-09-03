import { defineTool, READ } from "#shared/lib/tool"
import { handleListBusinesses } from "./handler.js"
import { listBusinessesSchema } from "./schema.js"

export const listBusinessesTool = defineTool({
  name: "list_businesses",
  title: "Профили организаций",
  description: "Получить доступные профили организаций из Яндекс Бизнеса.",
  annotations: READ,
  schema: listBusinessesSchema,
  handler: handleListBusinesses
})

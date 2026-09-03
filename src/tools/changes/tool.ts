import { defineTool, READ } from "#shared/lib/tool"
import { handleGetChanges } from "./handler.js"
import { getChangesSchema } from "./schema.js"

export const getChangesTool = defineTool({
  name: "get_changes",
  title: "Изменения объектов",
  description: "Проверить изменения кампаний, групп и объявлений начиная с указанного времени.",
  annotations: READ,
  schema: getChangesSchema,
  handler: handleGetChanges
})

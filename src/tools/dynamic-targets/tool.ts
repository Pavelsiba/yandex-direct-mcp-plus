import { DESTRUCTIVE, defineTool, READ } from "#shared/lib/tool"
import { handleListDynamicTargets, handleManageDynamicTargets } from "./handler.js"
import { listDynamicTargetsSchema, manageDynamicTargetsSchema } from "./schema.js"

export const listDynamicTargetsTool = defineTool({
  name: "list_dynamic_targets",
  title: "Динамические цели",
  description: "Получить условия нацеливания динамических текстовых объявлений.",
  annotations: READ,
  schema: listDynamicTargetsSchema,
  handler: handleListDynamicTargets
})

export const manageDynamicTargetsTool = defineTool({
  name: "manage_dynamic_targets",
  title: "Управление динамическими целями",
  description: "Создать, изменить ставки, остановить, возобновить или удалить динамические цели.",
  annotations: DESTRUCTIVE,
  schema: manageDynamicTargetsSchema,
  handler: handleManageDynamicTargets
})

import { DESTRUCTIVE, defineTool, READ } from "#shared/lib/tool"
import { handleListAudienceTargets, handleSetAudienceTargets } from "./handler.js"
import { listAudienceTargetsSchema, setAudienceTargetsSchema } from "./schema.js"

export const listAudienceTargetsTool = defineTool({
  name: "list_audience_targets",
  title: "Аудиторные цели",
  description: "Получить условия нацеливания на аудиторию по ID кампании, группы, ретаргетинга или интереса.",
  annotations: READ,
  schema: listAudienceTargetsSchema,
  handler: handleListAudienceTargets
})

export const setAudienceTargetsTool = defineTool({
  name: "set_audience_targets",
  title: "Управление аудиторными целями",
  description: "Добавить, остановить, возобновить, удалить аудиторные цели или изменить их ставки.",
  annotations: DESTRUCTIVE,
  schema: setAudienceTargetsSchema,
  handler: handleSetAudienceTargets
})

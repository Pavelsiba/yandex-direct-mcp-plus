import { defineTool, IDEMPOTENT, READ } from "#shared/lib/tool"
import { handleGetTimeTargeting, handleSetTimeTargeting } from "./handler.js"
import { getTimeTargetingSchema, setTimeTargetingSchema } from "./schema.js"

export const getTimeTargetingTool = defineTool({
  name: "get_time_targeting",
  title: "Расписание показов кампании",
  description:
    "Временной таргетинг кампании: часовой пояс, часы показов по дням недели, почасовые коэффициенты и настройка праздников.",
  annotations: READ,
  schema: getTimeTargetingSchema,
  handler: handleGetTimeTargeting
})

export const setTimeTargetingTool = defineTool({
  name: "set_time_targeting",
  title: "Задать расписание показов",
  description:
    "Задать расписание показов кампании: дни, часы, почасовые коэффициенты, праздники и часовой пояс. " +
    "⚠️ Расписание заменяется целиком: часы вне переданных правил показов не получат.",
  annotations: IDEMPOTENT,
  schema: setTimeTargetingSchema,
  handler: handleSetTimeTargeting
})

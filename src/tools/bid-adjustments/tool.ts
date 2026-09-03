import { defineTool, IDEMPOTENT, READ } from "#shared/lib/tool"
import { handleGetBidAdjustments, handleSetBidAdjustments } from "./handler.js"
import { getBidAdjustmentsSchema, setBidAdjustmentsSchema } from "./schema.js"

export const getBidAdjustmentsTool = defineTool({
  name: "get_bid_adjustments",
  title: "Корректировки ставок",
  description: "Получить корректировки ставок по устройствам, полу и возрасту на уровне кампании или группы.",
  annotations: READ,
  schema: getBidAdjustmentsSchema,
  handler: handleGetBidAdjustments
})

export const setBidAdjustmentsTool = defineTool({
  name: "set_bid_adjustments",
  title: "Изменить корректировки ставок",
  description: "Изменить коэффициенты существующих корректировок по их ID.",
  annotations: IDEMPOTENT,
  schema: setBidAdjustmentsSchema,
  handler: handleSetBidAdjustments
})

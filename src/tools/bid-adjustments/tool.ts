import { DESTRUCTIVE, defineTool, IDEMPOTENT, READ, WRITE } from "#shared/lib/tool"
import {
  handleAddBidAdjustments,
  handleDeleteBidAdjustments,
  handleGetBidAdjustments,
  handleSetBidAdjustments
} from "./handler.js"
import {
  addBidAdjustmentsSchema,
  deleteBidAdjustmentsSchema,
  getBidAdjustmentsSchema,
  setBidAdjustmentsSchema
} from "./schema.js"

export const getBidAdjustmentsTool = defineTool({
  name: "get_bid_adjustments",
  title: "Корректировки ставок",
  description:
    "Получить корректировки ставок кампании или группы: устройства, пол и возраст, аудитории, регионы, платёжеспособность, размещение.",
  annotations: READ,
  schema: getBidAdjustmentsSchema,
  handler: handleGetBidAdjustments
})

export const addBidAdjustmentsTool = defineTool({
  name: "add_bid_adjustments",
  title: "Создать корректировки ставок",
  description:
    "Создать корректировки ставок на кампаниях или группах. Коэффициент — проценты от ставки: 100 ничего не меняет, 0 отключает показы среза.",
  annotations: WRITE,
  schema: addBidAdjustmentsSchema,
  handler: handleAddBidAdjustments
})

export const setBidAdjustmentsTool = defineTool({
  name: "set_bid_adjustments",
  title: "Изменить корректировки ставок",
  description: "Изменить коэффициенты существующих корректировок по их ID.",
  annotations: IDEMPOTENT,
  schema: setBidAdjustmentsSchema,
  handler: handleSetBidAdjustments
})

export const deleteBidAdjustmentsTool = defineTool({
  name: "delete_bid_adjustments",
  title: "Удалить корректировки ставок",
  description: "Удалить корректировки по их ID. Ставка среза возвращается к базовой; отменить удаление нельзя.",
  annotations: DESTRUCTIVE,
  schema: deleteBidAdjustmentsSchema,
  handler: handleDeleteBidAdjustments
})

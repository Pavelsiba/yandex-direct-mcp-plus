import { defineTool, READ } from "#shared/lib/tool"
import { handleGetRegions, handleListTimeZones } from "./handler.js"
import { getRegionsSchema, listTimeZonesSchema } from "./schema.js"

export const getRegionsTool = defineTool({
  name: "get_regions",
  title: "Справочник регионов",
  description: "Справочник кодов регионов (GeoRegions) для таргетинга. Фильтр по названию. 225 = Россия.",
  annotations: READ,
  schema: getRegionsSchema,
  handler: handleGetRegions
})

export const listTimeZonesTool = defineTool({
  name: "list_time_zones",
  title: "Справочник часовых поясов",
  description:
    "Справочник часовых поясов (TimeZones) для set_time_targeting и create_campaign. Фильтр по коду или названию.",
  annotations: READ,
  schema: listTimeZonesSchema,
  handler: handleListTimeZones
})

import { z } from "zod"
import { CHANGES_FIELD_NAMES, CHANGES_MODES } from "#shared/config/enums"
import {
  MAX_AD_GROUPS_PER_CHANGES_CALL,
  MAX_ADS_PER_CHANGES_CALL,
  MAX_CAMPAIGNS_PER_CHANGES_CALL
} from "#shared/config/limits"
import { timestampField } from "#shared/lib/date"
import { idField } from "#shared/lib/id"

export const getChangesSchema = z.object({
  mode: z.literal(CHANGES_MODES).meta({
    description: "campaigns — какие кампании менялись целиком; objects — что изменилось внутри выбранных объектов"
  }),
  timestamp: timestampField("Момент, начиная с которого искать изменения: YYYY-MM-DDThh:mm:ssZ"),
  campaign_ids: z
    .array(idField("ID кампании"))
    .min(1, { error: "Список кампаний пуст" })
    .max(MAX_CAMPAIGNS_PER_CHANGES_CALL, { error: `Не больше ${MAX_CAMPAIGNS_PER_CHANGES_CALL} кампаний за вызов` })
    .optional()
    .meta({ description: "Кампании для mode=objects" }),
  ad_group_ids: z
    .array(idField("ID группы объявлений"))
    .min(1, { error: "Список групп пуст" })
    .max(MAX_AD_GROUPS_PER_CHANGES_CALL, { error: `Не больше ${MAX_AD_GROUPS_PER_CHANGES_CALL} групп за вызов` })
    .optional()
    .meta({ description: "Группы для mode=objects" }),
  ad_ids: z
    .array(idField("ID объявления"))
    .min(1, { error: "Список объявлений пуст" })
    .max(MAX_ADS_PER_CHANGES_CALL, { error: `Не больше ${MAX_ADS_PER_CHANGES_CALL} объявлений за вызов` })
    .optional()
    .meta({ description: "Объявления для mode=objects" }),
  field_names: z
    .array(z.literal(CHANGES_FIELD_NAMES))
    .min(1, { error: "Список полей пуст" })
    .optional()
    .meta({ description: "Какие изменения интересуют; по умолчанию — соответствующие переданным ID" })
})

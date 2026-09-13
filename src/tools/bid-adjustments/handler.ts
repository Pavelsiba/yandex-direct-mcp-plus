import type { z } from "zod"
import { apiPost } from "#shared/api/client"
import { API_FIELDS } from "#shared/config/api-fields"
import { MAX_ADJUSTMENTS_PER_CALL } from "#shared/config/limits"
import { formatResult } from "#shared/lib/format"
import { apiId, apiIds } from "#shared/lib/id"
import { buildPage } from "#shared/lib/pagination"
import type {
  addBidAdjustmentsSchema,
  deleteBidAdjustmentsSchema,
  getBidAdjustmentsSchema,
  setBidAdjustmentsSchema
} from "./schema.js"

const NO_MONEY = { money: false } as const

// Значения корректировок лежат в отдельных полях на каждый тип, поэтому запрашиваются
// все наборы сразу: иначе ответ придёт без самих коэффициентов. Каждый набор берётся
// целиком — у типовых перечислений от одного до четырёх значений, отбирать нечего.
const BID_MODIFIERS = API_FIELDS.bidmodifiers

const FIELD_NAMES = {
  FieldNames: [...BID_MODIFIERS.BidModifierFieldEnum],
  MobileAdjustmentFieldNames: [...BID_MODIFIERS.MobileAdjustmentFieldEnum],
  TabletAdjustmentFieldNames: [...BID_MODIFIERS.TabletAdjustmentFieldEnum],
  DesktopAdjustmentFieldNames: [...BID_MODIFIERS.DesktopAdjustmentFieldEnum],
  DesktopOnlyAdjustmentFieldNames: [...BID_MODIFIERS.DesktopOnlyAdjustmentFieldEnum],
  SmartTvAdjustmentFieldNames: [...BID_MODIFIERS.SmartTvAdjustmentFieldEnum],
  DemographicsAdjustmentFieldNames: [...BID_MODIFIERS.DemographicsAdjustmentFieldEnum],
  RetargetingAdjustmentFieldNames: [...BID_MODIFIERS.RetargetingAdjustmentFieldEnum],
  RegionalAdjustmentFieldNames: [...BID_MODIFIERS.RegionalAdjustmentFieldEnum],
  VideoAdjustmentFieldNames: [...BID_MODIFIERS.VideoAdjustmentFieldEnum],
  SmartAdAdjustmentFieldNames: [...BID_MODIFIERS.SmartAdAdjustmentFieldEnum],
  SerpLayoutAdjustmentFieldNames: [...BID_MODIFIERS.SerpLayoutAdjustmentFieldEnum],
  IncomeGradeAdjustmentFieldNames: [...BID_MODIFIERS.IncomeGradeAdjustmentFieldEnum],
  AdGroupAdjustmentFieldNames: [...BID_MODIFIERS.AdGroupAdjustmentFieldEnum]
}

export async function handleGetBidAdjustments(params: z.infer<typeof getBidAdjustmentsSchema>): Promise<string> {
  if (!params.campaign_ids && !params.ad_group_ids && !params.adjustment_ids) {
    throw new Error("Укажите campaign_ids, ad_group_ids или adjustment_ids.")
  }

  const selection: Record<string, unknown> = { Levels: params.levels }
  if (params.campaign_ids) selection.CampaignIds = apiIds(params.campaign_ids)
  if (params.ad_group_ids) selection.AdGroupIds = apiIds(params.ad_group_ids)
  if (params.adjustment_ids) selection.Ids = apiIds(params.adjustment_ids)
  if (params.types) selection.Types = params.types

  const request: Record<string, unknown> = { SelectionCriteria: selection, ...FIELD_NAMES }
  const page = buildPage(params)
  if (page) request.Page = page

  return formatResult(await apiPost("bidmodifiers", "get", request), NO_MONEY)
}

export async function handleSetBidAdjustments(params: z.infer<typeof setBidAdjustmentsSchema>): Promise<string> {
  const data = await apiPost("bidmodifiers", "set", {
    BidModifiers: params.adjustments.map((adjustment) => ({
      Id: apiId(adjustment.adjustment_id),
      BidModifier: adjustment.bid_modifier
    }))
  })
  return formatResult(data, NO_MONEY)
}

type NewAdjustment = z.infer<typeof addBidAdjustmentsSchema>["adjustments"][number]

// Каждый вид корректировки лежит в своём поле BidModifierAddItem, и в одном элементе
// Директ разрешает ровно один вид. Часть полей — массивы (пол/возраст, аудитории,
// регионы, размещение, платёжеспособность): такие корректировки одного объекта
// собираются в один элемент, остальные едут по элементу на штуку.
type AdjustmentSpec = {
  field: string
  many?: true
  slices: readonly SliceField[]
  build: (adjustment: NewAdjustment) => Record<string, unknown>
}

// Срезы плоские в схеме, а принадлежат каждый своему виду корректировки. Переданный
// не тому виду срез молча пропал бы при сборке: «+30% мобильным вот этой аудитории»
// превратилось бы в +30% всему мобильному трафику, и вызов вернул бы успех.
const SLICE_FIELDS = [
  "operating_system_type",
  "gender",
  "age",
  "retargeting_condition_id",
  "region_id",
  "serp_layout",
  "income_grade"
] as const

type SliceField = (typeof SLICE_FIELDS)[number]

const bidOnly = (adjustment: NewAdjustment) => ({ BidModifier: adjustment.bid_modifier })

const withOperatingSystem = (adjustment: NewAdjustment) => {
  const block: Record<string, unknown> = { BidModifier: adjustment.bid_modifier }
  if (adjustment.operating_system_type) block.OperatingSystemType = adjustment.operating_system_type
  return block
}

function demographics(adjustment: NewAdjustment): Record<string, unknown> {
  if (!adjustment.gender && !adjustment.age) {
    throw new Error("Для DEMOGRAPHICS_ADJUSTMENT укажите gender и/или age.")
  }
  const block: Record<string, unknown> = { BidModifier: adjustment.bid_modifier }
  if (adjustment.gender) block.Gender = adjustment.gender
  if (adjustment.age) block.Age = adjustment.age
  return block
}

// Обязательный срез, без которого Директ отвергнет корректировку: имя параметра
// в нашей схеме и поле запроса. Проверяем до вызова — ошибка понятнее и дешевле.
function requiredField<Value>(value: Value | undefined, param: string, type: string): Value {
  if (value === undefined) throw new Error(`Для ${type} укажите ${param}.`)
  return value
}

const ADJUSTMENT_SPECS: Record<NewAdjustment["type"], AdjustmentSpec> = {
  MOBILE_ADJUSTMENT: { field: "MobileAdjustment", slices: ["operating_system_type"], build: withOperatingSystem },
  TABLET_ADJUSTMENT: { field: "TabletAdjustment", slices: ["operating_system_type"], build: withOperatingSystem },
  DESKTOP_ADJUSTMENT: { field: "DesktopAdjustment", slices: [], build: bidOnly },
  DESKTOP_ONLY_ADJUSTMENT: { field: "DesktopOnlyAdjustment", slices: [], build: bidOnly },
  SMART_TV_ADJUSTMENT: { field: "SmartTvAdjustment", slices: [], build: bidOnly },
  VIDEO_ADJUSTMENT: { field: "VideoAdjustment", slices: [], build: bidOnly },
  SMART_AD_ADJUSTMENT: { field: "SmartAdAdjustment", slices: [], build: bidOnly },
  AD_GROUP_ADJUSTMENT: { field: "AdGroupAdjustment", slices: [], build: bidOnly },
  DEMOGRAPHICS_ADJUSTMENT: {
    field: "DemographicsAdjustments",
    many: true,
    slices: ["gender", "age"],
    build: demographics
  },
  RETARGETING_ADJUSTMENT: {
    field: "RetargetingAdjustments",
    many: true,
    slices: ["retargeting_condition_id"],
    build: (adjustment) => ({
      RetargetingConditionId: apiId(
        requiredField(adjustment.retargeting_condition_id, "retargeting_condition_id", "RETARGETING_ADJUSTMENT")
      ),
      BidModifier: adjustment.bid_modifier
    })
  },
  REGIONAL_ADJUSTMENT: {
    field: "RegionalAdjustments",
    many: true,
    slices: ["region_id"],
    build: (adjustment) => ({
      RegionId: apiId(requiredField(adjustment.region_id, "region_id", "REGIONAL_ADJUSTMENT")),
      BidModifier: adjustment.bid_modifier
    })
  },
  SERP_LAYOUT_ADJUSTMENT: {
    field: "SerpLayoutAdjustments",
    many: true,
    slices: ["serp_layout"],
    build: (adjustment) => ({
      SerpLayout: requiredField(adjustment.serp_layout, "serp_layout", "SERP_LAYOUT_ADJUSTMENT"),
      BidModifier: adjustment.bid_modifier
    })
  },
  INCOME_GRADE_ADJUSTMENT: {
    field: "IncomeGradeAdjustments",
    many: true,
    slices: ["income_grade"],
    build: (adjustment) => ({
      Grade: requiredField(adjustment.income_grade, "income_grade", "INCOME_GRADE_ADJUSTMENT"),
      BidModifier: adjustment.bid_modifier
    })
  }
}

function buildTargetItems(targetField: string, id: string, adjustments: NewAdjustment[]): Record<string, unknown>[] {
  const items: Record<string, unknown>[] = []
  const grouped = new Map<string, Record<string, unknown>[]>()

  for (const adjustment of adjustments) {
    const spec = ADJUSTMENT_SPECS[adjustment.type]
    const block = spec.build(adjustment)

    if (!spec.many) {
      items.push({ [targetField]: apiId(id), [spec.field]: block })
      continue
    }
    const blocks = grouped.get(spec.field) ?? []
    blocks.push(block)
    grouped.set(spec.field, blocks)
  }

  for (const [field, blocks] of grouped) {
    items.push({ [targetField]: apiId(id), [field]: blocks })
  }
  return items
}

function assertSlicesBelongToType(adjustment: NewAdjustment): void {
  const spec = ADJUSTMENT_SPECS[adjustment.type]
  const foreign = SLICE_FIELDS.filter((field) => adjustment[field] !== undefined && !spec.slices.includes(field))

  if (foreign.length > 0) {
    throw new Error(`Поля ${foreign.join(", ")} к ${adjustment.type} не относятся — проверьте вид корректировки.`)
  }
}

export async function handleAddBidAdjustments(params: z.infer<typeof addBidAdjustmentsSchema>): Promise<string> {
  const campaignIds = params.campaign_ids ?? []
  const adGroupIds = params.ad_group_ids ?? []

  if ((campaignIds.length === 0) === (adGroupIds.length === 0)) {
    throw new Error("Укажите ровно один уровень: campaign_ids ИЛИ ad_group_ids.")
  }
  for (const adjustment of params.adjustments) assertSlicesBelongToType(adjustment)

  const targetField = campaignIds.length > 0 ? "CampaignId" : "AdGroupId"
  const targetIds = campaignIds.length > 0 ? campaignIds : adGroupIds
  const bidModifiers = targetIds.flatMap((id) => buildTargetItems(targetField, id, params.adjustments))

  // Лимит Директа стоит на элементах запроса, а их тут произведение целей на виды
  // корректировок: по отдельности оба списка в схему укладываются, а вместе — нет.
  if (bidModifiers.length > MAX_ADJUSTMENTS_PER_CALL) {
    throw new Error(
      `Получилось ${bidModifiers.length} корректировок при пределе ${MAX_ADJUSTMENTS_PER_CALL} за вызов: ` +
        "разбейте цели или виды корректировок на несколько вызовов."
    )
  }

  return formatResult(await apiPost("bidmodifiers", "add", { BidModifiers: bidModifiers }), NO_MONEY)
}

export async function handleDeleteBidAdjustments(params: z.infer<typeof deleteBidAdjustmentsSchema>): Promise<string> {
  const data = await apiPost("bidmodifiers", "delete", {
    SelectionCriteria: { Ids: apiIds(params.adjustment_ids) }
  })
  return formatResult(data, NO_MONEY)
}

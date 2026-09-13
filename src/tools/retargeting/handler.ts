import type { z } from "zod"
import { apiPost } from "#shared/api/client"
import { API_FIELDS } from "#shared/config/api-fields"
import { formatResult } from "#shared/lib/format"
import { apiId, apiIds } from "#shared/lib/id"
import { buildPage } from "#shared/lib/pagination"
import type {
  addRetargetingListSchema,
  deleteRetargetingListsSchema,
  listRetargetingListsSchema,
  updateRetargetingListsSchema
} from "./schema.js"

const NO_MONEY = { money: false } as const

const LIST_FIELDS = [...API_FIELDS.retargetinglists.RetargetingListFieldEnum]

export async function handleListRetargetingLists(params: z.infer<typeof listRetargetingListsSchema>): Promise<string> {
  const selection: Record<string, unknown> = {}
  if (params.retargeting_list_ids?.length) selection.Ids = apiIds(params.retargeting_list_ids)
  if (params.types?.length) selection.Types = params.types

  const request: Record<string, unknown> = { FieldNames: LIST_FIELDS }
  if (Object.keys(selection).length > 0) request.SelectionCriteria = selection
  const page = buildPage(params)
  if (page) request.Page = page

  return formatResult(await apiPost("retargetinglists", "get", request), NO_MONEY)
}

type Rules = z.infer<typeof addRetargetingListSchema>["rules"]

function buildRules(rules: Rules): Record<string, unknown>[] {
  return rules.map((rule) => ({
    Operator: rule.operator,
    Arguments: rule.arguments.map((argument) => {
      const item: Record<string, unknown> = { ExternalId: apiId(argument.external_id) }
      if (argument.membership_life_span !== undefined) item.MembershipLifeSpan = argument.membership_life_span
      return item
    })
  }))
}

export async function handleAddRetargetingList(params: z.infer<typeof addRetargetingListSchema>): Promise<string> {
  const retargetingList: Record<string, unknown> = {
    Name: params.name,
    Type: params.type,
    Rules: buildRules(params.rules)
  }
  if (params.description !== undefined) retargetingList.Description = params.description

  return formatResult(await apiPost("retargetinglists", "add", { RetargetingLists: [retargetingList] }), NO_MONEY)
}

type RetargetingListUpdate = z.infer<typeof updateRetargetingListsSchema>["retargeting_lists"][number]

// null у описания значит «очистить» (поле nillable), поэтому пропуск поля отличает
// от очистки только undefined. Rules Директ заменяет целиком — дополнить нельзя.
function buildListUpdate(update: RetargetingListUpdate): Record<string, unknown> {
  const item: Record<string, unknown> = { Id: apiId(update.retargeting_list_id) }
  if (update.name !== undefined) item.Name = update.name
  if (update.description !== undefined) item.Description = update.description
  if (update.rules !== undefined) item.Rules = buildRules(update.rules)

  if (Object.keys(item).length === 1) {
    throw new Error(`Для условия ${update.retargeting_list_id} не передано ни одного изменения.`)
  }
  return item
}

export async function handleUpdateRetargetingLists(
  params: z.infer<typeof updateRetargetingListsSchema>
): Promise<string> {
  const data = await apiPost("retargetinglists", "update", {
    RetargetingLists: params.retargeting_lists.map(buildListUpdate)
  })
  return formatResult(data, NO_MONEY)
}

export async function handleDeleteRetargetingLists(
  params: z.infer<typeof deleteRetargetingListsSchema>
): Promise<string> {
  const data = await apiPost("retargetinglists", "delete", {
    SelectionCriteria: { Ids: apiIds(params.retargeting_list_ids) }
  })
  return formatResult(data, NO_MONEY)
}

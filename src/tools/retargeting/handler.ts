import type { z } from "zod"
import { apiPost } from "#shared/api/client"
import { formatResult } from "#shared/lib/format"
import { apiId, apiIds } from "#shared/lib/id"
import { buildPage } from "#shared/lib/pagination"
import type { addRetargetingListSchema, listRetargetingListsSchema } from "./schema.js"

const NO_MONEY = { money: false } as const

const LIST_FIELDS = [
  "Type",
  "Id",
  "Name",
  "Description",
  "Rules",
  "IsAvailable",
  "Scope",
  "AvailableForTargetsInAdGroupTypes"
]

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

export async function handleAddRetargetingList(params: z.infer<typeof addRetargetingListSchema>): Promise<string> {
  const retargetingList: Record<string, unknown> = {
    Name: params.name,
    Type: params.type,
    Rules: params.rules.map((rule) => ({
      Operator: rule.operator,
      Arguments: rule.arguments.map((argument) => {
        const item: Record<string, unknown> = { ExternalId: apiId(argument.external_id) }
        if (argument.membership_life_span !== undefined) item.MembershipLifeSpan = argument.membership_life_span
        return item
      })
    }))
  }
  if (params.description !== undefined) retargetingList.Description = params.description

  return formatResult(await apiPost("retargetinglists", "add", { RetargetingLists: [retargetingList] }), NO_MONEY)
}

import type { z } from "zod"
import { apiPost } from "#shared/api/client"
import { formatResult } from "#shared/lib/format"
import { apiId, apiIds } from "#shared/lib/id"
import { buildPage } from "#shared/lib/pagination"
import type { createAdGroupSchema, deleteAdGroupsSchema, listAdGroupsSchema, updateAdGroupSchema } from "./schema.js"
import { AD_GROUP_LIST_FIELDS } from "./schema.js"

export async function handleListAdGroups(params: z.infer<typeof listAdGroupsSchema>): Promise<string> {
  const requestParams: Record<string, unknown> = {
    SelectionCriteria: { CampaignIds: apiIds(params.campaign_ids) },
    FieldNames: params.fields ?? AD_GROUP_LIST_FIELDS
  }
  const page = buildPage(params)
  if (page) requestParams.Page = page

  return formatResult(await apiPost("adgroups", "get", requestParams))
}

export async function handleCreateAdGroup(params: z.infer<typeof createAdGroupSchema>): Promise<string> {
  const data = await apiPost("adgroups", "add", {
    AdGroups: [
      {
        Name: params.name,
        CampaignId: apiId(params.campaign_id),
        RegionIds: apiIds(params.region_ids)
      }
    ]
  })
  return formatResult(data)
}

export async function handleUpdateAdGroup(params: z.infer<typeof updateAdGroupSchema>): Promise<string> {
  const { ad_group_id, name, region_ids, tracking_params } = params
  if (name === undefined && region_ids === undefined && tracking_params === undefined) {
    throw new Error("Нечего обновлять: укажите name, region_ids и/или tracking_params.")
  }

  const adGroup: Record<string, unknown> = { Id: apiId(ad_group_id) }
  if (name !== undefined) adGroup.Name = name
  if (region_ids !== undefined) adGroup.RegionIds = apiIds(region_ids)
  // TrackingParams в WSDL не nillable: разметка снимается пустой строкой, а не null.
  if (tracking_params !== undefined) adGroup.TrackingParams = tracking_params ?? ""

  return formatResult(await apiPost("adgroups", "update", { AdGroups: [adGroup] }))
}

export async function handleDeleteAdGroups(params: z.infer<typeof deleteAdGroupsSchema>): Promise<string> {
  const data = await apiPost("adgroups", "delete", {
    SelectionCriteria: { Ids: apiIds(params.ad_group_ids) }
  })
  return formatResult(data)
}

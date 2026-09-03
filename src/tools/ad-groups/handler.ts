import type { z } from "zod"
import { apiPost } from "#shared/api/client"
import { formatResult } from "#shared/lib/format"
import { apiId, apiIds } from "#shared/lib/id"
import { buildPage } from "#shared/lib/pagination"
import type { createAdGroupSchema, deleteAdGroupsSchema, listAdGroupsSchema } from "./schema.js"

const LIST_FIELDS = ["Id", "Name", "CampaignId", "RegionIds", "Status", "Type"]

export async function handleListAdGroups(params: z.infer<typeof listAdGroupsSchema>): Promise<string> {
  const requestParams: Record<string, unknown> = {
    SelectionCriteria: { CampaignIds: apiIds(params.campaign_ids) },
    FieldNames: LIST_FIELDS
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

export async function handleDeleteAdGroups(params: z.infer<typeof deleteAdGroupsSchema>): Promise<string> {
  const data = await apiPost("adgroups", "delete", {
    SelectionCriteria: { Ids: apiIds(params.ad_group_ids) }
  })
  return formatResult(data)
}

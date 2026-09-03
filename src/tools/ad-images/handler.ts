import type { z } from "zod"
import { apiPost } from "#shared/api/client"
import { formatResult } from "#shared/lib/format"
import { buildPage } from "#shared/lib/pagination"
import type { manageAdImagesSchema } from "./schema.js"

const NO_MONEY = { money: false } as const

const GET_FIELDS = ["AdImageHash", "OriginalUrl", "PreviewUrl", "Name", "Type", "Subtype", "Associated"]

type Params = z.infer<typeof manageAdImagesSchema>

async function addImages(params: Params): Promise<string> {
  if (!params.images?.length) throw new Error("Для action=add передайте images.")

  const data = await apiPost("adimages", "add", {
    AdImages: params.images.map((image) => {
      const item: Record<string, unknown> = { ImageData: image.image_data, Name: image.name }
      if (image.type) item.Type = image.type
      return item
    })
  })
  return formatResult(data, NO_MONEY)
}

async function deleteImages(params: Params): Promise<string> {
  if (!params.ad_image_hashes?.length) throw new Error("Для action=delete передайте ad_image_hashes.")

  const data = await apiPost("adimages", "delete", {
    SelectionCriteria: { AdImageHashes: params.ad_image_hashes }
  })
  return formatResult(data, NO_MONEY)
}

async function getImages(params: Params): Promise<string> {
  const selection: Record<string, unknown> = {}
  if (params.ad_image_hashes?.length) selection.AdImageHashes = params.ad_image_hashes
  if (params.associated) selection.Associated = params.associated

  const request: Record<string, unknown> = { FieldNames: GET_FIELDS }
  if (Object.keys(selection).length > 0) request.SelectionCriteria = selection
  const page = buildPage(params)
  if (page) request.Page = page

  return formatResult(await apiPost("adimages", "get", request), NO_MONEY)
}

export async function handleManageAdImages(params: Params): Promise<string> {
  if (params.action === "add") return addImages(params)
  if (params.action === "delete") return deleteImages(params)
  return getImages(params)
}

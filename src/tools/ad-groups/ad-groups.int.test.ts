// Сетевой тест: форма ID в ответе боевого API. Юнит здесь бесполезен по устройству —
// он сверяет вывод с нашей же фикстурой, а разрядность ID назначает Яндекс: короткий ID
// приезжает числом, больше Number.MAX_SAFE_INTEGER — строкой. Расхождение 12.09.2026 нашлось
// живым вызовом, а не прогоном тестов: наружу уходило то число, то строка, и зависело
// это от величины значения, а не от поля.
//
// Чтение полигона не требует; запись update_ad_group — ниже, только на полигон.
import { afterAll, beforeAll, describe, expect, it } from "vitest"
import { apiPost } from "#shared/api/client"
import { API_FIELDS } from "#shared/config/api-fields"
import { CONFIGURED, collectIds, firstCampaignId, parseOutput, smokeRead } from "#testing/smoke"
import { handleListAdGroups, handleUpdateAdGroup } from "./handler.js"
import { updateAdGroupSchema } from "./schema.js"

describe.skipIf(!CONFIGURED)("форма ID в ответе боевого API", () => {
  it("отдаёт каждый ID строкой, какой бы разрядности он ни был", async () => {
    const output = await handleListAdGroups({ campaign_ids: [await firstCampaignId()], limit: 10 })
    const ids = collectIds(parseOutput(output))

    // Без этой проверки пустой ответ прошёл бы молча — тот самый ложно-зелёный тест,
    // от которого уходим: утверждение «все ID строки» на нуле ID всегда верно.
    expect(
      ids.map(([key]) => key),
      "в ответе не оказалось ни одного поля ID"
    ).toEqual(expect.arrayContaining(["Id", "CampaignId", "RegionIds"]))
    expect(ids.filter(([, value]) => typeof value !== "string")).toEqual([])
  })
})

// Запись — только в группу кампании-полигона, оставленной черновиком; ID полигона — из
// окружения, без YANDEX_DIRECT_POLYGON_CAMPAIGN_ID кейсы пропускаются.
const POLYGON = process.env.YANDEX_DIRECT_POLYGON_CAMPAIGN_ID
const POLYGON_SET = Boolean(POLYGON && CONFIGURED)

type PolygonGroup = { Id: string; RegionIds: string[]; TrackingParams: string }

async function readPolygonGroup(): Promise<PolygonGroup> {
  const output = await handleListAdGroups({
    campaign_ids: [POLYGON as string],
    fields: ["Id", "RegionIds", "TrackingParams"],
    limit: 1
  })
  const group = (parseOutput(output) as { result?: { AdGroups?: PolygonGroup[] } }).result?.AdGroups?.[0]
  if (!group) throw new Error(`В кампании-полигоне ${POLYGON} нет ни одной группы`)
  return group
}

describe.skipIf(!POLYGON_SET)("update_ad_group против боевого API", () => {
  let original: PolygonGroup

  // Кампания, вышедшая из черновика, может показываться и тратить деньги: тест падает,
  // а не пропускается.
  beforeAll(async () => {
    const data = await apiPost("campaigns", "get", {
      SelectionCriteria: { Ids: [POLYGON] },
      FieldNames: ["Status", "State"]
    })
    const campaign = (data as { result?: { Campaigns?: { Status?: string; State?: string }[] } }).result?.Campaigns?.[0]
    expect(
      { Status: campaign?.Status, State: campaign?.State },
      `Кампания-полигон ${POLYGON} вышла из черновика — писать в неё нельзя`
    ).toEqual({ Status: "DRAFT", State: "OFF" })

    original = await readPolygonGroup()
  })

  afterAll(async () => {
    // Группу не прочитали — в неё и не писали, восстанавливать нечего.
    if (!original) return
    await handleUpdateAdGroup(
      updateAdGroupSchema.parse({
        ad_group_id: original.Id,
        region_ids: original.RegionIds,
        tracking_params: original.TrackingParams || null
      })
    )
  })

  it("заменяет регионы целиком, а не дописывает к прежним", async () => {
    await handleUpdateAdGroup(updateAdGroupSchema.parse({ ad_group_id: original.Id, region_ids: ["225", "-213"] }))

    expect((await readPolygonGroup()).RegionIds).toEqual(["225", "-213"])
  })

  it("снимает разметку по null", async () => {
    await handleUpdateAdGroup(
      updateAdGroupSchema.parse({ ad_group_id: original.Id, tracking_params: "utm_source=probe" })
    )
    expect((await readPolygonGroup()).TrackingParams).toBe("utm_source=probe")

    await handleUpdateAdGroup(updateAdGroupSchema.parse({ ad_group_id: original.Id, tracking_params: null }))

    expect((await readPolygonGroup()).TrackingParams).toBe("")
  })
})

const GROUP_FIELDS = API_FIELDS.adgroups.AdGroupFieldEnum

describe.skipIf(!CONFIGURED)("smoke adgroups.get", () => {
  it("принимает весь AdGroupFieldEnum и отдаёт группы известной формы", async () => {
    await smokeRead({
      service: "adgroups",
      method: "get",
      params: {
        SelectionCriteria: { CampaignIds: [BigInt(await firstCampaignId())] },
        FieldNames: [...GROUP_FIELDS],
        Page: { Limit: 5 }
      },
      collection: "AdGroups",
      fields: GROUP_FIELDS,
      money: false
    })
  })
})

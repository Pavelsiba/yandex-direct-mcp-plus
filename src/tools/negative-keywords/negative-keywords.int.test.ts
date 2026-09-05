// Сетевой тест: настоящий API Директа, настоящая запись. Проверяет то, чего unit-тест
// показать не может, — что наше правило сравнения минус-фраз совпадает с правилом Директа.
// Unit-тест здесь бесполезен по устройству: он сверяет merge с нашим же представлением о
// нормализации, и разошедшееся с реальностью представление остаётся зелёным.
//
// Пишет только на кампанию-полигон, оставленную черновиком, — кроме набора минус-фраз,
// который живёт на уровне аккаунта и потому заводится и удаляется самим тестом. ID полигона
// берётся из окружения и в отслеживаемых файлах не хранится: без
// YANDEX_DIRECT_POLYGON_CAMPAIGN_ID оба набора кейсов пропускаются.
import { afterAll, beforeAll, describe, expect, it } from "vitest"
import { apiPost } from "#shared/api/client"
import {
  handleLinkNegativeKeywordSets,
  handleManageNegativeKeywordSharedSets,
  handleSetCampaignNegativeKeywords
} from "./handler.js"

const POLYGON = process.env.YANDEX_DIRECT_POLYGON_CAMPAIGN_ID
const CONFIGURED = Boolean(POLYGON && process.env.YANDEX_DIRECT_TOKEN)

type Campaign = { Status?: string; State?: string; NegativeKeywords?: { Items: string[] } | null }

async function getCampaign(fieldNames: string[]): Promise<Campaign | undefined> {
  const data = await apiPost("campaigns", "get", {
    SelectionCriteria: { Ids: [POLYGON] },
    FieldNames: ["Id", ...fieldNames]
  })
  return (data as { result?: { Campaigns?: Campaign[] } }).result?.Campaigns?.[0]
}

// null, а не пустой массив: у кампании без минус-фраз Директ отдаёт именно его.
async function readItems(): Promise<string[] | null> {
  const campaign = await getCampaign(["NegativeKeywords"])
  return campaign?.NegativeKeywords?.Items ?? null
}

async function clearPolygon(): Promise<void> {
  await apiPost("campaigns", "update", { Campaigns: [{ Id: POLYGON, NegativeKeywords: null }] })
}

const set = (keywords: string[], mode: "replace" | "add" | "remove"): Promise<string> =>
  handleSetCampaignNegativeKeywords({ campaign_id: POLYGON as string, negative_keywords: keywords, mode })

describe.skipIf(!CONFIGURED)("минус-фразы кампании против боевого API", () => {
  // Проверка цели до первой записи. Кампания, вышедшая из черновика, может показываться и
  // тратить деньги — на такую тест не пишет ничего и падает, а не пропускается: пропуск
  // здесь читался бы как «нечего проверять», хотя случилось непредвиденное.
  beforeAll(async () => {
    const campaign = await getCampaign(["Status", "State"])
    expect(campaign, `Кампания-полигон ${POLYGON} недоступна`).toBeDefined()
    expect(
      { Status: campaign?.Status, State: campaign?.State },
      `Кампания-полигон ${POLYGON} вышла из черновика — писать в неё нельзя`
    ).toEqual({ Status: "DRAFT", State: "OFF" })

    await clearPolygon()
  })

  afterAll(clearPolygon)

  it("replace кладёт список в пустую кампанию", async () => {
    await set(["зимняя рыбалка", "бесплатно"], "replace")

    expect(await readItems()).toEqual(expect.arrayContaining(["зимняя рыбалка", "бесплатно"]))
  })

  it("Директ сам приписывает ! к стоп-слову, меняя присланное написание", async () => {
    await set(["своими руками"], "replace")

    expect(await readItems()).toEqual(["!своими руками"])
  })

  it("remove находит фразу, написание которой изменил Директ", async () => {
    await set(["своими руками"], "replace")
    await set(["Своими Руками"], "remove")

    expect(await readItems()).toBeNull()
  })

  it("remove находит фразу, записанную через ё", async () => {
    await set(["дёшево"], "replace")
    expect(await readItems()).toEqual(["дешево"])

    await set(["дёшево"], "remove")
    expect(await readItems()).toBeNull()
  })

  it("add не плодит дубль фразы, отличающейся только оператором и регистром", async () => {
    await set(["ремонт"], "replace")
    await set(["+РЕМОНТ"], "add")

    expect(await readItems()).toEqual(["ремонт"])
  })

  it("remove последней фразы очищает список, а не падает ошибкой API", async () => {
    await set(["бесплатно"], "replace")
    await set(["бесплатно"], "remove")

    expect(await readItems()).toBeNull()
  })

  it("replace пустым списком очищает список", async () => {
    await set(["бесплатно"], "replace")
    await set([], "replace")

    expect(await readItems()).toBeNull()
  })
})

// Общий набор — объект уровня аккаунта, полигоном его не прикрыть, поэтому тест заводит свой
// и удаляет его за собой. Показов набор не даёт и денег не стоит, пока не привязан к группе;
// привязку тест не делает.
const PROBE_SET_NAME = "yd-mcp int-тест"

type SharedSet = { Id: string; Name: string; Associated?: string; NegativeKeywords?: string[] }

async function listSets(): Promise<SharedSet[]> {
  const data = await apiPost("negativekeywordsharedsets", "get", {
    FieldNames: ["Id", "Name", "Associated", "NegativeKeywords"]
  })
  return (data as { result?: { NegativeKeywordSharedSets?: SharedSet[] } }).result?.NegativeKeywordSharedSets ?? []
}

// По имени, а не по сохранённому ID: упавший прошлый прогон мог оставить набор за собой.
async function deleteProbeSets(): Promise<void> {
  const stale = (await listSets()).filter((sharedSet) => sharedSet.Name.startsWith(PROBE_SET_NAME))
  if (stale.length === 0) return

  await handleManageNegativeKeywordSharedSets({
    action: "delete",
    set_ids: stale.map((sharedSet) => String(sharedSet.Id))
  })
}

describe.skipIf(!CONFIGURED)("общие наборы минус-фраз против боевого API", () => {
  beforeAll(deleteProbeSets)
  afterAll(deleteProbeSets)

  // Форма поля здесь другая, чем у кампаний: голый массив вместо { Items: [...] }. Юнит-тест
  // это утверждение только повторил бы за хендлером — принять его может лишь сам Директ.
  it("add создаёт набор, принимая NegativeKeywords голым массивом", async () => {
    await handleManageNegativeKeywordSharedSets({
      action: "add",
      add_sets: [{ name: PROBE_SET_NAME, negative_keywords: ["лодка", "весло"] }]
    })

    const created = (await listSets()).find((sharedSet) => sharedSet.Name === PROBE_SET_NAME)
    expect(created?.NegativeKeywords).toEqual(expect.arrayContaining(["лодка", "весло"]))
  })

  it("нормализует фразы теми же правилами, что и кампания", async () => {
    await handleManageNegativeKeywordSharedSets({
      action: "add",
      add_sets: [{ name: `${PROBE_SET_NAME} нормализация`, negative_keywords: ["дёшево", "ДЁШЕВО", "своими руками"] }]
    })

    const created = (await listSets()).find((sharedSet) => sharedSet.Name === `${PROBE_SET_NAME} нормализация`)
    expect(created?.NegativeKeywords).toEqual(["!своими руками", "дешево"])
  })

  it("update заменяет название и список целиком", async () => {
    await handleManageNegativeKeywordSharedSets({
      action: "add",
      add_sets: [{ name: `${PROBE_SET_NAME} правка`, negative_keywords: ["лодка"] }]
    })
    const created = (await listSets()).find((sharedSet) => sharedSet.Name === `${PROBE_SET_NAME} правка`)

    await handleManageNegativeKeywordSharedSets({
      action: "update",
      update_sets: [{ set_id: String(created?.Id), name: `${PROBE_SET_NAME} правка два`, negative_keywords: ["весло"] }]
    })

    const updated = (await listSets()).find((sharedSet) => String(sharedSet.Id) === String(created?.Id))
    expect(updated).toMatchObject({ Name: `${PROBE_SET_NAME} правка два`, NegativeKeywords: ["весло"] })
  })

  it("delete убирает набор из аккаунта", async () => {
    await handleManageNegativeKeywordSharedSets({
      action: "add",
      add_sets: [{ name: `${PROBE_SET_NAME} на удаление`, negative_keywords: ["лодка"] }]
    })
    const created = (await listSets()).find((sharedSet) => sharedSet.Name === `${PROBE_SET_NAME} на удаление`)

    await handleManageNegativeKeywordSharedSets({ action: "delete", set_ids: [String(created?.Id)] })

    expect((await listSets()).some((sharedSet) => String(sharedSet.Id) === String(created?.Id))).toBe(false)
  })
})

// Привязка к кампании лежит внутри объекта настроек, поэтому и читается type-specific
// параметром TextCampaignFieldNames, а не общим FieldNames. Полигон — TEXT_CAMPAIGN;
// на другом типе набор кейсов пришлось бы менять вместе с ключом.
async function readCampaignSetIds(): Promise<string[] | null> {
  const data = await apiPost("campaigns", "get", {
    SelectionCriteria: { Ids: [POLYGON] },
    FieldNames: ["Id"],
    TextCampaignFieldNames: ["NegativeKeywordSharedSetIds"]
  })

  const campaign = (
    data as {
      result?: { Campaigns?: { TextCampaign?: { NegativeKeywordSharedSetIds?: { Items: string[] } | null } }[] }
    }
  ).result?.Campaigns?.[0]

  const items = campaign?.TextCampaign?.NegativeKeywordSharedSetIds?.Items
  return items ? items.map(String) : null
}

describe.skipIf(!CONFIGURED)("привязка общих наборов к кампании против боевого API", () => {
  const LINK_SET_NAME = `${PROBE_SET_NAME} привязка`
  let setId = ""

  beforeAll(async () => {
    const campaign = await getCampaign(["Status", "State"])
    expect(
      { Status: campaign?.Status, State: campaign?.State },
      `Кампания-полигон ${POLYGON} вышла из черновика — писать в неё нельзя`
    ).toEqual({ Status: "DRAFT", State: "OFF" })

    await deleteProbeSets()
    await handleManageNegativeKeywordSharedSets({
      action: "add",
      add_sets: [{ name: LINK_SET_NAME, negative_keywords: ["лодка"] }]
    })
    setId = String((await listSets()).find((sharedSet) => sharedSet.Name === LINK_SET_NAME)?.Id)
  })

  // Сначала снять привязку, потом удалять набор: привязанный набор Директ удалить не даст.
  afterAll(async () => {
    await handleLinkNegativeKeywordSets({ campaign_ids: [POLYGON as string], set_ids: [] })
    await deleteProbeSets()
  })

  it("привязывает набор к кампании, определив её тип сам", async () => {
    await handleLinkNegativeKeywordSets({ campaign_ids: [POLYGON as string], set_ids: [setId] })

    expect(await readCampaignSetIds()).toEqual([setId])
  })

  // Проверять здесь Associated бессмысленно: после привязки к кампании он остаётся "NO"
  // (наблюдение 05.09.2026). Похоже, флаг считает только привязки групп, но утверждать это
  // нечем, а гадание в ассертах — тот же ложно-зелёный тест, от которого мы уходим.

  // Запись и чтение здесь несимметричны: снимается привязка значением null (пустой Items
  // Директ отклоняет ошибкой 8000), а читается обратно как пустой Items — не как null и не
  // пропуском поля. У NegativeKeywords кампании ровно наоборот: очищенное поле приходит null.
  it("снимает привязку пустым списком", async () => {
    await handleLinkNegativeKeywordSets({ campaign_ids: [POLYGON as string], set_ids: [setId] })
    await handleLinkNegativeKeywordSets({ campaign_ids: [POLYGON as string], set_ids: [] })

    expect(await readCampaignSetIds()).toEqual([])
  })
})

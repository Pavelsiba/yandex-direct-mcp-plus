// biome-ignore-all lint/plugin: разбирается собственный вывод форматтера, ID в нём уже строки
// Обвязка сетевых smoke-тестов: один читающий вызов на домен против боевого API.
// Проверяет то, что юнит на подменённом транспорте проверить не может: FieldNames из снимка
// приняты, форма ответа та же (разбор strict — новый ключ значит «пересобери снимок»),
// ID строками и деньги в рублях.
import { expect } from "vitest"
import { z } from "zod"
import { apiPost } from "#shared/api/client"
import { formatResult } from "#shared/lib/format"
import { isRecord } from "#shared/lib/record"

export const CONFIGURED = Boolean(process.env.YANDEX_DIRECT_TOKEN)

const ID_KEYS = /Ids?$/
const WRAPPER_KEY = "Items"

type IdEntry = [key: string, value: unknown]

// Обход всего дерева, а не списка полей: ловятся и ID в полях, о которых мы не знали.
export function collectIds(value: unknown, key = ""): IdEntry[] {
  if (Array.isArray(value)) return value.flatMap((item) => collectIds(item, key))

  if (isRecord(value)) {
    return Object.entries(value).flatMap(([nestedKey, nested]) =>
      collectIds(nested, nestedKey === WRAPPER_KEY ? key : nestedKey)
    )
  }

  // null под ID-ключом — незаполненная ссылка (VCardId и прочие), это норма.
  if (value === null || value === undefined) return []
  return ID_KEYS.test(key) ? [[key, value]] : []
}

// Перед JSON-телом могут идти уведомления Директа.
export function parseOutput(output: string): unknown {
  return JSON.parse(output.slice(output.indexOf("{")))
}

// Коллекция ответа v5 — из сырого apiPost или из parseOutput: у обоих она под `result`.
// Без `result` ответ не той формы, и это ошибка теста, а не пустая выборка; пустую же
// коллекцию Директ опускает, поэтому её отсутствие — [].
export function resultItems<T>(data: unknown, collection: string): T[] {
  const result = isRecord(data) ? data.result : undefined
  if (!isRecord(result)) {
    throw new Error(`В ответе нет result.${collection}: ключи верхнего уровня — ${Object.keys(Object(data))}`)
  }
  const items = result[collection]
  if (items === undefined) return []
  if (!Array.isArray(items)) throw new Error(`result.${collection} — не массив`)
  return items as T[]
}

// Проверка цели до первой записи. Кампания вне черновика может показываться и тратить
// деньги: тест на неё не пишет и падает, а не пропускается — пропуск читался бы как
// «нечего проверять», хотя случилось непредвиденное.
export async function expectPolygonDraft(polygon: string): Promise<void> {
  const data = await apiPost("campaigns", "get", {
    SelectionCriteria: { Ids: [polygon] },
    FieldNames: ["Id", "Status", "State"]
  })
  const [campaign] = resultItems<{ Status?: string; State?: string }>(data, "Campaigns")
  expect(campaign, `Кампания-полигон ${polygon} недоступна`).toBeDefined()
  expect(
    { Status: campaign?.Status, State: campaign?.State },
    `Кампания-полигон ${polygon} вышла из черновика — писать в неё нельзя`
  ).toEqual({ Status: "DRAFT", State: "OFF" })
}

// Ловится только ключ, которого нет в перечислении снимка; значения проверяют инварианты.
function strictItem(fields: readonly string[]): z.ZodType {
  return z.strictObject(Object.fromEntries(fields.map((field) => [field, z.unknown().optional()])))
}

type SmokeRequest = {
  service: string
  method: string
  params: Record<string, unknown>
  collection: string
  fields: readonly string[]
  money?: boolean
  // false — для объектов без ID: изображение опознаётся по AdImageHash.
  ids?: boolean
}

// Один читающий вызов: strict-разбор сырого ответа плюс инварианты отформатированного.
export async function smokeRead(request: SmokeRequest): Promise<{ raw: unknown; output: unknown }> {
  const raw = await apiPost(request.service, request.method, request.params)
  const collection = (raw as { result?: Record<string, unknown> }).result?.[request.collection]

  expect(
    Array.isArray(collection),
    `Директ не вернул коллекцию ${request.collection} — проверять форму элемента не на чем`
  ).toBe(true)

  // На пустой выборке любая проверка «для всех элементов» зелёная — и ничего не проверяет.
  const items = collection as unknown[]
  expect(items.length, `в ответе ${request.collection} нет ни одного объекта`).toBeGreaterThan(0)

  const item = strictItem(request.fields)
  for (const value of items) {
    const parsed = item.safeParse(value)
    expect(parsed.success, `${request.collection}: ${parsed.error && z.prettifyError(parsed.error)}`).toBe(true)
  }

  const output = parseOutput(formatResult(raw, { money: request.money }))
  const ids = collectIds(output)
  if (request.ids !== false) expect(ids.length, "в ответе не оказалось ни одного поля ID").toBeGreaterThan(0)
  expect(ids.filter(([, value]) => typeof value !== "string")).toEqual([])

  return { raw, output }
}

// Ищется вызовом, а не константой: ID боевого аккаунта в публичный репозиторий не кладём.
async function firstId(service: string, collection: string, params: Record<string, unknown> = {}): Promise<string> {
  const data = (await apiPost(service, "get", { FieldNames: ["Id"], Page: { Limit: 1 }, ...params })) as {
    result?: Record<string, { Id?: unknown }[]>
  }
  const id = data.result?.[collection]?.[0]?.Id

  expect(id, `в аккаунте нет ни одного объекта ${collection} — smoke опереть не на что`).toBeDefined()
  return String(id)
}

export function firstCampaignId(): Promise<string> {
  return firstId("campaigns", "Campaigns")
}

export async function firstAdGroupId(): Promise<string> {
  return firstId("adgroups", "AdGroups", { SelectionCriteria: { CampaignIds: [BigInt(await firstCampaignId())] } })
}

export function firstRetargetingListId(): Promise<string> {
  return firstId("retargetinglists", "RetargetingLists")
}

// Сверка с сырым значением, а не с порогом: порог врал бы на крупном бюджете.
// Нет суммы в ответе — её не должно быть и в выводе.
export function expectRubles(rawMicros: unknown, rubles: unknown): void {
  if (rawMicros === undefined) {
    expect(rubles, "сумма появилась в выводе, хотя Директ её не присылал").toBeUndefined()
    return
  }

  expect(typeof rawMicros, "денежное поле пришло не числом").toBe("number")
  expect(rubles).toBe((rawMicros as number) / 1_000_000)
}

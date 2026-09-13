// biome-ignore-all lint/plugin: разбирается собственный вывод форматтера — ID в нём уже
// приведены к строкам, терять точность нечему
// Обвязка сетевых smoke-тестов: один читающий вызов на домен против боевого API.
//
// Зачем отдельно от unit. Юнит на подменённом транспорте не может разойтись с Директом:
// фикстуру к нему пишет тот же, кто пишет хендлер, из той же картины мира. Он стережёт
// нашу логику, но про API не утверждает ничего. Smoke утверждает три вещи, каждая из
// которых проверяема только живым вызовом:
//
//   1. запрос принят — значения FieldNames из снимка WSDL боевой API не отбил ошибкой
//      8000 (пробой 13.09.2026 так нашёлся CounterIds вместо CounterId);
//   2. форма ответа та же — разбор strict, и неизвестный ключ здесь не отказ, а сигнал
//      «Яндекс добавил поле, пересобери снимок». В сервере схемы остаются нестрогими:
//      там лишнее поле ломать инструмент не должно;
//   3. инварианты вывода — ID строками, деньги в рублях.
//
// Сырой ответ и вывод берутся из одного вызова: formatResult прогоняется здесь же, как
// это делает хендлер. Второй запрос ради той же проверки тратил бы баллы впустую.
import { expect } from "vitest"
import { z } from "zod"
import { apiPost } from "#shared/api/client"
import { formatResult } from "#shared/lib/format"

export const CONFIGURED = Boolean(process.env.YANDEX_DIRECT_TOKEN)

const ID_KEYS = /Ids?$/
const WRAPPER_KEY = "Items"

type IdEntry = [key: string, value: unknown]

// Обход всего дерева, а не заранее названного списка полей: проверяется то, что Директ
// реально прислал, включая поля, о которых мы не знали. Ключ передаётся вглубь массива и
// через обёртку `{ Items: [...] }` — у элементов своего имени нет.
export function collectIds(value: unknown, key = ""): IdEntry[] {
  if (Array.isArray(value)) return value.flatMap((item) => collectIds(item, key))

  if (value && typeof value === "object") {
    return Object.entries(value as Record<string, unknown>).flatMap(([nestedKey, nested]) =>
      collectIds(nested, nestedKey === WRAPPER_KEY ? key : nestedKey)
    )
  }

  // null под ID-ключом — норма: так Директ отдаёт незаполненную ссылку (VCardId и прочие).
  if (value === null || value === undefined) return []
  return ID_KEYS.test(key) ? [[key, value]] : []
}

// Вывод инструмента начинается с уведомлений Директа (LimitedBy и per-item ошибки),
// тело идёт следом.
export function parseOutput(output: string): unknown {
  return JSON.parse(output.slice(output.indexOf("{")))
}

// Строгая схема элемента собирается из перечисления снимка, а не пишется руками: рукописная
// копия разошлась бы с API молча, а эта живёт ровно до следующего `npm run api:fields`.
// Значения не типизируются — за них отвечают инварианты ниже; ловится появление ключа,
// которого в перечислении нет.
function strictItem(fields: readonly string[]): z.ZodType {
  return z.strictObject(Object.fromEntries(fields.map((field) => [field, z.unknown().optional()])))
}

type SmokeRequest = {
  service: string
  method: string
  params: Record<string, unknown>
  // Имя массива в result: Campaigns, AdGroups, Keywords и прочие.
  collection: string
  // Перечисление FieldNames этого метода из API_FIELDS.
  fields: readonly string[]
  money?: boolean
  // Не у всякого объекта есть поле на «Id»: изображение опознаётся по AdImageHash.
  // Там, где ID есть, его отсутствие в ответе — сигнал, а не мелочь, поэтому по умолчанию
  // ждём хотя бы один.
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

  // Пустая выборка прошла бы любую проверку: утверждение про все элементы на нуле
  // элементов истинно тождественно. Такой зелёный тест хуже отсутствующего — он
  // заявляет покрытие, которого нет.
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

// Опорные объекты ищутся вызовом, а не берутся константой: ID кампаний и групп — данные
// боевого аккаунта, а репозиторий публичный. Заодно тест не разваливается, когда объект
// в аккаунте меняется.
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

// Деньги наружу уходят в рублях: formatResult делит микроединицы на миллион. Сверяется
// с сырым значением, а не с порогом «слишком большое» — порог врал бы на крупном бюджете.
//
// Суммы может не быть вовсе: ставка не задана, бюджет не выставлен. Тогда её не должно
// быть и в выводе — выдумывать значение ради непустой проверки нельзя.
export function expectRubles(rawMicros: unknown, rubles: unknown): void {
  if (rawMicros === undefined) {
    expect(rubles, "сумма появилась в выводе, хотя Директ её не присылал").toBeUndefined()
    return
  }

  expect(typeof rawMicros, "денежное поле пришло не числом").toBe("number")
  expect(rubles).toBe((rawMicros as number) / 1_000_000)
}

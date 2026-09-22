// biome-ignore-all lint/plugin: сериализуется нормализованное дерево, ID в нём уже строки
// Единый формат ответа инструментов: деньги в рублях, ID строками, сверху — уведомления Директа.
import { getErrorHint } from "#shared/lib/error-hints"
import { microsToRubles } from "#shared/lib/money"
import { isRecord } from "#shared/lib/record"

// Только заведомо денежные ключи, иначе в рубли уехали бы счётчики и ID. Value — ценность
// цели: конвертируются только числа, строковые Value из Settings (YES/NO) не трогаются.
const MONEY_KEYS = new Set([
  "Amount",
  "Bid",
  "ContextBid",
  "WeeklySpendLimit",
  "BidCeiling",
  "Price",
  "CurrentSearchPrice",
  "MinSearchPrice",
  "CompetitorsBids",
  "Value"
])

// Короткие ID json-bigint отдаёт числом, наружу ID всегда строка. Регистр значим:
// Bid и ContextBid кончаются на «id», без учёта регистра ставки стали бы строками.
const ID_KEYS = /Ids?$/

// У элементов массива и обёртки `{ Items: [...] }` (CounterIds и соседи) своего имени нет —
// им передаётся имя родителя, иначе ID внутри остались бы числами.
const WRAPPER_KEY = "Items"

function normalize(value: unknown, key: string, money: boolean): unknown {
  if (Array.isArray(value)) return value.map((item) => normalize(item, key, money))

  if (isRecord(value)) {
    const converted: Record<string, unknown> = {}

    for (const [nestedKey, nested] of Object.entries(value)) {
      converted[nestedKey] = normalize(nested, nestedKey === WRAPPER_KEY ? key : nestedKey, money)
    }
    return converted
  }

  if (typeof value !== "number") return value
  if (money && MONEY_KEYS.has(key)) return microsToRubles(value)
  return ID_KEYS.test(key) ? String(value) : value
}

type Notification = {
  Code?: number
  Message?: string
  Details?: string
}

// По этому знаку в начале строки server ставит isError: признак переживает склейку
// нескольких ответов в один текст, а в JSON-теле строка с него не начинается.
const ITEM_ERROR_MARK = "❌"

function formatNotice(prefix: string, key: string, index: number, notification: Notification): string {
  const detail = notification.Details ? ` — ${notification.Details}` : ""
  const line = `${prefix} ${key}[${index}] [${notification.Code ?? "?"}] ${notification.Message ?? ""}${detail}`
  const hint = prefix === ITEM_ERROR_MARK ? getErrorHint(notification.Code) : undefined
  return hint ? `${line}\n   Что делать: ${hint}` : line
}

export const hasItemErrors = (output: string): boolean =>
  output.split("\n").some((line) => line.startsWith(ITEM_ERROR_MARK))

// Отказы по объектам лежат в *Results, обрезка выборки — в LimitedBy, и всё это приходит
// с HTTP 200: без шапки модель прочла бы частичный отказ как успех.
function collectNotices(data: unknown): string {
  const lines: string[] = []
  const result = isRecord(data) ? data.result : undefined
  if (!isRecord(result)) return ""

  if (typeof result.LimitedBy === "number") {
    lines.push(
      `ℹ️ Результат обрезан (LimitedBy=${result.LimitedBy}). Для следующей страницы передайте offset=${result.LimitedBy}.`
    )
  }

  for (const [key, value] of Object.entries(result)) {
    if (!/Results$/.test(key) || !Array.isArray(value)) continue

    value.forEach((item, index) => {
      for (const error of (item?.Errors ?? []) as Notification[]) {
        lines.push(formatNotice(ITEM_ERROR_MARK, key, index, error))
      }
      for (const warning of (item?.Warnings ?? []) as Notification[]) lines.push(formatNotice("⚠️", key, index, warning))
    })
  }

  return lines.join("\n")
}

export function formatResult(data: unknown, opts: { money?: boolean } = {}): string {
  const payload = normalize(data, "", opts.money !== false)
  const notices = collectNotices(data)
  const body = JSON.stringify(payload, null, 2)
  return notices ? `${notices}\n\n${body}` : body
}

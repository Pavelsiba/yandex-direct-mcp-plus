// biome-ignore-all lint/plugin: слой вывода — сериализуется уже нормализованное дерево,
// больших чисел в нём не остаётся: ID приведены к строкам ниже
// Единый формат ответа инструментов: деньги в рублях, ID строками, сверху — уведомления Директа.
import { getErrorHint } from "#shared/lib/error-hints"
import { microsToRubles } from "#shared/lib/money"

// Поля v5, приезжающие в микроединицах. Набор консервативный: только заведомо
// денежные ключи, иначе под конвертацию попали бы счётчики и ID.
// Аукционные добавлены 12.09.2026 вместе с get_keyword_auction: CompetitorsBids —
// массив голых чисел, поэтому ключ и обязан доходить до элементов.
// Value — ценность цели в PriorityGoals. Имя общее, поэтому оговорка: конвертируются
// только числа, а строковые Value (`Settings`: YES/NO) проход не проходят. Появится
// числовое неденежное Value — набор придётся переписать на пары «родитель + ключ».
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

// json-bigint отдаёт строкой только то, что не помещается в число (16+ знаков), поэтому
// короткие ID — кампании, группы, коды регионов — приезжают числами, и тип поля зависел бы
// от величины значения, а не от самого поля. Наружу ID уходит строкой всегда.
// Регистр значим: `Bid`, `ContextBid`, `AuctionBids` кончаются на `id`/`ids` строчными,
// и проверка без учёта регистра превратила бы ставки в строки.
const ID_KEYS = /Ids?$/

// Часть коллекций v5 приезжает обёрткой `{ Items: [...] }` — так устроены CounterIds,
// NegativeKeywordSharedSetIds и соседи. Своего имени у элементов нет, а `Items` про них
// ничего не говорит, поэтому через обёртку пронести надо имя родителя. Пробой 13.09.2026:
// `CounterIds: { Items: [...] }` иначе уезжает наружу числом, и тип ID зависит уже
// не от величины значения, а от формы обёртки.
const WRAPPER_KEY = "Items"

// Ключ передаётся вглубь массива: `RegionIds` — имя коллекции, а решение принимается
// по элементам, у которых своего имени нет.
function normalize(value: unknown, key: string, money: boolean): unknown {
  if (Array.isArray(value)) return value.map((item) => normalize(item, key, money))

  if (value && typeof value === "object") {
    const converted: Record<string, unknown> = {}
    for (const [nestedKey, nested] of Object.entries(value as Record<string, unknown>)) {
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

// Отказ по объекту начинается с этого знака в начале строки. По нему server ставит isError:
// хендлеры склеивают несколько ответов в один текст, и признак обязан пережить склейку.
// Тело ответа — JSON с отступами, строк с этим знаком в начале в нём не бывает.
const ITEM_ERROR_MARK = "❌"

function formatNotice(prefix: string, key: string, index: number, notification: Notification): string {
  const detail = notification.Details ? ` — ${notification.Details}` : ""
  const line = `${prefix} ${key}[${index}] [${notification.Code ?? "?"}] ${notification.Message ?? ""}${detail}`
  const hint = prefix === ITEM_ERROR_MARK ? getErrorHint(notification.Code) : undefined
  return hint ? `${line}\n   Что делать: ${hint}` : line
}

/** Есть ли в выводе инструмента отказ хотя бы по одному объекту. */
export const hasItemErrors = (output: string): boolean =>
  output.split("\n").some((line) => line.startsWith(ITEM_ERROR_MARK))

// Частичный успех Директ хранит в теле: per-item ошибки и предупреждения лежат
// в массивах *Results, обрезанная выборка — в LimitedBy. Без этой шапки модель
// увидела бы «успех» там, где половина элементов не прошла.
function collectNotices(data: unknown): string {
  const lines: string[] = []
  const result = (data as { result?: Record<string, unknown> })?.result
  if (!result || typeof result !== "object") return ""

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

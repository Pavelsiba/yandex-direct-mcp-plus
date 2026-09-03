// biome-ignore-all lint/plugin: слой вывода — ID сюда приходят уже строками из shared/api
// Единый формат ответа инструментов: деньги в рублях, сверху — уведомления Директа.
import { microsToRubles } from "#shared/lib/money"

// Поля v5, приезжающие в микроединицах. Набор консервативный: только заведомо
// денежные ключи, иначе под конвертацию попали бы счётчики и ID.
const MONEY_KEYS = new Set(["Amount", "Bid", "ContextBid", "WeeklySpendLimit", "BidCeiling"])

function convertMoney(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(convertMoney)

  if (value && typeof value === "object") {
    const converted: Record<string, unknown> = {}
    for (const [key, nested] of Object.entries(value as Record<string, unknown>)) {
      converted[key] = MONEY_KEYS.has(key) && typeof nested === "number" ? microsToRubles(nested) : convertMoney(nested)
    }
    return converted
  }

  return value
}

type Notification = {
  Code?: number
  Message?: string
  Details?: string
}

function formatNotice(prefix: string, key: string, index: number, notification: Notification): string {
  const detail = notification.Details ? ` — ${notification.Details}` : ""
  return `${prefix} ${key}[${index}] [${notification.Code ?? "?"}] ${notification.Message ?? ""}${detail}`
}

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
      for (const error of (item?.Errors ?? []) as Notification[]) lines.push(formatNotice("❌", key, index, error))
      for (const warning of (item?.Warnings ?? []) as Notification[]) lines.push(formatNotice("⚠️", key, index, warning))
    })
  }

  return lines.join("\n")
}

export function formatResult(data: unknown, opts: { money?: boolean } = {}): string {
  const payload = opts.money === false ? data : convertMoney(data)
  const notices = collectNotices(data)
  const body = JSON.stringify(payload, null, 2)
  return notices ? `${notices}\n\n${body}` : body
}

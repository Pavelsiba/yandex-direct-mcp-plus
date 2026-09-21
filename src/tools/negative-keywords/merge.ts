// Слияние минус-фраз для add и remove: Директ перезаписывает NegativeKeywords.Items целиком.

export type NegativeKeywordsMode = "replace" | "add" | "remove"

// Сравнение ровно как у Директа: строже — remove не найдёт фразу, слабее — add допишет
// дубль. Для него одинаковы регистр, ё/е, лишние пробелы и операторы «!» и «+» — «!» он
// ещё и приписывает сам, поэтому без этого фразу нельзя было бы удалить. Держит сетевой тест.
const normalize = (keyword: string): string =>
  keyword.toLowerCase().replaceAll("ё", "е").replaceAll(/[!+]/g, "").replaceAll(/\s+/g, " ").trim()

export function mergeNegativeKeywords(existing: string[], incoming: string[], mode: NegativeKeywordsMode): string[] {
  if (mode === "replace") return incoming

  const incomingKeys = new Set(incoming.map(normalize))
  if (mode === "remove") return existing.filter((keyword) => !incomingKeys.has(normalize(keyword)))

  // Написание сохранённых фраз не трогаем: при дубле Директ оставляет первое вхождение.
  const merged = [...existing]
  const seen = new Set(existing.map(normalize))

  for (const keyword of incoming) {
    const key = normalize(keyword)
    if (seen.has(key)) continue

    seen.add(key)
    merged.push(keyword.trim())
  }

  return merged
}

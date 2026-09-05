// Слияние минус-фраз для режимов add и remove. Директ перезаписывает
// NegativeKeywords.Items целиком, поэтому объединять обязан сценарий — а здесь это
// чистая функция, чтобы правило сравнения проверялось обычным тестом, а не двумя
// подменами fetch подряд.

export type NegativeKeywordsMode = "replace" | "add" | "remove"

// Сравнение без учёта регистра и краевых пробелов. Иначе remove «Бесплатно» не нашёл бы
// сохранённое «бесплатно» и вернул успех, ничего не удалив, — молчаливый отказ вместо
// молчаливого затирания. Пробой в песочнице, который подтвердил бы, нормализует ли фразы
// сам Директ, отложен: доступ к API не выдан (заявка 05.09.2026).
const normalize = (keyword: string): string => keyword.trim().toLowerCase()

export function mergeNegativeKeywords(existing: string[], incoming: string[], mode: NegativeKeywordsMode): string[] {
  if (mode === "replace") return incoming

  const incomingKeys = new Set(incoming.map(normalize))
  if (mode === "remove") return existing.filter((keyword) => !incomingKeys.has(normalize(keyword)))

  // add: написание и порядок уже сохранённых фраз не трогаем, новые дописываем в конец.
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

// Слияние минус-фраз для режимов add и remove. Директ перезаписывает
// NegativeKeywords.Items целиком, поэтому объединять обязан сценарий — а здесь это
// чистая функция, чтобы правило сравнения проверялось обычным тестом, а не двумя
// подменами fetch подряд.

export type NegativeKeywordsMode = "replace" | "add" | "remove"

// Сравнивать надо ровно так, как сравнивает Директ: строже — remove не найдёт фразу и
// вернёт успех, ничего не удалив; слабее — add допишет дубль, который Директ отбросит.
// Тождественны для него: регистр («СКИДКА» ≡ «скидка»), ё и е («дёшево» ≡ «дешево»),
// краевые и повторные пробелы («весло  двойное» ≡ «весло двойное»), операторы
// закрепления «!» и «+» («!стекло» ≡ «стекло», «+ремонт» ≡ «ремонт»).
//
// Смысл операторов описан в справке (keywords/symbols-and-operators): «+» и «!» фиксируют
// стоп-слова и словоформу. Чего в справке нет — что Директ приписывает «!» сам: присланное
// «своими руками» хранится как «!своими руками». Не игнорируй мы оператор, пользователь не
// смог бы удалить фразу, которую сам же и написал. Это и равенство пар выше подтверждены
// пробоем 05.09.2026 на кампании-полигоне; сетевой тест рядом держит их проверенными.
const normalize = (keyword: string): string =>
  keyword.toLowerCase().replaceAll("ё", "е").replaceAll(/[!+]/g, "").replaceAll(/\s+/g, " ").trim()

export function mergeNegativeKeywords(existing: string[], incoming: string[], mode: NegativeKeywordsMode): string[] {
  if (mode === "replace") return incoming

  const incomingKeys = new Set(incoming.map(normalize))
  if (mode === "remove") return existing.filter((keyword) => !incomingKeys.has(normalize(keyword)))

  // add: написание уже сохранённых фраз не трогаем, новые дописываем в конец. Порядок —
  // наш внутренний, наружу он не доживает: Директ хранит список отсортированным по
  // кодовым точкам и при схлопывании дубля оставляет написание первого вхождения.
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

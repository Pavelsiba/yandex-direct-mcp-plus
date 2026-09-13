import { readFileSync } from "node:fs"
import { describe, expect, it } from "vitest"
import { API_FIELDS } from "#shared/config/api-fields"

// Снимок разбирается здесь заново, а не импортом из scripts/: тест должен сверять
// сгенерированный файл с источником, а не с той же функцией, которая его писала.
function fieldEnumsFromSnapshot(markdown: string): Record<string, Record<string, string[]>> {
  const services: Record<string, Record<string, string[]>> = {}
  let service = ""
  let enumName = ""

  for (const line of markdown.split("\n")) {
    if (line.startsWith("## ")) {
      service = line.slice(3).trim()
      enumName = ""
    } else if (line.startsWith("### ")) {
      const name = line.slice(4).trim()
      enumName = name.endsWith("FieldEnum") ? name : ""
    } else if (enumName && line.startsWith("`")) {
      services[service] ??= {}
      services[service][enumName] = [...line.matchAll(/`([^`]+)`/g)].map((match) => match[1])
      enumName = ""
    }
  }

  return services
}

describe("API_FIELDS", () => {
  const snapshot = fieldEnumsFromSnapshot(readFileSync("docs/api-v5.md", "utf8"))

  it("повторяет снимок WSDL до последнего значения", () => {
    const generated = Object.fromEntries(
      Object.entries(API_FIELDS).map(([service, enums]) => [
        service,
        Object.fromEntries(Object.entries(enums).map(([name, values]) => [name, [...values]]))
      ])
    )

    expect(generated).toEqual(snapshot)
  })

  // Ради этого всё и затевалось: пробой 13.09.2026 Директ отбил CounterIds у смарт-кампаний
  // ошибкой 8000. Пока перечисления разные, компилятор ловит это до боевого вызова.
  it("различает счётчик смарт-кампании и остальных типов", () => {
    expect(API_FIELDS.campaigns.SmartCampaignFieldEnum).toContain("CounterId")
    expect(API_FIELDS.campaigns.SmartCampaignFieldEnum).not.toContain("CounterIds")
    expect(API_FIELDS.campaigns.TextCampaignFieldEnum).toContain("CounterIds")
  })
})

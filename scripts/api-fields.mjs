// Снимок WSDL → src/shared/config/api-fields.ts: наборы значений всех *FieldEnum.
//
// Зачем: FieldNames в v5 обязателен, «отдай всё» метода не существует, и проекцию до сих
// пор выбирали пятнадцать рукописных констант в хендлерах. Рукописный список расходится с
// API молча — Директ не ругается на усечённый набор, а имя, которого в перечислении нет,
// отбивает ошибкой 8000 уже на боевом вызове (проба 13.09.2026: CounterIds вместо
// CounterId у смарт-кампаний). Сгенерированный набор превращает и то, и другое в ошибку
// компиляции.
//
// Источник — docs/api-v5.md, а не сеть: снимок уже лежит в git, и генерация без запроса
// воспроизводима на любой машине. Порядок работ: npm run api:snapshot (сеть, обновляет
// снимок) → npm run api:fields (офлайн, обновляет константы).
//
// Запуск: npm run api:fields

import { execFileSync } from "node:child_process"
import { readFileSync, writeFileSync } from "node:fs"

const SNAPSHOT = "docs/api-v5.md"
const OUT = "src/shared/config/api-fields.ts"

// Имена *FieldEnum уникальны на весь снимок (проверено на 28 разделах), но раскладка по
// сервисам сохраняется: она показывает, у какого метода набор спрашивать.
function parseFieldEnums(markdown) {
  const services = {}
  let service = null
  let enumName = null

  for (const line of markdown.split("\n")) {
    const serviceMatch = line.match(/^## (.+)$/)
    if (serviceMatch) {
      service = serviceMatch[1]
      enumName = null
      continue
    }

    const enumMatch = line.match(/^### (\w+FieldEnum)$/)
    if (enumMatch) {
      enumName = enumMatch[1]
      continue
    }
    if (line.startsWith("### ")) {
      enumName = null
      continue
    }

    if (!enumName || !service || !line.startsWith("`")) continue

    const values = [...line.matchAll(/`([^`]+)`/g)].map((match) => match[1])
    if (values.length > 0) {
      services[service] ??= {}
      services[service][enumName] = values
    }
    enumName = null
  }

  return services
}

function render(services) {
  const lines = [
    "// СГЕНЕРИРОВАНО `npm run api:fields` из docs/api-v5.md. Руками не править —",
    "// перезапишется; расхождение с снимком ловит api-fields.unit.test.ts.",
    "//",
    "// Значения FieldNames для каждого метода v5. Хендлер берёт набор целиком",
    "// (`[...API_FIELDS.ads.AdFieldEnum]`) или объявляет подмножество типом",
    '// `FieldOf<"ads", "AdFieldEnum">[]` — тогда имя не из перечисления не компилируется.',
    "export const API_FIELDS = {"
  ]

  for (const [service, enums] of Object.entries(services)) {
    lines.push(`  "${service}": {`)
    for (const [name, values] of Object.entries(enums)) {
      lines.push(`    ${name}: [${values.map((value) => `"${value}"`).join(", ")}],`)
    }
    lines.push("  },")
  }

  lines.push(
    "} as const",
    "",
    "// Внутренний: наружу ходит только FieldOf — сервис задаётся его первым параметром.",
    "type ApiService = keyof typeof API_FIELDS",
    "",
    '// Значение одного перечисления: FieldOf<"campaigns", "CampaignFieldEnum">.',
    "export type FieldOf<S extends ApiService, E extends keyof (typeof API_FIELDS)[S]> =",
    "  (typeof API_FIELDS)[S][E] extends readonly (infer Value)[] ? Value : never",
    ""
  )

  return lines.join("\n")
}

const services = parseFieldEnums(readFileSync(SNAPSHOT, "utf8"))
const enumCount = Object.values(services).reduce((total, enums) => total + Object.keys(enums).length, 0)
const valueCount = Object.values(services).reduce(
  (total, enums) => total + Object.values(enums).reduce((sum, values) => sum + values.length, 0),
  0
)

writeFileSync(OUT, render(services), "utf8")
// Форматирование отдаём biome: иначе сгенерированный файл валит npm run lint. Бинарь
// зовём через node напрямую — npx под Windows требует shell, а это лишний слой цитирования.
execFileSync(process.execPath, ["node_modules/@biomejs/biome/bin/biome", "check", "--write", OUT], {
  stdio: "inherit"
})

console.error(`${OUT}: ${Object.keys(services).length} сервисов, ${enumCount} перечислений, ${valueCount} значений.`)

// Снимок API Директа v5 из WSDL → docs/api-v5.md.
//
// Зачем файл, а не чтение справочника по надобности: страницы документации отдают
// неполные списки (сверка 03.09.2026 дала для Ads.get два статуса вместо пяти), а WSDL —
// первоисточник и доступен без токена. Снимок в git превращает изменение на стороне
// Яндекса в обычный diff: пересобрал, посмотрел, что прибавилось.
//
// Запуск: npm run api:snapshot
//
// Разбор регулярками, а не XML-парсером, намеренно: нужны два узких среза — операции и
// перечисления, — и ради них тянуть зависимость в проект не стоит.

import { writeFileSync } from "node:fs"

// Проверено 05.09.2026: все 27 отдают WSDL с кодом 200, выдуманное имя — 404.
// Негативный контроль обязателен, иначе 200 ничего не доказывает.
const SERVICES = [
  "adextensions",
  "adgroups",
  "adimages",
  "ads",
  "agencyclients",
  "audiencetargets",
  "bidmodifiers",
  "bids",
  "businesses",
  "campaigns",
  "changes",
  "clients",
  "creatives",
  "dictionaries",
  "dynamictextadtargets",
  "feeds",
  "keywordbids",
  "keywords",
  "keywordsresearch",
  "leads",
  "negativekeywordsharedsets",
  "retargetinglists",
  "sitelinks",
  "smartadtargets",
  "strategies",
  "turbopages",
  "vcards"
]

const OUT = "docs/api-v5.md"

async function fetchWsdl(service) {
  const url = `https://api.direct.yandex.com/v5/${service}?wsdl`
  const response = await fetch(url)
  if (!response.ok) throw new Error(`${service}: HTTP ${response.status}`)
  return response.text()
}

function operations(wsdl) {
  const found = new Set()
  for (const match of wsdl.matchAll(/<wsdl:operation name="([^"]+)"/g)) found.add(match[1])
  return [...found].sort()
}

// Значения сортируются: Яндекс волен переставить их местами, и без сортировки такая
// перестановка выглядела бы в diff'е изменением API, которым не является.
function enumerations(wsdl) {
  const result = []
  for (const match of wsdl.matchAll(/<xsd:simpleType name="([^"]+)">([\s\S]*?)<\/xsd:simpleType>/g)) {
    const values = [...match[2].matchAll(/<xsd:enumeration value="([^"]*)"/g)].map((m) => m[1])
    if (values.length > 0) result.push({ name: match[1], values: values.sort() })
  }
  return result.sort((a, b) => a.name.localeCompare(b.name))
}

function renderService(service, wsdl) {
  const lines = [`## ${service}`, ""]
  const ops = operations(wsdl)
  lines.push(`Методы: ${ops.length ? ops.map((op) => `\`${op}\``).join(", ") : "—"}`, "")

  const enums = enumerations(wsdl)
  if (enums.length === 0) {
    lines.push("Перечислений нет.", "")
    return lines
  }

  for (const { name, values } of enums) {
    lines.push(`### ${name}`, "", values.map((value) => `\`${value}\``).join(", "), "")
  }
  return lines
}

const today = new Date().toISOString().slice(0, 10)
const header = [
  "# API Яндекс.Директа v5 — снимок WSDL",
  "",
  `Сгенерировано \`npm run api:snapshot\` ${today}. **Руками не править** — перезапишется.`,
  "",
  "Первоисточник допустимых значений: `xsd:enumeration` в WSDL сервиса, а не страницы",
  "справочника — те отдают неполные списки. WSDL доступен без токена:",
  '`curl -s "https://api.direct.yandex.com/v5/<service>?wsdl"`.',
  "",
  "Пересобирать перед тем, как заводить литерал в схеме, и когда Директ начал отклонять",
  "прежде рабочий вызов: `git diff` покажет, что Яндекс добавил или убрал.",
  "",
  "Значения внутри перечисления отсортированы, чтобы перестановка на стороне Яндекса не",
  "выглядела изменением API.",
  ""
]

const body = []
let enumCount = 0

for (const service of SERVICES) {
  const wsdl = await fetchWsdl(service)
  const rendered = renderService(service, wsdl)
  enumCount += enumerations(wsdl).length
  body.push(...rendered)
  console.error(`✔ ${service}`)
}

header.splice(4, 0, `Сервисов: ${SERVICES.length}. Перечислений: ${enumCount}.`, "")
writeFileSync(OUT, `${header.join("\n")}\n${body.join("\n")}`, "utf8")
console.error(`\n${OUT}: ${SERVICES.length} сервисов, ${enumCount} перечислений.`)

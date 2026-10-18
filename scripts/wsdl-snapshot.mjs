// Снимок API Директа v5 из WSDL → docs/api-v5.md.
//
// Зачем файл, а не чтение справочника по надобности: страницы документации отдают
// неполные списки (сверка 03.09.2026 дала для Ads.get два статуса вместо пяти), а WSDL —
// первоисточник и доступен без токена. Снимок в git превращает изменение на стороне
// Яндекса в обычный diff: пересобрал, посмотрел, что прибавилось.
//
// Запуск: npm run api:snapshot
//
// Разбор регулярками, а не XML-парсером, намеренно: нужны узкие срезы — операции,
// перечисления и имена полей xsd:long, — и ради них тянуть зависимость в проект не стоит.

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

// Общие типы, которые импортирует каждый сервис: GenderEnum, AgeRangeEnum, SerpLayoutEnum,
// IncomeGradeEnum и прочее живут только здесь. Без этой схемы литералы, собранные из общих
// перечислений, не с чем сверить: в WSDL сервиса их нет, и drift Яндекса diff не покажет.
const GENERAL_XSD = "https://soap.direct.yandex.ru/v5/general.xsd"

// У ReportService нет WSDL: спецификация отчёта описана отдельной схемой, и только в ней
// лежат типы отчётов и имена полей FieldNames.
const REPORTS_XSD = "https://api.direct.yandex.com/v5/reports.xsd"

const OUT = "docs/api-v5.md"

async function fetchXml(url, label) {
  const response = await fetch(url)
  // Балансировщик Директа при недоступности отвечает 204 без тела, а 204 для fetch — ok:
  // без этой проверки пустой ответ ушёл бы в снимок как «у сервиса ничего нет».
  if (response.status !== 200) throw new Error(`${label}: HTTP ${response.status}`)
  const xml = await response.text()
  if (!xml.includes("<xsd:schema")) throw new Error(`${label}: в ответе нет XML-схемы`)
  return xml
}

const fetchWsdl = (service) => fetchXml(`https://api.direct.yandex.com/v5/${service}?wsdl`, service)

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

// Деньги в v5 — xsd:long в микроединицах, но тем же типом идут ID и счётчики. Список имён
// держит format.unit.test.ts: каждое должно быть явно отнесено к деньгам или не-деньгам,
// иначе новое денежное поле уйдёт наружу микроединицами.
function longFields(xml) {
  const found = new Set()
  for (const match of xml.matchAll(/<xsd:element\b[^>]*>/g)) {
    const name = match[0].match(/\bname="([^"]+)"/)?.[1]
    if (name && /\btype="xsd:long"/.test(match[0])) found.add(name)
  }
  return [...found].sort()
}

function renderLongFields(xml) {
  const names = longFields(xml)
  return names.length ? ["### Поля xsd:long", "", names.map((name) => `\`${name}\``).join(", "), ""] : []
}

function renderService(service, wsdl) {
  const lines = [`## ${service}`, ""]
  const ops = operations(wsdl)
  lines.push(`Методы: ${ops.length ? ops.map((op) => `\`${op}\``).join(", ") : "—"}`, "")

  const enums = enumerations(wsdl)
  if (enums.length === 0) lines.push("Перечислений нет.", "")

  for (const { name, values } of enums) {
    lines.push(`### ${name}`, "", values.map((value) => `\`${value}\``).join(", "), "")
  }
  lines.push(...renderLongFields(wsdl))
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
  "За сервисами идёт `reports.xsd` — спецификация отчёта ReportService, у которого нет WSDL.",
  "",
  "Последним разделом идёт `general.xsd` — общие типы, импортируемые всеми сервисами.",
  "Перечисления оттуда (пол, возраст, платёжеспособность, раскладка выдачи) в WSDL",
  "самих сервисов не встречаются, но именно на них стоят литералы в схемах.",
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
  if (operations(wsdl).length === 0) throw new Error(`${service}: в WSDL нет ни одного метода`)
  const rendered = renderService(service, wsdl)
  enumCount += enumerations(wsdl).length
  body.push(...rendered)
  console.error(`✔ ${service}`)
}

const reports = await fetchXml(REPORTS_XSD, "reports.xsd")
const reportEnums = enumerations(reports)
if (reportEnums.length === 0) throw new Error("reports.xsd: ни одного перечисления")
enumCount += reportEnums.length
body.push("## reports", "", "Схема спецификации отчёта (`reports.xsd`), WSDL у сервиса нет.", "")
for (const { name, values } of reportEnums) {
  body.push(`### ${name}`, "", values.map((value) => `\`${value}\``).join(", "), "")
}
console.error("✔ reports.xsd")

const general = await fetchXml(GENERAL_XSD, "general.xsd")
const generalEnums = enumerations(general)
if (generalEnums.length === 0) throw new Error("general.xsd: ни одного перечисления")
enumCount += generalEnums.length
body.push("## general.xsd", "", "Общие типы, импортируемые всеми сервисами. Методов нет.", "")
for (const { name, values } of generalEnums) {
  body.push(`### ${name}`, "", values.map((value) => `\`${value}\``).join(", "), "")
}
body.push(...renderLongFields(general))
console.error("✔ general.xsd")

header.splice(
  4,
  0,
  `Сервисов: ${SERVICES.length} плюс \`reports.xsd\` и общий \`general.xsd\`. Перечислений: ${enumCount}.`,
  ""
)
writeFileSync(OUT, `${header.join("\n")}\n${body.join("\n")}`, "utf8")
console.error(`\n${OUT}: ${SERVICES.length} сервисов + reports.xsd + general.xsd, ${enumCount} перечислений.`)

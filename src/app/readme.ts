// Таблицы инструментов для README: собираются из реестра, а не пишутся руками. Рукописная
// таблица расходится с описанием дескриптора при первой же его правке, и заметить это
// некому. Пишет README скрипт npm run docs:tools, расхождение ловит readme.unit.test.ts.
import type { ToolGroup } from "#app/registry"

const START = "<!-- tools:start — генерируется npm run docs:tools, руками не править -->"
const END = "<!-- tools:end -->"

// В таблицу идёт первое предложение: остальное — инструкции для модели, читателю README
// они не нужны. Предложение обрывает точка с пробелом вне скобок: ни «Яндекс.Директ», ни
// «(см. get_regions)» его не заканчивают.
function summary(description: string): string {
  let depth = 0
  let end = description.length
  for (let i = 0; i < description.length; i++) {
    const char = description[i]
    if (char === "(") depth++
    else if (char === ")") depth = Math.max(0, depth - 1)
    else if (char === "." && depth === 0 && /\s/.test(description[i + 1] ?? "")) {
      end = i + 1
      break
    }
  }
  return description.slice(0, end).replaceAll("|", "\\|")
}

function renderGroup(group: ToolGroup): string {
  const rows = group.tools.map((tool) => `| \`${tool.name}\` | ${summary(tool.description)} |`)
  return [`**${group.title}**`, "", "| Инструмент | Описание |", "| ------------ | ---------- |", ...rows].join("\n")
}

export function renderToolTables(groups: readonly ToolGroup[]): string {
  return groups.map(renderGroup).join("\n\n")
}

// Заменяет блок между маркерами и возвращает README целиком. Без маркеров — ошибка, а не
// дописывание в конец: потерянный маркер значит, что README правили руками.
export function replaceToolTables(readme: string, groups: readonly ToolGroup[]): string {
  const start = readme.indexOf(START)
  const end = readme.indexOf(END)
  if (start === -1 || end === -1 || end < start) {
    throw new Error(`В README нет маркеров таблицы инструментов: ${START} … ${END}`)
  }
  return `${readme.slice(0, start + START.length)}\n\n${renderToolTables(groups)}\n\n${readme.slice(end)}`
}

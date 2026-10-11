// Реестр инструментов → таблицы в README.md (блок между маркерами tools:start/tools:end).
//
// Реестр — TypeScript с subpath imports, поэтому скрипт идёт через tsx с условием
// development: без него #app/* резолвится в dist/ и таблицы собрались бы по прошлой сборке.
//
// Запуск: npm run docs:tools

import { readFileSync, writeFileSync } from "node:fs"
import { replaceToolTables } from "#app/readme"
import { toolGroups } from "#app/registry"

const README = "README.md"

const before = readFileSync(README, "utf8")
const after = replaceToolTables(before, toolGroups)

if (after === before) {
  console.log(`${README}: таблицы инструментов актуальны`)
} else {
  writeFileSync(README, after)
  console.log(`${README}: таблицы инструментов обновлены`)
}

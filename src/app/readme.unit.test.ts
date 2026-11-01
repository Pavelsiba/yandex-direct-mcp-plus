import { readFileSync } from "node:fs"
import { describe, expect, it } from "vitest"
import { z } from "zod"
import { renderToolTables, replaceToolTables } from "#app/readme"
import { toolGroups } from "#app/registry"
import { defineTool, READ } from "#shared/lib/tool"

const stub = (name: string, description: string) =>
  defineTool({ name, title: name, description, annotations: READ, schema: z.object({}), handler: async () => "" })

describe("таблицы инструментов в README", () => {
  it("совпадают с реестром — иначе npm run docs:tools", () => {
    const readme = readFileSync("README.md", "utf8")

    expect(replaceToolTables(readme, toolGroups)).toBe(readme)
  })

  it("берут первое предложение описания и экранируют вертикальную черту", () => {
    const table = renderToolTables([
      {
        title: "Проба",
        tools: [stub("probe", "Отбор по Яндекс.Директ (см. get_regions): a|b. Дальше — инструкции для модели.")]
      }
    ])

    expect(table).toBe(
      [
        "**Проба**",
        "",
        "| Инструмент | Описание |",
        "| ------------ | ---------- |",
        "| `probe` | Отбор по Яндекс.Директ (см. get_regions): a\\|b. |"
      ].join("\n")
    )
  })

  it("без маркеров падает, а не дописывает таблицу в конец", () => {
    expect(() => replaceToolTables("# README\n", toolGroups)).toThrow(/маркеров/)
  })
})

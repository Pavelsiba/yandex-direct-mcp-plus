import { describe, expect, it } from "vitest"
import { z } from "zod"
import { tools } from "#app/registry"

const ID_FIELD = /_ids?$/

// Схема поля ID, построенная через idField: строка с regex на десятичное число.
function isIdField(schema: z.ZodType): boolean {
  const json = z.toJSONSchema(schema, { io: "input", unrepresentable: "any" }) as {
    type?: string
    pattern?: string
    items?: { type?: string; pattern?: string }
  }
  const target = json.type === "array" ? json.items : json
  return target?.type === "string" && target?.pattern === "^[1-9]\\d*$"
}

describe("реестр инструментов", () => {
  it("не содержит инструментов с одинаковыми именами", () => {
    const names = tools.map((tool) => tool.name)

    expect(new Set(names).size).toBe(names.length)
  })

  it("даёт каждому инструменту описание и аннотацию", () => {
    for (const tool of tools) {
      expect(tool.description, tool.name).toBeTruthy()
      expect(tool.annotations, tool.name).toBeTruthy()
    }
  })

  // Проверяется JSON Schema, а не meta(): у поля с .optional() метаданные лежат
  // на внутреннем типе, и модель видит именно то, что попало в inputSchema.
  it("описывает каждое поле схемы — другой документации у модели нет", () => {
    const undocumented: string[] = []

    for (const tool of tools) {
      const json = z.toJSONSchema(tool.schema, { io: "input", unrepresentable: "any" }) as {
        properties?: Record<string, { description?: string }>
      }
      for (const [field, property] of Object.entries(json.properties ?? {})) {
        if (!property.description) undocumented.push(`${tool.name}.${field}`)
      }
    }

    expect(undocumented).toEqual([])
  })

  // Ради этой проверки реестр и заводился: новый инструмент, объявивший ID строкой
  // без idField, роняет сборку в день появления, а не через полгода на живом аккаунте.
  it("строит каждое поле *_id и *_ids через idField", () => {
    const wrong: string[] = []

    for (const tool of tools) {
      for (const [field, schema] of Object.entries(tool.schema.shape)) {
        if (!ID_FIELD.test(field)) continue
        if (!isIdField(schema as z.ZodType)) wrong.push(`${tool.name}.${field}`)
      }
    }

    expect(wrong).toEqual([])
  })

  it("не пропускает 19-значный ID числом ни в одном инструменте", () => {
    const accepted: string[] = []

    for (const tool of tools) {
      for (const [field, schema] of Object.entries(tool.schema.shape)) {
        if (!ID_FIELD.test(field)) continue

        // biome-ignore lint/correctness/noPrecisionLoss: округление здесь и проверяется
        const value = field.endsWith("s") ? [1915016273214320641] : 1915016273214320641
        if ((schema as z.ZodType).safeParse(value).success) accepted.push(`${tool.name}.${field}`)
      }
    }

    expect(accepted).toEqual([])
  })
})

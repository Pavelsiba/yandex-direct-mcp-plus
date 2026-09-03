import { describe, expect, it } from "vitest"
import { z } from "zod"
import { buildPage, pageFields } from "#shared/lib/pagination"

describe("buildPage", () => {
  it("не строит Page, когда пагинация не запрошена", () => {
    expect(buildPage({})).toBeUndefined()
  })

  it("строит Page из limit и offset по отдельности", () => {
    expect(buildPage({ limit: 50 })).toEqual({ Limit: 50 })
    expect(buildPage({ offset: 100 })).toEqual({ Offset: 100 })
    expect(buildPage({ limit: 50, offset: 100 })).toEqual({ Limit: 50, Offset: 100 })
  })
})

describe("pageFields", () => {
  const schema = z.object(pageFields)

  it("не пропускает limit больше десяти тысяч", () => {
    expect(schema.safeParse({ limit: 10_001 }).success).toBe(false)
    expect(schema.safeParse({ limit: 10_000 }).success).toBe(true)
  })

  it("не пропускает дробный или отрицательный offset", () => {
    expect(schema.safeParse({ offset: -1 }).success).toBe(false)
    expect(schema.safeParse({ offset: 1.5 }).success).toBe(false)
    expect(schema.safeParse({ offset: 0 }).success).toBe(true)
  })
})

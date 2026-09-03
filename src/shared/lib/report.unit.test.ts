import { describe, expect, it } from "vitest"
import { reportName } from "#shared/lib/report"

describe("reportName", () => {
  // Часы приходят параметром — иначе хендлер отчёта был бы непроверяемым.
  it("собирает имя из префикса и момента времени", () => {
    expect(reportName("report", () => 1_700_000_000_000)).toBe("report_1700000000000")
  })

  it("даёт разные имена для разных моментов", () => {
    expect(reportName("report", () => 1)).not.toBe(reportName("report", () => 2))
  })
})

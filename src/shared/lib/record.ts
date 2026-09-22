// Сужение unknown до объекта с проверкой вместо приведения `as Record<string, unknown>`.
export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value)
}

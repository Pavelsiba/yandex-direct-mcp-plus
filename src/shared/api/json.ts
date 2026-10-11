// biome-ignore-all lint/plugin: единственное место в проекте, где вызывается разбор JSON
// 19-значные ID родной JSON.parse без reviver молча округляет в чужой, но валидный ID.
// Reviver берёт такие числа из исходного текста строкой. Разбор JSON — только здесь,
// держит GritQL-плагин Biome.

// Третий аргумент reviver (source text access) и JSON.rawJSON есть в V8 с 11.4, а в lib
// ES2023 их нет.
type ReviverContext = { source?: string }
const { rawJSON } = JSON as JSON & { rawJSON(text: string): unknown }

function keepUnsafeIntegers(_key: string, value: unknown, context?: ReviverContext): unknown {
  // Сначала isInteger: дробное значение небезопасным целым не считается и остаётся числом.
  if (typeof value === "number" && Number.isInteger(value) && !Number.isSafeInteger(value)) {
    return context?.source ?? value
  }
  return value
}

function writeBigInts(_key: string, value: unknown): unknown {
  return typeof value === "bigint" ? rawJSON(value.toString()) : value
}

export function parseJson(text: string): unknown {
  return JSON.parse(text, keepUnsafeIntegers)
}

export function stringifyJson(value: unknown, indent?: number): string {
  return JSON.stringify(value, writeBigInts, indent)
}

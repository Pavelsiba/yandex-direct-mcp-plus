// biome-ignore-all lint/plugin: единственное место в проекте, где вызывается разбор JSON
// ID Директа — 64-битные целые, в живых аккаунтах 19-значные. Родной JSON.parse молча
// округляет их до 2^53−1, превращая ID в валидное число, указывающее на другой объект.
// storeAsString отдаёт большие числа строками; сериализация принимает BigInt.
// Разбор и сериализация JSON живут только здесь — держит GritQL-плагин Biome.
import JSONbigFactory from "json-bigint"

const JSONbig = JSONbigFactory({ storeAsString: true })

export function parseJson(text: string): unknown {
  return JSONbig.parse(text)
}

export function stringifyJson(value: unknown): string {
  return JSONbig.stringify(value)
}

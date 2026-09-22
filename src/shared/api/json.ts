// biome-ignore-all lint/plugin: единственное место в проекте, где вызывается разбор JSON
// 19-значные ID родной JSON.parse молча округляет в чужой, но валидный ID; storeAsString
// отдаёт их строками. Разбор JSON — только здесь, держит GritQL-плагин Biome.
import JSONbigFactory from "json-bigint"

const JSONbig = JSONbigFactory({ storeAsString: true })

export function parseJson(text: string): unknown {
  return JSONbig.parse(text)
}

export function stringifyJson(value: unknown, indent?: number): string {
  return JSONbig.stringify(value, null, indent)
}

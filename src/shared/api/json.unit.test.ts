import { describe, expect, it } from "vitest"
import { parseJson, stringifyJson } from "#shared/api/json"

describe("parseJson", () => {
  it("отдаёт 19-значное целое строкой из исходного текста", () => {
    expect(parseJson('{"Id":1915016273214320641}')).toEqual({ Id: "1915016273214320641" })
  })

  it("отдаёт отрицательное небезопасное целое строкой", () => {
    expect(parseJson("[-9007199254740993]")).toEqual(["-9007199254740993"])
  })

  it("оставляет безопасные целые и дроби числами", () => {
    expect(parseJson('{"Id":123,"Bid":12.5,"Max":9007199254740991,"Ctr":0.1234567890123456}')).toEqual({
      Id: 123,
      Bid: 12.5,
      Max: 9007199254740991,
      Ctr: 0.1234567890123456
    })
  })

  it("бросает настоящий SyntaxError на теле, которое не JSON", () => {
    expect(() => parseJson("<html>")).toThrow(SyntaxError)
  })
})

describe("stringifyJson", () => {
  it("пишет BigInt числом без кавычек и без потери точности", () => {
    expect(stringifyJson({ Ids: [BigInt("1915016273214320641")] })).toBe('{"Ids":[1915016273214320641]}')
  })

  it("форматирует с отступом", () => {
    expect(stringifyJson({ Id: BigInt(1) }, 2)).toBe('{\n  "Id": 1\n}')
  })
})

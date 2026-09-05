import { describe, expect, it } from "vitest"
import { mergeNegativeKeywords } from "./merge.js"

describe("mergeNegativeKeywords", () => {
  describe("replace", () => {
    it("отдаёт входящий список как есть, не заглядывая в существующий", () => {
      expect(mergeNegativeKeywords(["бесплатно", "отзывы"], ["дёшево"], "replace")).toEqual(["дёшево"])
    })

    it("пустым списком очищает", () => {
      expect(mergeNegativeKeywords(["бесплатно"], [], "replace")).toEqual([])
    })
  })

  describe("add", () => {
    it("дописывает новые фразы в конец, сохраняя порядок существующих", () => {
      expect(mergeNegativeKeywords(["бесплатно", "отзывы"], ["дёшево", "б/у"], "add")).toEqual([
        "бесплатно",
        "отзывы",
        "дёшево",
        "б/у"
      ])
    })

    it("не плодит дубль при другом регистре и сохраняет прежнее написание", () => {
      expect(mergeNegativeKeywords(["бесплатно"], ["Бесплатно"], "add")).toEqual(["бесплатно"])
    })

    it("схлопывает дубли внутри входящего списка", () => {
      expect(mergeNegativeKeywords([], ["дёшево", "ДЁШЕВО", " дёшево "], "add")).toEqual(["дёшево"])
    })

    it("обрезает краевые пробелы у добавляемой фразы", () => {
      expect(mergeNegativeKeywords(["бесплатно"], ["  дёшево  "], "add")).toEqual(["бесплатно", "дёшево"])
    })

    it("на пустом входящем списке оставляет существующий нетронутым", () => {
      expect(mergeNegativeKeywords(["бесплатно", "отзывы"], [], "add")).toEqual(["бесплатно", "отзывы"])
    })

    it("идемпотентен: повторное добавление тех же фраз ничего не меняет", () => {
      const once = mergeNegativeKeywords(["бесплатно"], ["дёшево"], "add")
      expect(mergeNegativeKeywords(once, ["дёшево"], "add")).toEqual(once)
    })
  })

  describe("remove", () => {
    it("убирает названные фразы, остальные оставляет в прежнем порядке", () => {
      expect(mergeNegativeKeywords(["бесплатно", "отзывы", "дёшево"], ["отзывы"], "remove")).toEqual([
        "бесплатно",
        "дёшево"
      ])
    })

    it("находит фразу независимо от регистра и краевых пробелов", () => {
      expect(mergeNegativeKeywords(["Бесплатно", "отзывы"], ["  бесплатно "], "remove")).toEqual(["отзывы"])
    })

    it("молча пропускает фразу, которой в списке нет", () => {
      expect(mergeNegativeKeywords(["бесплатно"], ["дёшево"], "remove")).toEqual(["бесплатно"])
    })

    it("удалением всех фраз очищает список", () => {
      expect(mergeNegativeKeywords(["бесплатно", "отзывы"], ["отзывы", "бесплатно"], "remove")).toEqual([])
    })

    it("идемпотентен: повторное удаление тех же фраз ничего не меняет", () => {
      const once = mergeNegativeKeywords(["бесплатно", "отзывы"], ["отзывы"], "remove")
      expect(mergeNegativeKeywords(once, ["отзывы"], "remove")).toEqual(once)
    })
  })
})

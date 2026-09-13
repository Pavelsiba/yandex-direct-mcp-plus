import { describe, expect, it } from "vitest"
import { mergePriorityGoals, type PriorityGoal } from "./priority-goals.js"

const order: PriorityGoal = { goalId: "601000001", value: 200_000_000, isMetrikaSourceOfValue: "NO" }
const telegram: PriorityGoal = { goalId: "601000002", value: 100_000_000, isMetrikaSourceOfValue: "NO" }
const phone: PriorityGoal = { goalId: "601000003", value: 150_000_000 }

describe("mergePriorityGoals", () => {
  describe("replace", () => {
    it("отдаёт входящий список, не заглядывая в существующий", () => {
      expect(mergePriorityGoals([order, telegram], [phone], "replace")).toEqual([phone])
    })

    it("схлопывает повтор цели, оставляя последнюю ценность", () => {
      const cheaper = { goalId: phone.goalId, value: 50_000_000 }
      expect(mergePriorityGoals([], [phone, cheaper], "replace")).toEqual([cheaper])
    })
  })

  describe("add", () => {
    it("дописывает новую цель в конец, сохраняя порядок существующих", () => {
      expect(mergePriorityGoals([order, telegram], [phone], "add")).toEqual([order, telegram, phone])
    })

    it("у заданной цели меняет ценность и сохраняет признак источника ценности", () => {
      expect(mergePriorityGoals([order, telegram], [{ goalId: order.goalId, value: 300_000_000 }], "add")).toEqual([
        { goalId: order.goalId, value: 300_000_000, isMetrikaSourceOfValue: "NO" },
        telegram
      ])
    })

    it("не плодит дубль, когда цель повторяется во входящем списке", () => {
      expect(mergePriorityGoals([order], [phone, phone], "add")).toEqual([order, phone])
    })

    it("идемпотентен: повторное добавление той же цели ничего не меняет", () => {
      const once = mergePriorityGoals([order], [phone], "add")
      expect(mergePriorityGoals(once, [phone], "add")).toEqual(once)
    })
  })

  describe("remove", () => {
    it("убирает названные цели, остальные оставляет в прежнем порядке", () => {
      expect(mergePriorityGoals([order, telegram, phone], [telegram], "remove")).toEqual([order, phone])
    })

    it("молча пропускает цель, которой в списке нет", () => {
      expect(mergePriorityGoals([order], [phone], "remove")).toEqual([order])
    })

    it("убрав последнюю цель, отдаёт пустой список", () => {
      expect(mergePriorityGoals([order], [order], "remove")).toEqual([])
    })
  })
})

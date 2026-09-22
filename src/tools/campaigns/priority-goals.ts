// Слияние целей стратегии для add и remove: Директ перезаписывает PriorityGoals.Items целиком.

export type PriorityGoalsMode = "replace" | "add" | "remove"

export type PriorityGoal = {
  goalId: string
  // Микроединицы.
  value: number
  isMetrikaSourceOfValue?: string
}

export function mergePriorityGoals(
  existing: PriorityGoal[],
  incoming: PriorityGoal[],
  mode: PriorityGoalsMode
): PriorityGoal[] {
  // Дубль GoalId Директ отбил бы — выигрывает последняя ценность.
  const incomingById = new Map(incoming.map((goal) => [goal.goalId, goal]))

  if (mode === "replace") return [...incomingById.values()]
  if (mode === "remove") return existing.filter((goal) => !incomingById.has(goal.goalId))

  // add — upsert: у заданной цели меняется только ценность, признак источника остаётся.
  const merged = existing.map((goal) => {
    const update = incomingById.get(goal.goalId)
    return update ? { ...goal, value: update.value } : goal
  })
  const existingIds = new Set(existing.map((goal) => goal.goalId))
  for (const goal of incomingById.values()) {
    if (!existingIds.has(goal.goalId)) merged.push(goal)
  }

  return merged
}

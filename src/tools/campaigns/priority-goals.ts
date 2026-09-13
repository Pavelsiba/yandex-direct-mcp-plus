// Слияние целей стратегии для режимов add и remove. Директ перезаписывает
// PriorityGoals.Items целиком, поэтому объединять обязан сценарий — а здесь это чистая
// функция, чтобы правило слияния проверялось обычным тестом, а не двумя подменами fetch.

export type PriorityGoalsMode = "replace" | "add" | "remove"

export type PriorityGoal = {
  goalId: string
  // Микроединицы: вход уже сконвертировала схема, текущие цели такими приходят из API.
  value: number
  isMetrikaSourceOfValue?: string
}

export function mergePriorityGoals(
  existing: PriorityGoal[],
  incoming: PriorityGoal[],
  mode: PriorityGoalsMode
): PriorityGoal[] {
  // Повтор одной цели во входящем списке схлопывается, выигрывает последняя ценность:
  // два элемента с одним GoalId Директ принял бы за противоречие, а не за уточнение.
  const incomingById = new Map(incoming.map((goal) => [goal.goalId, goal]))

  if (mode === "replace") return [...incomingById.values()]
  if (mode === "remove") return existing.filter((goal) => !incomingById.has(goal.goalId))

  // add — это upsert: у уже заданной цели меняется только ценность, признак источника
  // ценности остаётся прежним. Новые цели дописываются в конец.
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

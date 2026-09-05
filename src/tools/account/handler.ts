// Сумма на общем счёте есть только в Live API v4 (AccountManagement.Get). В v5 финансы
// per-кампания (Campaigns.get, поле Funds) и per-клиент (Bonuses, OverdraftSumAvailable),
// баланса счёта среди них нет — сверено с WSDL 05.09.2026.
import type { z } from "zod"
import { apiV4 } from "#shared/api/v4"
import { getClientLogin } from "#shared/config/env"
import { formatResult } from "#shared/lib/format"
import type { getAccountBalanceSchema } from "./schema.js"

export async function handleGetAccountBalance(params: z.infer<typeof getAccountBalanceSchema>): Promise<string> {
  const param: Record<string, unknown> = { Action: "Get" }

  const clientLogin = getClientLogin()
  const logins = params.logins ?? (clientLogin ? [clientLogin] : undefined)
  if (logins?.length) param.SelectionCriteria = { Logins: logins }

  // money: false — v4 отдаёт Amount уже в валюте аккаунта, микроединиц здесь нет.
  return formatResult(await apiV4("AccountManagement", param), { money: false })
}

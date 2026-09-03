import { defineTool, READ } from "#shared/lib/tool"
import { handleGetAccountBalance } from "./handler.js"
import { getAccountBalanceSchema } from "./schema.js"

export const getAccountBalanceTool = defineTool({
  name: "get_account_balance",
  title: "Баланс аккаунта",
  description: "Баланс и финансовая информация аккаунта (Amount, Currency) через Live API v4.",
  annotations: READ,
  schema: getAccountBalanceSchema,
  handler: handleGetAccountBalance
})

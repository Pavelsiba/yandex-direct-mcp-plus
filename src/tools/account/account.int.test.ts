// Сетевой smoke Live v4 AccountManagement: у v4 нет FieldNames и снимка WSDL, поэтому форма
// ответа — рукописной strict-схемой; новый ключ Директа валит тест, а не теряется молча.
import { describe, expect, it } from "vitest"
import { z } from "zod"
import { CONFIGURED, parseOutput } from "#testing/smoke"
import { handleGetAccountBalance } from "./handler.js"

// Сумма в валюте аккаунта, а не в микроединицах: v4 присылает её десятичной строкой.
const amount = z.string().regex(/^-?\d+(\.\d{1,2})?$/)

const accountSchema = z.strictObject({
  AccountID: z.number(),
  Login: z.string(),
  Amount: amount,
  AmountAvailableForTransfer: amount,
  Currency: z.string(),
  AccountDayBudget: z.unknown(),
  AgencyName: z.string().nullable(),
  EmailNotification: z.strictObject({
    Email: z.string(),
    MoneyWarningValue: z.number(),
    PausedByDayBudget: z.string()
  }),
  SmsNotification: z.strictObject({
    MoneyInSms: z.string(),
    MoneyOutSms: z.string(),
    PausedByDayBudgetSms: z.string(),
    SmsTimeFrom: z.string(),
    SmsTimeTo: z.string()
  })
})

const responseSchema = z.strictObject({
  data: z.strictObject({ Accounts: z.array(accountSchema).min(1), ActionsResult: z.array(z.unknown()) })
})

describe.skipIf(!CONFIGURED)("smoke account", () => {
  it("баланс общего счёта: форма ответа v4 и сумма в валюте, а не в микроединицах", async () => {
    const output = parseOutput(await handleGetAccountBalance({}))

    const parsed = responseSchema.safeParse(output)
    expect(parsed.success, parsed.error && z.prettifyError(parsed.error)).toBe(true)
  })
})

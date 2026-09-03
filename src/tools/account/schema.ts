import { z } from "zod"

export const getAccountBalanceSchema = z.object({
  logins: z
    .array(z.string().min(1, { error: "Логин не может быть пустым" }))
    .optional()
    .meta({ description: "Логины аккаунтов для агентского токена; по умолчанию — аккаунт самого токена" })
})

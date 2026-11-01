import { z } from "zod"

export const startLoginSchema = z.object({})

export const finishLoginSchema = z.object({
  code: z
    .string()
    .trim()
    .check(z.minLength(1, { error: "Код пуст" }))
    .meta({
      description:
        "Код подтверждения, который Яндекс показал пользователю после входа по ссылке из start_login. Одноразовый, живёт около 10 минут"
    })
})

export const authStatusSchema = z.object({})

export const logoutSchema = z.object({})

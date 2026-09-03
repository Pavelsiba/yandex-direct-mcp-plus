// API Директа оперирует микроединицами (сумма в валюте × 1 000 000).
// Наружу сервер отдаёт и принимает рубли: вход конвертирует схема, выход — format.
import { z } from "zod"

export function rublesToMicros(rubles: number): number {
  return Math.round(rubles * 1_000_000)
}

export function microsToRubles(micros: number): number {
  return micros / 1_000_000
}

// Денежное поле схемы: наружу рубли, в хендлер приезжают уже микроединицы.
// Все суммы объявляются через него — иначе конвертация расползётся по хендлерам
// и рано или поздно случится дважды.
// allowZero нужен ставкам, где ноль — осмысленное значение «не задана».
export function rublesField(description: string, opts: { allowZero?: boolean } = {}) {
  const amount = opts.allowZero
    ? z
        .number({ error: "Сумма указывается числом в рублях" })
        .nonnegative({ error: "Сумма не может быть отрицательной" })
    : z.number({ error: "Сумма указывается числом в рублях" }).positive({ error: "Сумма должна быть больше нуля" })

  return amount.transform(rublesToMicros).meta({ description })
}

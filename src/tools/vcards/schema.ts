import { z } from "zod"
import { MAX_CAMPAIGNS_PER_ADJUSTMENT_CALL, MAX_IDS_PER_CALL } from "#shared/config/limits"
import { idField } from "#shared/lib/id"
import { pageFields } from "#shared/lib/pagination"

export const listVcardsSchema = z.object({
  vcard_ids: z
    .array(idField("ID визитки"))
    .max(MAX_IDS_PER_CALL, { error: `За один вызов допустимо не больше ${MAX_IDS_PER_CALL} визиток` })
    .optional()
    .meta({ description: "Конкретные визитки по их ID" }),
  campaign_ids: z
    .array(idField("ID кампании"))
    .max(MAX_CAMPAIGNS_PER_ADJUSTMENT_CALL, {
      error: `За один вызов допустимо не больше ${MAX_CAMPAIGNS_PER_ADJUSTMENT_CALL} кампаний`
    })
    .optional()
    .meta({ description: "Найти визитки, привязанные к объявлениям этих кампаний" }),
  ...pageFields
})

export const addVcardSchema = z.object({
  campaign_id: idField("ID кампании, к которой привязывается визитка"),
  country: z.string().min(1, { error: "Страна обязательна" }).meta({ description: "Страна, например «Россия»" }),
  city: z.string().min(1, { error: "Город обязателен" }).meta({ description: "Город" }),
  company_name: z
    .string()
    .min(1, { error: "Название организации обязательно" })
    .meta({ description: "Название организации" }),
  work_time: z.string().min(1, { error: "Режим работы обязателен" }).meta({
    description: "Режим работы в формате API: день_с#день_по#час_с#мин_с#час_по#мин_по, например 1#5#9#0#18#0"
  }),
  phone_country_code: z.string().min(1, { error: "Код страны обязателен" }).meta({ description: "Код страны, «+7»" }),
  phone_city_code: z
    .string()
    .min(1, { error: "Код города обязателен" })
    .meta({ description: "Код города или оператора" }),
  phone_number: z.string().min(1, { error: "Номер телефона обязателен" }).meta({ description: "Номер телефона" }),
  phone_extension: z.string().optional().meta({ description: "Добавочный номер" }),
  street: z.string().optional().meta({ description: "Улица" }),
  house: z.string().optional().meta({ description: "Дом" }),
  building: z.string().optional().meta({ description: "Корпус" }),
  apartment: z.string().optional().meta({ description: "Офис или квартира" }),
  extra_message: z.string().optional().meta({ description: "Дополнительная информация в визитке" }),
  contact_email: z.email({ error: "Некорректный адрес электронной почты" }).optional().meta({
    description: "Контактный адрес электронной почты"
  }),
  ogrn: z.string().optional().meta({ description: "ОГРН или ОГРНИП организации" }),
  contact_person: z.string().optional().meta({ description: "Контактное лицо" }),
  metro_station_id: idField("ID станции метро из справочника MetroStations").optional()
})

import { z } from "zod"
import { AD_IMAGE_ACTIONS, AD_IMAGE_TYPES, ASSOCIATED_FLAGS } from "#shared/config/enums"
import { AD_IMAGE_NAME_MAX, MAX_IDS_PER_CALL, MAX_IMAGES_PER_CALL } from "#shared/config/limits"
import { pageFields } from "#shared/lib/pagination"

// Изображение адресуется хешем, а не числовым ID: idField здесь неприменим.
const adImageHash = z.string().check(z.minLength(1, { error: "Хеш изображения не может быть пустым" }))

const adImage = z.object({
  image_data: z
    .string()
    .check(z.minLength(1, { error: "Данные изображения не могут быть пустыми" }))
    .meta({ description: "Содержимое файла изображения в base64" }),
  name: z
    .string()
    .check(
      z.minLength(1, { error: "Название не может быть пустым" }),
      z.maxLength(AD_IMAGE_NAME_MAX, { error: `Название длиннее ${AD_IMAGE_NAME_MAX} символов` })
    )
    .meta({ description: "Название изображения в интерфейсе" }),
  type: z.literal(AD_IMAGE_TYPES).optional().meta({ description: "Тип изображения; AUTO определяет его по размеру" })
})

export const manageAdImagesSchema = z.object({
  action: z.literal(AD_IMAGE_ACTIONS).meta({ description: "Что сделать: add, get или delete (необратимо)" }),
  images: z
    .array(adImage)
    .check(
      z.minLength(1, { error: "Список изображений пуст" }),
      z.maxLength(MAX_IMAGES_PER_CALL, {
        error: `За один вызов допустимо не больше ${MAX_IMAGES_PER_CALL} изображений`
      })
    )
    .optional()
    .meta({ description: "Изображения для загрузки; обязателен при action=add" }),
  ad_image_hashes: z
    .array(adImageHash)
    .check(
      z.minLength(1, { error: "Список хешей пуст" }),
      z.maxLength(MAX_IDS_PER_CALL, { error: `За один вызов допустимо не больше ${MAX_IDS_PER_CALL} хешей` })
    )
    .optional()
    .meta({ description: "Хеши изображений: фильтр при action=get, обязателен при action=delete" }),
  associated: z
    .literal(ASSOCIATED_FLAGS)
    .optional()
    .meta({ description: "Фильтр при action=get: YES — только привязанные к объявлениям, NO — только свободные" }),
  ...pageFields
})

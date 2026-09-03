// Дескриптор инструмента: имя, описание, аннотация, схема и хендлер в одном объекте.
// Лежит в shared, а не в app, потому что его импортирует каждый tools/<домен>/tool.ts —
// из app это развернуло бы направление зависимостей (app → tools → shared).
import type { ToolAnnotations } from "@modelcontextprotocol/sdk/types.js"
import type { z } from "zod"

// Подсказки клиенту о природе операции: по ним он решает, спрашивать ли пользователя.
// Выбираются по реальному действию, а не по имени метода: manage_*, умеющий удалять, —
// DESTRUCTIVE, даже если обычно только обновляет.
export const READ: ToolAnnotations = { readOnlyHint: true, openWorldHint: true }
export const WRITE: ToolAnnotations = { readOnlyHint: false, openWorldHint: true }
export const IDEMPOTENT: ToolAnnotations = { readOnlyHint: false, idempotentHint: true, openWorldHint: true }
export const DESTRUCTIVE: ToolAnnotations = { readOnlyHint: false, destructiveHint: true, openWorldHint: true }

export type ToolDescriptor = {
  readonly name: string
  readonly title: string
  readonly description: string
  readonly annotations: ToolAnnotations
  readonly schema: z.ZodObject
  readonly run: (params: unknown) => Promise<string>
}

type ToolInput<Schema extends z.ZodObject> = {
  name: string
  title: string
  description: string
  annotations: ToolAnnotations
  schema: Schema
  handler: (params: z.infer<Schema>) => Promise<string>
}

export function defineTool<Schema extends z.ZodObject>(tool: ToolInput<Schema>): ToolDescriptor {
  return {
    name: tool.name,
    title: tool.title,
    description: tool.description,
    annotations: tool.annotations,
    schema: tool.schema,
    // Единственное приведение типа на весь реестр, и оно обосновано: SDK валидирует
    // аргументы этой же схемой до вызова. Повторный parse здесь был бы не просто
    // лишним — он второй раз применил бы .transform, умножив рубли на миллион дважды.
    run: (params: unknown) => tool.handler(params as z.infer<Schema>)
  }
}

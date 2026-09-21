// Дескриптор инструмента. В shared, а не в app: его импортирует каждый tools/<домен>/tool.ts.
import type { ToolAnnotations } from "@modelcontextprotocol/sdk/types.js"
import type { z } from "zod"

// По ним клиент решает, спрашивать ли пользователя: manage_*, умеющий удалять, — DESTRUCTIVE.
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
    // Без parse: SDK уже провалидировал этой схемой, повторный .transform умножил бы
    // рубли на миллион дважды.
    run: (params: unknown) => tool.handler(params as z.infer<Schema>)
  }
}

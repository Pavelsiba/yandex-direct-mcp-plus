// Middleware предпросмотра: пишущий инструмент получает флаг dry_run и при нём отдаёт тела
// запросов вместо их отправки. Чтение при этом настоящее — запись строится по живым данным.
import { z } from "zod"
import { type HeldRequest, runDryRun } from "#shared/api/dry-run"
import { stringifyJson } from "#shared/api/json"
import { PREVIEW_STRING_MAX } from "#shared/config/limits"
import { isRecord } from "#shared/lib/record"
import type { ToolDescriptor } from "#shared/lib/tool"

const dryRunField = z.boolean().optional().meta({
  description:
    "true — ничего не менять: проверить параметры и вернуть тела запросов, которые ушли бы в Директ. Чтение при этом выполняется."
})

function shortenStrings(value: unknown): unknown {
  if (typeof value === "string" && value.length > PREVIEW_STRING_MAX) {
    return `${value.slice(0, PREVIEW_STRING_MAX)}… (обрезано, всего ${value.length} символов)`
  }
  if (Array.isArray(value)) return value.map(shortenStrings)
  if (isRecord(value)) {
    return Object.fromEntries(Object.entries(value).map(([key, nested]) => [key, shortenStrings(nested)]))
  }
  return value
}

function formatPreview(requests: HeldRequest[]): string {
  const bodies = requests.map(
    ({ service, method, params }, index) =>
      `${index + 1}. ${service}.${method}\n${stringifyJson({ method, params: shortenStrings(params) }, 2)}`
  )
  return [
    "🔍 Предпросмотр (dry_run): в Директ ничего не отправлено.",
    "Тела запросов — в формате API: суммы в микроединицах (рубли × 1 000 000).",
    ...bodies
  ].join("\n\n")
}

export function withDryRun(tool: ToolDescriptor): ToolDescriptor {
  if (tool.annotations.readOnlyHint) return tool

  return {
    ...tool,
    schema: tool.schema.extend({ dry_run: dryRunField }),
    run: async (params) => {
      const { dry_run: dryRun, ...toolParams } = params as Record<string, unknown>
      if (!dryRun) return tool.run(toolParams)

      const { output, requests } = await runDryRun(() => tool.run(toolParams))
      if (requests.length > 0) return formatPreview(requests)
      return `🔍 Предпросмотр (dry_run): запись не понадобилась, вызов только читал.\n\n${output}`
    }
  }
}

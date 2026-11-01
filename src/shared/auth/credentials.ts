// Сохранённый вход на диске. refresh_token в нём — бессрочный доступ к кабинету, поэтому
// файл только владельцу (0600), а запись атомарная: оборванная на середине оставила бы мусор.
import { chmod, mkdir, readFile, rename, rm, writeFile } from "node:fs/promises"
import { dirname } from "node:path"
import { z } from "zod"
import { parseJson, stringifyJson } from "#shared/api/json"

const credentialsSchema = z.object({
  clientId: z.string(),
  accessToken: z.string(),
  refreshToken: z.string().optional(),
  // Момент истечения access_token, мс от эпохи.
  expiresAt: z.number()
})

export type Credentials = z.infer<typeof credentialsSchema>

function isMissing(error: unknown): boolean {
  return (error as NodeJS.ErrnoException)?.code === "ENOENT"
}

export async function readCredentials(path: string): Promise<Credentials | undefined> {
  let raw: string
  try {
    raw = await readFile(path, "utf8")
  } catch (error) {
    if (isMissing(error)) return undefined
    throw error
  }
  const parsed = credentialsSchema.safeParse(
    (() => {
      try {
        return parseJson(raw)
      } catch {
        return undefined
      }
    })()
  )
  if (!parsed.success) {
    throw new Error(`Файл входа ${path} повреждён. Войдите заново: start_login, затем finish_login.`)
  }
  return parsed.data
}

export async function writeCredentials(path: string, credentials: Credentials): Promise<void> {
  await mkdir(dirname(path), { recursive: true, mode: 0o700 })
  const temp = `${path}.${process.pid}.tmp`
  await writeFile(temp, stringifyJson(credentials), { mode: 0o600 })
  // mode у writeFile действует только при создании файла; оставшийся от сбоя temp сохранил бы свои права.
  await chmod(temp, 0o600)
  await rename(temp, path)
}

/** Удаляет сохранённый вход; `false` — удалять было нечего. */
export async function deleteCredentials(path: string): Promise<boolean> {
  try {
    await rm(path)
    return true
  } catch (error) {
    if (isMissing(error)) return false
    throw error
  }
}

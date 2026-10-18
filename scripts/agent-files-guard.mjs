// post-checkout: локальные файлы агентской разработки переживают смену ветки.
//
// Они в .gitignore, но в старых коммитах отслеживались. Переход на такой коммит молча
// перезаписывает их версией из git, переход обратно — удаляет с диска. Последняя локальная
// версия лежит в <git-dir>/agent-files и обновляется после каждого переключения, где файлы
// не отслеживаются. Удалённое хук возвращает оттуда, о перезаписанном — предупреждает.
//
// Запуск — lefthook, аргументы git: <прежний HEAD> <новый HEAD> <1 — смена ветки>.

import { execFileSync } from "node:child_process"
import { cpSync, existsSync, readdirSync, readFileSync, rmSync, statSync } from "node:fs"
import { join } from "node:path"

const PATHS = ["CLAUDE.md", ".mcp.json", ".claude"]

const [previous, , branchSwitch] = process.argv.slice(2)
if (branchSwitch !== "1") process.exit(0)

const git = (...args) => execFileSync("git", args, { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] })

// В worktree .git — файл, поэтому каталог берётся у git, а не склеивается руками.
const BACKUP = join(git("rev-parse", "--git-dir").trim(), "agent-files")

function trackedAt(ref, path) {
  try {
    return git("ls-tree", "-r", "--name-only", ref, "--", path).trim() !== ""
  } catch {
    return false
  }
}

function files(path) {
  if (!existsSync(path)) return []
  if (!statSync(path).isDirectory()) return [path]
  return readdirSync(path, { recursive: true })
    .map((name) => join(path, String(name)))
    .filter((name) => statSync(name).isFile())
}

function differs(path) {
  const current = files(path)
  const saved = files(join(BACKUP, path))
  if (current.length !== saved.length) return true
  return current.some((file) => {
    const copy = join(BACKUP, file)
    return !existsSync(copy) || !readFileSync(file).equals(readFileSync(copy))
  })
}

for (const path of PATHS) {
  const backup = join(BACKUP, path)

  // Локальная копия — первой: в прежней ветке могла лежать чужая версия из git.
  if (!existsSync(path)) {
    if (existsSync(backup)) {
      cpSync(backup, path, { recursive: true })
      console.error(`agent-files: ${path} удалён сменой ветки — возвращён из ${backup}`)
    } else if (trackedAt(previous, path)) {
      git("restore", `--source=${previous}`, "--worktree", "--", path)
      console.error(`agent-files: ${path} удалён сменой ветки — возвращён из прежней`)
    }
    continue
  }

  if (trackedAt("HEAD", path)) {
    if (existsSync(backup) && differs(path)) {
      console.error(`agent-files: ${path} перезаписан версией из ветки; локальная копия — ${backup}`)
    }
    continue
  }

  rmSync(backup, { recursive: true, force: true })
  cpSync(path, backup, { recursive: true })
}

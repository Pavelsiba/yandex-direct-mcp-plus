// post-checkout, post-merge, post-rewrite: локальные файлы агентской разработки переживают
// смену ветки, pull и rebase.
//
// Они в .gitignore, но в старых коммитах отслеживались. Переход на такой коммит молча
// перезаписывает их версией из git, переход обратно — удаляет с диска; fast-forward в pull
// удаляет так же, как переключение, но post-checkout не вызывает. Последняя локальная версия
// лежит в <git-dir>/agent-files и обновляется после каждого события, где файлы не
// отслеживаются. Удалённое хук возвращает оттуда, о перезаписанном — предупреждает.
//
// Запуск — lefthook: <checkout|merge|rewrite>, у checkout следом аргументы git
// <прежний HEAD> <новый HEAD> <1 — смена ветки>.

import { execFileSync } from "node:child_process"
import { cpSync, existsSync, mkdirSync, readdirSync, readFileSync, rmSync, statSync } from "node:fs"
import { dirname, join } from "node:path"

const PATHS = ["CLAUDE.md", ".mcp.json", ".claude"]

const [event, ...gitArgs] = process.argv.slice(2)
if (event === "checkout" && gitArgs[2] !== "1") process.exit(0)
// amend файлов не трогает и ORIG_HEAD не обновляет: по устаревшему хук вернул бы удалённое руками.
if (event === "rewrite" && gitArgs[0] === "amend") process.exit(0)
// merge и rebase прежний HEAD не передают, но оставляют его в ORIG_HEAD.
const previous = event === "checkout" ? gitArgs[0] : "ORIG_HEAD"

const git = (...args) => execFileSync("git", args, { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] })

// В worktree .git — файл, поэтому каталог берётся у git, а не склеивается руками.
const BACKUP = join(git("rev-parse", "--git-dir").trim(), "agent-files")

function trackedFiles(ref, path) {
  try {
    return git("ls-tree", "-r", "--name-only", ref, "--", path).split("\n").filter(Boolean)
  } catch {
    return []
  }
}

const trackedAt = (ref, path) => trackedFiles(ref, path).length > 0

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

  // Пофайлово и только то, что git удалил сам — отслеживалось в прежнем коммите: от каталога
  // уцелевает часть, и проверка одного .claude приняла бы урезанный каталог за целый, а ниже
  // затёрла бы им копию. Удалённое руками остаётся удалённым.
  // Локальная копия — первой: в прежнем коммите могла лежать чужая версия из git.
  for (const file of trackedFiles(previous, path)) {
    if (existsSync(file)) continue
    const copy = join(BACKUP, file)
    if (existsSync(copy)) {
      mkdirSync(dirname(file), { recursive: true })
      cpSync(copy, file)
      console.error(`agent-files: ${file} удалён операцией git — возвращён из ${BACKUP}`)
    } else {
      git("restore", `--source=${previous}`, "--worktree", "--", file)
      console.error(`agent-files: ${file} удалён операцией git — возвращён из ${previous}`)
    }
  }
  if (!existsSync(path)) continue

  if (trackedAt("HEAD", path)) {
    if (existsSync(backup) && differs(path)) {
      console.error(`agent-files: ${path} перезаписан версией из коммита; локальная копия — ${backup}`)
    }
    continue
  }

  rmSync(backup, { recursive: true, force: true })
  cpSync(path, backup, { recursive: true })
}

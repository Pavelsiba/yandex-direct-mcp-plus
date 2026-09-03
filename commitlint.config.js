// Конфиг на .js, а не .ts как в more-shop: там рантайм bun и TypeScript читается
// напрямую, здесь — Node, и .ts потребовал бы отдельного загрузчика ради четырёх строк.

/** @type {import("@commitlint/types").UserConfig} */
export default {
  extends: ["@commitlint/config-conventional"]
}

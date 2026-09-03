# Zod v4 — ключевые отличия от v3

Проект использует **Zod v4**. НЕ применять v3-паттерны. Читать при создании схемы
инструмента, валидации входа хендлера, custom refine/transform, `z.infer`.

## Import

```ts
import { z } from "zod"
```

## Breaking Changes

### 1. Кастомизация ошибки: `message` → `error`

```ts
z.string().min(5, { message: "Слишком коротко" })   // v3 — WRONG
z.string().min(5, { error: "Слишком коротко" })      // v4 — CORRECT
```

### 2. Top-level format-функции (string & number)

Формат-валидаторы теперь top-level `z.*()`. Старые `z.string().email()` /
`z.number().int()` — deprecated.

**String:**

```ts
z.string().email()   // v3 DEPRECATED
z.email()            // v4
z.url()
z.uuidv4() / z.uuidv7()
z.iso.date() / z.iso.datetime() / z.iso.time()
```

**Number:**

```ts
z.number().int()     // ещё валидно, но предпочитать top-level
z.int()              // safe-integer range
z.int32() / z.uint32() / z.float32() / z.float64()

z.int().nonnegative()      // >= 0
z.int().positive()         // > 0
z.int().min(1).max(100)
```

> **Caveat — coercion:** `z.coerce.int()` **нет** (`z.coerce` = только
> string/number/boolean/bigint/date). Для «скоэрсить → провалидировать int» —
> `z.coerce.number().int()` (`.int()` тут корректен, не deprecated).

### 3. `.merge()` deprecated → `.extend()` / spread

```ts
const Extended = Base.merge(Other)                            // v3 DEPRECATED
const Extended = Base.extend(Other.shape)                     // v4
const Extended = z.object({ ...Base.shape, ...Other.shape })  // best tsc perf
```

Полезно для yd-mcp: общие куски схем (пагинация, `SelectionCriteria`, поля отчёта)
собираются spread'ом из базовых объектов.

### 4. `z.coerce` input type теперь `unknown`

```ts
const schema = z.coerce.string()
type Input = z.input<typeof schema>   // v3: string → v4: unknown
```

### 5. `z.function()` — новый API

```ts
const fn = z.function({ input: [z.string()], output: z.number() })  // v4
fn.implement((arg) => arg.length)
```

### 6. `z.discriminatedUnion()` — поддерживает union/pipe дискриминаторы и вложенность

```ts
z.discriminatedUnion("type", [
  z.object({ type: z.literal("TEXT_CAMPAIGN"), textCampaign: textCampaignSchema }),
  z.object({ type: z.literal("DYNAMIC_TEXT_CAMPAIGN"), dynamicTextCampaign: dynamicSchema })
])
```

### 7. `z.transform()` — standalone

```ts
const toStr = z.transform((input) => String(input))
z.string().transform((val) => val.length)   // возвращает ZodPipe
```

## Конвенция проекта: `z.literal([...])` вместо `z.enum()`

В Zod v4 `z.literal()` принимает массив значений, полностью заменяя `z.enum()`:

```ts
z.enum(["ACCEPTED", "MODERATION", "REJECTED"])       // WRONG
z.literal(["ACCEPTED", "MODERATION", "REJECTED"])     // CORRECT
```

Перечисления Директа обязаны быть типом, а не прозой в описании: схема — единственная
документация, которую видит модель на другом конце MCP.

## Конвенция проекта: описание на КАЖДОМ поле схемы (обязательно)

Описание документирует поле прямо в схеме, видно в IDE при наведении и попадает в
JSON Schema, которую получает клиент MCP. **Правило проекта: описывать каждое поле.**

**Синтаксис — `.meta({ description })`, не `.describe()`.** В Zod 4 `.describe()` оставлен
только для совместимости с v3; проект на v4, легаси не тянем. `.meta()` кладёт запись в
`z.globalRegistry` и принимает не только `description`, но и `id`, `title`, `examples`.

**Единицы и формат — обязательная часть описания.** Читателю схемы неоткуда узнать, рубли
это или микроединицы, строка это ID или число.

Yes:

```ts
const setBidsSchema = z.object({
  keywordId: idField().meta({
    description: "ID ключевой фразы — десятичная строка (19 знаков)"
  }),
  bid: z.number().positive().meta({
    description: "Ставка на поиске в рублях; сервер сам переведёт в микроединицы"
  }),
  strategyPriority: z.literal(["LOW", "NORMAL", "HIGH"]).optional().meta({
    description: "Приоритет фразы для автостратегии; по умолчанию NORMAL"
  })
})
```

No (v3-синтаксис, единицы не названы, перечисление прозой):

```ts
keywordId: z.string().describe("ID фразы"),
bid: z.number().describe("Ставка"),
strategyPriority: z.string().describe("LOW, NORMAL или HIGH")
```

Не описывать ради галочки: если поле правда самоочевидно — всё равно дай одну фразу о его
роли в домене (откуда берётся, на что влияет), а не «id — это id».

## Конвенция проекта: конвертация денег — в схеме

Вход конвертирует схема, выход — `format`. Хендлер на миллион не умножает.

```ts
const bidField = () =>
  z.number().positive()
    .transform((rub) => BigInt(Math.round(rub * 1_000_000)))
    .meta({ description: "Ставка в рублях" })
```

Описание остаётся про **рубли** — оно документирует вход, а не результат трансформации.

## Конвенция проекта: ID — никогда не `z.coerce`

```ts
z.coerce.number()          // ✖ примет уже округлённое число и скроет потерю точности
z.coerce.bigint()          // ✖ то же: округление произошло до нас, на разборе JSON
idField()                  // ✔ десятичная строка снаружи, BigInt внутрь
```

64-битные ID Директа (19 знаков) не помещаются в `Number` без потери точности.
`z.coerce` на ID-поле принял бы уже испорченное значение и превратил его в правдоподобную
строку — ошибка стала бы невидимой. Полный разбор — `docs/architecture.md`.

## Safe Patterns (без изменений в v4)

```ts
z.object({ ... })
z.array(z.string())
z.literal("value")       // одно значение
z.literal(["a", "b"])    // массив (v4, заменяет z.enum)
z.union([...])
z.optional() / z.nullable()
z.string().min() / .max() / .length()   // { error: } не { message: }
z.int() / z.int().min() / .max()
z.boolean() / z.date() / z.record() / z.tuple() / z.lazy()
z.infer<typeof schema> / z.input<...> / z.output<...>
```

## Известная засада с JSON Schema

`@modelcontextprotocol/sdk` отдаёт `$schema: draft-07` вместо `draft-2020-12`
(`mapMiniTarget`), что ломает клиентов со строгой валидацией. Пробой 03.09.2026:
**от версии zod не зависит** — `draft-07` уходит и на 3.25.76 + SDK 1.29, и на
4.5.4 + SDK 1.30. Описания полей при этом доезжают: и через `.meta({ description })`,
и через легаси `.describe()`.

При обновлении SDK пробу повторять: поднять сервер, вызвать `listTools`, посмотреть
`$schema`.

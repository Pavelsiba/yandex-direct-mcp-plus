// ReportName обязан быть уникальным в пределах аккаунта, поэтому в него идёт время.
// Часы вынесены параметром: Date.now() внутри хендлера сделал бы его непроверяемым.
export function reportName(prefix: string, now: () => number = Date.now): string {
  return `${prefix}_${now()}`
}

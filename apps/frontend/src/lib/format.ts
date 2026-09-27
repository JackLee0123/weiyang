/** 全站统一的时长文案：`45 分钟` / `8 小时 36 分钟`。 */
export function formatMinutes(minutes: number): string {
  const total = Math.max(0, Math.round(minutes))
  if (total < 60) return `${total} 分钟`
  const hours = Math.floor(total / 60)
  const rest = total % 60
  return rest ? `${hours} 小时 ${rest} 分钟` : `${hours} 小时`
}

/** 拆成「数值 + 单位」，方便用大字号排版：`8 小时 24` + `分钟`。 */
export function minutesParts(minutes: number): { value: string; unit: string } {
  const total = Math.max(0, Math.round(minutes))
  if (total < 60) return { value: String(total), unit: '分钟' }
  const hours = Math.floor(total / 60)
  const rest = total % 60
  return rest ? { value: `${hours} 小时 ${rest}`, unit: '分钟' } : { value: String(hours), unit: '小时' }
}

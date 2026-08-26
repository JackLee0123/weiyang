export const CATEGORIES = ['工作', '学习', '生活', '运动', '其他']

export const STATUS_OPTIONS = [
  { value: 'pending', label: '待启程' },
  { value: 'in_progress', label: '飞行中' },
  { value: 'done', label: '已抵达' },
  { value: 'cancelled', label: '改道' },
] as const

export const PRIORITY_OPTIONS = [
  { value: 'high', label: '高' },
  { value: 'medium', label: '中' },
  { value: 'low', label: '低' },
] as const

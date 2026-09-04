export type PlanStatus = 'pending' | 'in_progress' | 'done' | 'cancelled'
export type Priority = 'high' | 'medium' | 'low'

export interface Plan {
  id: number
  date: string
  title: string
  description: string
  start_time?: string | null
  end_time?: string | null
  status: PlanStatus
  priority: Priority
  category: string
  images?: string[]
  created_at: string
  updated_at: string
}

export interface PlanPayload {
  date: string
  title: string
  description?: string
  start_time?: string | null
  end_time?: string | null
  status?: PlanStatus
  priority?: Priority
  category?: string
  images?: string[]
}

export interface RecordEntry {
  id: number
  date: string
  title: string
  content: string
  duration_minutes?: number | null
  is_completed: boolean
  category: string
  linked_plan_id?: number | null
  images?: string[]
  done_at?: string | null
  created_at: string
}

export interface RecordEntryPayload {
  date: string
  title: string
  content?: string
  duration_minutes?: number | null
  is_completed?: boolean
  category?: string
  linked_plan_id?: number | null
  images?: string[]
}

export interface StatsDay {
  date: string
  total_plans: number
  done_plans: number
  planned_minutes: number
  records_count: number
  recorded_minutes: number
}

export interface StatsOverview {
  start: string
  end: string
  total_plans: number
  done_plans: number
  completion_rate: number
  planned_minutes: number
  recorded_minutes: number
  by_category: Record<string, number>
  days: StatsDay[]
  consecutive_recording_days: number
}

export interface HeatmapDay {
  date: string
  completed_plans: number
  records_count: number
}

export interface MemoryReport {
  start: string
  end: string
  period_days: number
  records_count: number
  recorded_minutes: number
  active_days: number
  consecutive_recording_days: number
  total_plans: number
  done_plans: number
  unfinished_plans: number
  cancelled_plans: number
  completion_rate: number
  by_category: Record<string, number>
  top_categories: string[]
  busiest_day?: string | null
  unfinished: Plan[]
}

export interface Backup {
  version: number
  exported_at: string
  plans: Plan[]
  records: RecordEntry[]
}

export interface AuthUser {
  id: number
  email: string
  name: string
  is_admin: boolean
  is_active: boolean
}

export interface AuthSession extends AuthUser {
  token: string
  expires_in: number
}

export interface SendCodeResult {
  message: string
  expires_in: number
  cooldown: number
  dev_code?: string | null
}

export interface CaptchaChallenge {
  captcha_id: string
  background: string
  piece: string
  piece_y: number
  piece_width: number
  piece_height: number
  width: number
  height: number
  target_x?: number | null
}

export interface CaptchaResult {
  captcha_token: string
}

export interface FeedbackResponse {
  submitted: boolean
  message: string
}

export interface AdminUser {
  id: number
  email: string
  name: string
  is_admin: boolean
  is_active: boolean
  created_at: string
}

export interface AdminUserUpdate {
  name?: string
  email?: string
  is_admin?: boolean
  is_active?: boolean
  password?: string
}

export interface RegisterPayload {
  name: string
  email: string
  password: string
  code: string
  captcha_token: string
}

export interface LoginPayload {
  email: string
  password: string
  captcha_token: string
}

export interface ResetPasswordPayload {
  email: string
  code: string
  password: string
}

export interface PeriodTime {
  start: string
  end: string
}

export interface Course {
  id: number
  term: string
  name: string
  code?: string | null
  teacher?: string | null
  location?: string | null
  day_of_week: number
  start_period: number
  end_period: number
  week_mask?: string | null
  week_label?: string | null
  credit?: number | null
  course_type?: string | null
  created_at: string
}

export interface CourseDraft {
  term: string
  name: string
  code?: string | null
  teacher?: string | null
  location?: string | null
  day_of_week: number
  start_period: number
  end_period: number
  week_mask?: string | null
  week_label?: string | null
  credit?: number | null
  course_type?: string | null
}

export interface TimetableSettings {
  active_term: string
  week1_date?: string | null
  period_times: PeriodTime[]
}

export interface ParseTimetableResult {
  term?: string | null
  courses: CourseDraft[]
  warnings: string[]
}

export interface WiseduCaptcha {
  captcha_token: string
  image: string
}

export interface CourseBulkResult {
  term: string
  saved: number
}

export interface GeneratePlansResult {
  created: number
  skipped_past: number
  skipped_duplicate: number
}

export type View = 'today' | 'weiyang' | 'calendar' | 'list' | 'heatmap' | 'memory' | 'timetable' | 'changelog' | 'admin'

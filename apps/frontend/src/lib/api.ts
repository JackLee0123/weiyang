import type {
  AdminUser,
  AdminUserUpdate,
  AuthSession,
  AuthUser,
  Backup,
  CaptchaChallenge,
  CaptchaResult,
  Course,
  CourseBulkResult,
  CourseDraft,
  FeedbackResponse,
  GeneratePlansResult,
  HeatmapDay,
  LoginPayload,
  MemoryReport,
  ParseTimetableResult,
  PeriodTime,
  Plan,
  PlanPayload,
  RecordEntry,
  RecordEntryPayload,
  RegisterPayload,
  ResetPasswordPayload,
  SendCodeResult,
  StatsOverview,
  TimetableSettings,
  WiseduCaptcha,
} from './types'
import { clearAuth, getToken } from './auth'

const BASE = '/api'

class ApiError extends Error {
  status: number
  constructor(message: string, status: number) {
    super(message)
    this.status = status
  }
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = getToken()
  const isForm = options.body instanceof FormData
  const headers = new Headers(options.headers)
  if (token) headers.set('Authorization', `Bearer ${token}`)
  if (!isForm) headers.set('Content-Type', 'application/json')
  const res = await fetch(`${BASE}${path}`, {
    ...options,
    headers,
  })
  if (!res.ok) {
    let detail = res.statusText
    try {
      const body = await res.json()
      detail = body.detail ?? detail
      if (Array.isArray(detail)) {
        detail = detail
          .map((d) => (d && typeof d === 'object' ? d.msg ?? d.message ?? (d.loc ?? []).join(' ') : String(d)))
          .filter(Boolean)
          .join('；')
      } else if (detail && typeof detail === 'object') {
        detail = (detail as { msg?: string; message?: string }).msg ?? (detail as { message?: string }).message ?? '请求参数有误'
      }
    } catch {
      /* ignore */
    }
    if (res.status === 401) clearAuth()
    throw new ApiError(detail, res.status)
  }
  if (res.status === 204) return undefined as T
  return res.json() as Promise<T>
}

function qs(params: Record<string, string | number | undefined>): string {
  const entries = Object.entries(params).filter(([, v]) => v !== undefined && v !== '')
  if (!entries.length) return ''
  return '?' + new URLSearchParams(entries as [string, string][]).toString()
}

export const api = {
  createCaptcha() {
    return request<CaptchaChallenge>('/captcha', { method: 'POST' })
  },
  verifyCaptcha(payload: { captcha_id: string; x: number }) {
    return request<CaptchaResult>('/captcha/verify', { method: 'POST', body: JSON.stringify(payload) })
  },
  sendCode(email: string) {
    return request<SendCodeResult>('/auth/send-code', { method: 'POST', body: JSON.stringify({ email }) })
  },
  register(payload: RegisterPayload) {
    return request<AuthSession>('/auth/register', { method: 'POST', body: JSON.stringify(payload) })
  },
  login(payload: LoginPayload) {
    return request<AuthSession>('/auth/login', { method: 'POST', body: JSON.stringify(payload) })
  },
  sendResetCode(email: string, captcha_token: string) {
    return request<SendCodeResult>('/auth/forgot-password', { method: 'POST', body: JSON.stringify({ email, captcha_token }) })
  },
  resetPassword(payload: ResetPasswordPayload) {
    return request<{ message: string }>('/auth/reset-password', { method: 'POST', body: JSON.stringify(payload) })
  },
  logout() {
    return request<void>('/auth/logout', { method: 'POST' })
  },
  me() {
    return request<AuthUser>('/auth/me')
  },

  fetchPlans(params: { start?: string; end?: string; status?: string; category?: string; q?: string } = {}) {
    return request<Plan[]>(`/plans${qs(params)}`)
  },
  fetchUnfinishedPlans() {
    return request<Plan[]>('/plans/unfinished')
  },
  createPlan(payload: PlanPayload) {
    return request<Plan>('/plans', { method: 'POST', body: JSON.stringify(payload) })
  },
  updatePlan(id: number, payload: Partial<PlanPayload>) {
    return request<Plan>(`/plans/${id}`, { method: 'PATCH', body: JSON.stringify(payload) })
  },
  deletePlan(id: number) {
    return request<void>(`/plans/${id}`, { method: 'DELETE' })
  },

  fetchRecords(params: { start?: string; end?: string; category?: string; q?: string } = {}) {
    return request<RecordEntry[]>(`/records${qs(params)}`)
  },
  createRecord(payload: RecordEntryPayload) {
    return request<RecordEntry>('/records', { method: 'POST', body: JSON.stringify(payload) })
  },
  updateRecord(id: number, payload: Partial<RecordEntryPayload>) {
    return request<RecordEntry>(`/records/${id}`, { method: 'PATCH', body: JSON.stringify(payload) })
  },
  deleteRecord(id: number) {
    return request<void>(`/records/${id}`, { method: 'DELETE' })
  },

  fetchStats(start: string, end: string) {
    return request<StatsOverview>(`/stats/overview${qs({ start, end })}`)
  },
  fetchHeatmap(start: string, end: string) {
    return request<HeatmapDay[]>(`/stats/heatmap${qs({ start, end })}`)
  },
  fetchMemoryReport(start: string, end: string) {
    return request<MemoryReport>(`/reports/memory${qs({ start, end })}`)
  },

  fetchUsers() {
    return request<AdminUser[]>('/admin/users')
  },
  updateUser(id: number, payload: AdminUserUpdate) {
    return request<AdminUser>(`/admin/users/${id}`, { method: 'PATCH', body: JSON.stringify(payload) })
  },
  deleteUser(id: number) {
    return request<void>(`/admin/users/${id}`, { method: 'DELETE' })
  },
  exportBackup() {
    return request<Backup>('/backup/export', { method: 'POST' })
  },
  importBackup(payload: Backup) {
    return request<{ imported_plans: number; imported_records: number }>('/backup/import', {
      method: 'POST',
      body: JSON.stringify(payload),
    })
  },

  submitFeedback(payload: { content: string; contact?: string; images: File[] }) {
    const form = new FormData()
    form.append('content', payload.content)
    if (payload.contact) form.append('contact', payload.contact)
    for (const image of payload.images) form.append('images', image)
    return request<FeedbackResponse>('/feedback', { method: 'POST', body: form })
  },

  parseTimetable(payload: { file?: File; raw_text?: string; term?: string }) {
    const form = new FormData()
    if (payload.file) form.append('file', payload.file)
    if (payload.raw_text) form.append('raw_text', payload.raw_text)
    if (payload.term) form.append('term', payload.term)
    return request<ParseTimetableResult>('/timetable/parse', { method: 'POST', body: form })
  },
  fetchWiseduCaptcha(payload: { base_url?: string } = {}) {
    return request<WiseduCaptcha>('/timetable/wisedu/captcha', { method: 'POST', body: JSON.stringify(payload) })
  },
  fetchWiseduTimetable(payload: { username: string; password: string; captcha_token: string; captcha_code?: string; term?: string; base_url?: string }) {
    return request<ParseTimetableResult>('/timetable/wisedu/fetch', { method: 'POST', body: JSON.stringify(payload) })
  },
  saveCourses(payload: { term: string; courses: CourseDraft[]; week1_date?: string; period_times?: PeriodTime[] }) {
    return request<CourseBulkResult>('/timetable/courses', { method: 'POST', body: JSON.stringify(payload) })
  },
  fetchCourses(params: { term?: string } = {}) {
    return request<{ term?: string | null; courses: Course[]; settings: TimetableSettings }>(`/timetable/courses${qs(params)}`)
  },
  deleteCourse(id: number) {
    return request<void>(`/timetable/courses/${id}`, { method: 'DELETE' })
  },
  fetchTimetableSettings() {
    return request<TimetableSettings>('/timetable/settings')
  },
  updateTimetableSettings(payload: Partial<TimetableSettings>) {
    return request<TimetableSettings>('/timetable/settings', { method: 'PATCH', body: JSON.stringify(payload) })
  },
  generatePlans(payload: { term: string; week_start: string }) {
    return request<GeneratePlansResult>('/timetable/generate-plans', { method: 'POST', body: JSON.stringify(payload) })
  },
}

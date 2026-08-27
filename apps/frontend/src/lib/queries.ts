import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from './api'
import type { AdminUserUpdate, CourseDraft, PeriodTime, PlanPayload, RecordEntryPayload } from './types'

export function usePlans(params: { start?: string; end?: string; status?: string; category?: string; q?: string } = {}) {
  return useQuery({ queryKey: ['plans', params], queryFn: () => api.fetchPlans(params) })
}

export function useUnfinishedPlans() {
  return useQuery({ queryKey: ['plans', 'unfinished'], queryFn: () => api.fetchUnfinishedPlans() })
}

export function useRecords(params: { start?: string; end?: string; category?: string; q?: string } = {}) {
  return useQuery({ queryKey: ['records', params], queryFn: () => api.fetchRecords(params) })
}

export function useStats(start: string, end: string) {
  return useQuery({ queryKey: ['stats', start, end], queryFn: () => api.fetchStats(start, end) })
}

export function useHeatmap(start: string, end: string) {
  return useQuery({ queryKey: ['heatmap', start, end], queryFn: () => api.fetchHeatmap(start, end) })
}

export function useMemoryReport(start: string, end: string) {
  return useQuery({ queryKey: ['memory', start, end], queryFn: () => api.fetchMemoryReport(start, end) })
}

export function usePlanMutations() {
  const qc = useQueryClient()
  const refresh = () => {
    qc.invalidateQueries({ queryKey: ['plans'] })
    qc.invalidateQueries({ queryKey: ['stats'] })
  }
  const create = useMutation({ mutationFn: (p: PlanPayload) => api.createPlan(p), onSuccess: refresh })
  const update = useMutation({ mutationFn: (v: { id: number; payload: Partial<PlanPayload> }) => api.updatePlan(v.id, v.payload), onSuccess: refresh })
  const remove = useMutation({ mutationFn: (id: number) => api.deletePlan(id), onSuccess: refresh })
  return { create, update, remove }
}

export function useRecordMutations() {
  const qc = useQueryClient()
  const refresh = () => {
    qc.invalidateQueries({ queryKey: ['records'] })
    qc.invalidateQueries({ queryKey: ['plans'] })
    qc.invalidateQueries({ queryKey: ['stats'] })
  }
  const create = useMutation({ mutationFn: (p: RecordEntryPayload) => api.createRecord(p), onSuccess: refresh })
  const update = useMutation({ mutationFn: (v: { id: number; payload: Partial<RecordEntryPayload> }) => api.updateRecord(v.id, v.payload), onSuccess: refresh })
  const remove = useMutation({ mutationFn: (id: number) => api.deleteRecord(id), onSuccess: refresh })
  return { create, update, remove }
}

export function useAdminUsers() {
  return useQuery({ queryKey: ['admin-users'], queryFn: () => api.fetchUsers() })
}

export function useAdminMutations() {
  const qc = useQueryClient()
  const refresh = () => qc.invalidateQueries({ queryKey: ['admin-users'] })
  const update = useMutation({
    mutationFn: (value: { id: number; payload: AdminUserUpdate }) => api.updateUser(value.id, value.payload),
    onSuccess: refresh,
  })
  const remove = useMutation({ mutationFn: (id: number) => api.deleteUser(id), onSuccess: refresh })
  return { update, remove }
}

export function useCourses(term?: string) {
  return useQuery({ queryKey: ['courses', term ?? ''], queryFn: () => api.fetchCourses({ term }) })
}

export function useTimetableSettings() {
  return useQuery({ queryKey: ['timetable-settings'], queryFn: () => api.fetchTimetableSettings() })
}

export function useTimetableMutations() {
  const qc = useQueryClient()
  const refresh = () => {
    qc.invalidateQueries({ queryKey: ['courses'] })
    qc.invalidateQueries({ queryKey: ['timetable-settings'] })
    qc.invalidateQueries({ queryKey: ['plans'] })
    qc.invalidateQueries({ queryKey: ['stats'] })
  }
  const save = useMutation({
    mutationFn: (value: { term: string; courses: CourseDraft[]; week1_date?: string; period_times?: PeriodTime[] }) =>
      api.saveCourses(value),
    onSuccess: refresh,
  })
  const remove = useMutation({ mutationFn: (id: number) => api.deleteCourse(id), onSuccess: refresh })
  const generate = useMutation({
    mutationFn: (value: { term: string; week_start: string }) => api.generatePlans(value),
    onSuccess: refresh,
  })
  const updateSettings = useMutation({
    mutationFn: (value: Partial<{ active_term: string; week1_date: string; period_times: PeriodTime[] }>) => api.updateTimetableSettings(value),
    onSuccess: refresh,
  })
  return { save, remove, generate, updateSettings }
}

/**
 * 演示模式数据：未配置服务器时可预览界面效果。
 */
import { todayISO, mondayOf } from './timetable.js'

var PERIOD_TIMES = [
  { start: '08:00', end: '08:45' },
  { start: '08:55', end: '09:40' },
  { start: '10:00', end: '10:45' },
  { start: '10:55', end: '11:40' },
  { start: '14:00', end: '14:45' },
  { start: '14:55', end: '15:40' },
  { start: '16:00', end: '16:45' },
  { start: '16:55', end: '17:40' },
  { start: '19:00', end: '19:45' },
  { start: '19:55', end: '20:40' }
]

function mask(weeks) {
  var arr = []
  for (var i = 1; i <= 16; i++) arr.push(weeks.indexOf(i) >= 0 ? '1' : '0')
  return arr.join('')
}

var COURSES = [
  { id: 1, name: '高等数学', teacher: '张老师', location: '教学楼A-301', day_of_week: 1, start_period: 1, end_period: 2, week_mask: mask([1, 2, 3, 4, 5, 6, 7, 8]) },
  { id: 2, name: '大学英语', teacher: '李老师', location: '教学楼B-205', day_of_week: 1, start_period: 5, end_period: 6, week_mask: mask([1, 3, 5, 7]) },
  { id: 3, name: '程序设计基础', teacher: '王老师', location: '实验楼C-402', day_of_week: 2, start_period: 3, end_period: 4, week_mask: mask([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16]) },
  { id: 4, name: '线性代数', teacher: '赵老师', location: '教学楼A-208', day_of_week: 3, start_period: 1, end_period: 2, week_mask: mask([2, 4, 6, 8]) },
  { id: 5, name: '体育（篮球）', teacher: '孙老师', location: '东区体育馆', day_of_week: 3, start_period: 7, end_period: 8, week_mask: mask([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16]) },
  { id: 6, name: '马克思主义基本原理', teacher: '周老师', location: '教学楼D-101', day_of_week: 4, start_period: 5, end_period: 6, week_mask: mask([1, 2, 3, 4, 5, 6, 7, 8]) },
  { id: 7, name: '数据结构与算法', teacher: '吴老师', location: '实验楼C-408', day_of_week: 5, start_period: 3, end_period: 4, week_mask: mask([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16]) }
]

export function demoTimetable() {
  return {
    term: '2026-2027 第 1 学期（演示）',
    courses: COURSES,
    settings: {
      active_term: '2026-2027 第 1 学期（演示）',
      week1_date: mondayOf(new Date()),
      period_times: PERIOD_TIMES
    }
  }
}

export function demoRecords() {
  return [
    { id: 101, title: '专注 · 45 分钟', duration_minutes: 45, is_completed: true, category: '其他', linked_plan_id: null },
    { id: 102, title: '专注 · 90 分钟', duration_minutes: 90, is_completed: true, category: '其他', linked_plan_id: null },
    { id: 103, title: '背单词 30 分钟', duration_minutes: 30, is_completed: true, category: '学习', linked_plan_id: null }
  ]
}

export function demoPlans() {
  return []
}

export function demoMe() {
  return { id: 1, email: 'demo@everlong.local', name: '演示用户', is_admin: false }
}

export { todayISO }

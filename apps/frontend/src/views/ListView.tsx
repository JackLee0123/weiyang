import { useMemo, useState } from 'react'
import { Search } from 'lucide-react'
import { PlanItem } from '../components/PlanItem'
import { RecordItem } from '../components/RecordItem'
import { PlanForm } from '../components/PlanForm'
import { RecordForm } from '../components/RecordForm'
import { Modal } from '../components/Modal'
import { EmptyState } from '../components/EmptyState'
import { usePlans, useRecords } from '../lib/queries'
import { CATEGORIES, STATUS_OPTIONS } from '../lib/constants'
import { todayISO } from '../lib/date'
import type { Plan, PlanStatus, RecordEntry } from '../lib/types'

type Tab = 'all' | 'plans' | 'records'
type ModalState = { type: 'plan'; initial?: Plan } | { type: 'record'; initial?: RecordEntry } | null

export function ListView() {
  const [q, setQ] = useState('')
  const [tab, setTab] = useState<Tab>('all')
  const [status, setStatus] = useState<PlanStatus | ''>('')
  const [category, setCategory] = useState('')
  const [modal, setModal] = useState<ModalState>(null)

  const plansQ = usePlans()
  const recordsQ = useRecords()
  const plans = useMemo(
    () =>
      (plansQ.data ?? []).filter(
        (p) =>
          (!q || p.title.includes(q) || p.description.includes(q)) &&
          (!status || p.status === status) &&
          (!category || p.category === category),
      ),
    [plansQ.data, q, status, category],
  )
  const records = useMemo(
    () =>
      (recordsQ.data ?? []).filter(
        (r) => (!q || r.title.includes(q) || r.content.includes(q)) && (!category || r.category === category),
      ),
    [recordsQ.data, q, category],
  )

  const showPlans = tab !== 'records'
  const showRecords = tab !== 'plans'
  const groups = useMemo(() => {
    const map = new Map<string, { plans: Plan[]; records: RecordEntry[] }>()
    if (showPlans)
      plans.forEach((p) => {
        const g = map.get(p.date) ?? { plans: [], records: [] }
        g.plans.push(p)
        map.set(p.date, g)
      })
    if (showRecords)
      records.forEach((r) => {
        const g = map.get(r.date) ?? { plans: [], records: [] }
        g.records.push(r)
        map.set(r.date, g)
      })
    return [...map.entries()].sort((a, b) => (a[0] < b[0] ? 1 : -1))
  }, [plans, records, showPlans, showRecords])

  const noResults = groups.length === 0

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold text-ink dark:text-slate-100">全部计划与记录</h1>
          <p className="mt-1 text-sm text-ink-muted dark:text-slate-400">搜索、筛选并回顾计划与实际记录</p>
        </div>
        <div className="flex gap-2">
          <button className="btn-ghost" onClick={() => setModal({ type: 'record' })}>
            新增记录
          </button>
          <button className="btn-primary" onClick={() => setModal({ type: 'plan' })}>
            新建计划
          </button>
        </div>
      </div>

      <div className="panel flex flex-wrap items-center gap-2 p-2">
        <div className="flex min-w-[180px] flex-1 items-center gap-2 rounded-md bg-surface-soft px-2.5 dark:bg-slate-900/60">
          <Search size={15} className="text-ink-faint dark:text-slate-500" />
          <input
            className="w-full bg-transparent py-2 text-sm text-ink outline-none placeholder:text-ink-faint dark:text-slate-200 dark:placeholder:text-slate-500"
            placeholder="搜索标题或内容"
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
        </div>
        <div className="flex overflow-hidden rounded-md border border-line dark:border-slate-600">
          {(['all', 'plans', 'records'] as Tab[]).map((t) => (
            <button
              key={t}
              className={`px-3 py-2 text-sm font-medium transition ${
                tab === t
                  ? 'bg-brand text-white'
                  : 'bg-surface text-ink-soft hover:bg-surface-soft dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700'
              }`}
              onClick={() => setTab(t)}
            >
              {t === 'all' ? '全部' : t === 'plans' ? '计划' : '记录'}
            </button>
          ))}
        </div>
        <div className="ml-auto flex flex-1 flex-wrap items-center gap-2 sm:flex-none">
          <select className="field w-auto min-w-[104px] py-1.5" value={status} onChange={(e) => setStatus(e.target.value as PlanStatus | '')}>
            <option value="">全部状态</option>
            {STATUS_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
          <select className="field w-auto min-w-[104px] py-1.5" value={category} onChange={(e) => setCategory(e.target.value)}>
            <option value="">全部分类</option>
            {CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </div>
      </div>

      {noResults ? (
        <EmptyState title="没有找到匹配的内容" hint="换个关键词或筛选条件试试" />
      ) : (
        <div className="space-y-5">
          {groups.map(([date, g]) => (
            <section key={date} className="min-w-0">
              <header className="flex items-baseline gap-2 border-b border-line pb-2.5 dark:border-slate-700">
                <h2 className="text-sm font-semibold text-ink dark:text-slate-100">{date.slice(5)}</h2>
                <span className="text-xs text-ink-faint dark:text-slate-500">{date.slice(0, 4)}</span>
                <span className="ml-auto text-xs text-ink-muted dark:text-slate-400">
                  {g.plans.length + g.records.length} 项
                </span>
              </header>
              <div className="mt-1">
                {g.plans.map((p) => (
                  <PlanItem key={p.id} plan={p} onEdit={(plan) => setModal({ type: 'plan', initial: plan })} />
                ))}
                {g.records.map((r) => (
                  <RecordItem key={r.id} record={r} onEdit={(record) => setModal({ type: 'record', initial: record })} />
                ))}
              </div>
            </section>
          ))}
        </div>
      )}

      {modal?.type === 'plan' && (
        <Modal title={modal.initial ? '编辑计划' : '新建计划'} onClose={() => setModal(null)}>
          <PlanForm defaultDate={todayISO()} initial={modal.initial} onClose={() => setModal(null)} />
        </Modal>
      )}
      {modal?.type === 'record' && (
        <Modal title={modal.initial ? '编辑记录' : '新增记录'} onClose={() => setModal(null)}>
          <RecordForm defaultDate={todayISO()} initial={modal.initial} plans={plans} onClose={() => setModal(null)} />
        </Modal>
      )}
    </div>
  )
}

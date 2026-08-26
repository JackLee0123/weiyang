import { useState } from 'react'
import { Check, Loader2, ShieldAlert, Trash2 } from 'lucide-react'
import { useAdminMutations, useAdminUsers } from '../lib/queries'
import { Modal } from '../components/Modal'
import { EmptyState } from '../components/EmptyState'
import type { AdminUser } from '../lib/types'

export function AdminView({ meId }: { meId: number }) {
  const usersQ = useAdminUsers()
  const { update, remove } = useAdminMutations()
  const users = usersQ.data ?? []
  const [resetTarget, setResetTarget] = useState<AdminUser | null>(null)
  const [password, setPassword] = useState('')
  const [confirming, setConfirming] = useState<AdminUser | null>(null)
  const [error, setError] = useState('')

  const toggleActive = (user: AdminUser) => {
    if (user.id === meId) return
    update.mutate({ id: user.id, payload: { is_active: !user.is_active } })
  }

  const toggleAdmin = (user: AdminUser) => {
    if (user.id === meId) return
    update.mutate({ id: user.id, payload: { is_admin: !user.is_admin } })
  }

  const resetPassword = async () => {
    if (!resetTarget || !password.trim()) return
    try {
      await update.mutateAsync({ id: resetTarget.id, payload: { password } })
      setResetTarget(null)
      setPassword('')
      setError('')
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    }
  }

  const deleteUser = (user: AdminUser) => {
    if (user.id === meId) return
    remove.mutate(user.id)
    setConfirming(null)
  }

  return (
    <div className="space-y-5">
      <header className="flex items-center gap-2">
        <div className="flex h-7 w-7 items-center justify-center rounded-md bg-brand-soft text-brand-ink dark:bg-brand/15 dark:text-teal-200">
          <ShieldAlert size={15} />
        </div>
        <h1 className="section-title">用户管理</h1>
        <span className="ml-auto text-xs text-ink-muted dark:text-slate-400">{users.length} 名用户</span>
      </header>

      {usersQ.isLoading && (
        <div className="flex items-center gap-2 text-sm text-ink-muted dark:text-slate-400">
          <Loader2 size={16} className="animate-spin" /> 加载中…
        </div>
      )}
      {usersQ.isError && <p className="text-sm text-rose-600 dark:text-rose-300">{usersQ.error?.message || '加载失败'}</p>}

      {usersQ.isSuccess && users.length === 0 && <EmptyState title="还没有用户" hint="用户注册后会自动出现在这里" />}

      {users.length > 0 && (
        <div className="overflow-x-auto rounded-lg border border-line bg-surface shadow-soft dark:border-slate-700 dark:bg-slate-800">
          <table className="w-full min-w-[640px] text-sm">
            <thead>
              <tr className="border-b border-line-soft text-left text-xs text-ink-muted dark:border-slate-700 dark:text-slate-400">
                <th className="px-3 py-2 font-medium">用户</th>
                <th className="px-3 py-2 font-medium">邮箱</th>
                <th className="px-3 py-2 font-medium">状态</th>
                <th className="px-3 py-2 font-medium">角色</th>
                <th className="px-3 py-2 font-medium">注册时间</th>
                <th className="px-3 py-2 text-right font-medium">操作</th>
              </tr>
            </thead>
            <tbody>
              {users.map((user) => {
                const self = user.id === meId
                return (
                  <tr key={user.id} className="border-b border-line-soft last:border-0 dark:border-slate-700/70">
                    <td className="px-3 py-2">
                      <div className="flex items-center gap-2">
                        <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-brand/15 text-xs font-semibold text-brand-ink dark:bg-white/10 dark:text-teal-200">
                          {user.name.slice(0, 1).toUpperCase()}
                        </div>
                        <span className="font-medium text-ink dark:text-slate-100">
                          {user.name}
                          {self && (
                            <span className="ml-1.5 rounded-sm bg-brand-soft px-1.5 py-0.5 text-[11px] text-brand-ink dark:bg-brand/15 dark:text-teal-200">
                              你
                            </span>
                          )}
                        </span>
                      </div>
                    </td>
                    <td className="px-3 py-2 text-ink-soft dark:text-slate-300">{user.email}</td>
                    <td className="px-3 py-2">
                      <span
                        className={`rounded-sm px-2 py-0.5 text-xs font-medium ${
                          user.is_active
                            ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300'
                            : 'bg-rose-50 text-rose-600 dark:bg-rose-500/15 dark:text-rose-300'
                        }`}
                      >
                        {user.is_active ? '启用' : '停用'}
                      </span>
                    </td>
                    <td className="px-3 py-2">
                      <span
                        className={`rounded-sm px-2 py-0.5 text-xs font-medium ${
                          user.is_admin
                            ? 'bg-brand-soft text-brand-ink dark:bg-brand/15 dark:text-teal-200'
                            : 'bg-surface-soft text-ink-muted dark:bg-slate-700/70 dark:text-slate-400'
                        }`}
                      >
                        {user.is_admin ? '管理员' : '用户'}
                      </span>
                    </td>
                    <td className="px-3 py-2 text-xs text-ink-muted dark:text-slate-400">{user.created_at.slice(0, 10)}</td>
                    <td className="px-3 py-2">
                      <div className="flex justify-end gap-1">
                        <button
                          className="btn-ghost px-2 py-1 text-xs"
                          disabled={self}
                          onClick={() => toggleActive(user)}
                          title={self ? '不能停用自己' : user.is_active ? '停用账号' : '启用账号'}
                        >
                          {user.is_active ? '停用' : '启用'}
                        </button>
                        <button
                          className="btn-ghost px-2 py-1 text-xs"
                          disabled={self}
                          onClick={() => toggleAdmin(user)}
                          title={self ? '不能移除自己的管理员权限' : user.is_admin ? '取消管理员' : '设为管理员'}
                        >
                          {user.is_admin ? '取消管理员' : '设为管理员'}
                        </button>
                        <button className="btn-ghost px-2 py-1 text-xs" onClick={() => setResetTarget(user)} title="重置密码">
                          重置密码
                        </button>
                        <button
                          className="btn-ghost px-2 py-1 text-xs text-rose-600 hover:bg-rose-50 disabled:cursor-not-allowed disabled:text-slate-300 dark:text-rose-300 dark:hover:bg-rose-500/10 dark:disabled:text-slate-600"
                          disabled={self}
                          onClick={() => setConfirming(user)}
                          title={self ? '不能删除自己' : '删除账号'}
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      {resetTarget && (
        <Modal title={`重置密码 · ${resetTarget.name}`} onClose={() => setResetTarget(null)}>
          <div className="space-y-4">
            <div>
              <label className="label">新密码</label>
              <input
                className="field"
                type="password"
                placeholder="至少 8 位，含大小写/数字/符号中的至少两种"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoFocus
              />
            </div>
            {error && <p className="text-xs text-rose-600 dark:text-rose-300">{error}</p>}
            <div className="flex justify-end gap-2">
              <button className="btn-ghost" onClick={() => setResetTarget(null)}>
                取消
              </button>
              <button className="btn-primary" onClick={() => void resetPassword()} disabled={!password.trim()}>
                <Check size={15} /> 保存
              </button>
            </div>
          </div>
        </Modal>
      )}

      {confirming && (
        <Modal title={`删除账号 · ${confirming.name}`} onClose={() => setConfirming(null)}>
          <div className="space-y-4">
            <p className="text-sm text-ink-soft dark:text-slate-300">
              确定要删除 <span className="font-medium text-ink dark:text-slate-100">{confirming.email}</span> 吗？该用户的所有计划与记录都会被清除。
            </p>
            <div className="flex justify-end gap-2">
              <button className="btn-ghost" onClick={() => setConfirming(null)}>
                取消
              </button>
              <button className="btn text-rose-600 hover:bg-rose-50 dark:text-rose-300 dark:hover:bg-rose-500/10" onClick={() => void deleteUser(confirming)}>
                <Trash2 size={15} /> 确认删除
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  )
}

export default AdminView

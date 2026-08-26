import { useEffect, useRef, useState } from 'react'
import { ArrowRight, CalendarRange, Eye, EyeOff, LockKeyhole, Mail, Moon, Sun, UserRound } from 'lucide-react'
import { api } from '../lib/api'
import { setAuth } from '../lib/auth'
import type { Theme } from '../lib/theme'

type AuthMode = 'login' | 'register' | 'forgot'

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const PASSWORD_MIN_LENGTH = 8

function passwordClassCount(password: string): number {
  let classes = 0
  if (/[a-z]/.test(password)) classes += 1
  if (/[A-Z]/.test(password)) classes += 1
  if (/\d/.test(password)) classes += 1
  if (/[^A-Za-z0-9]/.test(password)) classes += 1
  return classes
}

function isStrongPassword(password: string): boolean {
  return password.length >= PASSWORD_MIN_LENGTH && passwordClassCount(password) >= 2
}

interface LoginPageProps {
  theme: Theme
  onToggleTheme: () => void
  onLogin: (remember: boolean) => void
}

export function LoginPage({ theme, onToggleTheme, onLogin }: LoginPageProps) {
  const [mode, setMode] = useState<AuthMode>('login')
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [code, setCode] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [remember, setRemember] = useState(true)
  const [loading, setLoading] = useState(false)
  const [sendingCode, setSendingCode] = useState(false)
  const [cooldown, setCooldown] = useState(0)
  const [error, setError] = useState('')
  const [info, setInfo] = useState('')
  const codeInputRef = useRef<HTMLInputElement>(null)

  const switchMode = (next: AuthMode) => {
    setMode(next)
    setError('')
    setInfo('')
    setPassword('')
    setConfirmPassword('')
    setCode('')
    setLoading(false)
  }

  useEffect(() => {
    if (cooldown <= 0) return
    const timer = window.setInterval(() => {
      setCooldown((value) => (value > 0 ? value - 1 : 0))
    }, 1000)
    return () => window.clearInterval(timer)
  }, [cooldown > 0])

  const requestCode = async () => {
    if (!EMAIL_RE.test(email)) {
      setError('请输入有效的邮箱地址')
      return
    }
    setError('')
    setInfo('')
    setSendingCode(true)
    try {
      const result = mode === 'forgot' ? await api.sendResetCode(email) : await api.sendCode(email)
      setInfo(result.message)
      if (result.dev_code) setInfo(`${result.message}，开发模式验证码：${result.dev_code}`)
      setCooldown(result.cooldown)
      codeInputRef.current?.focus()
    } catch {
      setError(mode === 'forgot' ? '重置验证码发送失败，请确认邮箱已注册' : '验证码发送失败，请稍后重试')
    } finally {
      setSendingCode(false)
    }
  }

  const submit = async () => {
    if (mode === 'forgot') {
      if (!EMAIL_RE.test(email)) {
        setError('请输入有效的邮箱地址')
        return
      }
      if (!code.trim()) {
        setError('请输入验证码')
        return
      }
      if (!isStrongPassword(password)) {
        setError('新密码至少 8 位，且需包含大写字母、小写字母、数字、特殊符号中的至少两种')
        return
      }
      if (password !== confirmPassword) {
        setError('两次输入的密码不一致')
        return
      }
      setError('')
      setLoading(true)
      try {
        await api.resetPassword({ email, code: code.trim(), password })
        switchMode('login')
        setInfo('密码已重置，请用新密码登录')
      } catch (err) {
        setError(err instanceof Error ? err.message : '重置失败，请稍后重试')
        setLoading(false)
      }
      return
    }

    if (mode === 'register' && name.trim().length < 2) {
      setError('请输入至少 2 个字符的昵称')
      return
    }
    if (!EMAIL_RE.test(email)) {
      setError('请输入有效的邮箱地址')
      return
    }
    if (mode === 'register' && !isStrongPassword(password)) {
      setError('密码至少 8 位，且需包含大写字母、小写字母、数字、特殊符号中的至少两种')
      return
    }
    if (mode === 'register' && password !== confirmPassword) {
      setError('两次输入的密码不一致')
      return
    }

    setError('')
    setInfo('')
    setLoading(true)
    try {
      if (mode === 'register') {
        const session = await api.register({ name: name.trim(), email, password, code: code.trim() })
        setAuth(session.token, { id: session.id, email: session.email, name: session.name, is_admin: session.is_admin, is_active: session.is_active }, true)
        onLogin(true)
      } else {
        const session = await api.login({ email, password })
        setAuth(session.token, { id: session.id, email: session.email, name: session.name, is_admin: session.is_admin, is_active: session.is_active }, remember)
        onLogin(remember)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : '操作失败，请稍后重试')
      setLoading(false)
    }
  }

  const title =
    mode === 'login' ? '登录 · 未央 Everlong' : mode === 'register' ? '创建账号 · 未央 Everlong' : '重置密码 · 未央 Everlong'
  const subtitle =
    mode === 'login'
      ? '长日未央 · 把计划落笔，把日子记下'
      : mode === 'register'
        ? '欢迎来到未央 Everlong，从一份计划开始'
        : '通过邮箱验证码重置你的登录密码'

  return (
    <div className="relative flex min-h-full items-center justify-center px-4 py-8">
      <button
        className="btn-ghost absolute right-4 top-4 p-2"
        onClick={onToggleTheme}
        aria-label={theme === 'dark' ? '切换到浅色模式' : '切换到深色模式'}
        title={theme === 'dark' ? '切换到浅色模式' : '切换到深色模式'}
      >
        {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
      </button>

      <div className="w-full max-w-sm rounded-lg border border-line bg-surface p-6 shadow-soft dark:border-slate-700 dark:bg-slate-900">
        <div className="flex flex-col items-center text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-md bg-brand text-white shadow-sm">
            <CalendarRange size={24} />
          </div>
          <h1 className="mt-4 text-xl font-semibold text-ink dark:text-slate-100">{title}</h1>
          <p className="mt-1 text-sm text-ink-muted dark:text-slate-400">{subtitle}</p>
        </div>

        <form
          className="mt-6 space-y-4"
          onSubmit={(event) => {
            event.preventDefault()
            void submit()
          }}
        >
          {mode === 'register' && (
            <div>
              <label className="label" htmlFor="name">
                昵称
              </label>
              <div className="relative">
                <UserRound size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-faint dark:text-slate-500" />
                <input
                  id="name"
                  className="field pl-10"
                  type="text"
                  autoComplete="name"
                  placeholder="你的昵称"
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                />
              </div>
            </div>
          )}

          <div>
            <label className="label" htmlFor="email">
              邮箱
            </label>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Mail size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-faint dark:text-slate-500" />
                <input
                  id="email"
                  className="field pl-10"
                  type="email"
                  autoComplete="email"
                  placeholder="name@example.com"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                />
              </div>
              {mode !== 'login' && (
                <button
                  type="button"
                  className="btn-ghost shrink-0 whitespace-nowrap border border-line dark:border-slate-600"
                  onClick={() => void requestCode()}
                  disabled={sendingCode || cooldown > 0}
                >
                  {cooldown > 0 ? `重新发送 ${cooldown}s` : sendingCode ? '发送中…' : '获取验证码'}
                </button>
              )}
            </div>
          </div>

          {mode !== 'login' && (
            <div>
              <label className="label" htmlFor="code">
                验证码
              </label>
              <input
                id="code"
                ref={codeInputRef}
                className="field"
                type="text"
                inputMode="numeric"
                autoComplete="one-time-code"
                maxLength={6}
                placeholder="6 位验证码"
                value={code}
                onChange={(event) => setCode(event.target.value)}
              />
            </div>
          )}

          <div>
            <label className="label" htmlFor="password">
              {mode === 'forgot' ? '新密码' : '密码'}
            </label>
            <div className="relative">
              <LockKeyhole size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-faint dark:text-slate-500" />
              <input
                id="password"
                className="field pl-10 pr-11"
                type={showPassword ? 'text' : 'password'}
                autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                placeholder="至少 8 位"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
              />
              <button
                type="button"
                className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-ink-faint transition hover:bg-surface-soft hover:text-ink dark:text-slate-500 dark:hover:bg-white/10 dark:hover:text-slate-200"
                onClick={() => setShowPassword((value) => !value)}
                aria-label="切换密码可见性"
                title="切换密码可见性"
              >
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
            {mode !== 'login' && (
              <p className="mt-1 text-xs text-ink-faint dark:text-slate-500">
                至少 8 位，需包含大写/小写字母、数字、特殊符号中的至少两种
              </p>
            )}
          </div>

          {mode !== 'login' && (
            <div>
              <label className="label" htmlFor="confirm-password">
                {mode === 'forgot' ? '确认新密码' : '确认密码'}
              </label>
              <div className="relative">
                <LockKeyhole size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-faint dark:text-slate-500" />
                <input
                  id="confirm-password"
                  className="field pl-10 pr-11"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="new-password"
                  placeholder={mode === 'forgot' ? '再次输入新密码' : '再次输入密码'}
                  value={confirmPassword}
                  onChange={(event) => setConfirmPassword(event.target.value)}
                />
              </div>
            </div>
          )}

          {mode === 'login' && (
            <div className="flex items-center justify-between gap-3">
              <label className="flex items-center gap-2 text-sm text-ink-soft dark:text-slate-300">
                <input
                  type="checkbox"
                  className="h-4 w-4 rounded border-line-strong text-brand focus:ring-brand/25 dark:border-slate-600"
                  checked={remember}
                  onChange={(event) => setRemember(event.target.checked)}
                />
                记住登录
              </label>
              <button
                type="button"
                className="text-xs font-medium text-brand hover:text-brand-deep dark:text-teal-300 dark:hover:text-teal-200"
                onClick={() => switchMode('forgot')}
              >
                忘记密码？
              </button>
            </div>
          )}

          {error && (
            <p className="rounded-md bg-rose-50 px-3 py-2 text-sm text-rose-600 dark:bg-rose-500/10 dark:text-rose-300">
              {error}
            </p>
          )}

          {info && (
            <p className="rounded-md bg-teal-50 px-3 py-2 text-sm text-teal-700 dark:bg-teal-500/10 dark:text-teal-200">
              {info}
            </p>
          )}

          <button
            className="btn-primary w-full py-2.5"
            type="submit"
            disabled={
              loading ||
              !email ||
              !password ||
              (mode === 'register' && (!name.trim() || !confirmPassword || !code.trim())) ||
              (mode === 'forgot' && (!confirmPassword || !code.trim()))
            }
          >
            {loading
              ? mode === 'login'
                ? '登录中…'
                : mode === 'register'
                  ? '创建中…'
                  : '重置中…'
              : mode === 'login'
                ? '登录'
                : mode === 'register'
                  ? '创建账号'
                  : '重置密码'}
            {!loading && <ArrowRight size={16} />}
          </button>
        </form>

        <div className="mt-5 text-center text-sm text-ink-muted dark:text-slate-400">
          {mode === 'login' && (
            <>
              还没有账号？
              <button
                type="button"
                className="ml-1 font-medium text-brand hover:text-brand-deep dark:text-teal-300 dark:hover:text-teal-200"
                onClick={() => switchMode('register')}
              >
                注册
              </button>
            </>
          )}
          {mode === 'register' && (
            <>
              已有账号？
              <button
                type="button"
                className="ml-1 font-medium text-brand hover:text-brand-deep dark:text-teal-300 dark:hover:text-teal-200"
                onClick={() => switchMode('login')}
              >
                登录
              </button>
            </>
          )}
          {mode === 'forgot' && (
            <>
              想起密码了？
              <button
                type="button"
                className="ml-1 font-medium text-brand hover:text-brand-deep dark:text-teal-300 dark:hover:text-teal-200"
                onClick={() => switchMode('login')}
              >
                返回登录
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  )
}

const TOKEN_KEY = 'planner-token'
const USER_KEY = 'planner-user'

export interface StoredUser {
  id: number
  email: string
  name: string
  is_admin?: boolean
  is_active?: boolean
}

const AUTH_EVENT = 'planner-auth-changed'

function removeKey(key: string) {
  window.localStorage.removeItem(key)
  window.sessionStorage.removeItem(key)
}

export function setAuth(token: string, user: StoredUser, remember: boolean) {
  const storage = remember ? window.localStorage : window.sessionStorage
  const other = remember ? window.sessionStorage : window.localStorage
  storage.setItem(TOKEN_KEY, token)
  storage.setItem(USER_KEY, JSON.stringify(user))
  other.removeItem(TOKEN_KEY)
  other.removeItem(USER_KEY)
}

export function getToken(): string | null {
  return window.localStorage.getItem(TOKEN_KEY) ?? window.sessionStorage.getItem(TOKEN_KEY)
}

export function getStoredUser(): StoredUser | null {
  const raw = window.localStorage.getItem(USER_KEY) ?? window.sessionStorage.getItem(USER_KEY)
  if (!raw) return null
  try {
    return JSON.parse(raw) as StoredUser
  } catch {
    return null
  }
}

export function updateStoredUser(user: StoredUser) {
  const storage = window.localStorage.getItem(TOKEN_KEY) ? window.localStorage : window.sessionStorage
  storage.setItem(USER_KEY, JSON.stringify(user))
}

export function clearAuth() {
  removeKey(TOKEN_KEY)
  removeKey(USER_KEY)
  window.dispatchEvent(new Event(AUTH_EVENT))
}

export function onAuthChange(listener: () => void): () => void {
  window.addEventListener(AUTH_EVENT, listener)
  return () => window.removeEventListener(AUTH_EVENT, listener)
}

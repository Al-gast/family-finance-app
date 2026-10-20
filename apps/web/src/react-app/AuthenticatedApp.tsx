import { useEffect, useState, type FormEvent } from 'react'
import {
  getAuthClient,
  getVerifiedSession,
  isNeonAuthConfigured,
  type VerifiedUser,
} from './auth-client'
import { PublicApp } from './App'

type AuthMode = 'login' | 'register'

function AuthPage() {
  const configured = isNeonAuthConfigured()
  const [mode, setMode] = useState<AuthMode>('login')
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [user, setUser] = useState<VerifiedUser | null>(null)
  const [loading, setLoading] = useState(configured)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)

  useEffect(() => {
    if (!configured) {
      return
    }

    let active = true
    void getVerifiedSession()
      .then((verifiedUser) => {
        if (active) {
          setUser(verifiedUser)
          setError(null)
        }
      })
      .catch(() => {
        if (active) {
          setError('Sesi tidak dapat diverifikasi. Coba lagi beberapa saat.')
        }
      })
      .finally(() => {
        if (active) {
          setLoading(false)
        }
      })

    return () => {
      active = false
    }
  }, [configured])

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setSubmitting(true)
    setError(null)
    setNotice(null)

    try {
      const client = getAuthClient()
      const result =
        mode === 'register'
          ? await client.signUp.email({ email, name: name.trim(), password })
          : await client.signIn.email({ email, password })

      if (result.error) {
        throw new Error(result.error.message ?? 'Authentication failed')
      }

      const verifiedUser = await getVerifiedSession(client)
      if (!verifiedUser) {
        if (mode === 'register') {
          setMode('login')
          setPassword('')
          setNotice(
            'Akun dibuat. Jika verifikasi email diwajibkan, periksa email sebelum login.',
          )
          return
        }
        throw new Error('The new session could not be verified')
      }

      setUser(verifiedUser)
      setPassword('')
    } catch {
      setError(
        mode === 'register'
          ? 'Pendaftaran gagal. Periksa data dan konfigurasi Neon Auth.'
          : 'Login gagal. Periksa email dan kata sandi.',
      )
    } finally {
      setSubmitting(false)
    }
  }

  async function handleLogout() {
    setSubmitting(true)
    setError(null)

    try {
      const result = await getAuthClient().signOut()
      if (result.error) {
        throw new Error(result.error.message ?? 'Sign out failed')
      }
      setUser(null)
    } catch {
      setError('Logout gagal. Coba lagi.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <main className="shell">
      <section className="auth-card" aria-labelledby="auth-title">
        <a className="back-link" href="/">
          ← Kembali
        </a>

        {!configured ? (
          <div className="auth-copy">
            <p className="eyebrow">Neon Managed Auth</p>
            <h1 id="auth-title">Konfigurasi lokal diperlukan.</h1>
            <p className="description">
              Tambahkan URL publik Neon Auth ke{' '}
              <code>VITE_NEON_AUTH_URL</code> untuk mengaktifkan pendaftaran dan
              login.
            </p>
          </div>
        ) : loading ? (
          <div className="auth-copy" aria-live="polite">
            <p className="eyebrow">Neon Managed Auth</p>
            <h1 id="auth-title">Memeriksa sesi…</h1>
          </div>
        ) : user ? (
          <div className="auth-copy">
            <p className="eyebrow">Sesi terverifikasi</p>
            <h1 id="auth-title">Anda sudah masuk.</h1>
            <p className="description">
              Identitas ini diverifikasi oleh Worker dari token Neon, bukan dari
              ID yang dikirim browser.
            </p>
            <dl className="identity">
              <div>
                <dt>Email</dt>
                <dd>{user.email ?? 'Tidak tersedia di token'}</dd>
              </div>
              <div>
                <dt>User ID</dt>
                <dd>{user.id}</dd>
              </div>
            </dl>
            {error ? <p className="form-error">{error}</p> : null}
            <button
              className="action button-action"
              disabled={submitting}
              onClick={() => void handleLogout()}
              type="button"
            >
              {submitting ? 'Memproses…' : 'Logout'}
            </button>
          </div>
        ) : (
          <div className="auth-copy">
            <p className="eyebrow">Neon Managed Auth</p>
            <h1 id="auth-title">
              {mode === 'register' ? 'Buat akun.' : 'Masuk ke akun.'}
            </h1>
            <form className="auth-form" onSubmit={handleSubmit}>
              {mode === 'register' ? (
                <label>
                  Nama
                  <input
                    autoComplete="name"
                    onChange={(event) => setName(event.target.value)}
                    required
                    type="text"
                    value={name}
                  />
                </label>
              ) : null}
              <label>
                Email
                <input
                  autoComplete="email"
                  onChange={(event) => setEmail(event.target.value)}
                  required
                  type="email"
                  value={email}
                />
              </label>
              <label>
                Kata sandi
                <input
                  autoComplete={
                    mode === 'register' ? 'new-password' : 'current-password'
                  }
                  minLength={8}
                  onChange={(event) => setPassword(event.target.value)}
                  required
                  type="password"
                  value={password}
                />
              </label>
              {error ? (
                <p className="form-error" role="alert">
                  {error}
                </p>
              ) : null}
              {notice ? (
                <p className="form-notice" role="status">
                  {notice}
                </p>
              ) : null}
              <button
                className="action button-action"
                disabled={submitting}
                type="submit"
              >
                {submitting
                  ? 'Memproses…'
                  : mode === 'register'
                    ? 'Daftar'
                    : 'Login'}
              </button>
            </form>
            <button
              className="mode-switch"
              onClick={() => {
                setError(null)
                setNotice(null)
                setMode(mode === 'register' ? 'login' : 'register')
              }}
              type="button"
            >
              {mode === 'register'
                ? 'Sudah punya akun? Login'
                : 'Belum punya akun? Daftar'}
            </button>
          </div>
        )}
      </section>
    </main>
  )
}

export function AuthenticatedApp() {
  if (window.location.pathname === '/auth') {
    return <AuthPage />
  }

  return <PublicApp />
}

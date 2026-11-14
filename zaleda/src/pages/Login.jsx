import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Eye, EyeOff } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { getRole, clearIdentity } from '../lib/auth'

const toPassword = (p) => p.trim().toUpperCase() + '-ZALEDA'

export default function Login() {
  const navigate = useNavigate()
  const [name, setName] = useState('')
  const [password, setPassword] = useState('')
  const [show, setShow] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    getRole().then((role) => {
      if (role) navigate(role === 'admin' ? '/admin' : '/', { replace: true })
    })
  }, [navigate])


  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')

    if (!name.trim() || !password) {
      setError('Enter your name and password.')
      return
    }

    setLoading(true)
    try {
      const email = `${name.trim().toLowerCase().replace(/\s+/g, '.')}@zaleda.app`
      const { error: authError } = await supabase.auth.signInWithPassword({
        email,
        password: toPassword(password),
      })
      if (authError) throw authError

      const role = await getRole()
      if (!role) {
        clearIdentity()
        await supabase.auth.signOut()
        setError('Your account has no role yet. Please tell the organizer.')
        return
      }
      navigate(role === 'admin' ? '/admin' : '/', { replace: true })
    } catch {
      setError('Wrong name or password. Try again.')
    } finally {
      setLoading(false)
    }
  }

  const inputCls =
    'w-full rounded-xl border border-white/40 bg-black/30 px-4 py-3.5 text-base text-white placeholder-white/30 outline-none transition focus:border-brand focus:ring-2 focus:ring-brand/40'

  return (
    <div className="flex min-h-dvh items-center justify-center px-5 py-10">

      <form
        onSubmit={handleSubmit}
        className="w-full max-w-sm rounded-3xl border border-white/20 bg-white/5 p-7 shadow-2xl backdrop-blur-xl md:max-w-md md:p-10"
      >
        {/* logo placeholder */}
        <div className="mx-auto flex h-32 w-32 items-center justify-center text-xs font-semibold tracking-widest text-white/70">
          <img
            src="/logo-white.png"
            alt="SZHD"
            className="h-[clamp(6rem,24dvh,15rem)] w-auto max-w-full object-contain"
          />
        </div>
        {/* when you have the real logo, replace the box above with:
        <img src="/logo.png" alt="SXHD" className="mx-auto h-24 w-24 object-contain" /> */}

        <h1 className="mt-5 text-center text-2xl font-bold">Welcome to ZALEDA 2.0</h1>

        <div className="mt-7 space-y-5">
          <div>
            <label htmlFor="name" className="mb-1.5 block text-sm text-white/80">
              Name
            </label>
            <input
              id="name"
              type="text"
              autoComplete="username"
              autoCapitalize="words"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Your name"
              className={inputCls}
            />
          </div>

          <div>
            <label htmlFor="password" className="mb-1.5 block text-sm text-white/80">
              Password
            </label>
            <div className="relative">
              <input
                id="password"
                type={show ? 'text' : 'password'}
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Your password"
                className={`${inputCls} pr-12`}
              />
              <button
                type="button"
                onClick={() => setShow((s) => !s)}
                aria-label={show ? 'Hide password' : 'Show password'}
                className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-white/60"
              >
                {show ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
              </button>
            </div>
          </div>
        </div>

        {error && (
          <p className="mt-4 rounded-xl border border-red-500/40 bg-red-500/15 px-4 py-2.5 text-sm text-red-200">
            {error}
          </p>
        )}

        <button
          type="submit"
          disabled={loading}
          className="mt-7 w-full rounded-full bg-brand py-4 text-lg font-bold text-white shadow-lg shadow-brand/30 transition active:scale-95 disabled:opacity-60"
        >
          {loading ? 'Logging in...' : 'Login'}
        </button>
      </form>
    </div>
  )
}
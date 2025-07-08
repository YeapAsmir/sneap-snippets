'use client'
// Misc
import { Button }    from '@/components/button';
import {
    Checkbox,
    CheckboxField
}                    from '@/components/checkbox';
import {
    Field,
    Label
}                    from '@/components/fieldset';
import { Heading }   from '@/components/heading';
import { Input }     from '@/components/input';
import { useAuth }   from '@/hooks/useAuth';
import { useRouter } from 'next/navigation';
import { useState }  from 'react';

export function LoginForm() {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')

  const { login, loading, error, setError } = useAuth()
  const router = useRouter()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    const response = await login({
      username,
      password
    })

    if (response.success) {
      router.push('/')
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSubmit(e)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="grid w-full max-w-sm grid-cols-1 gap-5">
      <Heading>Sign in to your account</Heading>

      {error && (
        <div className="rounded-lg px-2.5 py-1.5 ring-1 ring-inset ring-rose-200 bg-rose-50">
          <p className="text-sm text-red-500">{error}</p>
        </div>
      )}

      <Field>
        <Label>Username</Label>
        <Input
          type="text"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          onKeyDown={handleKeyDown}
          required
          autoFocus
        />
      </Field>

      <Field>
        <Label>Password</Label>
        <Input
          type='password'
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          onKeyDown={handleKeyDown}
          required
        />
      </Field>

      <Button type="submit" className="w-full" disabled={loading}>
        {loading ? (
          <span className="flex items-center">
            <svg className="mr-2 -ml-1 h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
              />
            </svg>
            Signing in...
          </span>
        ) : (
          'Sign in'
        )}
      </Button>
    </form>
  )
}

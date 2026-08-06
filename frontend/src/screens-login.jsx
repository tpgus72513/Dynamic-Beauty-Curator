import React from 'react'

import { normalizeNickname } from './profile'
import { Button } from './ui'


export function ScreenLogin({ ctx }) {
  const [nickname, setNickname] = React.useState('')
  const [error, setError] = React.useState('')

  const submit = (event) => {
    event.preventDefault()
    try {
      ctx.login(normalizeNickname(nickname))
    } catch (validationError) {
      setError(validationError.message)
    }
  }

  return (
    <div className="screen login-screen anim-fade">
      <div className="login-contour" aria-hidden="true">
        <span />
        <span />
        <span />
        <div>DBC</div>
      </div>

      <form className="login-card" onSubmit={submit} noValidate>
        <div className="login-kicker">
          <span />
          LOCAL PROFILE
        </div>
        <h1 className="h-display">어떻게<br />불러드릴까요?</h1>
        <p className="t-body">
          닉네임은 이 기기의 로컬 프로필에만 저장됩니다.
          계정이나 비밀번호는 필요하지 않아요.
        </p>

        <div className="login-field">
          <label htmlFor="nickname">닉네임</label>
          <div className="login-input-wrap">
            <input
              id="nickname"
              name="nickname"
              value={nickname}
              maxLength={12}
              autoComplete="nickname"
              autoFocus
              placeholder="예: 민지"
              aria-describedby={error ? 'nickname-error' : 'nickname-hint'}
              aria-invalid={Boolean(error)}
              onChange={(event) => {
                setNickname(event.target.value)
                if (error) setError('')
              }}
            />
            <span>{nickname.length}/12</span>
          </div>
          {error ? (
            <p id="nickname-error" className="login-error" role="alert">{error}</p>
          ) : (
            <p id="nickname-hint" className="login-hint">언제든 마이 페이지에서 로그아웃할 수 있어요.</p>
          )}
        </div>

        <Button type="submit" variant="primary" size="xl" fullWidth>
          계속하기
        </Button>
      </form>
    </div>
  )
}

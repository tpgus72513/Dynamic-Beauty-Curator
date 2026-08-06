import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'

import App from './App'
import { ScreenLogin } from './screens-login'


vi.mock('./api/client', () => ({
  getRecommend: vi.fn(() => new Promise(() => {})),
}))


describe('nickname login screen', () => {
  it('submits a trimmed nickname', async () => {
    const user = userEvent.setup()
    const login = vi.fn()
    render(<ScreenLogin ctx={{ login }} />)

    await user.type(screen.getByLabelText('닉네임'), '  민지  ')
    await user.click(screen.getByRole('button', { name: '계속하기' }))

    expect(login).toHaveBeenCalledWith('민지')
  })

  it('shows an actionable validation error for whitespace', async () => {
    const user = userEvent.setup()
    render(<ScreenLogin ctx={{ login: vi.fn() }} />)

    await user.type(screen.getByLabelText('닉네임'), '   ')
    await user.click(screen.getByRole('button', { name: '계속하기' }))

    expect(screen.getByRole('alert')).toHaveTextContent('닉네임을 입력')
  })

  it('explains that the nickname is a local profile', () => {
    render(<ScreenLogin ctx={{ login: vi.fn() }} />)

    expect(screen.getByText(/로컬 프로필/)).toBeVisible()
  })
})


describe('profile routing', () => {
  it('starts at login on a device without a nickname', () => {
    render(<App />)

    expect(screen.getByLabelText('닉네임')).toBeVisible()
  })

  it('shows the stored nickname on home and clears it on logout', async () => {
    const user = userEvent.setup()
    localStorage.setItem('dbc.nickname', '민지')
    render(<App />)

    expect(screen.getByText(/민지님/)).toBeVisible()
    await user.click(screen.getByRole('button', { name: '마이 페이지' }))
    expect(screen.getByText('민지', { exact: true })).toBeVisible()
    expect(screen.getByText(/이 기기에 저장된 로컬 프로필/)).toBeVisible()

    await user.click(screen.getByRole('button', { name: '로그아웃' }))

    expect(screen.getByLabelText('닉네임')).toBeVisible()
    expect(localStorage.getItem('dbc.nickname')).toBeNull()
  })
})

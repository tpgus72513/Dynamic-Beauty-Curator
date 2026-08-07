import { describe, expect, it } from 'vitest'

import {
  clearNickname,
  normalizeNickname,
  readNickname,
  saveNickname,
} from './profile'


describe('local nickname profile', () => {
  it('trims and stores a valid nickname', () => {
    expect(saveNickname('  민지  ')).toBe('민지')
    expect(readNickname()).toBe('민지')
  })

  it('rejects empty and longer-than-12 nicknames', () => {
    expect(() => normalizeNickname('   ')).toThrow('닉네임')
    expect(() => normalizeNickname('1234567890123')).toThrow('12')
  })

  it('ignores and removes an invalid nickname already stored on the device', () => {
    localStorage.setItem('dbc.nickname', '1234567890123')

    expect(readNickname()).toBe('')
    expect(localStorage.getItem('dbc.nickname')).toBeNull()
  })

  it('clears only the nickname key', () => {
    localStorage.setItem('unrelated', 'keep-me')
    saveNickname('민지')

    clearNickname()

    expect(readNickname()).toBe('')
    expect(localStorage.getItem('unrelated')).toBe('keep-me')
  })
})

export const PROFILE_STORAGE_KEY = 'dbc.nickname'


export function normalizeNickname(value) {
  const nickname = String(value ?? '').trim()
  if (!nickname) throw new Error('닉네임을 입력해 주세요.')
  if (nickname.length > 12) throw new Error('닉네임은 12자 이하여야 합니다.')
  return nickname
}


export function readNickname(storage = localStorage) {
  return storage.getItem(PROFILE_STORAGE_KEY)?.trim() || ''
}


export function saveNickname(value, storage = localStorage) {
  const nickname = normalizeNickname(value)
  storage.setItem(PROFILE_STORAGE_KEY, nickname)
  return nickname
}


export function clearNickname(storage = localStorage) {
  storage.removeItem(PROFILE_STORAGE_KEY)
}

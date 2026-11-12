const KEY = 'spy-game:nickname'

export function loadNickname(): string {
  try {
    return window.localStorage.getItem(KEY) ?? ''
  } catch {
    return ''
  }
}

export function saveNickname(nickname: string): void {
  try {
    window.localStorage.setItem(KEY, nickname)
  } catch {
    // Storage blocked: the nickname just is not remembered.
  }
}

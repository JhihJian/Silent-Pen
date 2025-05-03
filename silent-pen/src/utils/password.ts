const PASSWORD_KEY = 'diary_password';

export function setPassword(pwd: string) {
  localStorage.setItem(PASSWORD_KEY, pwd);
}

export function getPassword(): string | null {
  return localStorage.getItem(PASSWORD_KEY);
}

export function clearPassword() {
  localStorage.removeItem(PASSWORD_KEY);
} 
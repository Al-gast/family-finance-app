import { PublicApp } from './App'
import { LocalFinanceApp } from './LocalFinanceApp'

export function LocalFirstApp() {
  return window.location.pathname.startsWith('/app') ? (
    <LocalFinanceApp />
  ) : (
    <PublicApp />
  )
}


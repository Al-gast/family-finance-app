import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { LocalFirstApp } from './LocalFirstApp'

const rootElement = document.getElementById('root')
if (!rootElement) throw new Error('Root element was not found')

createRoot(rootElement).render(
  <StrictMode>
    <LocalFirstApp />
  </StrictMode>,
)


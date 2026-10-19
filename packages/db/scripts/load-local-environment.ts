import { config } from 'dotenv'

config({
  path: new URL('../../../apps/web/.dev.vars', import.meta.url),
  quiet: true,
})


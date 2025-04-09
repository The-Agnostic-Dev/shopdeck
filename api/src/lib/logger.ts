import { config } from '../config.js'

const LEVELS = { debug: 10, info: 20, warn: 30, error: 40 } as const
type Level = keyof typeof LEVELS

const threshold = LEVELS[config.LOG_LEVEL]

function write(level: Level, msg: string, fields?: Record<string, unknown>) {
  if (LEVELS[level] < threshold) return
  const line = JSON.stringify({ t: new Date().toISOString(), level, msg, ...fields })
  if (level === 'error' || level === 'warn') process.stderr.write(line + '\n')
  else process.stdout.write(line + '\n')
}

export const logger = {
  debug: (msg: string, fields?: Record<string, unknown>) => write('debug', msg, fields),
  info: (msg: string, fields?: Record<string, unknown>) => write('info', msg, fields),
  warn: (msg: string, fields?: Record<string, unknown>) => write('warn', msg, fields),
  error: (msg: string, fields?: Record<string, unknown>) => write('error', msg, fields),
  child(base: Record<string, unknown>) {
    return {
      debug: (msg: string, f?: Record<string, unknown>) => write('debug', msg, { ...base, ...f }),
      info: (msg: string, f?: Record<string, unknown>) => write('info', msg, { ...base, ...f }),
      warn: (msg: string, f?: Record<string, unknown>) => write('warn', msg, { ...base, ...f }),
      error: (msg: string, f?: Record<string, unknown>) => write('error', msg, { ...base, ...f }),
    }
  },
}

import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function pluralise(n: number, one: string, many = `${one}s`) {
  return `${n.toLocaleString('en-NG')} ${n === 1 ? one : many}`
}

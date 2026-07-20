'use client'

import { useSyncExternalStore } from 'react'

function subscribe(callback: () => void): () => void {
  const query = window.matchMedia('(prefers-reduced-motion: reduce)')
  query.addEventListener('change', callback)
  return () => query.removeEventListener('change', callback)
}

function getSnapshot(): boolean {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

function getServerSnapshot(): boolean {
  return false
}

export function useReducedMotion(): boolean {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot)
}

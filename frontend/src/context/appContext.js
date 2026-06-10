import { createContext, useContext } from 'react'

export const AppContext = createContext(null)

export function useAppState() {
  const ctx = useContext(AppContext)
  if (!ctx) throw new Error('useAppState must be used within an AppProvider')
  return ctx
}

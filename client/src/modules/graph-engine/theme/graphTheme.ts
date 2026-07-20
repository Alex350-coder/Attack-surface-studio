'use client'

import { createContext, useContext } from 'react'

export interface GraphTheme {
  motion: {
    fast: number
    normal: number
    slow: number
    idleDrift?: {
      enabled?: boolean
      amplitudeRange?: [number, number]
      durationRange?: [number, number]
    }
  }
}

export const defaultGraphTheme: GraphTheme = {
  motion: {
    fast: 150,
    normal: 300,
    slow: 600,
    idleDrift: {
      enabled: true,
      amplitudeRange: [4, 9],
      durationRange: [6000, 12000],
    },
  },
}

export const GraphThemeContext = createContext<GraphTheme>(defaultGraphTheme)

export function useGraphTheme(): GraphTheme {
  return useContext(GraphThemeContext)
}

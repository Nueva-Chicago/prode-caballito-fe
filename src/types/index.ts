export interface User {
  id: string
  nombre: string
  email: string
  rol: 'usuario' | 'admin'
  idioma_pref: 'es' | 'pt'
  tema_equipo: string
  email_verified: boolean
  foto_url?: string
  created_at?: string
}

export interface AuthState {
  user: User | null
  token: string | null
  refreshToken: string | null
}

export interface Match {
  id: string
  home_team: string
  away_team: string
  home_team_pt?: string
  away_team_pt?: string
  start_time: string
  time_cutoff: string
  halftime_minutes: number
  estado: 'pending' | 'live' | 'finished'
  finished: boolean
  resultado_local?: number
  resultado_visitante?: number
  planilla_id?: string
  tournament_id?: string
  tournament_name?: string
  tournament_fase?: string
}

export interface Bet {
  id: string
  planilla_id: string
  match_id: string
  goles_local: number
  goles_visitante: number
  puntos_obtenidos?: number
  bonus_aplicado?: boolean
  home_team?: string
  away_team?: string
  start_time?: string
  estado?: string
  resultado_local?: number
  resultado_visitante?: number
}

export interface Planilla {
  id: string
  user_id: string
  nombre_planilla: string
  precio_pagado: boolean
  puntos_totales?: number
  exactos_count?: number
  total_bets?: number
  created_at?: string
}

export interface RankingEntry {
  planilla_id: string
  nombre_planilla: string
  user_id: string
  user_name: string
  user_avatar?: string
  puntos_totales: number
  exactos_count: number
  aciertos_celeste: number
  aciertos_rojo: number
  aciertos_verde: number
  aciertos_amarillo: number
  position: number
  precio_pagado: boolean
  is_virtual?: boolean
}

export interface Tournament {
  id: string
  name: string
  description?: string
  fase: string
  start_date?: string
  end_date?: string
  status?: string
  is_active: boolean
  finished_count?: number   // partidos terminados (del endpoint público)
  first_match_time?: string
}

export interface Notification {
  id: string
  user_id: string
  type: string
  title: string
  message: string
  read: boolean
  created_at: string
  data?: Record<string, unknown>
}

export interface Message {
  id: string
  sender_id: string
  receiver_id: string
  content: string
  read: boolean
  created_at: string
  sender_nombre?: string
  receiver_nombre?: string
}

export interface Comment {
  id: string
  user_id: string
  user_name: string
  user_avatar?: string
  content: string
  target_type: string
  created_at: string
}

export interface Score {
  puntos: number
  bonus: boolean
  detalle: {
    acerto_global: boolean
    acerto_exacto_local: boolean
    acerto_exacto_visitante: boolean
    exactos_count: number
    total_goles: number
  }
}

export type PointColor = 'celeste' | 'rojo' | 'verde' | 'amarillo' | 'gris'

export const TEAM_THEMES: Record<string, { primary: string; secondary: string; name: string }> = {
  neutral:      { primary: '#0042A5', secondary: '#FFDF00', name: 'Neutral' },
  boca:         { primary: '#001A4B', secondary: '#FFDF00', name: 'Boca Juniors' },
  river:        { primary: '#CC0000', secondary: '#FFFFFF', name: 'River Plate' },
  independiente:{ primary: '#CC0000', secondary: '#FFFFFF', name: 'Independiente' },
  racing:       { primary: '#75AADB', secondary: '#FFFFFF', name: 'Racing Club' },
  sanlorenzo:   { primary: '#001A4B', secondary: '#CC0000', name: 'San Lorenzo' },
  estudiantes:  { primary: '#CC0000', secondary: '#FFFFFF', name: 'Estudiantes' },
  huracan:      { primary: '#FFFFFF', secondary: '#CC0000', name: 'Huracán' },
}

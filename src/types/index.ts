export interface User {
  id: string
  nombre: string
  email: string
  rol: 'usuario' | 'admin'
  idioma_pref: 'es' | 'pt'
  tema_equipo: string
  email_verified: boolean
  foto_url?: string
  whatsapp_number?: string
  whatsapp_consent?: boolean
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
  tournament_ids?: string[]
}

export interface RankingEntry {
  planilla_id: string
  nombre_planilla: string
  user_id: string
  user_name: string
  user_avatar?: string
  whatsapp_number?: string
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

export const TEAM_THEMES: Record<string, {
  primary: string; secondary: string; name: string
  pattern?: string  // CSS background para el preview strip de la camiseta
  fg?: string       // color de ícono/punto sobre el pattern
  ring?: string     // color del borde activo
}> = {
  // Neutral — azul/amarillo genérico de fútbol
  neutral: {
    primary: '#0042A5', secondary: '#FFDF00', name: 'Neutral',
  },
  // Boca Juniors — azul profundo + banda amarilla horizontal
  boca: {
    primary: '#003087', secondary: '#F5C500', name: 'Boca Juniors',
    pattern: 'linear-gradient(180deg, #001A4B 0% 33%, #F5C500 33% 67%, #001A4B 67% 100%)',
    fg: '#F5C500', ring: '#F5C500',
  },
  // River Plate — banda diagonal roja sobre blanco ("La Banda")
  river: {
    primary: '#C8102E', secondary: '#FFFFFF', name: 'River Plate',
    pattern: 'linear-gradient(135deg, #FFFFFF 30%, #C8102E 30%, #C8102E 70%, #FFFFFF 70%)',
    fg: '#C8102E', ring: '#C8102E',
  },
  // Independiente — rojo oscuro/carmín puro ("El Rojo")
  independiente: {
    primary: '#8B0000', secondary: '#FFFFFF', name: 'Independiente',
    ring: '#8B0000',
  },
  // Racing Club — celeste cielo + blanco ("La Academia")
  racing: {
    primary: '#4BA6D1', secondary: '#FFFFFF', name: 'Racing Club',
    ring: '#4BA6D1',
  },
  // San Lorenzo — franjas verticales azul y rojo ("El Ciclón")
  sanlorenzo: {
    primary: '#0033A0', secondary: '#CC0000', name: 'San Lorenzo',
    pattern: 'repeating-linear-gradient(90deg, #0033A0 0px, #0033A0 12px, #CC0000 12px, #CC0000 24px)',
    fg: '#FFFFFF', ring: '#CC0000',
  },
  // Estudiantes de La Plata — franjas finas rojo/blanco ("Pincharratas")
  estudiantes: {
    primary: '#9E001A', secondary: '#FFFFFF', name: 'Estudiantes',
    pattern: 'repeating-linear-gradient(90deg, #9E001A 0px, #9E001A 5px, #FFFFFF 5px, #FFFFFF 10px)',
    fg: '#9E001A', ring: '#9E001A',
  },
  // Huracán — diagonal negro y rojo ("El Globo")
  huracan: {
    primary: '#1A1A1A', secondary: '#FFFFFF', name: 'Huracán',
    pattern: 'repeating-linear-gradient(45deg, #1A1A1A 0px, #1A1A1A 8px, #D42B2B 8px, #D42B2B 16px)',
    fg: '#FFFFFF', ring: '#D42B2B',
  },
}

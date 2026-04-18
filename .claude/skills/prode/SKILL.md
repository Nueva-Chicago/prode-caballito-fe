---
name: prode
description: Contexto completo del proyecto Prode Caballito — arquitectura, repos, infra AWS, patrones de código, convenciones, credenciales de test y decisiones técnicas tomadas. Usar cuando el usuario mencione prodecaballito, prode, apuestas, planilla, matriz, o cualquier tarea relacionada con ese proyecto.
tools: Read, Glob, Grep, Bash, Edit, Write
---

# Prode Caballito — Skill de contexto

Cuando se invoca este skill, cargás todo el conocimiento acumulado del proyecto y operás como si ya hubieras leído el código. No preguntes cosas que están aquí — actuá directamente.

---

## 1. Qué es el proyecto

**prodecaballito.com** — PRODE (quiniela deportiva) online para el grupo de Caballito. Los usuarios crean "planillas", pronostican resultados de partidos de fútbol y acumulan puntos según exactitud. Hay torneos, ranking global, matriz de comparación entre jugadores y mensajería interna.

---

## 2. Repos y acceso

| Repo | URL | Rama principal |
|------|-----|----------------|
| **Frontend** | `github.com/cfdelrio/prode-caballito-fe` | `main` |
| **Backend** | `github.com/cfdelrio/prode-caballito-be` | `main` |

- Working dir habitual del FE: `/tmp/prode-caballito-fe`
- Working dir habitual del BE (fuente compilada): `/tmp/prode-api-src`

---

## 3. Stack técnico

### Frontend
- **React 19 + TypeScript + Vite 6**
- **Tailwind CSS v4** (config inline, sin tailwind.config.js)
- **Zustand** para estado global (`authStore`, `toastStore`, `teamBadgesStore`)
- **React Router v6** (SPA, rutas protegidas con `RequireAuth`)
- **Axios** — cliente HTTP en `src/api/client.ts`
- **i18n** propio: objetos `es`/`pt` en `src/i18n/`, hook `useT()` devuelve el objeto según `user.idioma_pref`
- **Vite PWA** con service worker — intercepta rutas, ojo al trabajar con páginas estáticas

### Backend
- **Node.js + Express** (compilado a JS, fuente real en el repo be)
- **AWS Lambda** (runtime Node.js 20) + **API Gateway**
- **PostgreSQL en RDS**: `prode-db.c850syqeokik.us-east-1.rds.amazonaws.com`
- Lambda principal: `prode-api` — región `us-east-1`

### Infra
- **Frontend**: S3 (`prodecaballito-fe`) + CloudFront — región `us-east-1`
- **CI/CD**: GitHub Actions → `deploy.yml` hace `vite build` + sync S3 + invalidar CloudFront
- **Dominio**: `prodecaballito.com` (CloudFront)
- **API base URL**: `https://t49euho172.execute-api.us-east-1.amazonaws.com/prod/api`

---

## 4. Estructura de archivos clave (FE)

```
src/
  api/client.ts          ← axios instance, interceptor JWT + refresh
  store/
    authStore.ts         ← user, token, setAuth, logout, isAdmin()
    toastStore.ts        ← addToast(msg, type)
    teamBadgesStore.ts   ← badges por equipo
  hooks/
    useT.ts              ← hook i18n
    useCountdown.ts      ← countdown en tiempo real + formatCountdown()
  i18n/
    es.ts                ← traducciones español (fuente de verdad del tipo T)
    pt.ts                ← traducciones portugués (debe satisfacer tipo T)
  pages/
    Home.tsx             ← dashboard: hero, CTA pendientes, podio, próximos partidos
    Apuestas.tsx         ← página principal de apuestas con polling live
    Matriz.tsx           ← matriz de comparación entre jugadores
    Ranking.tsx          ← ranking global y por torneo
    Profile.tsx          ← perfil, tema visual, planillas, WhatsApp
    Planilla.tsx         ← detalle de una planilla
    Messages.tsx         ← chat entre usuarios
  components/
    match/MatchCard.tsx  ← tarjeta de partido con inline betting
    ui/Toast.tsx         ← sistema de toasts
  types/index.ts         ← Match, Bet, Planilla, RankingEntry, Tournament, User
  utils/theme.ts         ← applyTheme(teamSlug) → CSS variables
  test/                  ← tests vitest (excluido del tsconfig de producción)

public/                  ← archivos estáticos que sobreviven el build
  landing.html
  landing-mundial.html
  landing-premios.html
  landing-amigos.html

e2e/                     ← tests Playwright contra prodecaballito.com
  auth.setup.ts
  home-cta.spec.ts
  matriz-filter.spec.ts
```

---

## 5. Patrones de código establecidos

### Traducciones
```typescript
// Agregar clave nueva → siempre en ES primero (define el tipo), luego PT
// es.ts
home: {
  ctaTitle: (n: number) => n === 1 ? 'Tenés 1 pronóstico pendiente' : `Tenés ${n} pronósticos pendientes`,
}
// pt.ts satisface el mismo tipo T
```

### Llamadas API
```typescript
// Siempre usar api de @/api/client — nunca fetch directo
const res = await api.get('/matches?limit=200')
// Los endpoints devuelven { success: true, data: ... }
```

### Toasts
```typescript
const { addToast } = useToastStore()
addToast('Mensaje ✓', 'success')  // tipos: success | error | warning | info
```

### Temas visuales
```typescript
// CSS variables: --theme-primary, --theme-secondary, --theme-nav-bg, --theme-accent
// En Tailwind usar clases t-* definidas en index.css:
// t-bg-nav, t-text-nav, t-bg-primary, t-text-primary, t-bg-secondary, t-text-accent
// t-gradient-hero
```

### Countdown
```typescript
import { useCountdown, formatCountdown } from '@/hooks/useCountdown'
// formatCountdown(h, m, s):
//   ≥48h → "Xd Yh"  (regresión corregida: nunca mostrar "1311h")
//   >0h  → "Xh YYm"
//   >0m  → "Xm YYs"
//   else → "Xs"
```

---

## 6. Base de datos — tablas principales

| Tabla | Descripción |
|-------|-------------|
| `users` | id, nombre, email, rol, foto_url, idioma_pref, tema_equipo, whatsapp_number, whatsapp_consent |
| `planillas` | id, user_id, nombre_planilla, precio_pagado |
| `matches` | id, home_team, away_team, start_time, time_cutoff, estado, resultado_local, resultado_visitante |
| `bets` | id, planilla_id, match_id, goles_local, goles_visitante, puntos_obtenidos, bonus_aplicado |
| `tournaments` | id, name, fase, start_date |
| `messages` | id, sender_id, receiver_id, content, read_at, created_at |
| `message_counters` | user_a, user_b, counter_a_to_b, counter_b_to_a, blocked |
| `notifications` | user_id, type, payload, status, sent_at |

**Conexión Lambda → RDS**: via `db/connection.js` en el Lambda, variables de entorno `DB_HOST`, `DB_USER`, `DB_PASSWORD`, `DB_NAME`.

**Ejecutar SQL ad-hoc**: Lambda `prode-sql-temp` en us-east-1. Payload:
```bash
aws lambda invoke --function-name prode-sql-temp \
  --payload "$(echo '{"sql":"SELECT ..."}' | base64)" \
  --cli-binary-format raw-in-base64-out out.json
```

---

## 7. Roles de usuario

| Rol | Capacidades |
|-----|-------------|
| `admin` | Todo: publicar resultados, enviar broadcast, ver planillas bloqueadas, aprobar pagos |
| `moderator` | Enviar broadcast |
| `user` | Apostar, ver ranking, chat |

**Cuenta de test admin**: `cfdelrio@gmail.com` / `qatar2022`

---

## 8. Endpoints API principales

```
POST /auth/login          → { token, refreshToken, user }
POST /auth/register
POST /auth/refresh

GET  /matches?limit=N     → { matches: Match[] }
GET  /bets/planillas/:id/bets
POST /bets/planillas/:id/bets
DELETE /bets/:betId

GET  /planillas           → planillas del usuario autenticado
POST /planillas
DELETE /planillas/:id

GET  /ranking?limit=N&tournament_id=X
GET  /matriz?planilla_id=X&tournament_id=X

GET  /users/:id
PUT  /users/:id           → acepta: nombre, foto_url, tema_equipo, idioma_pref, whatsapp_number, whatsapp_consent

GET  /messages/users      → lista de usuarios para chatear
GET  /messages/:otherUserId
POST /messages/:otherUserId
GET  /messages/conversations
POST /messages/broadcast  → solo admin/moderator

GET  /tournaments
GET  /notifications
```

---

## 9. Sistema de puntos

| Color badge | Puntos | Condición |
|-------------|--------|-----------|
| `celeste` | 4 pts | Resultado exacto + partido con ≥4 goles (bonus +1) |
| `rojo` | 3 pts | Resultado exacto |
| `verde` | 2 pts | Ganador correcto + diferencia de goles correcta |
| `amarillo` | 1 pt | Ganador correcto |
| `gris` | 0 pts | Sin acierto |

---

## 10. Decisiones técnicas importantes

### Landing pages en `public/`
Las páginas de landing (`landing.html`, `landing-mundial.html`, etc.) están en `public/` — NO en `public/landing/`. Razón: el service worker de Vite PWA intercepta subdirectorios y redirige al login. Los paths planos (`/landing-mundial.html`) funcionan.

### Backend sin fuente original
El repo `prode-caballito-be` contiene el JS compilado (resultado del `tsc`). Para editar: modificar el `.js` directamente, comprimir en zip, hacer `aws lambda update-function-code`. La fuente TypeScript original se perdió — los `.js` son la fuente de verdad.

### TypeScript en tests
Los archivos de `src/test/` están excluidos de `tsconfig.app.json` (`"exclude": ["src/test"]`). Tienen sus propios mocks y vitest los type-chequea por separado. **No agregarlos de vuelta al tsconfig de producción.**

### Idioma por defecto
Si el navegador no tiene idioma configurado → castellano. Las landing pages usan `detectLang()` con `return 'es'` como fallback.

### Filtros Matriz (multi-select)
Estado: `filterColors: Set<string>`. Lógica: `filterColors.size > 0 && !filterColors.has(res.color)` → celda invisible. Un Set vacío = sin filtro = todo visible.

### WhatsApp en Matriz
Solo se muestra el ícono WhatsApp junto al nombre cuando `whatsapp_number` es no-null en la API (el backend filtra por `whatsapp_consent = true` antes de devolver el número).

---

## 11. Tests

### Unit/componente (vitest)
```bash
# En /tmp/prode-caballito-fe
node ./node_modules/vitest/vitest.mjs run
```
Archivos: `src/test/formatCountdown.test.ts`, `src/test/Home.cta.test.tsx`, `src/test/Matriz.filter.test.tsx`

### E2E (Playwright) — correr localmente
```bash
npx playwright install chromium
npx playwright test e2e/auth.setup.ts   # login, guarda sesión
npx playwright test                      # todos los specs
npx playwright test --ui                 # con UI interactiva
```
Apuntan a `https://www.prodecaballito.com`. Los specs se auto-skipean si el estado del usuario no cumple las condiciones (ej: sin pendientes).

### Regresión completa (API)
Existe un script de regresión con 29 tests que corre contra la API en vivo. Ver historial de conversaciones para el script exacto.

---

## 12. Deploy

### Frontend
```bash
# CI automático en push a main
# Manual si hace falta:
npm run build
aws s3 sync dist/ s3://prodecaballito-fe --delete
aws cloudfront create-invalidation --distribution-id <ID> --paths "/*"
```

### Backend (Lambda)
```bash
cd /tmp/prode-api-src
zip -r ../prode-api-new.zip .
aws lambda update-function-code \
  --function-name prode-api \
  --zip-file fileb://../prode-api-new.zip \
  --region us-east-1
```

---

## 13. Trabajo en progreso / roadmap UX

Plan de mejoras UX priorizado (generado como experto en UX en sesión anterior):

| # | Mejora | Estado |
|---|--------|--------|
| 1 | CTA "Te faltan N pronósticos" en Home | ✅ Implementado |
| 2 | Skeleton screens (reemplazar spinners) | ⏳ Pendiente |
| 3 | Errores de red visibles (catch silenciosos) | ⏳ Pendiente |
| 4 | Botón "volver" en chat mobile y Planilla | ⏳ Pendiente |
| 5 | Preview último mensaje en lista de chat | ⏳ Pendiente |
| 6 | Hover hint en Matriz y Ranking (cursor-pointer) | ⏳ Pendiente |
| 7 | Empty states consistentes (componente único) | ⏳ Pendiente |
| 8 | Pasos del registro con etiquetas | ⏳ Pendiente |

---

## 14. Comandos útiles frecuentes

```bash
# Ver logs Lambda
aws logs tail /aws/lambda/prode-api --follow --region us-east-1

# TypeScript check sin compilar
npx tsc --noEmit

# Build de producción
npm run build

# Ver usuarios admin en DB (via Lambda SQL)
# Payload: {"sql": "SELECT id, nombre, email, rol FROM users WHERE rol='admin'"}
```

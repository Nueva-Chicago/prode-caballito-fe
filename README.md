# Prode Caballito — Frontend

[![Coverage](https://img.shields.io/endpoint?url=https://gist.githubusercontent.com/cfdelrio/6eb515266a2c723d42eec2d6d5292979/raw/prode-caballito-fe-coverage.json)](https://github.com/cfdelrio/prode-caballito-fe/actions)

React 19 + TypeScript + Vite — frontend de [prodecaballito.com](https://prodecaballito.com)

## Stack

- React 19 + TypeScript + Vite 6
- Tailwind CSS v4
- Zustand (estado global)
- React Router v6
- Vitest + Testing Library (unit/component tests)

## Desarrollo local

```bash
npm install
npm run dev
```

## Tests

```bash
npm test                 # una sola corrida
npm run test:coverage    # con reporte de coverage
```

## Deploy

El deploy es automático via GitHub Actions al pushear a `main`:
- Frontend → S3 + CloudFront invalidation
- Tests con coverage report en cada PR

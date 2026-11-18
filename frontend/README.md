# BBG Frontend

Angular 22 standalone app for the BBG business management and marketplace platform.

## Commands

```bash
npm start                          # ng serve → http://localhost:4200
npx ng build --configuration development
npm run build                      # production build
npm test
npm run format
npm run format:check
```

## Conventions

- Coding standards: [`CODING_STANDARDS.md`](./CODING_STANDARDS.md)
- Agent skills / workflows: [`.agent/`](./.agent/) and [`AGENTS.md`](./AGENTS.md)
- Do not change UI or behaviour during standards-only refactors

## Stack

Angular 22, TypeScript ~6, RxJS 7.8, SCSS design tokens, signals + HttpClient. No Tailwind, PrimeNG or NgRx.

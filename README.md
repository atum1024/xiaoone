# Xiaoone User Frontend

This repository contains the Xiaoone user-side React frontend and the local shared frontend packages it depends on.

## Structure

- `merchant-react/`: user-side React app.
- `packages/chat-kit/`: shared chat and realtime API helpers.
- `packages/design-tokens/`: shared design tokens.
- `packages/react-ui/`: shared React UI primitives.

## Development

```bash
pnpm install
pnpm dev
```

The dev server uses port `5177`.

## Build

```bash
pnpm build
```

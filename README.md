# Voice Agent Mastra Demo

A monorepo containing a voice agent demo built with Mastra, mem0, and LiveKit.

## Project Structure

```
voice-agent-mastra-demo/
├── backend/          # Backend API with Mastra, mem0, LiveKit
├── frontend/         # Frontend UI (AG-UI)
├── shared/           # Shared utilities and types
└── package.json      # Root package.json for monorepo
```

## Prerequisites

- Node.js >= 18.0.0
- pnpm >= 8.0.0

## Getting Started

1. Install dependencies:
   ```bash
   pnpm install
   ```

2. Start development servers:
   ```bash
   pnpm dev
   ```

3. Build all packages:
   ```bash
   pnpm build
   ```

## Available Scripts

- `pnpm dev` - Start all development servers in parallel
- `pnpm build` - Build all packages
- `pnpm test` - Run tests across all packages
- `pnpm lint` - Run linting across all packages
- `pnpm clean` - Clean build artifacts

## Technologies

- **Backend**: Mastra, mem0, LiveKit
- **Frontend**: AG-UI
- **Package Manager**: pnpm
- **Monorepo**: pnpm workspaces

## Development

This is a monorepo using pnpm workspaces. Each package can be developed independently or together using the root scripts. 
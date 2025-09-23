# Module Federation Examples

A comprehensive collection of Module Federation patterns and implementations.

## Repository Structure

```
├── apps/                    # Module Federation example implementations
│   └── nextjs-cra/         # Next.js + Create React App example
│       ├── dashboard/       # Next.js 13 app (host)
│       ├── remote/          # React with react-app-rewired + SWC (remote)
│       └── cloud/           # React with CRACO + SWC (remote)
├── packages/                # Shared packages and utilities
├── scripts/                 # Build tools and benchmark utilities
└── docs/                    # Documentation and ADRs
```

## Quick Start

```bash
# Install dependencies
pnpm install

# Start all applications for nextjs-cra example
pnpm dev

# Run benchmarks
node scripts/benchmark.js
```

## Examples

### Next.js + Create React App (`apps/nextjs-cra/`)
Demonstrates Module Federation with mixed React versions and different build tools.

- **Dashboard**: Next.js 13 host (port 3000)
- **Remote**: React 18 with react-app-rewired (port 8081)
- **Cloud**: React 17 with CRACO (port 8082)

## Development

See [CLAUDE.md](./CLAUDE.md) for development guidelines and workflows.
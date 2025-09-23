# Next.js + Create React App Module Federation Example

This example demonstrates Module Federation with:
- **dashboard/**: Next.js 13 host application (port 3000)
- **remote/**: React 18 remote with react-app-rewired (port 8081)
- **cloud/**: React 17 remote with CRACO (port 8082)

## Quick Start

From the repository root:
```bash
# Install dependencies
pnpm install

# Start all applications
pnpm dev
```

## Architecture

- Mixed React versions (18 in dashboard/remote, 17 in cloud)
- Shared dependencies via Module Federation
- Dynamic imports of remote components
- Styled with @stitches/react (singleton shared)

See individual app directories for specific configuration details.
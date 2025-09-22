# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## IMPORTANT: Use Graphite for ALL Git Operations

**You MUST use Graphite (gt) for ALL changes. Never use git directly for commits or branches.**

### Stacking Rules
1. Break ALL work into small, focused PRs (<300 lines each)
2. Each PR should be independently reviewable and testable
3. Create a new branch for each logical change using `gt branch create <name>`
4. Commit using `gt commit -m "message"` 
5. Submit stacks using `gt stack submit`

### Stack Structure for Module Federation Changes

When implementing features, organize your Todos as a stack:

1. **Configuration Changes** - webpack, package.json, build configs
2. **Type Definitions** - TypeScript interfaces, shared types
3. **Core Implementation** - One component/module per PR
4. **Integration** - Connecting components, Module Federation setup
5. **Tests** - Test files in separate PR(s)
6. **Documentation** - README updates, comments

### Example Stack for New Features
```bash
# For adding a new shared component:
gt branch create feat/component-types        # TypeScript interfaces
gt branch create feat/component-impl         # Component implementation  
gt branch create feat/component-export       # Module Federation exposure
gt branch create test/component             # Tests
gt branch create docs/component             # Documentation

# Submit entire stack
gt stack submit
```

## Commands

### Development
- `pnpm dev` - Start all applications concurrently (dashboard on port 3000, remote on 8081, cloud on 8082)
- `pnpm build` - Build all packages using lerna
- `pnpm serve` - Serve production builds

### Package-specific commands (run from root with lerna)
- `lerna run dev --scope dashboard` - Start Next.js dashboard only
- `lerna run start --scope remote` - Start remote React app only
- `lerna run start --scope cloud` - Start cloud React app only
- `lerna run test --scope [package-name]` - Run tests for specific package
- `lerna run lint --scope dashboard` - Run Next.js linting for dashboard

### Package-specific commands (run from package directory)
- Dashboard: `pnpm dev`, `pnpm build`, `pnpm start`, `pnpm lint`
- Remote: `pnpm start`, `pnpm build`, `pnpm test`, `pnpm serve`
- Cloud: `pnpm start`, `pnpm build`, `pnpm test`, `pnpm serve`

## Architecture

This is a Module Federation example with three applications:

### Dashboard (Host) - `/dashboard`
- Next.js 13 application running on port 3000
- Consumes remote components from `remote` and `cloud` applications
- Module Federation configuration in `next.config.js`
- Uses React 18.2.0
- Imports remote components from:
  - `remote@http://localhost:8081/remote.js`
  - `cloud@http://localhost:8082/remote.js`

### Remote Application - `/remote`
- React 18.2.0 with react-app-rewired and SWC
- Runs on port 8081
- Exposes `./Button` component via Module Federation
- Configuration in `config-overrides.js`
- Uses customize-cra for webpack customization

### Cloud Application - `/cloud`
- React 17.0.2 with CRACO and SWC
- Runs on port 8082
- Exposes `./CloudButton` component via Module Federation
- Configuration in `craco.config.js`
- Uses legacy share scope for React compatibility

### Key Technical Details
- Uses pnpm workspaces with Lerna for monorepo management
- Mixed React versions: Dashboard and Remote use React 18, Cloud uses React 17
- Shared dependencies managed through Module Federation's `shared` configuration
- All apps use `@stitches/react` for styling (singleton shared)
- SWC used for faster compilation in remote and cloud apps

### Module Federation Flow
1. Dashboard (host) loads remote entry files from remote and cloud apps
2. Remote components are dynamically imported when needed
3. Shared dependencies (React, React-DOM, @stitches/react) are deduped based on version compatibility
4. Dashboard exposes its React version as `newReact` for potential sharing

## Development Workflow
1. Always run `pnpm dev` from root to start all applications together
2. Module Federation requires all apps to be running for proper development
3. Changes to exposed components in remote/cloud apps require a refresh of the dashboard
4. Build order matters: build remote apps before the host dashboard

## GitHub Issues and Stacking Strategy
We're transforming this into a comprehensive Module Federation examples repository. Track progress: https://github.com/acald-creator/module-federations-examples/issues

## Current Milestone: Foundation (Due Oct 1, 2025)
- Issue #2: Repository restructure
- Issue #3: Performance monitoring package
- Issue #5: Documentation overhaul

## How to Work on Issues with Stacking
For Issue #2 (Repository Restructure), create this stack:

```bash
gt branch create feat/repo-structure      # Create apps/ directory structure
gt branch create feat/move-apps          # Move existing apps to apps/nextjs-cra/
gt branch create feat/packages-setup     # Create packages/ directory
gt branch create feat/lerna-config       # Update lerna.json and package.json
gt branch create feat/scripts-setup      # Add benchmark scripts
gt branch create docs/restructure        # Update documentation
```

## For Issue #3 (Performance Monitoring), create this stack:

```bash
gt branch create feat/perf-package       # Create package structure
gt branch create feat/perf-core          # Core monitoring class
gt branch create feat/perf-mf-metrics    # Module Federation specific metrics
gt branch create feat/perf-web-vitals    # Web Vitals integration
gt branch create feat/perf-reporting     # Report generation
gt branch create test/perf-monitor       # Tests
gt branch create docs/perf-monitor       # Documentation
```

### Commit Message Format

Always use conventional commits with issue references:
- `feat: add performance monitoring core (#3)`
- `fix: resolve remote loading race condition`
- `docs: add ADR for module federation architecture (#5)`
- `perf: optimize shared dependency resolution`
- `refactor: simplify webpack configuration`
- `test: add integration tests for remote loading`

## Performance Benchmarking

When making changes that could affect performance:
1. Run baseline benchmark: `pnpm benchmark:before`
2. Make your changes in a stack
3. Run after benchmark: `pnpm benchmark:after`
4. Include results in PR description

### Key Metrics to Track
- Cold build time
- Hot reload time
- Bundle size (total and per chunk)
- Remote loading time
- First Contentful Paint (FCP)
- Time to Interactive (TTI)

## Adding New Module Federation Examples

When adding a new example, create this stack structure:
```bash
gt branch create feat/example-scaffold    # Directory and package.json
gt branch create feat/example-webpack     # Webpack/build configuration
gt branch create feat/example-host        # Host application
gt branch create feat/example-remote      # Remote application(s)
gt branch create feat/example-shared      # Shared dependencies config
gt branch create test/example            # Tests
gt branch create docs/example            # Documentation
gt stack submit                          # Submit entire stack for review
```

## Testing Requirements

Each PR in your stack should:
1. Pass existing tests
2. Include new tests if adding functionality
3. Not break other apps in the monorepo
4. Maintain or improve performance metrics

## Common Module Federation Patterns to Implement

1. **Version Isolation**: Running multiple React versions
2. **Dynamic Remotes**: Loading remotes at runtime
3. **Shared State**: State management across federated modules
4. **Error Boundaries**: Graceful fallbacks for failed remotes
5. **Performance Optimization**: Lazy loading, prefetching
6. **Cross-Framework**: React host with Vue/Angular remotes

## Working with Issues

When working on a GitHub issue:
1. Reference the issue number in branch names when possible
2. Include "Part of #X" or "Closes #X" in commit messages
3. Break large issues into multiple PRs in a stack
4. Update issue with PR links as you create them

## File Organization Standards

- Each Module Federation app should be self-contained in its directory
- Shared code goes in `packages/`
- Build scripts and tools go in `scripts/`
- Documentation goes in `docs/`
- Keep configuration files at the root of each app

## PR Description Template

When submitting PRs, include:

## Purpose
Closes #[issue-number] or Part of #[issue-number]

## Changes
- Brief description of what changed
- Why this approach was taken

## Testing
- [ ] All apps start correctly with `pnpm dev`
- [ ] No console errors
- [ ] Tests pass
- [ ] Performance metrics maintained or improved

## Stack Position
- Previous PR: #[number]
- Next PR: #[number]
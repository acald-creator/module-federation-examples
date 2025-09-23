# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## IMPORTANT: Use Graphite for ALL Git Operations

**You MUST use Graphite (gt) for ALL changes. Never use git directly for commits or branches.**

### Primary Graphite Commands
- **Instead of `git add . && git commit`:** Use `gt create -m "message"`
- **Instead of `git push`:** Use `gt submit --no-interactive`
- **Instead of `git checkout -b`:** Use `gt branch create <name>`
- **For commits on existing branch:** Use `gt commit -m "message"`
- **To view your stack:** Use `gt stack`
- **To navigate:** Use `gt up` and `gt down`

## MANDATORY: Stack Planning Before Code

**Before writing ANY code, you MUST:**

1. Present the complete stack structure
2. Show estimated lines of code per PR  
3. Confirm each PR will be atomic and pass CI
4. Get explicit user confirmation

### Stack Planning Template
```
Proposed Stack for [Feature/Fix] (#issue-number):
└── base-branch-name
    ├── feat/specific-change-1    (~X lines: description)
    ├── feat/specific-change-2    (~Y lines: description)
    ├── test/related-tests        (~Z lines: description)
    └── docs/documentation         (~N lines: description)

Each PR is atomic and will pass CI independently.
Confirm? (y/n)
```

**Wait for user confirmation before proceeding with implementation.**

### Stacking Rules
1. Break ALL work into small, focused PRs (<300 lines each, ideally <100)
2. Each PR should be independently reviewable and testable
3. Each PR MUST be atomic and pass CI on its own
4. Create a new branch for each logical change using `gt branch create <name>`
5. Commit using `gt create -m "message"` or `gt commit -m "message"`
6. Submit stacks using `gt submit --no-interactive`

### Stack Structure for Module Federation Changes

When implementing features, organize your Todos as a stack:

1. **Configuration Changes** - webpack, package.json, build configs
2. **Type Definitions** - TypeScript interfaces, shared types
3. **Core Implementation** - One component/module per PR
4. **Integration** - Connecting components, Module Federation setup
5. **Tests** - Test files in separate PR(s)
6. **Documentation** - README updates, comments

### Example Stack Planning

Before implementing, present this structure:

```
Proposed Stack for Performance Monitoring (#3):
└── feat/perf-monitor-base
    ├── feat/perf-package-setup      (~50 lines: package.json, structure)
    ├── feat/perf-core-class         (~150 lines: PerformanceMonitor class)
    ├── feat/perf-mf-metrics         (~200 lines: MF-specific tracking)
    ├── feat/perf-web-vitals         (~100 lines: Web Vitals integration)
    ├── test/perf-monitor-tests      (~200 lines: Unit tests)
    └── docs/perf-monitor-docs       (~100 lines: Documentation)

Each PR is atomic and will pass CI independently.
Confirm? (y/n)
```

### Example Stack for New Features
```bash
# For adding a new shared component:
gt branch create feat/component-types        # TypeScript interfaces
gt create -m "feat: add component type definitions (#issue)"

gt branch create feat/component-impl         # Component implementation
gt create -m "feat: implement component core (#issue)"

gt branch create feat/component-export       # Module Federation exposure
gt create -m "feat: expose component via Module Federation (#issue)"

gt branch create test/component             # Tests
gt create -m "test: add component unit tests (#issue)"

gt branch create docs/component             # Documentation
gt create -m "docs: add component documentation (#issue)"

# Submit entire stack
gt submit --no-interactive
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

**IMPORTANT: Always present your stack plan and wait for confirmation before implementing.**

For Issue #2 (Repository Restructure), present this stack:

```
Proposed Stack for Repository Restructure (#2):
└── main
    ├── feat/repo-structure      (~30 lines: Create apps/ directory structure)
    ├── feat/move-apps          (~20 lines: Move existing to apps/nextjs-cra/)
    ├── feat/packages-setup     (~40 lines: Create packages/ directory)
    ├── feat/lerna-config       (~25 lines: Update lerna.json and package.json)
    ├── feat/scripts-setup      (~50 lines: Add benchmark scripts)
    └── docs/restructure        (~30 lines: Update documentation)

Each PR is atomic and will pass CI independently.
Confirm? (y/n)
```

After confirmation, implement:
```bash
gt branch create feat/repo-structure
# ... make changes ...
gt create -m "feat: create apps directory structure (#2)"

gt branch create feat/move-apps
# ... make changes ...
gt create -m "feat: move existing apps to apps/nextjs-cra (#2)"

# Continue for each PR...
gt submit --no-interactive
```

For Issue #3 (Performance Monitoring), present this stack:

```
Proposed Stack for Performance Monitoring (#3):
└── main
    ├── feat/perf-package       (~40 lines: Create package structure)
    ├── feat/perf-core          (~150 lines: Core monitoring class)
    ├── feat/perf-mf-metrics    (~200 lines: Module Federation metrics)
    ├── feat/perf-web-vitals    (~100 lines: Web Vitals integration)
    ├── feat/perf-reporting     (~80 lines: Report generation)
    ├── test/perf-monitor       (~150 lines: Tests)
    └── docs/perf-monitor       (~50 lines: Documentation)

Each PR is atomic and will pass CI independently.
Confirm? (y/n)
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

When adding a new example, present this stack structure first:

```
Proposed Stack for [Example Name]:
└── main
    ├── feat/example-scaffold    (~40 lines: Directory and package.json)
    ├── feat/example-webpack     (~80 lines: Webpack/build configuration)
    ├── feat/example-host        (~150 lines: Host application)
    ├── feat/example-remote      (~100 lines: Remote application(s))
    ├── feat/example-shared      (~30 lines: Shared dependencies config)
    ├── test/example            (~100 lines: Tests)
    └── docs/example            (~50 lines: Documentation)

Each PR is atomic and will pass CI independently.
Confirm? (y/n)
```

After confirmation:
```bash
gt branch create feat/example-scaffold
# ... create structure ...
gt create -m "feat: scaffold new example structure"

gt branch create feat/example-webpack
# ... add configuration ...
gt create -m "feat: add webpack configuration for example"

# Continue through stack...
gt submit --no-interactive
```

## Testing Requirements

Each PR in your stack should:
1. Pass existing tests
2. Include new tests if adding functionality
3. Not break other apps in the monorepo
4. Maintain or improve performance metrics
5. Be independently deployable/runnable

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
5. Always present stack structure before implementation

## File Organization Standards

- Each Module Federation app should be self-contained in its directory
- Shared code goes in `packages/`
- Build scripts and tools go in `scripts/`
- Documentation goes in `docs/`
- Keep configuration files at the root of each app

## PR Description Template

When submitting PRs, include:

### Purpose
Closes #[issue-number] or Part of #[issue-number]

### Changes
- Brief description of what changed
- Why this approach was taken

### Testing
- [ ] All apps start correctly with `pnpm dev`
- [ ] No console errors
- [ ] Tests pass
- [ ] Performance metrics maintained or improved

### Stack Position
- Previous PR: #[number] or "Stack base"
- Next PR: #[number] or "Stack top"

## Atomic PR Checklist

Before committing any PR in a stack, verify:
- [ ] This PR can be checked out and run independently
- [ ] All tests pass with just this PR's changes
- [ ] The application builds successfully
- [ ] No references to code that only exists in later PRs
- [ ] Changes are focused and under 300 lines (ideally <100)

## Remember

**The goal is to make code review delightful through small, focused, logical PRs that tell a story of incremental progress.**

- Always use `gt create` instead of `git commit`
- Always use `gt submit --no-interactive` instead of `git push`
- Always present your stack plan and wait for confirmation
- Each PR must be atomic and pass CI independently
- Never reference code that doesn't exist yet in the current PR
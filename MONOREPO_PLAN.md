# Monorepo Restructuring Plan

## Directory Structure
```
ad-tech-analyzer/
├── package.json          # Root configuration defining workspaces
├── tsconfig.base.json    # Shared TypeScript configuration
├── packages/
│   ├── core/             # Shared logic (@ad-tech/core)
│   │   ├── package.json
│   │   ├── tsconfig.json
│   │   └── src/
│   │       ├── index.ts  # Barrel file exporting all core modules
│   │       ├── network-classifier.ts
│   │       ├── vendor-patterns.ts
│   │       └── api-query-orchestrator.ts
│   ├── mcp/              # MCP Server (@ad-tech/mcp)
│   │   ├── package.json
│   │   ├── tsconfig.json
│   │   └── src/
│   │       └── index.ts  # MCP server entry point
│   └── dashboard/        # Web UI (@ad-tech/dashboard)
│       ├── package.json
│       ├── tsconfig.json
│       ├── vite.config.ts
│       └── src/          # Existing React app
```

## Package Configurations

### Root `package.json`
```json
{
  "name": "ad-tech-analyzer-root",
  "private": true,
  "workspaces": ["packages/*"],
  "scripts": {
    "build": "npm run build --workspaces",
    "test": "npm run test --workspaces"
  }
}
```

### `packages/core/package.json`
```json
{
  "name": "@ad-tech/core",
  "version": "1.0.0",
  "main": "dist/index.js",
  "types": "dist/index.d.ts",
  "scripts": {
    "build": "tsc"
  },
  "peerDependencies": {
    "typescript": "^5.0.0"
  }
}
```

### `packages/mcp/package.json`
```json
{
  "name": "@ad-tech/mcp",
  "version": "1.0.0",
  "dependencies": {
    "@ad-tech/core": "^1.0.0",
    "chrome-devtools-mcp": "latest"
  }
}
```

### `packages/dashboard/package.json`
```json
{
  "name": "@ad-tech/dashboard",
  "version": "1.0.0",
  "dependencies": {
    "@ad-tech/core": "^1.0.0",
    "react": "^18.2.0"
  }
}
```

## Migration Steps

1. **Prepare Directories:**
   - Create `packages/core`, `packages/mcp` directories at the project root.
   - Move the existing `dashboard` folder into `packages/`.

2. **Extract Core:**
   - Move `src/analyzer/*.ts` files to `packages/core/src/`.
   - Create `packages/core/src/index.ts` and export all classes/functions (e.g., `export * from './network-classifier';`).

3. **Setup MCP:**
   - Move `src/mcp/` content to `packages/mcp/src/`.

4. **Configure Workspaces:**
   - Create the root `package.json` with the `workspaces` array.
   - Create/Update individual `package.json` files as defined above.

5. **Install & Link:**
   - Run `npm install` from the root directory. This creates symlinks for `@ad-tech/core` in `node_modules`.

6. **Refactor Imports:**
   - In `mcp` and `dashboard` files, replace relative imports (e.g., `../../analyzer/network-classifier`) with package imports (`@ad-tech/core`).

## Import Path Examples

### Before (in dashboard or MCP)
```typescript
import { NetworkClassifier } from '../../analyzer/network-classifier';
import { PatternMatcher } from '../shared/vendor-patterns';
```

### After (in `packages/dashboard/src/App.tsx` or `packages/mcp/src/index.ts`)
```typescript
import { NetworkClassifier, PatternMatcher } from '@ad-tech/core';
```

### Core Exports (`packages/core/src/index.ts`)
```typescript
export * from './network-classifier';
export * from './vendor-patterns';
export * from './api-query-orchestrator';
```

## Benefits

1. **Independent Versioning** - Each package can be published separately
2. **Clear Dependencies** - Explicit package boundaries
3. **Reusability** - Core logic shared between MCP and Dashboard
4. **Better DX** - Cleaner imports, easier testing
5. **Distribution** - Can publish @ad-tech/mcp to npm, @ad-tech/dashboard as Docker image

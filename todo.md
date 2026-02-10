# Production Build Todo List

## Phase 1: Architecture & API Migration
- [ ] Create `/lib/services/erpnext-service.ts` for client-side API calls
- [ ] Migrate all ERPNext API logic from `app/api` to client-side
- [ ] Update components to use new service layer
- [ ] Remove `app/api` directory (not compatible with static export)

## Phase 2: Next.js Configuration
- [ ] Update `next.config.mjs` with `output: 'export'`
- [ ] Set `assetPrefix: './'` for relative paths
- [ ] Set `trailingSlash: true`
- [ ] Add `images.unoptimized: true` for static export
- [ ] Remove deprecated `swcMinify` option
- [ ] Add `typescript.ignoreBuildErrors: true`
- [ ] Add `eslint.ignoreDuringBuilds: true`

## Phase 3: Electron Configuration
- [ ] Update `electron-main.js` with `webSecurity: false` for CORS bypass
- [ ] Configure proper `loadURL` with `file://` protocol
- [ ] Add electron-rebuild for native modules
- [ ] Ensure standalone operation (no external Node.js required)

## Phase 4: Build Assets
- [ ] Create proper `icon.ico` file (256x256)
- [ ] Place icon in `build/` directory
- [ ] Update `package.json` build configuration
- [ ] Test icon display in Windows

## Phase 5: CircleCI Configuration
- [ ] Update `.circleci/config.yml` for Windows build
- [ ] Add error handling for TypeScript/ESLint
- [ ] Configure artifact upload
- [ ] Test build process

## Phase 6: Final Delivery
- [ ] Package complete project
- [ ] Create comprehensive documentation
- [ ] Test exe file functionality
- [ ] Deliver to user

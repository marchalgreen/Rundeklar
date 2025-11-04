import { existsSync, rmSync, watch } from 'node:fs'
import { mkdir } from 'node:fs/promises'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { spawn } from 'node:child_process'
import waitOn from 'wait-on'
import { context } from 'esbuild'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)
const rootDir = resolve(__dirname, '..')
const mainDir = resolve(rootDir, 'packages/main')
const preloadDir = resolve(rootDir, 'packages/preload')

const mainEntry = resolve(mainDir, 'src/main.ts')
const preloadEntry = resolve(preloadDir, 'src/index.ts')
const mainOut = resolve(mainDir, 'dist/main.cjs')
const preloadOut = resolve(preloadDir, 'dist/preload.cjs')
const devServerUrl = 'http://127.0.0.1:5173'

let electronProcess = null
let rendererProcess = null

const cleanOutputs = () => {
  if (existsSync(resolve(mainDir, 'dist'))) rmSync(resolve(mainDir, 'dist'), { recursive: true, force: true })
  if (existsSync(resolve(preloadDir, 'dist'))) rmSync(resolve(preloadDir, 'dist'), { recursive: true, force: true })
}

const spawnRendererDev = () => {
  rendererProcess = spawn('pnpm', ['--filter', 'renderer', 'dev'], {
    cwd: rootDir,
    stdio: 'inherit',
    env: { ...process.env }
  })
}

const startElectron = async () => {
  // Spawn via pnpm exec to avoid brittle path.txt resolution
  electronProcess = spawn('pnpm', ['exec', 'electron', mainOut], {
    cwd: rootDir,
    stdio: 'inherit',
    env: {
      ...process.env,
      VITE_DEV_SERVER_URL: devServerUrl
    }
  })

  electronProcess.on('exit', (code) => {
    if (code !== 0) {
      console.error(`Electron exited with code ${code ?? 'unknown'}`)
    }
    electronProcess = null
  })
}

const restartElectron = async () => {
  if (electronProcess) {
    electronProcess.removeAllListeners('exit')
    electronProcess.kill()
    electronProcess = null
  }
  await startElectron()
}

const start = async () => {
  cleanOutputs()
  await Promise.all([
    mkdir(resolve(mainDir, 'dist'), { recursive: true }),
    mkdir(resolve(preloadDir, 'dist'), { recursive: true })
  ])

  spawnRendererDev()
  console.log('Waiting for renderer dev server...')
  await waitOn({ resources: [devServerUrl], timeout: 30000 })
  console.log('Renderer ready')

  const mainCtx = await context({
    entryPoints: [mainEntry],
    outfile: mainOut,
    bundle: true,
    format: 'cjs',
    platform: 'node',
    target: 'node20',
    external: ['electron', 'better-sqlite3'],
    sourcemap: true
  })
  await mainCtx.rebuild()

  const preloadCtx = await context({
    entryPoints: [preloadEntry],
    outfile: preloadOut,
    bundle: true,
    format: 'cjs',
    platform: 'node',
    target: 'node20',
    external: ['electron'],
    sourcemap: true
  })
  await preloadCtx.rebuild()

  await startElectron()

  // Watch main with esbuild 0.23+ API
  // Start watching for file changes
  await mainCtx.watch()
  console.log('Watching main for changes...')

  // Watch source files and trigger rebuilds
  let mainRebuildTimeout = null
  const mainWatcher = watch(resolve(mainDir, 'src'), { recursive: true }, async () => {
    if (mainRebuildTimeout) clearTimeout(mainRebuildTimeout)
    mainRebuildTimeout = setTimeout(async () => {
      try {
        const result = await mainCtx.rebuild()
        if (result.errors.length === 0) {
          console.log('Main rebuilt')
          restartElectron().catch((err) => console.error('Failed to restart Electron', err))
        } else {
          console.error('Main build failed:', result.errors)
        }
      } catch (err) {
        console.error('Main rebuild error:', err)
      }
    }, 100)
  })

  // Watch preload with esbuild 0.23+ API
  await preloadCtx.watch()
  console.log('Watching preload for changes...')

  // Watch source files and trigger rebuilds
  let preloadRebuildTimeout = null
  const preloadWatcher = watch(resolve(preloadDir, 'src'), { recursive: true }, async () => {
    if (preloadRebuildTimeout) clearTimeout(preloadRebuildTimeout)
    preloadRebuildTimeout = setTimeout(async () => {
      try {
        const result = await preloadCtx.rebuild()
        if (result.errors.length === 0) {
          console.log('Preload rebuilt')
          restartElectron().catch((err) => console.error('Failed to restart Electron', err))
        } else {
          console.error('Preload build failed:', result.errors)
        }
      } catch (err) {
        console.error('Preload rebuild error:', err)
      }
    }, 100)
  })

  const cleanExit = () => {
    mainWatcher?.close()
    preloadWatcher?.close()
    mainCtx.dispose().catch(() => {})
    preloadCtx.dispose().catch(() => {})
    rendererProcess?.kill()
    electronProcess?.kill()
    process.exit()
  }

  process.on('SIGINT', cleanExit)
  process.on('SIGTERM', cleanExit)
}

start().catch((err) => {
  console.error(err)
  rendererProcess?.kill()
  electronProcess?.kill()
  process.exit(1)
})

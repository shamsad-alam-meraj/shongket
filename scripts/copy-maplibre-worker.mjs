// Copies MapLibre's module worker into /public so it is served at a stable URL.
// (Bundlers rewrite import.meta.url, which breaks MapLibre's default worker lookup.)
import { copyFileSync, mkdirSync, readFileSync, readdirSync, rmSync } from "node:fs"
import { dirname, join } from "node:path"
import { createRequire } from "node:module"

const require = createRequire(import.meta.url)
const pkgPath = require.resolve("maplibre-gl/package.json")
const { version } = JSON.parse(readFileSync(pkgPath, "utf8"))
const src = join(dirname(pkgPath), "dist", "maplibre-gl-worker.mjs")
const outDir = join(process.cwd(), "public", "vendor")
mkdirSync(outDir, { recursive: true })
for (const f of readdirSync(outDir)) if (f.startsWith("maplibre-gl-worker")) rmSync(join(outDir, f))
copyFileSync(src, join(outDir, `maplibre-gl-worker-${version}.mjs`))
console.log(`[maplibre] worker ${version} → public/vendor/`)

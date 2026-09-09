import { readFile, rename, unlink, writeFile } from 'node:fs/promises'
import { basename, dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const logoFile = resolve(projectRoot, 'assets/crunchbase/yc-company-logo-urls.json')
const manifestFile = resolve(projectRoot, 'outputs/crunchbase/manifest.json')
const crunchbaseDirectory = resolve(projectRoot, 'outputs/crunchbase')
const logoSnapshot = JSON.parse(await readFile(logoFile, 'utf8'))
const manifest = JSON.parse(await readFile(manifestFile, 'utf8'))
const profileByUrl = new Map(manifest.entries.map((entry) => [entry.requestedUrl, entry.outputPath]))
let repaired = 0

for (const item of logoSnapshot.items) {
  const weakLogo = item.logoUrl === null || item.logoUrl?.includes('google.com/s2/favicons')
  if (!weakLogo) continue
  const profilePath = profileByUrl.get(item.crunchbaseUrl)
  if (!profilePath) continue
  const profile = JSON.parse(await readFile(resolve(crunchbaseDirectory, basename(profilePath)), 'utf8'))
  const imageId = profile.organization?.properties?.identifier?.image_id
  if (!imageId) continue
  item.logoUrl = `https://images.crunchbase.com/image/upload/c_pad,h_256,w_256,f_auto,q_auto:eco,dpr_1/${imageId}`
  repaired += 1
}

const temporaryFile = `${logoFile}.${process.pid}.tmp`
try {
  await writeFile(temporaryFile, `${JSON.stringify(logoSnapshot, null, 2)}\n`, 'utf8')
  await rename(temporaryFile, logoFile)
} catch (error) {
  await unlink(temporaryFile).catch(() => undefined)
  throw error
}
console.log(`Replaced ${repaired.toLocaleString()} weak logo URLs with Crunchbase images.`)

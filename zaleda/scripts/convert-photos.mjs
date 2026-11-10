import sharp from 'sharp'
import { readdirSync, mkdirSync } from 'node:fs'
import path from 'node:path'

const IN_DIR = 'scripts/raw-photos'
const OUT_DIR = 'public/photos'
mkdirSync(IN_DIR, { recursive: true })
mkdirSync(OUT_DIR, { recursive: true })

const OK = ['.jpg', '.jpeg', '.png', '.webp', '.tiff', '.tif', '.gif', '.avif']
const files = readdirSync(IN_DIR)
const seen = new Set()
let done = 0, failed = 0

for (const file of files) {
  const { name, ext } = path.parse(file)
  const e = ext.toLowerCase()

  if (e === '.heic' || e === '.heif') {
    console.log(`SKIPPED (HEIC not supported): ${file}`)
    failed++
    continue
  }
  if (!OK.includes(e)) {
    console.log(`SKIPPED (not an image): ${file}`)
    continue
  }

  // lowercase, no spaces: "JAC Photo.PNG" -> "jac-photo.jpg"
  const out = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') + '.jpg'
  if (seen.has(out)) console.log(`WARNING: ${file} overwrites another file named ${out}`)
  seen.add(out)

  try {
    await sharp(path.join(IN_DIR, file))
      .rotate() // fixes sideways phone photos
      .resize(800, 1200, { fit: 'cover', position: 'top' })
      .flatten({ background: '#000000' }) // transparent PNGs get a black background
      .jpeg({ quality: 80, mozjpeg: true })
      .toFile(path.join(OUT_DIR, out))
    console.log(`OK: ${file} -> ${out}`)
    done++
  } catch (err) {
    console.log(`FAILED: ${file} -> ${err.message}`)
    failed++
  }
}

console.log(`\n${done} converted, ${failed} failed.`)
import sharp from 'sharp'

const SRC = 'public/logo-white.png'
const BG = '#0a0a0a'

async function make(size, file, logoRatio) {
  const logoSize = Math.round(size * logoRatio)
  const logo = await sharp(SRC)
    .resize(logoSize, logoSize, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .toBuffer()

  await sharp({
    create: { width: size, height: size, channels: 4, background: BG },
  })
    .composite([{ input: logo, gravity: 'center' }])
    .png()
    .toFile(`public/${file}`)

  console.log(`OK: public/${file}`)
}

await make(180, 'apple-touch-icon.png', 0.7)
await make(192, 'icon-192.png', 0.7)
await make(512, 'icon-512.png', 0.7)
await make(512, 'icon-maskable-512.png', 0.55)
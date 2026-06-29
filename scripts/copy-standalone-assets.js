// next build with output: 'standalone' does not copy public/ or .next/static
// into .next/standalone on its own — PM2/Docker run .next/standalone/server.js
// directly, so without this step the deployed app serves a blank page (404s
// on every CSS/JS/image request).
const fs = require('fs')
const path = require('path')

const root = process.cwd()
const standaloneDir = path.join(root, '.next', 'standalone')

if (!fs.existsSync(standaloneDir)) {
  process.exit(0)
}

fs.cpSync(path.join(root, 'public'), path.join(standaloneDir, 'public'), { recursive: true })
fs.cpSync(path.join(root, '.next', 'static'), path.join(standaloneDir, '.next', 'static'), { recursive: true })

console.log('Copied public/ and .next/static into .next/standalone')

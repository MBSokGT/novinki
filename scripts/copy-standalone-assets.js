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

// lib/sqlite.ts resolves migrations relative to process.cwd(), and PM2/Docker
// run the server with cwd = .next/standalone — without this copy, any
// migration added after the first deploy silently never runs (its table/
// column just doesn't exist, e.g. "no such table: vendors").
fs.cpSync(path.join(root, 'migrations'), path.join(standaloneDir, 'migrations'), { recursive: true })

console.log('Copied public/, .next/static and migrations/ into .next/standalone')

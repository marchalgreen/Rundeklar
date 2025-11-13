#!/usr/bin/env node
// Wrapper script to run vercel dev without triggering recursion detection
import { spawn } from 'child_process'

const vercel = spawn('vercel', ['dev', '--listen', '3000'], {
  stdio: 'inherit',
  shell: true
})

vercel.on('error', (error) => {
  console.error('Failed to start vercel dev:', error)
  process.exit(1)
})

vercel.on('exit', (code) => {
  process.exit(code || 0)
})


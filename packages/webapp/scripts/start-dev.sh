#!/bin/bash
# Wrapper script to start dev servers
# This avoids Vercel's recursion detection

exec concurrently -n "vite,vercel" -c "cyan,magenta" \
  "vite" \
  "vercel dev --listen 3000"


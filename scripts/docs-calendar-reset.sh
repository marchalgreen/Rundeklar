#!/usr/bin/env bash
set -euo pipefail

TS="$(date +"%Y%m%d-%H%M%S")"
SRC_DIR="packages/web/src/app/docs/calendar"
TRASH_DIR="docs/_trash/calendar-$TS"

# 1) Verify
if [ ! -d "$SRC_DIR" ]; then
  echo "❌ Not found: $SRC_DIR"
  exit 1
fi

# 2) Backup
mkdir -p "$TRASH_DIR"
cp -R "$SRC_DIR" "$TRASH_DIR/"
echo "✅ Backup created at: $TRASH_DIR/calendar"

# 3) Wipe + recreate
rm -rf "$SRC_DIR"
mkdir -p "$SRC_DIR"

# 4) Minimal placeholder while we scaffold
cat <<'TSX' > "$SRC_DIR/page.tsx"
export default function Placeholder() {
  return (
    <main className="mx-auto max-w-3xl p-8">
      <h1 className="text-2xl font-semibold">Calendar docs (reset)</h1>
      <p className="text-muted-foreground">New pages will be scaffolded shortly from the Epic.</p>
    </main>
  );
}
TSX

echo "✅ Wiped $SRC_DIR and added a small placeholder"

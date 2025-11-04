// src/lib/anim/typewriter.ts
export type TypewriterOpts = {
  speed?: number; // ms per char
  clearFirst?: boolean; // clear before typing
  delay?: number; // initial delay in ms
};

export async function typewriterInsert(
  setter: (v: string) => void,
  finalText: string,
  opts: TypewriterOpts = {},
): Promise<void> {
  const speed = Math.max(8, opts.speed ?? 28);
  const delay = Math.max(0, opts.delay ?? 50);
  const text = finalText ?? '';

  if (opts.clearFirst) setter('');

  if (delay) await new Promise((r) => setTimeout(r, delay));

  let cur = '';
  for (let i = 0; i < text.length; i++) {
    cur += text[i];
    setter(cur);
    // a tiny random variance to feel human
    const jitter = Math.random() * 0.35 + 0.8;
    // eslint-disable-next-line no-await-in-loop
    await new Promise((r) => setTimeout(r, speed * jitter));
  }
}

'use client';

export default function LogbookWindow() {
  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-3">
        <div>
          <div className="mb-1 text-xs text-zinc-500">Dagens opgave</div>
          <select className="w-full rounded-md border px-2 py-1 text-sm">
            <option>Synsprøve</option>
            <option>Kontrol</option>
          </select>
        </div>
        <div>
          <div className="mb-1 text-xs text-zinc-500">Kundekortnr.</div>
          <input className="w-full rounded-md border px-2 py-1 text-sm" defaultValue="12652" />
        </div>
      </div>

      <div>
        <div className="mb-1 text-xs text-zinc-500">Noter</div>
        <textarea className="h-28 w-full rounded-md border p-2 text-sm" placeholder="Observations, bemærkninger..." />
      </div>

      <div className="flex gap-2">
        <button className="rounded-md border bg-white px-3 py-1.5 text-sm shadow-sm">Gem</button>
        <button className="rounded-md border bg-white px-3 py-1.5 text-sm shadow-sm">Send</button>
      </div>
    </div>
  );
}
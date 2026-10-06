// Shown instantly while a page's data loads, so a tap on the menu responds at once.
export default function Loading() {
  const bar = "animate-pulse rounded-lg bg-[var(--line)]";
  return (
    <main className="mx-auto flex w-full max-w-[1400px] flex-col gap-4 px-3 py-4 sm:px-5 sm:py-5 lg:px-7" aria-busy="true" aria-label="กำลังโหลด">
      <div className="card flex flex-col gap-3 !p-4">
        <div className={`${bar} h-5 w-1/3`} />
        <div className={`${bar} h-9 w-full`} />
      </div>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {Array.from({ length: 6 }, (_, i) => (
          <div key={i} className="card flex flex-col gap-3 !p-4">
            <div className={`${bar} size-8`} />
            <div className={`${bar} h-7 w-1/2`} />
            <div className={`${bar} h-3 w-3/4`} />
          </div>
        ))}
      </div>
      <div className="card flex flex-col gap-3 !p-4">
        {Array.from({ length: 5 }, (_, i) => <div key={i} className={`${bar} h-4`} style={{ width: `${90 - i * 10}%` }} />)}
      </div>
    </main>
  );
}

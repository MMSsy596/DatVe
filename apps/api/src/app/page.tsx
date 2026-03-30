export default function Home() {
  return (
    <main className="min-h-screen bg-slate-950 px-6 py-10 text-slate-50">
      <div className="mx-auto flex max-w-5xl flex-col gap-6">
        <section className="rounded-[28px] border border-emerald-500/20 bg-emerald-500/10 p-8">
          <p className="text-sm font-semibold uppercase tracking-[0.28em] text-emerald-300">
            DatVe API
          </p>
          <h1 className="mt-4 text-4xl font-bold tracking-tight">
            Backend skeleton cho catalog phim, booking, payment va dashboard.
          </h1>
          <p className="mt-4 max-w-3xl text-base leading-7 text-slate-300">
            Hien tai da mo duong cho health check va endpoint catalog mau. Buoc tiep theo la bo
            auth, Prisma, MySQL schema va booking engine.
          </p>
        </section>

        <section className="grid gap-4 md:grid-cols-2">
          <div className="rounded-[24px] border border-white/10 bg-white/5 p-6">
            <h2 className="text-xl font-semibold">Endpoints da co</h2>
            <ul className="mt-4 space-y-3 text-sm text-slate-300">
              <li>`GET /api/health`</li>
              <li>`GET /api/v1/catalog`</li>
            </ul>
          </div>
          <div className="rounded-[24px] border border-white/10 bg-white/5 p-6">
            <h2 className="text-xl font-semibold">Endpoints se bo sung</h2>
            <ul className="mt-4 space-y-3 text-sm text-slate-300">
              <li>`POST /api/v1/auth/login`</li>
              <li>`GET /api/v1/movies`</li>
              <li>`POST /api/v1/bookings/hold`</li>
              <li>`POST /api/v1/payments/callback`</li>
            </ul>
          </div>
        </section>
      </div>
    </main>
  );
}

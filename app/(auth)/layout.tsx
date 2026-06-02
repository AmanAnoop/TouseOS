export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-gradient-to-b from-navy via-racing-950 to-navy flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-sm">
        <div className="flex flex-col items-center gap-3 mb-8">
          <div className="w-12 h-12 rounded-lg bg-gold/15 border border-gold/40 flex items-center justify-center">
            <span className="font-display text-2xl font-semibold text-gold">T</span>
          </div>
          <span className="font-display text-3xl font-semibold text-white tracking-wide">TouseOS</span>
          <p className="text-sm text-white/50 text-center">Chapter command center</p>
        </div>
        {children}
      </div>
    </div>
  );
}

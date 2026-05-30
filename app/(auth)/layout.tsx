export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-sm">
        <div className="flex items-center justify-center gap-2 mb-8">
          <div className="w-9 h-9 rounded-xl bg-greek-600 flex items-center justify-center text-white font-bold text-sm">
            TO
          </div>
          <span className="text-xl font-bold text-foreground">TouseOS</span>
        </div>
        {children}
      </div>
    </div>
  );
}

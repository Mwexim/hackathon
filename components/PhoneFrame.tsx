/** Phone-width frame, centred on a soft grey background on desktop (looks like a phone on the projector). */
export function PhoneFrame({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen sm:py-6">
      <div className="relative mx-auto flex min-h-screen w-full max-w-[420px] flex-col overflow-hidden bg-canvas sm:min-h-[calc(100vh-3rem)] sm:rounded-[2.25rem] sm:shadow-2xl sm:ring-1 sm:ring-black/5">
        {children}
      </div>
    </div>
  );
}

export default function DashboardSkeleton() {
  return (
    <div className="min-h-screen flex flex-col p-6 gap-6 pb-20 animate-pulse" style={{ background: 'var(--app-bg)' }}>
      <div className="mt-4 space-y-2">
        <div className="h-8 w-48 rounded-lg" style={{ background: 'var(--app-surface2)' }} />
        <div className="h-4 w-64 rounded-lg" style={{ background: 'var(--app-surface2)' }} />
      </div>
      <div className="flex justify-center my-6">
        <div className="w-24 h-24 rounded-full" style={{ background: 'var(--app-surface2)' }} />
      </div>
      <div className="w-full h-24 rounded-2xl" style={{ background: 'var(--app-surface2)' }} />
      <div className="grid grid-cols-1 gap-4 mt-2">
        <div className="h-24 rounded-2xl" style={{ background: 'var(--app-surface2)' }} />
        <div className="h-24 rounded-2xl" style={{ background: 'var(--app-surface2)' }} />
      </div>
      <div className="w-full mt-6 h-[200px] rounded-2xl" style={{ background: 'var(--app-surface2)' }} />
    </div>
  );
}

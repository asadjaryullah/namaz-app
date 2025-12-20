export default function DashboardSkeleton() {
  return (
    <div className="min-h-screen bg-slate-50 flex flex-col p-6 gap-6 pb-20 animate-pulse">
      
      {/* Begrüßung Skeleton */}
      <div className="mt-4 space-y-2">
        <div className="h-8 w-48 bg-slate-200 rounded-lg"></div>
        <div className="h-4 w-64 bg-slate-200 rounded-lg"></div>
      </div>

      {/* Logo Platzhalter */}
      <div className="flex justify-center my-6">
        <div className="w-24 h-24 bg-slate-200 rounded-full"></div>
      </div>

      {/* Kalender Button Skeleton */}
      <div className="w-full h-24 bg-slate-200 rounded-2xl"></div>

      {/* Karten Skeleton */}
      <div className="grid grid-cols-1 gap-4 mt-2">
        <div className="h-24 bg-slate-200 rounded-2xl"></div>
        <div className="h-24 bg-slate-200 rounded-2xl"></div>
      </div>

      {/* Map Skeleton */}
      <div className="w-full mt-6 h-[200px] bg-slate-200 rounded-2xl"></div>
    </div>
  );
}
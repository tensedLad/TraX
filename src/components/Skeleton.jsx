export function Shimmer({ className = '' }) {
  return (
    <div className={`animate-pulse bg-[#1a1a1a] rounded-lg ${className}`}></div>
  );
}

// Market page skeleton
export function MarketSkeleton() {
  return (
    <div className="space-y-3">
      {[...Array(6)].map((_, i) => (
        <div key={i} className="grid grid-cols-2 md:grid-cols-12 gap-4 items-center bg-[#0f0f0f] border border-[#1a1a1a] rounded-xl p-4">
          <div className="col-span-2 md:col-span-4 flex items-center space-x-3">
            <Shimmer className="w-10 h-10 rounded-lg" />
            <div className="space-y-2">
              <Shimmer className="w-20 h-3" />
              <Shimmer className="w-32 h-2.5" />
            </div>
          </div>
          <div className="col-span-1 md:col-span-2 flex justify-end"><Shimmer className="w-16 h-4" /></div>
          <div className="col-span-1 md:col-span-2 flex justify-end"><Shimmer className="w-14 h-4" /></div>
          <div className="hidden md:flex col-span-2 justify-end"><Shimmer className="w-12 h-4" /></div>
          <div className="hidden md:flex col-span-2 justify-end"><Shimmer className="w-16 h-5 rounded-full" /></div>
        </div>
      ))}
    </div>
  );
}

// Asset detail skeleton
export function AssetDetailSkeleton() {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <div className="lg:col-span-2 space-y-4">
        <div className="bg-[#0f0f0f] border border-[#1a1a1a] rounded-xl p-4">
          <div className="flex gap-3 mb-4">
            <Shimmer className="w-12 h-6 rounded" />
            <Shimmer className="w-12 h-6 rounded" />
            <Shimmer className="w-12 h-6 rounded" />
          </div>
          <Shimmer className="w-full h-72 rounded-lg" />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-[#0f0f0f] border border-[#1a1a1a] rounded-xl p-4 space-y-3">
            <Shimmer className="w-24 h-4" />
            <Shimmer className="w-full h-3" />
            <Shimmer className="w-full h-3" />
            <Shimmer className="w-full h-3" />
          </div>
          <div className="bg-[#0f0f0f] border border-[#1a1a1a] rounded-xl p-4 space-y-3">
            <Shimmer className="w-24 h-4" />
            <Shimmer className="w-full h-3" />
            <Shimmer className="w-full h-3" />
          </div>
        </div>
      </div>
      <div className="space-y-4">
        <div className="bg-[#0f0f0f] border border-[#1a1a1a] rounded-xl p-6 space-y-4">
          <Shimmer className="w-24 h-6" />
          <Shimmer className="w-32 h-8" />
          <Shimmer className="w-full h-10 rounded-lg" />
          <Shimmer className="w-full h-10 rounded-lg" />
          <Shimmer className="w-full h-12 rounded-lg" />
        </div>
      </div>
    </div>
  );
}

// Portfolio skeleton
export function PortfolioSkeleton() {
  return (
    <div className="space-y-8">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="bg-[#0f0f0f] border border-[#1a1a1a] p-4 rounded-xl space-y-2">
            <Shimmer className="w-20 h-2.5" />
            <Shimmer className="w-28 h-6" />
          </div>
        ))}
      </div>
      <div className="bg-[#0f0f0f] border border-[#1a1a1a] rounded-xl overflow-hidden">
        <div className="p-4 space-y-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <Shimmer className="w-16 h-4" />
              </div>
              <Shimmer className="w-12 h-4" />
              <Shimmer className="w-14 h-4" />
              <Shimmer className="w-14 h-4" />
              <Shimmer className="w-12 h-4" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// Leaderboard skeleton
export function LeaderboardSkeleton() {
  return (
    <div className="space-y-2">
      {[...Array(5)].map((_, i) => (
        <div key={i} className="flex items-center p-3 bg-[#0f0f0f] border border-[#1a1a1a] rounded-xl">
          <Shimmer className="w-6 h-6 mr-3" />
          <Shimmer className="w-10 h-10 rounded-full mr-3" />
          <div className="flex-1 space-y-2">
            <Shimmer className="w-24 h-3.5" />
            <Shimmer className="w-16 h-2.5" />
          </div>
          <Shimmer className="w-16 h-4" />
        </div>
      ))}
    </div>
  );
}

// Profile skeleton
export function ProfileSkeleton() {
  return (
    <div className="max-w-4xl mx-auto w-full animate-fade-in pb-20 space-y-10 mt-6 md:mt-10">
      <div className="bg-[#0a0a0a] border border-[#1a1a1a] rounded-2xl p-6 md:p-8 flex flex-col md:flex-row items-center md:items-start justify-between gap-6">
        <div className="flex flex-col md:flex-row items-center gap-6 md:gap-8">
          <Shimmer className="h-[90px] w-[90px] rounded-full" />
          <div className="space-y-3">
            <Shimmer className="w-48 h-8" />
            <Shimmer className="w-32 h-4" />
            <div className="flex gap-2 pt-2">
              <Shimmer className="w-24 h-6 rounded" />
              <Shimmer className="w-32 h-6 rounded" />
            </div>
          </div>
        </div>
        <div className="flex flex-row md:flex-col gap-6 md:gap-4 pt-2 md:pt-0 text-right w-full md:w-auto justify-center md:justify-end">
           <div className="flex flex-col items-center md:items-end space-y-2">
              <Shimmer className="w-24 h-3" />
              <Shimmer className="w-32 h-6" />
           </div>
           <div className="flex flex-col items-center md:items-end space-y-2">
              <Shimmer className="w-20 h-3" />
              <Shimmer className="w-16 h-5" />
           </div>
        </div>
      </div>
      
      <div className="space-y-4">
        <Shimmer className="w-32 h-4" />
        <div className="flex gap-3">
            <Shimmer className="w-24 h-8 rounded-full" />
            <Shimmer className="w-24 h-8 rounded-full" />
        </div>
      </div>

      <div className="space-y-4">
        <Shimmer className="w-32 h-4" />
        <div className="border border-[#1a1a1a] rounded-xl flex flex-col overflow-hidden">
          {[...Array(3)].map((_,i) => (
             <div key={i} className="flex justify-between items-center p-6 border-b border-[#1a1a1a] last:border-0 bg-[#0a0a0a]">
                <Shimmer className="w-32 h-4" />
                <Shimmer className="w-16 h-4" />
             </div>
          ))}
        </div>
      </div>
    </div>
  );
}

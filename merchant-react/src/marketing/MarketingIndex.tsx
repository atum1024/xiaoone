import React, { Suspense } from 'react'

const MarketingHome = React.lazy(() =>
  import('./components/Home').then(m => ({ default: m.Home })),
)

export function MarketingIndex() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-slate-50" />}>
      <MarketingHome />
    </Suspense>
  )
}

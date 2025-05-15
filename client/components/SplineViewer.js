"use client"

import Script from "next/script"

// The interactive prop is no longer used here for conditional rendering of its content
// but can be kept if Spline itself has features that can be toggled with it.
// For now, let's assume it's just for loading the scene.
export default function SplineViewer() { 
  return (
    <div 
      className="relative h-[700px] w-[120%] -ml-[10%] overflow-hidden"
    >
      <Script 
        type="module" 
        src="https://unpkg.com/@splinetool/viewer@1.9.89/build/spline-viewer.js" 
        strategy="afterInteractive" 
      />
      <div className="w-full h-full">
        <spline-viewer 
          url="https://prod.spline.design/fxgvwAZfU318DzBQ/scene.splinecode" 
          className="w-full h-full scale-125"
          loading="lazy"
          events-target="global"
        />
      </div>
    </div>
  )
}
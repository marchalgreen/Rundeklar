'use client';

import React, { useEffect, useState } from 'react';
import { useWidgets } from '@/store/widgets';

/**
 * Subtle alignment grid that only appears while widgets are being dragged or resized.
 * Lightweight SVG pattern + GPU-friendly opacity fade.
 */
export default function GridOverlay() {
  const { snap } = useWidgets();
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const show = () => setVisible(true);
    const hide = () => setVisible(false);
    window.addEventListener('widget-grid:show', show);
    window.addEventListener('widget-grid:hide', hide);
    return () => {
      window.removeEventListener('widget-grid:show', show);
      window.removeEventListener('widget-grid:hide', hide);
    };
  }, []);

  return (
    <div
      className="pointer-events-none fixed inset-0 z-[14] transition-opacity duration-200 ease-out"
      style={{
        opacity: visible ? 1 : 0,
        mixBlendMode: 'soft-light',
        willChange: 'opacity',
      }}
    >
      <svg width="100%" height="100%">
        <defs>
          <pattern id="clairity-grid" width={snap} height={snap} patternUnits="userSpaceOnUse">
            <path
              d={`M ${snap} 0 L 0 0 0 ${snap}`}
              fill="none"
              stroke="rgba(0,0,0,.06)"
              strokeWidth="0.5"
            />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#clairity-grid)" />
      </svg>
    </div>
  );
}

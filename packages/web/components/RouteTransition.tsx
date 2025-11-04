// src/components/RouteTransition.tsx
'use client';

import { useEffect, useRef } from 'react';

export default function RouteTransition() {
  const ref = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const el = document.createElement('div');
    el.setAttribute('data-emp-transition', '');
    Object.assign(el.style, {
      position: 'fixed',
      inset: '0',
      zIndex: '9999',
      pointerEvents: 'none',
      opacity: '0',
      background:
        'radial-gradient(120% 140% at 50% 20%, rgba(255,255,255,.95), rgba(59,130,246,.12) 40%, rgba(255,255,255,0) 65%), ' +
        'linear-gradient(to bottom, rgba(255,255,255,.65), rgba(255,255,255,.0))',
      backdropFilter: 'blur(0px) saturate(100%)',
      WebkitBackdropFilter: 'blur(0px) saturate(100%)',
      transform: 'scale(1)',
      transition: 'none',
    });

    document.body.appendChild(el);
    ref.current = el;

    const play = (kind: 'login' | 'logout') => {
      if (!ref.current) return;

      if (kind === 'login') {
        // ——— LOGIN — gentle fade/blur-in (already looks good)
        const anim = ref.current.animate(
          [
            {
              opacity: 0,
              transform: 'scale(1)',
              backdropFilter: 'blur(0px) saturate(100%)',
            },
            {
              opacity: 1,
              transform: 'scale(1.03)',
              backdropFilter: 'blur(10px) saturate(130%)',
              offset: 0.5,
            },
            {
              opacity: 0,
              transform: 'scale(1)',
              backdropFilter: 'blur(0px) saturate(100%)',
            },
          ],
          {
            duration: 450,
            easing: 'cubic-bezier(.22,.7,.2,1)',
            fill: 'both',
          }
        );
        anim.play();
      } else {
        // ——— LOGOUT — reverse: a cool upward “lift away” + tint
        const anim = ref.current.animate(
          [
            {
              opacity: 0,
              transform: 'translateY(0) scale(1)',
              backdropFilter: 'blur(4px) saturate(130%)',
              background:
                'radial-gradient(140% 180% at 50% 80%, rgba(59,130,246,.18), rgba(255,255,255,.0) 70%), rgba(255,255,255,.8)',
            },
            {
              opacity: 1,
              transform: 'translateY(-6%) scale(1.05)',
              backdropFilter: 'blur(10px) saturate(160%)',
              background:
                'radial-gradient(160% 200% at 50% 80%, rgba(59,130,246,.25), rgba(255,255,255,.0) 70%), rgba(255,255,255,.9)',
              offset: 0.5,
            },
            {
              opacity: 0,
              transform: 'translateY(-12%) scale(0.98)',
              backdropFilter: 'blur(0px) saturate(100%)',
              background:
                'radial-gradient(120% 140% at 50% 20%, rgba(255,255,255,.95), rgba(59,130,246,.12) 40%, rgba(255,255,255,0) 65%)',
            },
          ],
          {
            duration: 600,
            easing: 'cubic-bezier(.22,.7,.2,1)',
            fill: 'both',
          }
        );
        anim.play();
      }
    };

    const onLogin = () => play('login');
    const onLogout = () => play('logout');

    window.addEventListener('emp:transition:login', onLogin);
    window.addEventListener('emp:transition:logout', onLogout);

    return () => {
      window.removeEventListener('emp:transition:login', onLogin);
      window.removeEventListener('emp:transition:logout', onLogout);
      ref.current?.remove();
    };
  }, []);

  return null;
}

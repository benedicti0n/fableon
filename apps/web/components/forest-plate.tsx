/**
 * A static visual-direction study for the MVP benchmark: a bird crossing a
 * painted forest at dusk. It is illustrative only and is not produced by the
 * (not-yet-implemented) Fableon renderer.
 */
export function ForestPlate() {
  return (
    <figure className="relative overflow-hidden rounded-xl border border-ink-700 bg-ink-900 shadow-[0_30px_80px_-40px_rgba(0,0,0,0.9)]">
      <div className="flex items-center justify-between border-b border-ink-700 px-4 py-3">
        <span className="font-mono text-[10px] tracking-[0.16em] text-mist-400 uppercase">
          Visual direction / 01
        </span>
        <span className="font-mono text-[10px] tracking-[0.16em] text-mist-500 uppercase">
          Static study
        </span>
      </div>

      <div className="aspect-[4/5] overflow-hidden bg-ink-950">
        <svg
          viewBox="0 0 640 800"
          className="h-full w-full"
          role="img"
          aria-labelledby="forest-plate-title forest-plate-desc"
        >
          <title id="forest-plate-title">A bird flying through a twilight painted forest</title>
          <desc id="forest-plate-desc">
            A conceptual illustration with a pale bird crossing layered, painterly forest
            silhouettes beneath a warm setting sun.
          </desc>

          <defs>
            <linearGradient id="forest-sky" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stopColor="#0b1313" />
              <stop offset="0.42" stopColor="#293a33" />
              <stop offset="0.7" stopColor="#7f7b55" />
              <stop offset="1" stopColor="#c9a468" />
            </linearGradient>
            <radialGradient id="forest-sun-glow">
              <stop offset="0" stopColor="#f4dca8" stopOpacity="0.92" />
              <stop offset="0.42" stopColor="#e0b269" stopOpacity="0.3" />
              <stop offset="1" stopColor="#e0b269" stopOpacity="0" />
            </radialGradient>
            <linearGradient id="forest-hill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stopColor="#34483c" />
              <stop offset="1" stopColor="#17241f" />
            </linearGradient>
            <linearGradient id="forest-ground" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stopColor="#101a16" />
              <stop offset="1" stopColor="#080d0b" />
            </linearGradient>
            <filter id="forest-blur" x="-30%" y="-30%" width="160%" height="160%">
              <feGaussianBlur stdDeviation="18" />
            </filter>
            <filter id="forest-grain" x="0" y="0" width="100%" height="100%">
              <feTurbulence type="fractalNoise" baseFrequency="0.75" numOctaves="2" />
              <feColorMatrix type="saturate" values="0" />
            </filter>
          </defs>

          <rect width="640" height="800" fill="url(#forest-sky)" />
          <circle
            cx="424"
            cy="242"
            r="230"
            fill="url(#forest-sun-glow)"
            filter="url(#forest-blur)"
          />
          <circle cx="424" cy="238" r="68" fill="#efd39a" opacity="0.86" />
          <circle cx="424" cy="238" r="68" fill="#f8e9c6" opacity="0.18" />

          <path
            d="M0 470c78-50 156-67 239-32 82 35 143 24 201-8 74-41 139-39 200 7v363H0V470Z"
            fill="url(#forest-hill)"
            opacity="0.78"
          />
          <path
            d="M0 514c96-31 174-23 246 14 91 47 164 22 230-14 60-33 118-30 164 6v280H0V514Z"
            fill="#1b2b23"
            opacity="0.88"
          />

          <g fill="#0e1814">
            <path d="M60 800V338c-8-28-4-64 9-92 9 30 13 67 7 96v458H60Z" />
            <path d="M46 350c-28-22-43-49-47-83 33 15 56 39 68 73l-21 10ZM75 367c31-20 50-46 58-79-36 13-61 35-76 69l18 10Z" />
            <path d="M582 800V280c10-33 5-74-8-105-10 34-14 77-8 111v514h16Z" />
            <path d="M568 302c-36-25-56-57-61-95 42 17 70 47 84 87l-23 8ZM596 324c39-22 63-52 73-90-45 15-77 42-95 82l22 8Z" />
            <path d="M478 800V408c7-24 3-52-6-73-6 24-8 52-4 75v390h10Z" />
          </g>

          <g fill="#111d18" opacity="0.95">
            <path d="M0 576c40-17 72-11 103 13 30 23 55 25 84 5 36-25 67-22 96 7-49 3-90 20-123 49l-160 3v-77Z" />
            <path d="M640 548c-45-9-78 0-103 27-25 26-51 29-81 9-32-22-61-17-88 14 54-1 94 15 126 47l146 1v-98Z" />
          </g>

          <g opacity="0.24" strokeLinecap="round" fill="none">
            <path d="M52 650c111-39 231-42 351-8" stroke="#e0b269" strokeWidth="12" />
            <path d="M242 700c99-23 192-19 286 12" stroke="#9db398" strokeWidth="8" />
            <path d="M84 736c142-30 282-24 421 19" stroke="#0a0f0c" strokeWidth="22" />
          </g>

          <g transform="translate(286 310) rotate(-7)">
            <path d="M0 0c19-27 47-37 80-25-23 5-43 19-57 42L0 0Z" fill="#f5e6c6" opacity="0.92" />
            <path d="M0 0c-16-24-40-33-71-23 21 4 38 17 51 38L0 0Z" fill="#d9b579" opacity="0.9" />
            <path d="M-7 2c6 17 19 27 38 31-9-13-17-24-21-37L-7 2Z" fill="#f5e6c6" opacity="0.86" />
            <path
              d="M-14 9c-16 10-28 22-36 37"
              stroke="#f5e6c6"
              strokeWidth="3"
              strokeLinecap="round"
              opacity="0.5"
            />
          </g>

          <path
            d="M0 676c82-45 161-49 238-12 72 34 144 27 215-21 70-47 132-49 187-6v163H0V676Z"
            fill="url(#forest-ground)"
          />

          <g fill="#060b09">
            <path d="M0 800c33-66 78-107 137-123-17 49-45 90-84 123H0Z" />
            <path d="M640 800c-31-57-71-94-121-111 14 43 38 80 71 111h50Z" />
            <path d="M240 800c20-44 49-74 88-90-9 39-26 69-51 90h-37Z" />
            <path d="M402 800c-12-38-5-71 22-99 14 39 12 72-6 99h-16Z" />
          </g>

          <rect width="640" height="800" filter="url(#forest-grain)" opacity="0.055" />
          <rect
            width="640"
            height="800"
            fill="none"
            stroke="#f5e6c6"
            strokeOpacity="0.08"
            strokeWidth="2"
          />
        </svg>
      </div>

      <figcaption className="flex items-end justify-between gap-4 border-t border-ink-700 px-4 py-3">
        <p className="text-sm text-paper-100">
          Bird in flight
          <span className="mt-0.5 block text-xs text-mist-500">
            Study for the MVP benchmark scene
          </span>
        </p>
        <span className="font-mono text-[9px] tracking-[0.14em] text-mist-500 uppercase">
          Concept · not rendered
        </span>
      </figcaption>
    </figure>
  );
}

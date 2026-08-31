"use client";

// Header is now integrated INSIDE Hero (h-screen w-screen wrapper) exactly as in hero-test/HeroV5.
// This component is intentionally hidden to preserve the exact hero-test placement:
// header at pt-5 inside the same viewport flex-col wrapper with the hero grid (my-auto)
// and mountain/planet background. Rendering a separate fixed nav would duplicate the header
// and break the vh placement (h-screen flex flex-col justify-between).
export function Navbar() {
  return null;
}

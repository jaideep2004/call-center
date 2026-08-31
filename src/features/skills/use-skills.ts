"use client";

import { useEffect, useState } from "react";

export interface Skill {
  id: string;
  name: string;
  slug: string;
  active: boolean;
  sort: number;
}

export function useSkills() {
  const [skills, setSkills] = useState<Skill[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/v1/skills?active=true")
      .then(async (res) => {
        if (res.ok) {
          const body = await res.json();
          if (!cancelled) setSkills(body.data ?? []);
        }
      })
      .catch(() => {})
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, []);

  return { skills, loading, names: skills.map((s) => s.name) };
}
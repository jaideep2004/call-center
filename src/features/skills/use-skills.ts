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

  const fetchSkills = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/v1/skills?active=true");
      if (res.ok) {
        const body = await res.json();
        setSkills(body.data ?? []);
      }
    } catch {}
    setLoading(false);
  };

  useEffect(() => {
    fetchSkills();
  }, []);

  return { skills, loading, names: skills.map((s) => s.name), refresh: fetchSkills };
}
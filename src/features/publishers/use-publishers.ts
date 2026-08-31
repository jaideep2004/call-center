"use client";

import { useEffect, useState } from "react";

export interface Publisher {
  id: string;
  name: string;
  email: string | null;
  afid: string | null;
  commission_pct: number;
  active: boolean;
}

export function usePublishers() {
  const [publishers, setPublishers] = useState<Publisher[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/v1/publishers?active=true")
      .then(async (res) => {
        if (res.ok) {
          const body = await res.json();
          if (!cancelled) setPublishers(body.data ?? []);
        }
      })
      .catch(() => {})
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, []);

  return { publishers, loading };
}

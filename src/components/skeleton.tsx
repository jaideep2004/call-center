"use client";

interface SkeletonProps {
  variant?: "text" | "heading" | "avatar" | "card" | "table-row";
  width?: string | number;
  height?: string | number;
  count?: number;
}

const cls = {
  text: "skeleton skeleton-text",
  heading: "skeleton skeleton-heading",
  avatar: "skeleton skeleton-avatar",
  card: "skeleton skeleton-text",
  "table-row": "skeleton skeleton-text",
};

export default function Skeleton({ variant = "text", width, height, count = 1 }: SkeletonProps) {
  const className = cls[variant];
  const style = { width, height } as React.CSSProperties;
  return (
    <>
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className={className} style={style} />
      ))}
    </>
  );
}

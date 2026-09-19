/**
 * Video URL helpers (tutorials). Direct files (mp4/webm) play in <video>;
 * YouTube links (watch / youtu.be / embed / shorts / live) play in a
 * privacy-enhanced iframe. Thumbnails fall back to YouTube's artwork.
 */

export function getYoutubeId(url: string | null | undefined): string | null {
  if (!url) return null;
  const trimmed = url.trim();
  const patterns = [
    /(?:youtube\.com\/watch\?.*v=|youtube\.com\/embed\/|youtube\.com\/shorts\/|youtube\.com\/live\/)([A-Za-z0-9_-]{6,})/,
    /youtu\.be\/([A-Za-z0-9_-]{6,})/,
  ];
  for (const re of patterns) {
    const m = trimmed.match(re);
    if (m?.[1]) return m[1];
  }
  return null;
}

export function isYoutubeUrl(url: string | null | undefined): boolean {
  return getYoutubeId(url) !== null;
}

export function youtubeEmbedUrl(id: string): string {
  return `https://www.youtube-nocookie.com/embed/${id}?rel=0`;
}

export function youtubeThumb(id: string): string {
  return `https://img.youtube.com/vi/${id}/hqdefault.jpg`;
}

/** Card artwork: explicit thumbnail wins, else YouTube artwork, else null. */
export function tutorialArtwork(
  thumbnailUrl: string | null | undefined,
  videoUrl: string | null | undefined,
): string | null {
  if (thumbnailUrl) return thumbnailUrl;
  const yt = getYoutubeId(videoUrl);
  return yt ? youtubeThumb(yt) : null;
}

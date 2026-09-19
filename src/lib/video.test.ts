import { describe, it, expect } from "vitest";
import { getYoutubeId, isYoutubeUrl, youtubeEmbedUrl, tutorialArtwork } from "./video";

describe("getYoutubeId", () => {
  it("parses watch URLs (even with extra params)", () => {
    expect(getYoutubeId("https://www.youtube.com/watch?v=dQw4w9WgXcQ")).toBe("dQw4w9WgXcQ");
    expect(getYoutubeId("https://www.youtube.com/watch?v=dQw4w9WgXcQ&t=42s&list=abc")).toBe("dQw4w9WgXcQ");
  });

  it("parses short, embed, shorts, and live URLs", () => {
    expect(getYoutubeId("https://youtu.be/dQw4w9WgXcQ")).toBe("dQw4w9WgXcQ");
    expect(getYoutubeId("https://www.youtube.com/embed/dQw4w9WgXcQ")).toBe("dQw4w9WgXcQ");
    expect(getYoutubeId("https://www.youtube.com/shorts/dQw4w9WgXcQ")).toBe("dQw4w9WgXcQ");
    expect(getYoutubeId("https://www.youtube.com/live/dQw4w9WgXcQ")).toBe("dQw4w9WgXcQ");
  });

  it("rejects direct files, empties, and non-YouTube hosts", () => {
    expect(getYoutubeId("https://cdn/x.mp4")).toBeNull();
    expect(getYoutubeId("https://vimeo.com/12345")).toBeNull();
    expect(getYoutubeId("")).toBeNull();
    expect(getYoutubeId(null)).toBeNull();
    expect(isYoutubeUrl("https://cdn/x.mp4")).toBe(false);
    expect(isYoutubeUrl("https://youtu.be/dQw4w9WgXcQ")).toBe(true);
  });

  it("builds a privacy-enhanced embed URL", () => {
    expect(youtubeEmbedUrl("dQw4w9WgXcQ")).toContain("youtube-nocookie.com/embed/dQw4w9WgXcQ");
  });
});

describe("tutorialArtwork", () => {
  it("prefers the explicit thumbnail, else YouTube artwork, else null", () => {
    expect(tutorialArtwork("https://cdn/t.png", "https://youtu.be/dQw4w9WgXcQ")).toBe("https://cdn/t.png");
    expect(tutorialArtwork(null, "https://youtu.be/dQw4w9WgXcQ")).toBe(
      "https://img.youtube.com/vi/dQw4w9WgXcQ/hqdefault.jpg",
    );
    expect(tutorialArtwork(null, "https://cdn/x.mp4")).toBeNull();
    expect(tutorialArtwork(null, null)).toBeNull();
  });
});

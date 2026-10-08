import { describe, expect, test } from "bun:test";
import { getImageProps } from "./imageProps.server";

// Bun runs these without Next's config injection. Check the image props our
// components need; the production build and browser suite exercise app config.
describe("server image props", () => {
  test("fill images retain responsive sizes and avoid lazy loading when preloaded", () => {
    const sizes = "(max-width: 640px) 160px, 224px";
    const { props } = getImageProps({
      src: "/me.png",
      alt: "Portrait",
      fill: true,
      sizes,
      preload: true,
    });

    expect(props.alt).toBe("Portrait");
    expect(props.sizes).toBe(sizes);
    expect(props.style).toMatchObject({ position: "absolute", width: "100%", height: "100%" });
    expect(props.srcSet).toContain("w=640&q=75 640w");
    expect(props.loading).toBeUndefined();
    expect(Object.values(props)).not.toContain(undefined);
  });

  test("fixed-size illustrations receive optimized URLs and density variants", () => {
    const { props } = getImageProps({
      src: "/illustration.png",
      alt: "Illustration",
      width: 224,
      height: 224,
      quality: 75,
    });

    expect(props).toMatchObject({
      src: "/_next/image?url=%2Fillustration.png&w=640&q=75",
      width: 224,
      height: 224,
      loading: "lazy",
    });
    expect(props.srcSet).toBe(
      "/_next/image?url=%2Fillustration.png&w=256&q=75 1x, /_next/image?url=%2Fillustration.png&w=640&q=75 2x",
    );
  });

  test("remote thumbnails encode their original URL in responsive optimization URLs", () => {
    const src = "https://img.youtube.com/vi/example/mqdefault.jpg";
    const sizes = "(max-width: 640px) 50vw, 33vw";
    const { props } = getImageProps({ src, alt: "Video", fill: true, sizes });
    const optimized = new URL(props.src, "https://example.test");

    expect(optimized.pathname).toBe("/_next/image");
    expect(optimized.searchParams.get("url")).toBe(src);
    expect(optimized.searchParams.get("q")).toBe("75");
    expect(props.sizes).toBe(sizes);
    expect(props.srcSet).toContain(" 640w");
  });

  test("SVG sources bypass raster optimization", () => {
    const { props } = getImageProps({ src: "/logo.svg", alt: "Logo", width: 48, height: 48 });

    expect(props).toMatchObject({ src: "/logo.svg", alt: "Logo", width: 48, height: 48 });
    expect(props.srcSet).toBeUndefined();
  });

  test("explicitly unoptimized sources remain unchanged", () => {
    const { props } = getImageProps({
      src: "/custom.png",
      alt: "Custom",
      width: 64,
      height: 64,
      unoptimized: true,
    });

    expect(props).toMatchObject({ src: "/custom.png", alt: "Custom", width: 64, height: 64 });
    expect(props.srcSet).toBeUndefined();
  });
});

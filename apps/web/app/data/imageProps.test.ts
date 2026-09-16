import { describe, expect, test } from "bun:test";
import { type ImageProps, getImageProps as publicImageProps } from "next/image";
import { getImageProps } from "./imageProps.server";

describe("server image adapter matches the pinned Next public API", () => {
  const inputs: ImageProps[] = [
    {
      src: "/me.png",
      alt: "Portrait",
      fill: true,
      sizes: "(max-width: 640px) 160px, 224px",
      preload: true,
    },
    { src: "/illustration.png", alt: "Illustration", width: 224, height: 224, quality: 75 },
    {
      src: "https://img.youtube.com/vi/example/mqdefault.jpg",
      alt: "Video",
      fill: true,
      sizes: "(max-width: 640px) 50vw, 33vw",
    },
    { src: "/logo.svg", alt: "Logo", width: 48, height: 48 },
    { src: "/custom.png", alt: "Custom", width: 64, height: 64, unoptimized: true },
  ];
  for (const input of inputs) {
    test(input.src.toString(), () => {
      expect(getImageProps(input)).toEqual(publicImageProps(input));
    });
  }
});

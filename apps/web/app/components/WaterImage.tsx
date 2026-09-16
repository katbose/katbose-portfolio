import { WaterImageEffect } from "./WaterEffects.client";

/** The fallback image and WebGL texture must use the same optimized URL. */
export function WaterImage({ src, alt }: { src: string; alt: string }) {
  const { props } = getImageProps({ src, alt, width: 224, height: 224, quality: 75 });
  return <WaterImageEffect src={props.src} alt={alt} />;
}

import { getImageProps } from "../data/imageProps.server";

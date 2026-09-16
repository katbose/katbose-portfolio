import { getImgProps, type ImageProps } from "next/dist/shared/lib/get-img-props";
import { imageConfigDefault } from "next/dist/shared/lib/image-config";
import imageLoader from "next/dist/shared/lib/image-loader";
import nextConfig from "../../next.config";

// Next 16's public next/image barrel retains the unused Image client boundary.
// This server-only adapter calls the same implementation without that barrel.
// The pinned Next version and parity tests guard these internal imports; review
// this adapter on upgrades and return to the public API when it tree-shakes.
export function getImageProps(input: ImageProps) {
  const { props } = getImgProps(input, {
    defaultLoader: imageLoader,
    imgConf: { ...imageConfigDefault, ...nextConfig.images },
  });
  return {
    props: Object.fromEntries(
      Object.entries(props).filter(([, value]) => value !== undefined),
    ) as typeof props,
  };
}

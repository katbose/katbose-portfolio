import type { ImageProps } from "next/image";
import { preload } from "react-dom";
import { getImageProps } from "../data/imageProps.server";

/** Static images keep Next's responsive optimization without a client component. */
export function OptimizedImage({ priority, ...input }: ImageProps) {
  const { props } = getImageProps({ ...input, priority });
  if (priority) {
    preload(props.src, {
      as: "image",
      imageSrcSet: props.srcSet,
      imageSizes: props.sizes,
      fetchPriority: "high",
    });
  }
  // biome-ignore lint/performance/noImgElement: getImageProps supplies optimized responsive URLs on the server
  return <img {...props} alt={props.alt} />;
}

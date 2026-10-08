// Next 16.4 separates this helper from its Image client component and marks the
// public barrel as side-effect-free. Next injects next.config.ts image options
// into the helper during compilation, including our remote host allowlist.
export { getImageProps } from "next/image";

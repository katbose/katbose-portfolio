"use client";

// A static named export lets the bundler discard every unused shader before
// this client-only module is loaded on demand.
export { Water as default } from "@paper-design/shaders-react";

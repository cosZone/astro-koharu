/// <reference path="../.astro/types.d.ts" />
/// <reference types="astro/client" />
/// <reference types="vite-plugin-svgr/client" />

declare namespace NodeJS {
  interface ProcessEnv {
    /** Server-only public origin. Required only when Moments is enabled. */
    readonly KOHARU_SUITE_URL?: string;
  }
}

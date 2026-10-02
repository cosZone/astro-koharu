// Share the Ruby boundary between raw preprocessing and the remark renderer.
// Exclude {.class} attributes, which start with a dot.
export const SHOKA_RUBY_PATTERN = /\{([^{}^.][^{}^]*)\^([^{}]+)\}/;

/**
 * Custom DOM events used across the application.
 *
 * Augments the global WindowEventMap so addEventListener/removeEventListener
 * calls for custom events are type-safe.
 */

declare global {
  interface DocumentEventMap {
    /** Fired after an encrypted post is decrypted and its HTML injected into the DOM. */
    'content:decrypted': CustomEvent;
  }
}

export {};

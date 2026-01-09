/**
 * Type declarations for YAML file imports
 * Used by @rollup/plugin-yaml
 */

declare module '*.yaml' {
  import type { SiteYamlConfig } from '@lib/config/types';
  const value: SiteYamlConfig;
  export default value;
}

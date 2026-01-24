/**
 * Type declarations for YAML file imports
 * Used by @rollup/plugin-yaml
 */

// Specific type declarations for each config file
declare module '*/config/site.yaml' {
  import type { SiteYamlConfig } from '@lib/config/types';
  const value: SiteYamlConfig;
  export default value;
}

declare module '*/config/cms.yaml' {
  import type { CMSConfig } from '@/types/cms';
  const value: CMSConfig;
  export default value;
}

// Fallback for other YAML files
declare module '*.yaml' {
  const value: Record<string, unknown>;
  export default value;
}

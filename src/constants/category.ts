import yamlConfig from '../../config/site.yaml';

// { '随笔': 'life' }
export const categoryMap: { [name: string]: string } = yamlConfig.categoryMap || {};

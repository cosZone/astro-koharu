import { defineLiveCollection } from 'astro:content';
import { momentsConfig } from '@constants/site-config';
import { koharuChannelsLoader } from '@coszone/koharu-astro/loaders';
import { readKoharuSuiteUrl } from './features/moments/lib/runtime';

export const collections = momentsConfig.enabled
  ? {
      koharuChannels: defineLiveCollection({
        loader: koharuChannelsLoader({ baseUrl: readKoharuSuiteUrl() }),
      }),
    }
  : {};

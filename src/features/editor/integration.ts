import type { AstroIntegration } from 'astro';
import { handleEditorOGRequest } from './server/http';

/** Register the opt-in writing room and its local metadata endpoint together. */
export function editorIntegration(): AstroIntegration {
  return {
    name: 'koharu-editor',
    hooks: {
      'astro:config:setup': ({ injectRoute }) => {
        injectRoute({ pattern: '/editor', entrypoint: './src/features/editor/pages/index.astro', prerender: true });
        injectRoute({ pattern: '/editor/preview', entrypoint: './src/features/editor/pages/preview.astro', prerender: true });
      },
      'astro:server:setup': ({ server }) => {
        server.middlewares.use((request, response, next) => {
          void handleEditorOGRequest(request, response)
            .then((handled) => {
              if (!handled) next();
            })
            .catch(next);
        });
      },
    },
  };
}

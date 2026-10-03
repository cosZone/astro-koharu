import type { AstroIntegration } from 'astro';
import { handleEditorOGRequest } from './server/http';

/** The public metadata endpoint is available locally without starting a second server. */
export function editorDevIntegration(): AstroIntegration {
  return {
    name: 'koharu-editor-dev',
    hooks: {
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

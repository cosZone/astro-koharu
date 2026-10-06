import { getPostSource } from '../_shared/post-source';
import { postSourceRoute } from '../_shared/routes';

export const getStaticPaths = postSourceRoute.root;
export const GET = getPostSource;

import { getPostSource } from '../../_shared/post-source';
import { postSourceRoute } from '../../_shared/routes';

export const getStaticPaths = postSourceRoute.mirror;
export const GET = getPostSource;

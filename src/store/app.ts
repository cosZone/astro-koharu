import { HomeSiderSegmentType } from '@constants/enum';
import { atom } from 'nanostores';

export const homeSiderSegmentType = atom<HomeSiderSegmentType>(HomeSiderSegmentType.INFO);

/**
 * HomeSider Component
 *
 * Sidebar with content switching between Info, Directory (TOC), and Series.
 * Uses tabs-like pattern with animated transitions.
 */

import { SeriesNavigation } from '@components/post/SeriesNavigation';
import { SeriesPostList } from '@components/post/SeriesPostList';
import HomeSiderSegmented from '@components/ui/segmented/HomeSiderSegmented';
import { HomeSiderSegmentType, HomeSiderType } from '@constants/enum';
import { cn } from '@lib/utils';
import { useStore } from '@nanostores/react';
import { homeSiderSegmentType } from '@store/app';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import type { ReactNode } from 'react';
import { useEffect, useMemo, useState } from 'react';
import type { BlogPost } from '@/types/blog';
import { ScrollProgress } from './ScrollProgress';
import { TableOfContents } from './TableOfContents/index';

interface HomeSiderProps {
  type?: HomeSiderType;
  className?: string;
  /** Pre-rendered HomeInfo component (from Astro) */
  homeInfo?: ReactNode;
  /** Series posts data */
  seriesPosts?: BlogPost[];
  /** Current post slug for series highlighting */
  currentPostSlug?: string;
  /** Previous post in series */
  prevPost?: BlogPost | null;
  /** Next post in series */
  nextPost?: BlogPost | null;
  /** Enable TOC numbering */
  tocNumbering?: boolean;
}

// Animation variants
const slideVariants = {
  enter: (direction: number) => ({
    x: direction > 0 ? 12 : -12,
    opacity: 0,
  }),
  center: {
    x: 0,
    opacity: 1,
  },
  exit: (direction: number) => ({
    x: direction < 0 ? 12 : -12,
    opacity: 0,
  }),
};

export default function HomeSider({
  type = HomeSiderType.HOME,
  className,
  homeInfo,
  seriesPosts = [],
  currentPostSlug,
  prevPost,
  nextPost,
  tocNumbering = true,
}: HomeSiderProps) {
  const shouldReduceMotion = useReducedMotion();
  const currentSegment = useStore(homeSiderSegmentType);

  // Determine default segment type
  const defaultSegmentType = type === HomeSiderType.POST ? HomeSiderSegmentType.DIRECTORY : HomeSiderSegmentType.INFO;

  // Track direction for animation
  const [direction, setDirection] = useState(0);
  const [activeSegment, setActiveSegment] = useState(defaultSegmentType);

  // Segment order for determining animation direction
  const segmentOrder = useMemo(
    () => ({
      [HomeSiderSegmentType.INFO]: 0,
      [HomeSiderSegmentType.DIRECTORY]: 1,
      [HomeSiderSegmentType.SERIES]: 2,
    }),
    [],
  );

  // Sync with store changes
  useEffect(() => {
    if (type === HomeSiderType.HOME) {
      setActiveSegment(HomeSiderSegmentType.INFO);
      return;
    }

    const newOrder = segmentOrder[currentSegment];
    const oldOrder = segmentOrder[activeSegment];
    setDirection(newOrder > oldOrder ? 1 : -1);
    setActiveSegment(currentSegment);
  }, [currentSegment, type, segmentOrder, activeSegment]);

  // Initialize store on mount
  useEffect(() => {
    if (type === HomeSiderType.POST) {
      homeSiderSegmentType.set(defaultSegmentType);
    }
  }, [type, defaultSegmentType]);

  // Render content based on active segment
  const renderContent = () => {
    if (type === HomeSiderType.HOME) {
      return homeInfo || <div className="pt-18 md:pt-0">HomeInfo placeholder</div>;
    }

    switch (activeSegment) {
      case HomeSiderSegmentType.INFO:
        return homeInfo || <div>HomeInfo placeholder</div>;
      case HomeSiderSegmentType.DIRECTORY:
        return <TableOfContents enableNumbering={tocNumbering} />;
      case HomeSiderSegmentType.SERIES:
        return <SeriesPostList posts={seriesPosts} currentPostSlug={currentPostSlug} />;
      default:
        return null;
    }
  };

  return (
    <div
      className={cn(
        'page-home-sider sticky top-0 flex tablet:hidden h-screen min-w-64 max-w-64 flex-col items-center self-start overflow-auto px-2 shadow-home-sider',
        className,
      )}
    >
      {type === HomeSiderType.POST && (
        <HomeSiderSegmented
          className="my-4 flex w-full justify-between text-sm/6"
          itemClass="grow"
          defaultValue={defaultSegmentType}
          id="inner-home-sider"
        />
      )}

      <div className="vertical-scrollbar scroll-gutter-stable relative w-full flex-1 overflow-y-auto overflow-x-hidden md:pt-4 md:pl-3">
        <AnimatePresence mode="wait" initial={false} custom={direction}>
          <motion.div
            key={activeSegment}
            custom={direction}
            variants={shouldReduceMotion ? undefined : slideVariants}
            initial="enter"
            animate="center"
            exit="exit"
            transition={{
              x: { type: 'tween', duration: 0.2, ease: 'easeInOut' },
              opacity: { duration: 0.2 },
            }}
            className="absolute inset-x-0 top-0"
          >
            {renderContent()}
          </motion.div>
        </AnimatePresence>
      </div>

      {type === HomeSiderType.POST && <SeriesNavigation prevPost={prevPost} nextPost={nextPost} className="w-full px-2" />}

      <ScrollProgress className="mt-auto w-full rounded-full pt-4" />
    </div>
  );
}

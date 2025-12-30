/**
 * Type Definitions Barrel Export
 *
 * This file provides a convenient single import point for all type definitions.
 * Import from '@types' instead of '@types/specific-file' when you need multiple types.
 */

// Animation types
export type {
  AnimationDirection,
  AnimationTiming,
  AnimationTrigger,
  AnimationVariantName,
  ExpandProps,
  FadeInProps,
  MotionVariants,
  SlideInProps,
  SpringConfig,
  SpringPreset,
  StaggerProps,
} from './animation';

// Component props
export type {
  CoverProps,
  DropdownNavProps,
  ErrorBoundaryProps,
  MenuIconProps,
  NavItemProps,
  PopoverProps,
  PostItemCardProps,
  SegmentedProps,
  TableOfContentsProps,
  TooltipProps,
} from './components';

// Content types
export type {
  BlogPost,
  BlogSchema,
  Category,
  CategoryListResult,
  CategoryWithCount,
  PaginatedResult,
  PostMetadata,
  TagWithCount,
} from './content';
// UI types
export type {
  BadgeVariant,
  ButtonVariant,
  ControlledComponentProps,
  FloatingPosition,
  ForwardedRef,
  OpenCloseState,
  OptionType,
  Size,
  WithChildren,
  WithClassName,
} from './ui';

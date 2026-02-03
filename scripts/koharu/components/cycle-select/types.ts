/**
 * Option item for CycleSelect
 */
export interface SelectOption {
  label: string;
  value: string;
}

/**
 * Internal option item with linked list pointers
 */
export interface OptionItem {
  value: string;
  label: string;
  index: number;
  previous?: OptionItem;
  next?: OptionItem;
}

/**
 * Extended Map type to track first and last options
 */
export interface OptionMapType extends Map<string, OptionItem> {
  first?: OptionItem;
  last?: OptionItem;
}

/**
 * Create a new OptionMap instance
 */
export function createOptionMap(): OptionMapType {
  const map = new Map<string, OptionItem>() as OptionMapType;
  return map;
}

/**
 * Props for CycleSelect component
 */
export interface CycleSelectProps {
  /** Available options to select from */
  options: SelectOption[];
  /** Callback when an option is selected */
  onChange: (value: string) => void;
  /** Number of visible options (default: 5) */
  visibleOptionCount?: number;
  /** Default selected value */
  defaultValue?: string;
}

/**
 * State for CycleSelect
 */
export interface CycleSelectState {
  focusedValue: string;
  optionMap: OptionMapType;
  visibleFromIndex: number;
  visibleToIndex: number;
  visibleOptionCount: number;
}

/**
 * Actions for CycleSelect reducer
 */
export type CycleSelectAction = { type: 'focus-next-option' } | { type: 'focus-previous-option' };

import type { Dispatch } from 'react';
import { useReducer } from 'react';
import type { CycleSelectAction, CycleSelectState, OptionMapType, SelectOption } from './types';
import { createOptionMap } from './types';

interface UseCycleSelectStateReturn {
  state: CycleSelectState;
  dispatch: Dispatch<CycleSelectAction>;
}

/**
 * Build OptionMap from options array
 * Creates a doubly-linked list structure for efficient navigation
 */
function buildOptionMap(options: SelectOption[]): OptionMapType {
  const map = createOptionMap();

  for (let index = 0; index < options.length; index++) {
    const option = options[index];
    const previousItem = index > 0 ? map.get(options[index - 1].value) : undefined;

    const item = {
      value: option.value,
      label: option.label,
      index,
      previous: previousItem,
    };

    // Link previous item to current
    if (previousItem) {
      previousItem.next = item;
    }

    map.set(option.value, item);

    // Track first and last
    if (index === 0) {
      map.first = item;
    }
    if (index === options.length - 1) {
      map.last = item;
    }
  }

  return map;
}

/**
 * Create initial state for CycleSelect
 */
function createInitialState(options: SelectOption[], visibleOptionCount: number, defaultValue?: string): CycleSelectState {
  const optionMap = buildOptionMap(options);
  const focusedValue = defaultValue || options[0]?.value || '';

  return {
    focusedValue,
    optionMap,
    visibleFromIndex: 0,
    visibleToIndex: visibleOptionCount,
    visibleOptionCount,
  };
}

/**
 * Reducer for CycleSelect state
 * Implements cyclic navigation: wraps from last to first and vice versa
 */
function cycleSelectReducer(state: CycleSelectState, action: CycleSelectAction): CycleSelectState {
  const item = state.optionMap.get(state.focusedValue);
  if (!item) return state;

  switch (action.type) {
    case 'focus-next-option': {
      // If at end, wrap to first
      const next = item.next ?? state.optionMap.first;
      if (!next) return state;

      const isWrapping = !item.next;
      if (isWrapping) {
        // Jump to beginning, reset scroll position
        return {
          ...state,
          focusedValue: next.value,
          visibleFromIndex: 0,
          visibleToIndex: state.visibleOptionCount,
        };
      }

      // Normal case: move down
      const newVisibleFromIndex = next.index >= state.visibleToIndex ? state.visibleFromIndex + 1 : state.visibleFromIndex;
      const newVisibleToIndex = next.index >= state.visibleToIndex ? state.visibleToIndex + 1 : state.visibleToIndex;

      return {
        ...state,
        focusedValue: next.value,
        visibleFromIndex: newVisibleFromIndex,
        visibleToIndex: newVisibleToIndex,
      };
    }

    case 'focus-previous-option': {
      // If at beginning, wrap to last
      const previous = item.previous ?? state.optionMap.last;
      if (!previous) return state;

      const isWrapping = !item.previous;
      if (isWrapping) {
        // Jump to end, scroll to show last items
        const totalOptions = state.optionMap.size;
        return {
          ...state,
          focusedValue: previous.value,
          visibleFromIndex: Math.max(0, totalOptions - state.visibleOptionCount),
          visibleToIndex: totalOptions,
        };
      }

      // Normal case: move up
      const newVisibleFromIndex = previous.index < state.visibleFromIndex ? state.visibleFromIndex - 1 : state.visibleFromIndex;
      const newVisibleToIndex = previous.index < state.visibleFromIndex ? state.visibleToIndex - 1 : state.visibleToIndex;

      return {
        ...state,
        focusedValue: previous.value,
        visibleFromIndex: newVisibleFromIndex,
        visibleToIndex: newVisibleToIndex,
      };
    }

    default:
      return state;
  }
}

/**
 * Hook for managing CycleSelect state
 */
export function useCycleSelectState(
  options: SelectOption[],
  visibleOptionCount: number,
  defaultValue?: string,
): UseCycleSelectStateReturn {
  const [state, dispatch] = useReducer(cycleSelectReducer, { options, visibleOptionCount, defaultValue }, (init) =>
    createInitialState(init.options, init.visibleOptionCount, init.defaultValue),
  );

  return { state, dispatch };
}

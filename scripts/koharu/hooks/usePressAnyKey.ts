import { useInput } from 'ink';

/** 按任意键继续的 hook */
export function usePressAnyKey(enabled: boolean, onPress: () => void) {
  useInput(
    () => {
      onPress();
    },
    { isActive: enabled },
  );
}

import { Box, Text } from 'ink';
import { useState } from 'react';
import { CycleSelect as Select } from './components';
import { CREATORS, type CreatorType } from './creators';

type NewStatus = 'selecting' | 'creating' | 'done';

interface NewAppProps {
  /** Initial creator type (skip selection if provided) */
  initialType?: CreatorType;
  /** Whether to show return hint (for menu navigation) */
  showReturnHint?: boolean;
  /** Callback when creation is complete */
  onComplete?: () => void;
}

export function NewApp({ initialType, showReturnHint = false, onComplete }: NewAppProps) {
  const [status, setStatus] = useState<NewStatus>(() => (initialType ? 'creating' : 'selecting'));
  const [selectedType, setSelectedType] = useState<CreatorType | null>(initialType || null);

  const handleTypeSelect = (value: string) => {
    if (value === 'cancel') {
      onComplete?.();
      return;
    }
    setSelectedType(value as CreatorType);
    setStatus('creating');
  };

  const handleCreatorComplete = (_success: boolean) => {
    setStatus('done');
    onComplete?.();
  };

  const selectedCreator = selectedType ? CREATORS.find((c) => c.id === selectedType) : null;
  const CreatorComponent = selectedCreator?.Component;

  return (
    <Box flexDirection="column">
      {status === 'selecting' && (
        <Box flexDirection="column">
          <Text>选择要创建的内容类型:</Text>
          <Select
            options={[
              ...CREATORS.map((creator) => ({
                label: `${creator.label} - ${creator.description}`,
                value: creator.id,
              })),
              { label: '返回', value: 'cancel' },
            ]}
            onChange={handleTypeSelect}
          />
        </Box>
      )}

      {status === 'creating' && CreatorComponent && (
        <CreatorComponent onComplete={handleCreatorComplete} showReturnHint={showReturnHint} />
      )}
    </Box>
  );
}

import { type OptionType, Segmented } from '@components/ui/segmented';
import type { HomeSiderSegmentType } from '@constants/enum';
import { HomeSiderSegmentType as SegmentTypeEnum } from '@constants/enum';
import { homeSiderSegmentType } from '@store/app';
import React from 'react';
import { RiArticleLine, RiDashboard3Line, RiListOrdered2 } from 'react-icons/ri';
import { cn } from '@/lib/utils';

type HomeSiderSegmentedProps = {
  defaultValue?: HomeSiderSegmentType; // 默认值
  className?: string;
  indicateClass?: string;
  itemClass?: string;
  id?: string;
  value?: HomeSiderSegmentType; // 受控
};

export const HomeSiderSegmented = ({ className, ...props }: HomeSiderSegmentedProps) => {
  const options: OptionType<HomeSiderSegmentType>[] = [
    {
      label: '站点概览',
      value: SegmentTypeEnum.INFO,
      icon: RiDashboard3Line,
    },
    {
      label: '文章目录',
      value: SegmentTypeEnum.DIRECTORY,
      icon: RiListOrdered2,
    },
    {
      label: '系列文章',
      value: SegmentTypeEnum.SERIES,
      icon: RiArticleLine,
    },
  ];

  return (
    <Segmented<HomeSiderSegmentType>
      {...props}
      options={options}
      className={cn(
        'flex w-fit cursor-pointer select-none rounded-sm bg-black/8 p-1 font-semibold text-xs backdrop-blur-lg',
        className,
      )}
      onChange={(value) => homeSiderSegmentType.set(value)}
    />
  );
};

HomeSiderSegmented.displayName = 'HomeSiderSegmented';
export default React.memo(HomeSiderSegmented);

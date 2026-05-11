import type { Classification } from '@/lib/types';

export function pillClass(c: Classification): string {
  return (
    {
      excellent: 'pill-excellent',
      good: 'pill-good',
      average: 'pill-average',
      below: 'pill-below',
      poor: 'pill-poor',
    } as const
  )[c];
}

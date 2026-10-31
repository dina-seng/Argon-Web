/**
 * EventCover – an event's cover poster, or a category-tinted placeholder until covers are uploaded.
 * Children (badges) are laid over the cover: put them in the corners with absolute positioning.
 */
import type { ReactNode } from 'react';
import { EventCategory } from '@argon/shared';

const PLACEHOLDER_GRADIENTS: Record<EventCategory, string> = {
  [EventCategory.MUSIC]: 'radial-gradient(120% 90% at 20% 10%, #5b3aa8 0%, transparent 60%), radial-gradient(90% 80% at 90% 100%, #7a2048 0%, transparent 60%), #17111f',
  [EventCategory.SPORTS]: 'radial-gradient(120% 90% at 15% 0%, #0f6e66 0%, transparent 60%), radial-gradient(90% 80% at 95% 100%, #1d4d7a 0%, transparent 60%), #0d1517',
  [EventCategory.FOOD]: 'radial-gradient(120% 90% at 20% 10%, #a3541b 0%, transparent 60%), radial-gradient(90% 80% at 90% 100%, #0f5e5a 0%, transparent 60%), #17120d',
  [EventCategory.ARTS]: 'radial-gradient(120% 90% at 20% 10%, #9c4a2f 0%, transparent 60%), radial-gradient(90% 80% at 90% 100%, #c49a6c 0%, transparent 65%), #19120f',
  [EventCategory.TECH]: 'radial-gradient(120% 90% at 20% 10%, #1f4fbf 0%, transparent 60%), radial-gradient(90% 80% at 90% 100%, #c2611d 0%, transparent 60%), #0e1220',
  [EventCategory.OTHER]: 'radial-gradient(120% 90% at 20% 10%, #3a3f4f 0%, transparent 60%), radial-gradient(90% 80% at 90% 100%, #4b3a68 0%, transparent 60%), #121216',
};

interface EventCoverProps {
  category: EventCategory;
  coverImageUrl: string | null;
  className?: string;
  children?: ReactNode;
}

export function EventCover({ category, coverImageUrl, className = '', children }: EventCoverProps) {
  return (
    <div
      className={`relative overflow-hidden bg-surface-card ${className}`}
      style={coverImageUrl ? undefined : { background: PLACEHOLDER_GRADIENTS[category] }}
    >
      {coverImageUrl && (
        <img src={coverImageUrl} alt="" loading="lazy" className="absolute inset-0 h-full w-full object-cover" />
      )}
      {/* Darken the bottom so badges stay readable on bright covers. */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent" />
      {children}
    </div>
  );
}

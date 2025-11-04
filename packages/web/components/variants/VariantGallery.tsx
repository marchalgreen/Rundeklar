'use client';

import * as React from 'react';
import { Image as ImageIcon, ZoomIn } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useVariantSync } from '@/lib/variants/VariantSyncProvider';
import { GalleryPhoto } from '@/lib/variants/types';

type VariantGalleryProps = {
  heroAlt?: string;
  onOpenLightbox?: (index: number) => void;
  renderHeroOverlay?: React.ReactNode;
};

export default function VariantGallery({
  heroAlt,
  onOpenLightbox,
  renderHeroOverlay,
}: VariantGalleryProps) {
  const { photos, photoIndex, setPhotoIndex, setActiveColor, activeColor } = useVariantSync();

  const hero = photos[photoIndex];
  const displayedColor = activeColor ?? hero?.color;

  const handleSelect = React.useCallback(
    (index: number) => {
      setPhotoIndex(index);
      const photoColor = photos[index]?.color;
      if (photoColor) {
        setActiveColor(photoColor);
      }
    },
    [photos, setActiveColor, setPhotoIndex],
  );

  return (
    <div className="space-y-2">
      <div className="relative z-0 rounded-2xl overflow-hidden border border-hair bg-white/70 group pointer-events-auto">
        {hero ? (
          <>
            <img
              src={hero.url}
              alt={heroAlt}
              className="block w-full h-[260px] md:h-[300px] object-cover transition-transform duration-200 group-hover:scale-[1.01]"
            />
            {renderHeroOverlay}
            {onOpenLightbox ? (
              <button
                type="button"
                className="absolute right-2 top-2 z-[2] rounded-full bg-white/85 dark:bg-[hsl(var(--surface))]/85 backdrop-blur-md border border-hair h-8 w-8 grid place-items-center transition-transform duration-150 hover:scale-[1.05] pointer-events-auto"
                style={{ contain: 'layout paint' }}
                onClick={() => onOpenLightbox(photoIndex)}
                title="Åbn galleri"
              >
                <ZoomIn className="h-4 w-4" />
              </button>
            ) : null}
          </>
        ) : (
          <div className="h-[260px] md:h-[300px] grid place-items-center text-muted">
            <ImageIcon className="h-6 w-6 opacity-60" />
            <div className="text-xs mt-1">Ingen foto</div>
          </div>
        )}
      </div>
      {displayedColor ? (
        <div className="text-xs text-muted">
          Farve: <span className="text-foreground font-medium">{displayedColor}</span>
        </div>
      ) : null}
      {photos.length > 1 ? (
        <ThumbnailRail photos={photos} activeIndex={photoIndex} onSelect={handleSelect} />
      ) : null}
    </div>
  );
}

type ThumbnailRailProps = {
  photos: GalleryPhoto[];
  activeIndex: number;
  onSelect: (index: number) => void;
};

function ThumbnailRail({ photos, activeIndex, onSelect }: ThumbnailRailProps) {
  const listRef = React.useRef<HTMLDivElement>(null);

  const focusButton = React.useCallback((index: number) => {
    const buttons =
      listRef.current?.querySelectorAll<HTMLButtonElement>('[data-thumb-btn="true"]') ?? [];
    const target = buttons[index];
    if (target) {
      target.focus();
      target.scrollIntoView({ block: 'nearest', inline: 'center', behavior: 'smooth' });
    }
  }, []);

  const handleKeyDown = React.useCallback(
    (event: React.KeyboardEvent<HTMLButtonElement>, index: number) => {
      if (!photos.length) return;
      switch (event.key) {
        case 'ArrowRight':
        case 'ArrowDown': {
          event.preventDefault();
          const nextIndex = (index + 1) % photos.length;
          onSelect(nextIndex);
          focusButton(nextIndex);
          break;
        }
        case 'ArrowLeft':
        case 'ArrowUp': {
          event.preventDefault();
          const previousIndex = (index - 1 + photos.length) % photos.length;
          onSelect(previousIndex);
          focusButton(previousIndex);
          break;
        }
        case 'Home': {
          event.preventDefault();
          onSelect(0);
          focusButton(0);
          break;
        }
        case 'End': {
          event.preventDefault();
          const lastIndex = photos.length - 1;
          onSelect(lastIndex);
          focusButton(lastIndex);
          break;
        }
        case 'Enter':
        case ' ': {
          event.preventDefault();
          onSelect(index);
          break;
        }
        default:
          break;
      }
    },
    [focusButton, onSelect, photos.length],
  );

  React.useEffect(() => {
    if (!photos.length) return;
    const container = listRef.current;
    if (!container) return;
    const buttons = container.querySelectorAll<HTMLButtonElement>('[data-thumb-btn="true"]') ?? [];
    const activeButton = buttons[activeIndex];
    if (!activeButton) return;
    if (!container.contains(document.activeElement)) {
      activeButton.scrollIntoView({ block: 'nearest', inline: 'center', behavior: 'smooth' });
    }
  }, [activeIndex, photos.length]);

  return (
    <div
      className={cn('thumb-rail', 'relative z-0')}
      role="listbox"
      aria-label="Billedminiaturer"
      ref={listRef}
    >
      {photos.map((photo, index) => (
        <ThumbnailRailButton
          key={`${photo.url}-${index}`}
          photo={photo}
          index={index}
          isActive={index === activeIndex}
          onSelect={onSelect}
          onNavigate={handleKeyDown}
        />
      ))}
    </div>
  );
}

type ThumbnailRailButtonProps = {
  photo: GalleryPhoto;
  index: number;
  isActive: boolean;
  onSelect: (index: number) => void;
  onNavigate: (event: React.KeyboardEvent<HTMLButtonElement>, index: number) => void;
};

function ThumbnailRailButton({ photo, index, isActive, onSelect, onNavigate }: ThumbnailRailButtonProps) {
  const [loaded, setLoaded] = React.useState(false);
  const label = photo.label ?? photo.color ?? (photo.angle ? `Foto ${photo.angle}` : `Foto ${index + 1}`);

  return (
    <button
      type="button"
      role="option"
      aria-label={label}
      aria-selected={isActive}
      data-thumb-btn="true"
      className={cn('thumb-btn', isActive && 'thumb-selected')}
      title={label}
      tabIndex={isActive ? 0 : -1}
      onClick={() => onSelect(index)}
      onKeyDown={(event) => onNavigate(event, index)}
    >
      <img
        src={photo.url}
        alt=""
        aria-hidden="true"
        loading="lazy"
        data-loaded={loaded}
        className="thumb-img"
        onLoad={() => setLoaded(true)}
        onError={() => setLoaded(true)}
      />
    </button>
  );
}

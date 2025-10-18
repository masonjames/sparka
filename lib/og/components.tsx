import { OG_BACKGROUND_IMAGE, OG_SIZE } from '@/lib/og/shared';

export const OG_CARD_SIZE = { width: 1080, height: 560 } as const;

export function OGContainer({
  size,
  backgroundImage,
  children,
}: {
  size?: { width: number; height: number };
  backgroundImage?: string;
  children: React.ReactNode;
}) {
  const containerSize = size ?? OG_SIZE;
  return (
    <div
      tw="flex h-full w-full items-center justify-center"
      style={{
        width: containerSize.width,
        height: containerSize.height,
        display: 'flex',
        // Match site background color (dark mode base)
        backgroundColor: 'hsl(0 0% 9.0196%)',
        backgroundImage: backgroundImage ?? OG_BACKGROUND_IMAGE,
      }}
    >
      {children}
    </div>
  );
}

export function OGCard({
  width,
  height,
  roundedTw = 'rounded-3xl',
  paddingTw = 'p-12',
  extraTw = '',
  style,
  children,
}: {
  width?: number;
  height?: number;
  roundedTw?: string;
  paddingTw?: string;
  extraTw?: string;
  style?: { [key: string]: string | number };
  children: React.ReactNode;
}) {
  const cardWidth = width ?? OG_CARD_SIZE.width;
  const cardHeight = height ?? OG_CARD_SIZE.height;
  return (
    <div
      tw={`flex flex-col bg-white/5 backdrop-blur-md border border-white/10 ${roundedTw} ${paddingTw} ${extraTw}`}
      style={{
        display: 'flex',
        width: cardWidth,
        height: cardHeight,
        ...(style || {}),
      }}
    >
      {children}
    </div>
  );
}

export function OGFooter({
  appIconUrl,
  siteName,
  iconSize = 32,
  textSizeTw = 'text-xl',
  containerTw = '',
}: {
  appIconUrl: string;
  siteName: string;
  iconSize?: number;
  textSizeTw?: string;
  containerTw?: string;
}) {
  return (
    <div
      tw={`flex items-center text-slate-300 ${containerTw}`}
      style={{ display: 'flex', gap: '.75rem', alignItems: 'center' }}
    >
      <img
        width={iconSize}
        height={iconSize}
        alt="Sparka AI icon"
        src={appIconUrl}
      />
      <div tw={textSizeTw} style={{ display: 'flex' }}>
        {siteName}
      </div>
    </div>
  );
}

export function OGTitle({
  text,
  threshold = 40,
  smallTw = 'text-[64px]',
  largeTw = 'text-[84px]',
  maxWidthPx,
}: {
  text: string;
  threshold?: number;
  smallTw?: string;
  largeTw?: string;
  maxWidthPx?: number;
}) {
  const sizeTw = text.length > threshold ? smallTw : largeTw;
  return (
    <div
      tw={`leading-[1.1] font-bold text-white tracking-tight ${sizeTw}`}
      style={{
        display: 'flex',
        ...(maxWidthPx ? { maxWidth: `${maxWidthPx}px` } : {}),
      }}
    >
      {text}
    </div>
  );
}

export function OGIcon({
  src,
  alt,
  size,
  bare = false,
}: {
  src: string | null | undefined;
  alt: string;
  size: 'sm' | 'md' | 'lg';
  bare?: boolean;
}) {
  // Bare icon sizes for inline usage (e.g., modalities)
  const bareSizePx = size === 'sm' ? 22 : size === 'md' ? 28 : 36;
  // Framed provider icon container sizes
  const framedSizePx = size === 'sm' ? 84 : size === 'md' ? 90 : 96;
  const framedPaddingTw = size === 'sm' ? 'p-4' : size === 'md' ? 'p-4' : 'p-5';

  if (bare) {
    return src ? (
      <img width={bareSizePx} height={bareSizePx} src={src} alt={alt} />
    ) : null;
  }

  return src ? (
    <img
      src={src}
      alt={alt}
      width={framedSizePx}
      height={framedSizePx}
      tw={`w-[${framedSizePx}px] h-[${framedSizePx}px] rounded-xl bg-white/10 ${framedPaddingTw}`}
      style={{ display: 'flex' }}
    />
  ) : null;
}

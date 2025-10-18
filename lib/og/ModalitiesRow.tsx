import { OGIcon } from '@/lib/og/components';

export function ModalitiesRow({
  inputKeys,
  outputKeys,
  capabilityIcons,
  arrowRightUrl,
  size = 'sm',
}: {
  inputKeys: Array<'text' | 'image' | 'pdf' | 'audio' | 'video'>;
  outputKeys: Array<'text' | 'image' | 'audio' | 'video'>;
  capabilityIcons: Record<'text' | 'image' | 'pdf' | 'audio' | 'video', string>;
  arrowRightUrl: string;
  size?: 'sm' | 'md' | 'lg';
}) {
  return (
    <div tw="flex items-center" style={{ display: 'flex', gap: '1rem' }}>
      <div tw="flex items-center" style={{ display: 'flex', gap: '.75rem' }}>
        {inputKeys.map((key, idx) => (
          <span
            key={`in-${key}-${idx}`}
            tw="p-2 bg-white/10 rounded-lg"
            style={{ display: 'flex' }}
          >
            <OGIcon src={capabilityIcons[key]} alt={key} size={size} bare />
          </span>
        ))}
      </div>
      <div style={{ display: 'flex' }}>
        <OGIcon src={arrowRightUrl} alt="Arrow right" size={size} bare />
      </div>
      <div tw="flex items-center" style={{ display: 'flex', gap: '.75rem' }}>
        {outputKeys.map((key, idx) => (
          <span
            key={`out-${key}-${idx}`}
            tw="p-2 bg-white/10 rounded-lg"
            style={{ display: 'flex' }}
          >
            <OGIcon src={capabilityIcons[key]} alt={key} size={size} bare />
          </span>
        ))}
      </div>
    </div>
  );
}

import { ImageResponse } from '@vercel/og';
import {
  OG_SIZE,
  getBaseUrl,
  getAppIconUrl,
  OG_BACKGROUND_IMAGE,
} from '@/lib/og/shared';
import { OGContainer, OGCard, OGFooter, OGTitle } from '@/lib/og/components';

export const runtime = 'edge';

const size = OG_SIZE;

function truncate(input: string, max: number) {
  if (!input) return input;
  return input.length > max ? `${input.slice(0, max - 3)}...` : input;
}

export async function GET(req: Request) {
  const url = new URL(req.url);
  const title = url.searchParams.get('title');
  const description = url.searchParams.get('description');

  if (!title || !description) {
    return new ImageResponse(
      <div
        style={{
          width: size.width,
          height: size.height,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: '#0B1220',
          color: 'white',
          fontSize: 28,
        }}
      >
        Missing required query parameters: title and description
      </div>,
      { width: size.width, height: size.height },
    );
  }

  const baseUrl = getBaseUrl();
  const appIcon = getAppIconUrl(baseUrl);

  const displayTitle = truncate(title, 60);
  const displayDescription = truncate(description, 160);

  return new ImageResponse(
    <OGContainer backgroundImage={OG_BACKGROUND_IMAGE}>
      <OGCard
        roundedTw="rounded-3xl"
        style={{ position: 'relative', gap: '3rem' }}
      >
        <div tw="flex flex-1" style={{ display: 'flex' }}>
          <div tw="flex-1 flex-col" style={{ display: 'flex', gap: '1rem' }}>
            <div tw="flex items-start" style={{ display: 'flex' }}>
              <OGTitle
                text={displayTitle}
                threshold={40}
                smallTw="text-[60px]"
                largeTw="text-[80px]"
                maxWidthPx={980}
              />
            </div>

            <div
              tw="flex text-[40px] text-slate-300"
              style={{ display: 'flex', maxWidth: '980px' }}
            >
              <span>{displayDescription}</span>
            </div>
          </div>
        </div>

        <OGFooter
          appIconUrl={appIcon}
          siteName={'Sparka AI'}
          containerTw="mt-auto"
        />
      </OGCard>
    </OGContainer>,
    {
      width: size.width,
      height: size.height,
    },
  );
}

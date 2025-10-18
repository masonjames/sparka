import { ImageResponse } from '@vercel/og';

import { allModels } from '@/lib/models';
import { formatNumberCompact } from '@/lib/utils/format-number-compact';
import { getProviderIconUrl } from '../get-provider-icon-url';
import type { ProviderId } from '@/lib/models';
import {
  OG_SIZE,
  OG_SITE_NAME,
  getBaseUrl,
  getAppIconUrl,
  OG_BACKGROUND_IMAGE,
  titleCase,
} from '@/lib/og/shared';
import { OGContainer, OGCard, OGFooter, OGTitle } from '@/lib/og/components';

export const runtime = 'edge';
export const contentType = 'image/png';
export const size = OG_SIZE;

export default async function OGImage() {
  const numModels = allModels.length;
  const providers = Array.from(
    new Set(
      allModels
        .map((m) => (m.owned_by || '').trim())
        .filter((p): p is string => Boolean(p)),
    ),
  );

  const numProviders = providers.length;
  const topProviderIcons = providers
    .map((p) => ({
      name: p,
      iconUrl: getProviderIconUrl(p as ProviderId, getBaseUrl()),
    }))
    .filter((p) => p.iconUrl);

  const pageTitle = 'Browse AI Models';
  const pageDescription =
    'Explore models across providers from Vercel AI Gateway. Filter and compare by provider, context window, and pricing.';
  const baseUrl = getBaseUrl();
  const appIcon = getAppIconUrl(baseUrl);

  return new ImageResponse(
    <OGContainer backgroundImage={OG_BACKGROUND_IMAGE}>
      <OGCard paddingTw="p-14">
        <div tw="flex items-center" style={{ display: 'flex' }}>
          <div tw="flex flex-col" style={{ display: 'flex' }}>
            <OGTitle
              text={pageTitle}
              smallTw="text-[64px]"
              largeTw="text-[64px]"
            />
            <div
              tw="text-[22px] text-slate-200 mt-3 max-w-[900px]"
              style={{ display: 'flex' }}
            >
              {pageDescription}
            </div>
            <div tw="mt-5 text-2xl text-slate-300" style={{ display: 'flex' }}>
              <span>Providers</span>
              <span tw="text-white ml-1">
                {formatNumberCompact(numProviders)}
              </span>
              <span tw="mx-2">•</span>
              <span>Models</span>
              <span tw="text-white ml-1">{formatNumberCompact(numModels)}</span>
            </div>
          </div>
        </div>

        <div tw="mt-10 h-[1px] bg-white/10" />

        <div
          tw="mt-8 flex items-center justify-start text-slate-300"
          style={{ display: 'flex' }}
        >
          {topProviderIcons.length > 0 && (
            <div
              tw="flex flex-wrap items-center justify-center max-w-[960px]"
              style={{ display: 'flex', gap: '.625rem' }}
            >
              {topProviderIcons.slice(0, 18).map((p) => (
                <span
                  key={p.name}
                  tw="p-2.5 w-[52px] h-[52px] rounded-xl bg-white/10 flex items-center justify-center"
                  style={{ display: 'flex' }}
                  title={titleCase(p.name)}
                >
                  {p.iconUrl ? (
                    <img
                      src={p.iconUrl}
                      alt={`${p.name} logo`}
                      width={30}
                      height={30}
                    />
                  ) : (
                    <span tw="text-white/80 text-lg font-bold">
                      {p.name.slice(0, 1).toUpperCase()}
                    </span>
                  )}
                </span>
              ))}
            </div>
          )}
        </div>

        <OGFooter
          appIconUrl={appIcon}
          siteName={OG_SITE_NAME}
          iconSize={36}
          textSizeTw="text-[20px]"
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

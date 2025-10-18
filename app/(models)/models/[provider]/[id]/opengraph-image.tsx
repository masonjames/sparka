import { ImageResponse } from '@vercel/og';

import { allModels } from '@/lib/models';
import { getProviderIconUrl } from '../../../get-provider-icon-url';
import { ModalitiesRow } from '@/lib/og/ModalitiesRow';
import {
  OG_BACKGROUND_IMAGE,
  capitalizeFirst,
  getBaseUrl,
  getAppIconUrl,
  buildBulletItems,
  inputModalitiesOrder,
  outputModalitiesOrder,
  getCapabilityIcons,
  getArrowRightUrl,
  OG_SIZE,
  OG_SITE_NAME,
} from '@/lib/og/shared';
import {
  OGContainer,
  OGCard,
  OGFooter,
  OGIcon,
  OGTitle,
} from '@/lib/og/components';

export const runtime = 'edge';
export const contentType = 'image/png';
export const size = OG_SIZE;
const TITLE_MAX_LENGTH = 30;
const DESCRIPTION_MAX_LENGTH = 165;

export default async function OGImage(
  props: PageProps<'/models/[provider]/[id]'>,
) {
  const { provider, id } = await props.params;
  const modelId = `${provider}/${id}`;
  const model = allModels.find((m) => m.id === modelId) || null;

  if (!model) {
    return new ImageResponse(
      <div>
        <h1>Model not found</h1>
      </div>,
      {
        width: size.width,
        height: size.height,
      },
    );
  }

  const providerDisplay = capitalizeFirst(
    (model?.owned_by || provider) as string,
  );
  const modelDisplay = model?.name || id;

  const titleRaw = `${modelDisplay}`.trim();
  const title =
    titleRaw.length > TITLE_MAX_LENGTH
      ? `${titleRaw.slice(0, TITLE_MAX_LENGTH - 3)}...`
      : titleRaw;

  const baseUrl = getBaseUrl();
  const iconUrl = getProviderIconUrl(model.owned_by, baseUrl);

  // Extra data for richer OG card
  const contextWindow = model?.context_window || null;
  const maxOut = model?.max_tokens || null;
  const pricingIn = model?.pricing?.input || null;
  const pricingOut = model?.pricing?.output || null;
  const releaseDate = model?.releaseDate || null;
  const releaseDateDisplay = releaseDate
    ? releaseDate.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      })
    : null;

  const bulletItems = buildBulletItems(model);

  const descriptionRaw = model?.description || '';
  const description =
    descriptionRaw.length > DESCRIPTION_MAX_LENGTH
      ? `${descriptionRaw.slice(0, DESCRIPTION_MAX_LENGTH - 3)}...`
      : descriptionRaw;

  const capabilityIcons = getCapabilityIcons(baseUrl);
  const arrowRight = getArrowRightUrl(baseUrl);

  const enabledInputKeys = inputModalitiesOrder.filter(
    (key) => model?.input?.[key],
  );
  const enabledOutputKeys = outputModalitiesOrder.filter(
    (key) => model?.output?.[key],
  );

  const appIcon = getAppIconUrl(baseUrl);

  return new ImageResponse(
    <OGContainer backgroundImage={OG_BACKGROUND_IMAGE}>
      <OGCard roundedTw="rounded-2xl">
        <div tw="flex items-center" style={{ display: 'flex', gap: '1.5rem' }}>
          {iconUrl ? (
            <OGIcon src={iconUrl} alt={`${providerDisplay} logo`} size="lg" />
          ) : (
            <div
              tw="w-[96px] h-[96px] rounded-xl bg-white/10 flex items-center justify-center text-white/80 text-5xl font-bold"
              style={{ display: 'flex' }}
            >
              {providerDisplay.slice(0, 1)}
            </div>
          )}

          <div tw="flex flex-col" style={{ display: 'flex' }}>
            <OGTitle
              text={title}
              threshold={22}
              smallTw="text-[52px]"
              largeTw="text-[64px]"
            />
            <div tw="text-xl text-slate-200 mt-1" style={{ display: 'flex' }}>
              by {providerDisplay.toLowerCase()}
            </div>
          </div>
        </div>

        {bulletItems.length > 0 && (
          <div tw="mt-6 text-xl text-slate-300" style={{ display: 'flex' }}>
            {bulletItems.map((item, idx) => (
              <span
                key={`${item.label}-${idx}`}
                style={{ display: 'flex', gap: '.25rem' }}
              >
                <span>{`${item.label}`}</span>
                <span tw="text-white">{item.value}</span>
                {idx < bulletItems.length - 1 && <span tw="mx-2">•</span>}
              </span>
            ))}
          </div>
        )}

        {description && (
          <div tw="mt-6 text-2xl text-slate-200" style={{ display: 'flex' }}>
            {description}
          </div>
        )}

        {(enabledInputKeys.length > 0 || enabledOutputKeys.length > 0) && (
          <div
            tw="mt-4 flex items-center text-slate-300"
            style={{ display: 'flex' }}
          >
            <ModalitiesRow
              inputKeys={
                enabledInputKeys as Array<
                  'text' | 'image' | 'pdf' | 'audio' | 'video'
                >
              }
              outputKeys={
                enabledOutputKeys as Array<'text' | 'image' | 'audio'>
              }
              capabilityIcons={capabilityIcons}
              arrowRightUrl={arrowRight}
              size="md"
            />
          </div>
        )}

        <OGFooter
          appIconUrl={appIcon}
          siteName={OG_SITE_NAME}
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

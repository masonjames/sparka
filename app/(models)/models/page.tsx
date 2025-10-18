import { ScrollArea } from '@/components/ui/scroll-area';
import { ModelFilters } from '@/app/(models)/models/model-filters';
import { ModelsProvider } from '@/app/(models)/models/models-store-context';
import { ModelsResults } from './models-results';
import type { Metadata } from 'next';

const pageTitle = 'Models | Sparka AI';
const pageDescription =
  'Browse models across providers form Vercel AI Gateway in Sparka AI. Filter and compare by provider, context window, and pricing.';

export const metadata: Metadata = {
  title: pageTitle,
  description: pageDescription,
  keywords: [
    'Sparka',
    'Vercel AI Gateway',
    'models',
    'LLM',
    'AI models',
    'providers',
  ],
  openGraph: {
    title: pageTitle,
    description: pageDescription,
    url: '/models',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: pageTitle,
    description: pageDescription,
  },
  alternates: {
    canonical: '/models',
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default function HomePage() {
  return (
    <ModelsProvider>
      <ModelsPageContent />
    </ModelsProvider>
  );
}

function ModelsPageContent() {
  return (
    <div className="grid h-full min-h-0 grid-cols-1 md:grid-cols-[auto_1fr] ">
      <aside className="hidden md:block md:h-full min-h-0 w-full md:w-64 bg-sidebar">
        <ScrollArea className="h-full">
          <ModelFilters className="p-4 overflow-y-auto" />
        </ScrollArea>
      </aside>

      <main className="min-h-0 h-full">
        <ModelsResults />
      </main>
    </div>
  );
}

'use client';

import { useMemo, useState } from 'react';
import { useParams } from 'next/navigation';
import { allModels, type ModelDefinition } from '@/lib/models';
import { Container } from '@/components/container';
import { ModelDetails } from '@/app/(models)/models/model-details';

export default function ComparePage() {
  const params = useParams<{ slug?: string[] | string }>();

  const segments = useMemo(() => {
    const raw = params?.slug;
    if (!raw) return [] as string[];
    if (Array.isArray(raw)) return raw;
    return [raw];
  }, [params]);

  const [leftModelId, setLeftModelId] = useState<string | null>(() => {
    return segments.length >= 2 ? `${segments[0]}/${segments[1]}` : null;
  });

  const [rightModelId, setRightModelId] = useState<string | null>(() => {
    return segments.length >= 4 ? `${segments[2]}/${segments[3]}` : null;
  });

  const leftModel: ModelDefinition | null = useMemo(() => {
    if (!leftModelId) return null;
    return allModels.find((m) => m.id === leftModelId) || null;
  }, [leftModelId]);

  const rightModel: ModelDefinition | null = useMemo(() => {
    if (!rightModelId) return null;
    return allModels.find((m) => m.id === rightModelId) || null;
  }, [rightModelId]);

  function pushCompareUrl(leftId: string | null, rightId: string | null) {
    const parts: string[] = [];
    const pushId = (id: string) => {
      const [a, b] = id.split('/');
      if (a && b) parts.push(a, b);
    };
    if (leftId) pushId(leftId);
    if (rightId) pushId(rightId);
    const path = parts.length > 0 ? `/compare/${parts.join('/')}` : '/compare';
    if (typeof window !== 'undefined') {
      window.history.pushState({}, '', path);
    }
  }

  function handleLeftChange(nextId: string) {
    setLeftModelId(nextId);
    pushCompareUrl(nextId, rightModelId);
  }

  function handleRightChange(nextId: string) {
    setRightModelId(nextId);
    pushCompareUrl(leftModelId, nextId);
  }

  return (
    <Container className="p-6">
      <div className="mb-6 flex flex-col gap-4 max-w-[450px] lg:max-w-none mx-auto">
        <h1 className="text-2xl font-semibold ">Compare Models</h1>
      </div>
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2 mx-auto ">
        <ModelDetails
          className="mx-auto"
          modelDefinition={leftModel}
          onModelChangeAction={handleLeftChange}
          enabledActions={{ goToModel: true, chat: true, compare: false }}
        />
        <ModelDetails
          className="mx-auto"
          modelDefinition={rightModel}
          onModelChangeAction={handleRightChange}
          enabledActions={{ goToModel: true, chat: true, compare: false }}
        />
      </div>
    </Container>
  );
}

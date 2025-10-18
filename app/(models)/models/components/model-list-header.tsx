'use client';

export function ModelListHeaders() {
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-baseline gap-2">
          <h1 className="text-2xl font-semibold tracking-tight">Models</h1>
          <p className="text-sm text-muted-foreground">
            {'from '}
            <a
              href="https://vercel.com/docs/ai-gateway"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:underline"
            >
              Vercel AI Gateway
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}

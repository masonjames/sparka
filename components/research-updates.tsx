import type React from "react";
import type { WebSearchUpdate } from "@/lib/ai/tools/research-updates-schema";
import { WebToolAction } from "./tool-actions";

// TODO: Make sure these components are used or remove them

// Web updates component
const _WebUpdates: React.FC<{ updates: WebSearchUpdate[] }> = ({ updates }) => (
  <>
    {updates.map((update, idx) => (
      // biome-ignore lint/suspicious/noArrayIndexKey: no id for now
      <div className="space-y-2" key={idx}>
        {update.results?.map((result) => (
          <WebToolAction key={result.url} result={result} />
        ))}
      </div>
    ))}
  </>
);

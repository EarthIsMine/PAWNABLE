"use client";

import * as React from "react";
import createCache from "@emotion/cache";
import { CacheProvider } from "@emotion/react";
import type { EmotionCache } from "@emotion/cache";
import { useServerInsertedHTML } from "next/navigation";

interface EmotionCacheWithInserted extends EmotionCache {
  __inserted: Set<string>;
}

function createEmotionCache() {
  return createCache({ key: "css" });
}

export default function EmotionRegistry({ children }: { children: React.ReactNode }) {
  const [cache] = React.useState<EmotionCacheWithInserted>(() => {
    const c = createEmotionCache() as EmotionCacheWithInserted;

    c.__inserted = new Set<string>();

    const originalInsert = c.insert;
    c.insert = (...args) => {
      const serialized = args[1];
      if (!c.__inserted.has(serialized.name)) {
        c.__inserted.add(serialized.name);
      }
      return originalInsert(...args);
    };

    return c;
  });

  useServerInsertedHTML(() => {
    if (cache.__inserted.size === 0) return null;

    const names = Array.from(cache.__inserted);
    cache.__inserted.clear();

    let styles = "";
    for (const name of names) {
      const value = cache.inserted[name];
      if (typeof value === "string") {
        styles += value;
      }
    }

    return (
      <style
        data-emotion={`${cache.key} ${names.join(" ")}`}
        dangerouslySetInnerHTML={{ __html: styles }}
      />
    );
  });

  return <CacheProvider value={cache}>{children}</CacheProvider>;
}

import { useCallback, useEffect, useRef, useState } from "react";

export function useSSE(url: string | null) {
  const [lines, setLines] = useState<string[]>([]);
  const [done, setDone] = useState(false);
  const esRef = useRef<EventSource | null>(null);

  const clear = useCallback(() => setLines([]), []);

  useEffect(() => {
    if (!url) return;
    setLines([]);
    setDone(false);

    const es = new EventSource(url);
    esRef.current = es;

    es.onmessage = (e) => {
      try {
        const data = JSON.parse(e.data);
        if (data.done) {
          setDone(true);
          es.close();
          return;
        }
        if (data.line !== undefined) {
          setLines((prev) => [...prev, data.line]);
        }
      } catch {
        // ignore parse errors
      }
    };

    es.onerror = () => {
      es.close();
    };

    return () => {
      es.close();
    };
  }, [url]);

  return { lines, done, clear };
}

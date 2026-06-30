import { useState, useCallback, useRef } from 'react';
import type { Artifact } from '../types/artifact';
import { createUpdatedArtifact, createNewArtifact, performRollback } from '../lib/artifactUtils';

export function useArtifacts() {
  const [artifacts, setArtifacts] = useState<Artifact[]>([]);
  const [activeArtifactId, setActiveArtifactId] = useState<string | null>(null);
  const [isPanelOpen, setIsPanelOpen] = useState(false);
  const versionCounterRef = useRef<Record<string, number>>({});
  const processedIdentifiersRef = useRef<Set<string>>(new Set());

  const addArtifacts = useCallback((newArtifacts: Artifact[]) => {
    const deduped = newArtifacts.filter(a => !processedIdentifiersRef.current.has(a.identifier));
    if (deduped.length === 0) return;
    setArtifacts((prev) => {
      const updated = [...prev];
      for (const incoming of deduped) {
        processedIdentifiersRef.current.add(incoming.identifier);
        const idx = updated.findIndex(a => a.identifier === incoming.identifier);
        if (idx >= 0) {
          const next = (versionCounterRef.current[incoming.identifier] ?? updated[idx].version) + 1;
          versionCounterRef.current[incoming.identifier] = next;
          updated[idx] = createUpdatedArtifact(updated[idx], incoming, next);
        } else {
          versionCounterRef.current[incoming.identifier] = 0;
          updated.push(createNewArtifact(incoming));
        }
      }
      return updated;
    });
    setActiveArtifactId(deduped[0].identifier); setIsPanelOpen(true);
  }, []);

  const rollbackArtifact = useCallback((id: string, ver: number) => {
    setArtifacts((prev) => {
      const idx = prev.findIndex(a => a.identifier === id);
      if (idx < 0) return prev;
      const updated = [...prev]; updated[idx] = performRollback(updated[idx], ver);
      return updated;
    });
  }, []);

  return {
    artifacts, activeArtifactId, isPanelOpen, addArtifacts, rollbackArtifact,
    selectArtifact: useCallback((id: string) => setActiveArtifactId(id), []),
    closePanel: useCallback(() => setIsPanelOpen(false), []),
    openPanel: useCallback(() => setIsPanelOpen(true), []),
    clearArtifacts: useCallback(() => { setArtifacts([]); setActiveArtifactId(null); setIsPanelOpen(false); versionCounterRef.current = {}; }, []),
  };
}

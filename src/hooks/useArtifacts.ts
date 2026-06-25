import { useState, useCallback, useRef } from 'react';
import type { Artifact } from '../types/artifact';

export function useArtifacts() {
  const [artifacts, setArtifacts] = useState<Artifact[]>([]);
  const [activeArtifactId, setActiveArtifactId] = useState<string | null>(null);
  const [isPanelOpen, setIsPanelOpen] = useState(false);
  const versionCounterRef = useRef<Record<string, number>>({});

  const addArtifacts = useCallback((newArtifacts: Artifact[]) => {
    setArtifacts((prev) => {
      const updated = [...prev];

      for (const incoming of newArtifacts) {
        const existingIndex = updated.findIndex(
          (a) => a.identifier === incoming.identifier
        );

        if (existingIndex >= 0) {
          const existing = updated[existingIndex];
          const nextVersion = (versionCounterRef.current[incoming.identifier] ?? existing.version) + 1;
          versionCounterRef.current[incoming.identifier] = nextVersion;

          updated[existingIndex] = {
            ...incoming,
            version: nextVersion,
            createdAt: Date.now(),
          };
        } else {
          versionCounterRef.current[incoming.identifier] = 0;
          updated.push({
            ...incoming,
            version: 0,
            createdAt: Date.now(),
          });
        }
      }

      return updated;
    });

    if (newArtifacts.length > 0) {
      setActiveArtifactId(newArtifacts[0].identifier);
      setIsPanelOpen(true);
    }
  }, []);

  const selectArtifact = useCallback((id: string) => {
    setActiveArtifactId(id);
  }, []);

  const closePanel = useCallback(() => {
    setIsPanelOpen(false);
  }, []);

  const openPanel = useCallback(() => {
    setIsPanelOpen(true);
  }, []);

  const clearArtifacts = useCallback(() => {
    setArtifacts([]);
    setActiveArtifactId(null);
    setIsPanelOpen(false);
    versionCounterRef.current = {};
  }, []);

  return {
    artifacts,
    activeArtifactId,
    isPanelOpen,
    addArtifacts,
    selectArtifact,
    closePanel,
    openPanel,
    clearArtifacts,
  };
}

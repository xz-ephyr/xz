import type { Artifact, ArtifactVersion } from '../types/artifact';

export function createUpdatedArtifact(existing: Artifact, incoming: Artifact, nextVersion: number): Artifact {
  const oldVersion: ArtifactVersion = { content: existing.content, version: existing.version, createdAt: existing.createdAt };
  return { ...incoming, version: nextVersion, createdAt: Date.now(), versions: [...(existing.versions || []), oldVersion] };
}

export function createNewArtifact(incoming: Artifact): Artifact {
  return { ...incoming, version: 0, createdAt: Date.now(), versions: [] };
}

export function performRollback(artifact: Artifact, targetVersion: number): Artifact {
  const versionEntry = (artifact.versions || []).find(v => v.version === targetVersion);
  if (!versionEntry) return artifact;
  const currentVersion: ArtifactVersion = { content: artifact.content, version: artifact.version, createdAt: artifact.createdAt };
  return { ...artifact, content: versionEntry.content, version: versionEntry.version, createdAt: Date.now(), versions: [...(artifact.versions || []).filter(v => v.version !== targetVersion), currentVersion] };
}

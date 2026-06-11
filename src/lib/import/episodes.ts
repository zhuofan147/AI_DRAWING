export interface ImportedEpisodeText {
  idea?: string | null;
  description?: string | null;
}

export function scriptFromImportedEpisode(episode: ImportedEpisodeText): string {
  const idea = episode.idea?.trim();
  if (idea) return idea;
  return episode.description?.trim() ?? "";
}

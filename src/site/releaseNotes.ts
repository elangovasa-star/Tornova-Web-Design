// Stage 15 (handoff §12): a small, lightweight, hand-maintained release-notes surface - the team
// edits this file directly when cutting a release; there is deliberately no CMS, database or admin
// UI behind it, matching the handoff's own "keep this implementation lightweight" instruction.
//
// Newest entry first. Version strings should match Directory.Build.props's TornovaVersion for that
// release exactly, so a customer/IT admin can match what they downloaded to what changed. Add an
// entry here ONLY once VG has actually published that version - this file is never used to describe
// work still in progress or awaiting review.

export interface ReleaseNoteEntry {
  version: string;
  dateUtc: string;
  changes: string[];
}

export const RELEASE_NOTES: ReleaseNoteEntry[] = [];

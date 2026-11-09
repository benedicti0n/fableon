export interface CrossfadePass {
  readonly source: "previous" | "current";
  readonly includeCharacter: boolean;
}

/**
 * Crossfades keep the environment dissolve but never blend two opaque character
 * renders. The outgoing character is omitted; the incoming character is drawn
 * once at full opacity. This prevents duplicate birds, eyes, and beaks.
 */
export function crossfadePasses(hasPreviousShot: boolean): readonly CrossfadePass[] {
  if (!hasPreviousShot) {
    return [{ source: "current", includeCharacter: true }];
  }
  return [
    { source: "previous", includeCharacter: false },
    { source: "current", includeCharacter: true },
  ];
}

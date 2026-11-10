import type { HostedProviderId } from "./catalog";

export interface CharacterDesignRecord {
  readonly id: "artisan" | "horse";
  readonly label: string;
  readonly orientation: string;
  readonly proportions: string;
  readonly face: string;
  readonly hairOrTurban: string;
  readonly clothing: string;
  readonly palette: readonly string[];
  readonly outline: string;
  readonly identityAnchors: readonly string[];
}

export const ART_DIRECTION_PROMPT = [
  "Original Rajasthani/Indian folk-art cutout animation design.",
  "Bold consistent black ink outline, flat earthy fills, minimal gradient shading.",
  "Decorative geometric fabric motifs, stylized profile face, prominent expressive eye.",
  "Readable silhouette, rig-friendly separated limbs, hidden overlap at joints.",
  "No photorealism, no 3D render, no anime anatomy, no soft AI gradient, no text.",
  "Do not copy any recognizable existing cartoon character or exact reference frame.",
].join(" ");

export const CHARACTER_DESIGNS: readonly CharacterDesignRecord[] = Object.freeze([
  {
    id: "artisan",
    label: "Village artisan",
    orientation:
      "Full-body side profile facing right; restrained three-quarter cues only in the face.",
    proportions:
      "Adult, slightly oversized head, shoulder width about 1.4 head widths, arms to mid-thigh, clear hip/knee/ankle separation.",
    face: "Warm terracotta skin, prominent almond eye, straight nose, curled black moustache, stable neutral expression, gold earring.",
    hairOrTurban:
      "Saffron wrapped turban with an indigo band, gold pin, long indigo turban tail behind the head.",
    clothing:
      "Ochre angrakha with terracotta and indigo trim, cream dhoti, terracotta sash, indigo sleeves, brown mojari shoes, gold jewellery.",
    palette: ["#d39a3d", "#29445f", "#b55034", "#f2e3c6", "#e0b354", "#c98254"],
    outline: "7–10 px dark ink silhouette at master scale; 3–5 px interior detail.",
    identityAnchors: [
      "saffron turban",
      "indigo turban tail",
      "curled moustache",
      "gold earring",
      "ochre angrakha",
      "cream dhoti",
    ],
  },
  {
    id: "horse",
    label: "Decorated village horse",
    orientation: "Full-body side profile facing right, four clearly separated legs.",
    proportions:
      "Barrel torso, arched neck, long wedge head, two upright ears, upper/lower leg and hoof separation, terracotta tail.",
    face: "Cream coat, dark expressive eye, long pale muzzle, terracotta forelock, indigo-and-gold bridle.",
    hairOrTurban: "Terracotta mane and tail; no human hair or turban.",
    clothing:
      "Indigo harness collar and saddle blanket with gold lattice, terracotta girth strap, gold studs and bell anchor.",
    palette: ["#e8cda0", "#a94f32", "#29445f", "#e0b354", "#b55034", "#5a2f1d"],
    outline: "7–10 px dark ink silhouette at master scale.",
    identityAnchors: [
      "cream coat",
      "terracotta mane/tail",
      "indigo saddle blanket",
      "gold studs",
      "long pale muzzle",
    ],
  },
]);

export function characterDesign(id: "artisan" | "horse"): CharacterDesignRecord {
  const design = CHARACTER_DESIGNS.find((entry) => entry.id === id);
  if (!design) throw new Error(`Unknown character design "${id}".`);
  return design;
}

export function buildMasterPrompt(id: "artisan" | "horse", provider: HostedProviderId): string {
  const design = characterDesign(id);
  const transparency =
    provider === "openai"
      ? "Render on a fully transparent background with clean alpha edges and no white fringe."
      : "Render on a flat uncluttered cream background; this provider has no native transparency, so the asset will be masked in a separate explicit repair step.";
  return [
    ART_DIRECTION_PROMPT,
    `Character: ${design.label}.`,
    `Orientation: ${design.orientation}`,
    `Proportions: ${design.proportions}`,
    `Face: ${design.face}`,
    `Headwear/hair: ${design.hairOrTurban}`,
    `Clothing/harness: ${design.clothing}`,
    `Palette: ${design.palette.join(", ")}.`,
    `Outline: ${design.outline}`,
    `Identity anchors that must remain stable in every subsequent edit: ${design.identityAnchors.join(", ")}.`,
    transparency,
  ].join("\n");
}

const PART_DESCRIPTIONS: Readonly<Record<string, string>> = {
  artisan_head: "complete head, face, ear and neck stump, with 24 px of hidden neck overlap",
  artisan_eye: "single almond eye, matching pupil and highlight",
  artisan_eyelid: "skin-coloured eyelid shape that covers the eye for a blink",
  artisan_brow: "single dark brow",
  artisan_mustache: "curled black moustache",
  artisan_turban: "saffron turban with indigo band and gold pin",
  artisan_turbanTail: "long indigo turban tail",
  artisan_torso: "ochre angrakha torso with collar and buttons, no arms or head",
  artisan_sash: "terracotta waist sash with gold border",
  artisan_pelvis: "cream dhoti pelvis with cloth folds",
  artisan_nearUpperArm: "near upper arm in an indigo sleeve, with shoulder and elbow overlap",
  artisan_nearForearm:
    "near forearm in warm skin with gold wrist bands and hidden elbow/wrist overlap",
  artisan_handOpen: "near hand, open, simplified fingers, wrist registration",
  artisan_handGrip: "near hand closed in a grip around a small handle, same wrist registration",
  artisan_nearThigh: "near thigh in cream dhoti cloth with hip/knee overlap",
  artisan_nearShin: "near shin in warm skin with gold anklet",
  artisan_nearFoot: "near foot in a brown mojari shoe",
  horse_torso: "cream horse barrel torso, no neck, head, tail or legs",
  horse_neck: "arched cream neck with mane attachment",
  horse_head: "long cream horse head with muzzle, eye socket and ears removed",
  horse_nearFrontUpper: "near front upper leg with shoulder and knee overlap",
  horse_nearFrontLower: "near front lower leg with knee and fetlock overlap",
  horse_nearFrontHoof: "near front dark hoof",
  horse_saddleBlanket: "indigo saddle blanket with gold lattice",
  horse_harnessCollar: "indigo harness collar with gold studs",
};

export function buildPartPrompt(input: {
  readonly character: "artisan" | "horse";
  readonly partId: string;
  readonly provider: HostedProviderId;
}): string {
  const design = characterDesign(input.character);
  const description =
    PART_DESCRIPTIONS[input.partId] ??
    `isolated ${input.partId
      .replace(`${input.character}_`, "")
      .replace(/([A-Z])/g, " $1")
      .toLowerCase()} piece`;
  const transparency =
    input.provider === "openai"
      ? "Transparent PNG, straight alpha, no checkerboard, no white halo."
      : "Flat cream background, no shadows; a separate mask will extract the part.";
  return [
    ART_DIRECTION_PROMPT,
    `Use the approved ${design.label} master as the exact identity and style reference.`,
    `Produce only ${description}.`,
    "Match the master's palette, outline weight, fabric pattern scale, proportions and lighting.",
    "Extend hidden geometry 20–30 px past the visible joint so rotation does not open a hole.",
    "Do not include other body parts, text, labels, ground shadow, or a character sheet.",
    transparency,
  ].join("\n");
}

const BACKGROUND_DESCRIPTIONS = {
  courtyard:
    "Rajasthani sandstone village courtyard with a central indigo gate, arched jaali windows, gold trim, hanging banners, neem tree, pots and a clear central performance area.",
  street:
    "Rajasthani village lane with converging sandstone buildings, a central arched exit, hanging cloth, lanterns, pots and a clear rightward path for a cart.",
} as const;

export function buildBackgroundPrompt(location: "courtyard" | "street"): string {
  return [
    ART_DIRECTION_PROMPT,
    `Background only: ${BACKGROUND_DESCRIPTIONS[location]}`,
    "16:9 composition, warm morning light from upper right, flat theatrical staging.",
    "No people, no horse, no cart, no text, no border, no camera frame.",
    "Keep the lower-center area free of tall occluders for foreground animation.",
  ].join("\n");
}

export type Stage2BSheetId = "head" | "body" | "arms" | "legs";

export interface Stage2BSheetPlan {
  readonly id: Stage2BSheetId;
  readonly title: string;
  readonly columns: number;
  readonly rows: number;
  readonly slots: readonly string[];
  readonly layout: readonly string[];
}

/**
 * Four coherent sheets per provider. Every one of the 31 Stage 2B rig slots is
 * represented once. The empty body cell is deliberate; it keeps the 3x2 grid
 * readable rather than forcing an extra unrelated part.
 */
export const STAGE2B_SHEETS: Readonly<Record<Stage2BSheetId, Stage2BSheetPlan>> = {
  head: {
    id: "head",
    title: "Head, face and turban parts",
    columns: 3,
    rows: 3,
    slots: [
      "artisan_head",
      "artisan_turban",
      "artisan_turbanTail",
      "artisan_mustache",
      "artisan_earring",
      "artisan_eye",
      "artisan_eyelid",
      "artisan_brow",
      "artisan_neck",
    ],
    layout: [
      "Row 1: bare face and ear only, no turban, no moustache, no earring; saffron turban wrap; indigo turban tail.",
      "Row 2: detached moustache; gold hoop earring; one open expressive eye.",
      "Row 3: one closed eyelid; one eyebrow; short neck with a collar overlap.",
    ],
  },
  body: {
    id: "body",
    title: "Torso, sash and pelvis parts",
    columns: 3,
    rows: 2,
    slots: [
      "artisan_torso",
      "artisan_sash",
      "artisan_necklace",
      "artisan_shoulderSash",
      "artisan_pelvis",
      "",
    ],
    layout: [
      "Row 1: ochre angrakha torso with shoulder caps and armholes, no head, no arms; maroon waist sash; gold necklace.",
      "Row 2: indigo shoulder sash; pelvis/hip garment base with dhoti waistband, no legs; leave the final cell empty green/transparent.",
    ],
  },
  arms: {
    id: "arms",
    title: "Both arms, hands and elbow covers",
    columns: 3,
    rows: 3,
    slots: [
      "artisan_nearUpperArm",
      "artisan_nearForearm",
      "artisan_nearElbowCover",
      "artisan_handOpen",
      "artisan_handGrip",
      "artisan_farUpperArm",
      "artisan_farForearm",
      "artisan_farElbowCover",
      "artisan_farHand",
    ],
    layout: [
      "Row 1: near upper arm sleeve segment; near forearm with cuff; near elbow cover shaped as a matching fabric cuff, not a plain circle.",
      "Row 2: near open hand; near gripping hand; far upper arm sleeve segment.",
      "Row 3: far forearm with cuff; far elbow cover; far open hand.",
    ],
  },
  legs: {
    id: "legs",
    title: "Both legs, feet and dhoti parts",
    columns: 4,
    rows: 2,
    slots: [
      "artisan_nearThigh",
      "artisan_nearShin",
      "artisan_nearFoot",
      "artisan_nearDhoti",
      "artisan_farThigh",
      "artisan_farShin",
      "artisan_farFoot",
      "artisan_farDhoti",
    ],
    layout: [
      "Row 1: near thigh; near shin with ankle; near foot in profile; near dhoti drape panel.",
      "Row 2: far thigh; far shin with ankle; far foot in profile; far dhoti drape panel.",
    ],
  },
};

const COMMON = `Use the approved artisan master as the exact identity, proportion, palette and outline reference. Preserve the saffron turban, indigo turban tail, ochre angrakha, maroon sash, gold jewellery, warm skin, bold black ink outlines, flat earthy fills and decorative geometric fabric motifs. Original Rajasthani folk-art cutout design. No photorealism, no 3D render, no anime anatomy, no soft AI gradient, no text, no labels, no grid lines, no shadows, no ground plane, no complete character.`;

export function stage2bSheetPrompt(provider: "openai" | "gemini", sheet: Stage2BSheetPlan): string {
  const background =
    provider === "openai"
      ? "Use a fully transparent background. Every part must have clean native alpha and be separated from every other part by transparent gutters."
      : "Use a perfectly flat, uniform chroma-key green (#00FF00) background. Do not use green on the character. Every part must be fully separated by wide green gutters.";
  const grid = `${sheet.columns}x${sheet.rows}`;
  return `${COMMON}

Create one ${grid} rig-parts sheet. Each cell contains exactly one isolated body part, centered and fully inside its cell. Do not overlap cells. Do not draw connecting limbs or a full body. Keep the same profile orientation, outline weight and scale relationship as the master.

${sheet.layout.join("\n")}

${background}`;
}

export const STAGE2B_SHEET_ORDER: readonly Stage2BSheetId[] = ["head", "body", "arms", "legs"];

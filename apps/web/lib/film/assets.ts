import {
  createImportedCharacterRig,
  parseIllustrationPack,
  type ImportedCharacterRig,
} from "@fableon/illustration-pipeline";
import { createLittleBirdBaseRig } from "@fableon/character-motion";

export interface FilmAssets {
  readonly plate: CanvasImageSource;
  readonly plateDistant: CanvasImageSource;
  readonly character: ImportedCharacterRig;
}

async function decodeImage(url: string): Promise<CanvasImageSource> {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Could not load film asset "${url}" (HTTP ${response.status}).`);
  }
  const blob = await response.blob();
  if (typeof createImageBitmap === "function") {
    return createImageBitmap(blob);
  }
  const objectUrl = URL.createObjectURL(blob);
  try {
    const image = new Image();
    image.src = objectUrl;
    await image.decode();
    return image;
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}

export async function loadFilmAssets(): Promise<FilmAssets> {
  const [plate, plateDistant, manifestResponse] = await Promise.all([
    decodeImage("/assets/film/where-the-light-lands-plate.png"),
    decodeImage("/assets/film/where-the-light-lands-plate-distant.png"),
    fetch("/assets/premium-bird-v1/manifest.json"),
  ]);
  if (!manifestResponse.ok) {
    throw new Error(`Could not load the premium bird manifest (HTTP ${manifestResponse.status}).`);
  }
  const pack = parseIllustrationPack((await manifestResponse.json()) as unknown);
  const images = new Map<string, CanvasImageSource>();
  await Promise.all(
    pack.parts.map(async (part) => {
      const image = await decodeImage(`/assets/premium-bird-v1/${part.source}`);
      images.set(part.id, image);
    }),
  );
  const character = createImportedCharacterRig(createLittleBirdBaseRig(), pack, images);
  return { plate, plateDistant, character };
}

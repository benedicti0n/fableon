import { FolkRenderer } from "../../apps/web/lib/folk/renderer";
import { ARTISAN_RIG } from "@fableon/folk-motion";
import { evaluateFolkFrame } from "../../apps/web/lib/folk/evaluate";
(globalThis as unknown as { FableonStage2C4: unknown }).FableonStage2C4 = {
  FolkRenderer,
  ARTISAN_RIG,
  evaluateFolkFrame,
};

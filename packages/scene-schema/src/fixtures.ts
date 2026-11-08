import rawProject from "../fixtures/where-the-light-lands.project.json";

import type { Project } from "./schema";
import { parseProject } from "./validation";

/**
 * The canonical Phase 1 example. It is data only: none of the referenced art
 * or audio exists yet, and no renderer is connected.
 */
export const SAMPLE_PROJECT: Project = parseProject(rawProject);

export const SAMPLE_PROJECT_FIXTURE_PATH = "fixtures/where-the-light-lands.project.json";

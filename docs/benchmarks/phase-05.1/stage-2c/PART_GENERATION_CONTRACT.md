# Stage 2C — Part Generation Contract

Implemented in `apps/web/lib/providers/stage2c-contract.ts`.

Each part records:

- character/provider/role;
- master source and hash;
- parent/child joints;
- master landmark coordinates;
- expected segment length in master pixels;
- neutral location and visible region;
- orientation;
- allowed uniform scale;
- hidden overlap at parent/child;
- occlusion owner and decoration owner;
- source provenance;
- provider-generation reference;
- approval status.

Versioned contracts:

- `openai-contract.json`
- `gemini-contract.json`
- `contracts.json`

No Stage 2A–2B.3 manifest was mutated.

## Missing-artwork manifest

The offline extraction currently provides visible master regions only. Missing material:

- hidden shoulder extension behind the torso;
- hidden elbow gusset between upper arm and forearm;
- hidden hip/pelvis connection behind the dhoti;
- hidden knee gusset between thigh and shin;
- source-matched wrist/hip/knee joint covers where the visible contour does not provide them.

These are the only regions intended for paid generation/editing. Full-part regeneration is not
authorized or planned.

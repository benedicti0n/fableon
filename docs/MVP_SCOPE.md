# Fableon MVP Scope

> **Status:** Phase 0 establishes the foundation only. This document defines the
> product bar for the first end-to-end release. It is a specification, not a
> claim of implemented functionality. Decisions marked provisional may be
> refined during Phases 1–9, but the benchmark and acceptance criteria should
> remain stable.

## 1. MVP statement

Fableon's MVP must turn one authored idea into a complete illustrated,
narrated, animated short film of **45–60 seconds**, built from **4–6 scenes**,
with a consistent character, painterly environments, deliberate camera motion,
narration, readable subtitles, scene transitions, and a verified **1920×1080
MP4** export.

The benchmark story is a bird flying through a painted forest and landing on a
branch. It is chosen because it stresses the capabilities that matter most:
character consistency, layered environments, organic flight and landing motion,
camera choreography, temporal stability, and painterly visual quality.

## 2. Target user

The MVP is for a solo creative user — an illustrator, storyteller, educator, or
animator — who:

- has a short story idea but limited animation production time;
- values a hand-drawn, painterly look over photoreal or template-driven motion;
- wants to review and correct AI assistance rather than accept an opaque output;
- works locally and is willing to wait for a high-quality render;
- can make scene-level creative decisions without needing a full 3D pipeline.

The MVP does not target enterprise teams, real-time collaborators, or users who
need broadcast-scale production infrastructure.

## 3. Target experience

A successful MVP session feels like directing a small illustrated film:

1. **Start with an idea.** The creator describes the bird story, audience, tone,
   duration, and visual direction.
2. **Shape the story.** Fableon proposes a script and 4–6 scene breakdown. The
   creator edits narration, beats, and scene durations.
3. **Plan the shots.** Each scene gets a composition, character blocking, camera
   intention, and transitions.
4. **Paint the world.** Characters and environments are authored or generated,
   reviewed, and refined until the palette and character design are consistent.
5. **Animate.** The bird's flight, wing motion, descent, contact, and landing are
   edited or regenerated at the scene level.
6. **Direct the camera.** Camera moves and parallax support the story rather
   than distract from it.
7. **Add sound.** Narration is generated or recorded, aligned to scenes, and
   paired with ambience and music. Captions are generated and corrected.
8. **Review and export.** The creator scrubs the film in the Studio, fixes
   issues, and exports a 1080p master.
9. **Revise locally.** Regenerating one scene or line must not force a rebuild of
   the entire project.

The interface must always distinguish authored, generated, cached, and
unimplemented content. No placeholder control may look functional.

## 4. Required features

| Capability            | MVP requirement                                                                               | Phase |
| --------------------- | --------------------------------------------------------------------------------------------- | ----- |
| Project workspace     | Create/open/save a local project without hand-editing JSON                                    | 1, 5  |
| Scene management      | 4–6 ordered scenes with editable duration, transition, and notes                              | 1, 5  |
| Story planning        | Idea → script → scene breakdown, with human approval and editing                              | 6     |
| Storyboard            | Per-scene composition, blocking, camera, and visual-direction metadata                        | 6     |
| Character consistency | Canonical bird design and palette reused across every scene                                   | 3, 7  |
| Environments          | Layered painterly forest with parallax-capable depth                                          | 2, 7  |
| Asset management      | Browse, inspect, replace, and regenerate character/environment/audio assets with provenance   | 5, 7  |
| Painterly rendering   | Deterministic brush-based still frames and animated layers at 1080p                           | 2     |
| Character animation   | Flight, wing cycles, descent, anticipation, contact, landing, secondary motion                | 3     |
| Camera                | Keyframed camera, 2.5D parallax, smooth transitions, seeded handheld motion where appropriate | 4     |
| Scene regeneration    | Regenerate or replace one scene's assets/motion without rebuilding unrelated scenes           | 5–7   |
| Narration             | 45–60 seconds of timed voice performance aligned to picture                                   | 8     |
| Music and ambience    | At least one ambience bed and one music cue, mixed under narration                            | 8     |
| Subtitles             | Readable captions synchronized to narration, editable, exportable                             | 8     |
| Timeline              | Scene timing, layer visibility, keyframes, audio/caption tracks, scrubbing, playback          | 1, 5  |
| Video composition     | Frame-accurate picture, audio, and caption assembly                                           | 9     |
| Export                | 1920×1080, 24 fps, H.264 MP4 with AAC audio and captions                                      | 9     |
| Quality review        | Visual, motion, audio, caption, and technical review of the final master                      | 9, 11 |

### Required workflow properties

- Every generated asset can be traced to its source, provider version, prompt
  or reference, seed, and approval state where applicable.
- A failed generation or render is recoverable without corrupting the project.
- Scene edits invalidate only the affected caches.
- The final video can be reproduced from the project and asset manifest.
- The deterministic manual path works even if AI providers are unavailable.

## 5. Explicit non-goals

The MVP will not include:

- Videos longer than two minutes or multi-episode projects.
- 4K, 60 fps, vertical, square, or variable-frame-rate masters.
- 3D modeling, photoreal rendering, live-action compositing, or full 3D camera
  systems.
- Full lip-sync, facial performance capture, or dialogue-heavy multi-character
  scenes.
- Multi-user collaboration, accounts, billing, cloud sync, or team permissions.
- Mobile-native applications or real-time collaborative editing.
- A plugin marketplace, public template marketplace, or third-party SDK.
- Custom model training, fine-tuning, or provider hosting.
- Automated music composition as a required feature. A licensed or imported
  music bed is sufficient.
- Broadcast delivery formats, closed-caption compliance beyond the MVP caption
  policy, or localization beyond one language.
- Interactive games, VR/AR output, or real-time streaming.
- Production-scale render farms or cloud infrastructure.

These exclusions protect the 45–60 second visual benchmark. They are not
permanent product decisions.

## 6. End-to-end workflow

### 6.1 Manual/deterministic path

```text
New project
  → story and script (authored or approved)
  → 4–6 scenes with timings
  → storyboard and camera plan
  → character/environment assets
  → paint layers
  → motion and camera tracks
  → narration, ambience, music
  → captions
  → preview
  → 1080p export
  → review and correction
```

This path must work with manually authored or procedurally generated content and
no AI provider. It is the reference implementation for the assisted path.

### 6.2 AI-assisted path

AI may propose the script, scene breakdown, storyboard metadata, images, limited
animation, and narration. Every proposal enters a review step before it becomes
part of the project. The creator can accept, edit, regenerate, or replace any
generated artifact. Provider-specific behavior stays behind adapters and never
changes the scene format.

### 6.3 Review loop

The Studio must support:

- scrubbing the whole film and individual scenes;
- comparing generated alternatives;
- regenerating one scene or asset;
- correcting captions and narration timing;
- marking an asset approved or rejected;
- exporting a preview without committing to the final render;
- recovering from failed jobs.

## 7. Content and technical specification

| Requirement       | MVP target                                                                 |
| ----------------- | -------------------------------------------------------------------------- |
| Duration          | 45–60 seconds                                                              |
| Scenes            | 4–6                                                                        |
| Resolution        | 1920×1080                                                                  |
| Frame rate        | 24 fps                                                                     |
| Video             | H.264 MP4, high-quality 1080p profile                                      |
| Audio             | 48 kHz AAC; narration, ambience, music mixed                               |
| Captions          | Visible captions in the master and/or attached SRT; editable source timing |
| Transitions       | At least two intentional transitions; no accidental hard cuts              |
| Character         | One consistent bird design across all scenes                               |
| Environments      | Painted forest with at least three depth layers for parallax               |
| Export validation | ffprobe-verifiable streams, duration, frame count, resolution, audio, text |
| Reproducibility   | Project + assets + engine versions + seed reproduce an equivalent master   |

Frame rate and codec details are provisional until Phase 9 but should not change
without an explicit MVP decision.

## 8. Visual quality requirements

### 8.1 Painterly quality

- The final image reads as illustrated, not as a filtered photograph or a flat
  vector approximation.
- Brushwork shows intentional edge variation, texture, and layered color.
- Paper/canvas texture supports the image without visibly tiling or crawling
  between frames.
- Color harmony holds across scenes: warm dawn light, sage/ink shadow, ochre
  highlights, and a restrained accent palette.
- Detail at 1080p survives compression; no mushy or aliased edges.

### 8.2 Character consistency

- The bird's silhouette, proportions, wing shape, tail, eye, beak, and palette
  remain recognizable in wide, medium, and close shots.
- Markings and highlight placement stay consistent under changing light.
- Generated variations are reviewed against a canonical reference sheet.
- The character does not morph between scenes or lose parts during motion.

### 8.3 Temporal consistency

- Painted surfaces, textures, and edges do not flicker or boil unintentionally
  from frame to frame.
- Layer parallax remains stable; no seams, warping, or horizon drift.
- Light and shadow changes are intentional and continuous.
- Wing and feather shapes do not pop or invert between adjacent frames.
- Camera motion does not expose unpainted canvas or layer gaps.

### 8.4 Organic motion

- Flight has weight: acceleration, gliding, wing compression, and recovery.
- The landing includes anticipation, contact, branch compression, recoil, and a
  settle; secondary motion continues after the bird stops.
- Motion arcs and timing feel observed rather than linear.
- Wing cycles avoid obvious loops in close shots unless stylistically intended.
- Leaves, dust, and background elements react subtly to the landing.

### 8.5 Composition and camera

- Each shot has a clear focal point and readable negative space.
- The camera move serves the story and preserves caption safe areas.
- Parallax adds depth without turning into a layer-separation effect.
- Shot progression builds from wide establishing space to intimate landing,
  then releases into a final wide hold.
- Transitions are motivated by light, motion, or story beats.

### 8.6 Sound and captions

- Narration is intelligible, warm, and correctly timed.
- Ambience and music support the scene without masking narration.
- Captions are readable at 1080p, respect safe areas, and match narration.
- No sudden loudness jumps or clipped audio.

## 9. Benchmark scene: “Where the Light Lands”

### 9.1 Logline

At first light, a small ochre-breasted bird crosses a painted forest, follows a
ribbon of sun between the trunks, and lands on a branch as the forest settles
around it.

### 9.2 Visual direction

- **Style:** hand-painted 2.5D illustration; visible brush texture; soft edges;
  no photoreal assets.
- **Palette:** deep ink-green shadows, sage midtones, warm ochre sunrise, cream
  highlights, muted clay accents.
- **Character:** compact bird, ochre breast, ink-blue wings, cream throat, dark
  eye, small pale beak; consistent reference sheet.
- **Environment:** layered conifer/broadleaf forest, mist bands, sun shafts,
  textured branch, drifting leaves.
- **Camera:** restrained, story-led moves; parallax; no whip pans or gratuitous
  shake.

### 9.3 Scene plan

| #   | Time      | Picture                                                                 | Camera / motion                                     | Audio / captions                                                  |
| --- | --------- | ----------------------------------------------------------------------- | --------------------------------------------------- | ----------------------------------------------------------------- |
| 1   | 0:00–0:08 | Wide dawn forest, mist between dark trunks, a small bird enters high    | Slow push-in; three parallax layers                 | Forest ambience; “At first light, the forest held its breath.”    |
| 2   | 0:08–0:20 | Bird glides between trunks, wings catching warm light                   | Lateral tracking with depth parallax; gentle rise   | Soft wingbeats; “A small bird crossed the painted dark…”          |
| 3   | 0:20–0:32 | Medium profile as the bird follows a sunbeam; leaves drift              | Follow shot, slight rack of light; shallow parallax | Music enters; “It followed a ribbon of sun through the branches.” |
| 4   | 0:32–0:43 | Low-angle descent toward the chosen branch; anticipation before contact | Tilt down with the bird; branch enters foreground   | Wingbeat slows; “Then, softly, it chose a place to land.”         |
| 5   | 0:43–0:54 | Close landing: branch flexes, leaves settle, bird folds wings           | Near-static close shot with small settle move       | Contact, branch creak, settling leaves; “And the forest exhaled.” |
| 6   | 0:54–0:58 | Wide final hold; mist drifts; title appears                             | Slow pull-back; light shifts warmer                 | Ambience resolves; title card                                     |

Total runtime: approximately 58 seconds. Exact timing can be adjusted within
the 45–60 second target.

### 9.4 Benchmark deliverables

- The project file and required asset manifest.
- A 1920×1080, 24 fps MP4 master with narration, music/ambience, and captions.
- An SRT caption file.
- A contact sheet or selected key frames for visual review.
- A render manifest with versions, seed, hashes, and validation results.
- A short review note identifying known limitations.

## 10. Visual evaluation rubric

Reviewers score each dimension from 1 to 5. The benchmark passes the visual gate
when the weighted average is at least **4.0**, no dimension scores below **3**,
and the technical checks pass.

| Dimension              | Weight | 1 — Unacceptable                                        | 3 — Acceptable                                       | 5 — Benchmark quality                                                         |
| ---------------------- | ------ | ------------------------------------------------------- | ---------------------------------------------------- | ----------------------------------------------------------------------------- |
| Temporal consistency   | 25%    | Obvious flicker, identity drift, layer seams every shot | Mostly stable; minor texture or edge shimmer         | Stable painted surfaces, character, light, and parallax across all cuts       |
| Organic motion         | 25%    | Linear, weightless, robotic; landing lacks contact      | Motion reads but feels stiff or mechanically looped  | Anticipation, weight, overlapping action, believable landing and settle       |
| Composition and camera | 20%    | Flat framing, distracting camera, broken safe areas     | Clear shots with competent but generic movement      | Intentional composition, meaningful parallax, shot progression, graceful cuts |
| Painterly quality      | 20%    | Filtered or procedural look, flat texture, poor edges   | Consistent brushwork, acceptable detail              | Rich hand-painted texture, edge variation, color harmony, clean 1080p detail  |
| Story, sound, captions | 10%    | Confusing story, inaudible narration, broken captions   | Clear story, intelligible narration, usable captions | Narration, sound, and captions elevate the film and stay precisely aligned    |

Review method:

- Watch the full master at normal speed, then review selected frames at 100%.
- Step through the landing and at least two flight segments frame by frame.
- Compare character shots against the canonical reference sheet.
- Inspect the export with media probing and verify caption timing.
- Record scores and specific evidence (timecodes/frames), not only a verdict.

Provisional technical pass/fail checks:

- Duration within 45–60 seconds; frame count matches the declared duration.
- No unintentional black frames, missing assets, dropped audio, or caption
  overflow.
- Character remains recognizable and complete in every scene.
- Audio stays synchronized with picture; captions stay synchronized with
  narration.
- Export manifest matches the reviewed file hash.

## 11. Functional acceptance criteria

The MVP is accepted only when all of the following are true:

1. A creator can open the benchmark project in the Studio, review all 4–6
   scenes, adjust timings, and save/reload without data loss.
2. The benchmark can be played back with picture, narration, music/ambience, and
   captions in sync.
3. The bird remains visually consistent across every scene and shot size.
4. The forest is layered, painterly, and stable under camera motion.
5. Flight and landing motion pass the visual rubric.
6. At least one scene can be regenerated or replaced without rebuilding the
   entire project.
7. Narration covers the story and is aligned to the picture.
8. Captions are readable, editable, and present in or alongside the export.
9. The final export is a valid 45–60 second 1920×1080, 24 fps H.264 MP4 with AAC
   audio and captions.
10. The export can be reproduced from the project and asset manifest.
11. No manual JSON editing or undocumented command is required for the core
    review-and-export workflow.
12. The deterministic path works without network access after assets are
    available; AI assistance is optional, not a hidden dependency.
13. The final report records the exact render environment, versions, verification
    commands, and known limitations.
14. No secrets, unlicensed assets, or unexplained third-party media are present
    in the project or export.

## 12. Performance and reliability targets

These targets are provisional until Phase 9 establishes a reference machine:

- Full export completes within 30 minutes for the 45–60 second benchmark.
- No individual frame takes longer than 2 minutes to evaluate and rasterize.
- Scrubbing a scene responds within 100 ms for cached frames; uncached preview
  may show a clearly labeled loading state.
- Saving and reopening a project never loses authored data.
- A failed export reports the failing stage and frame, remains cancellable, and
  leaves the previous valid master intact.
- Render memory stays within a documented budget on the reference machine.

## 13. Assumptions and constraints

- One primary character is sufficient for the MVP; additional characters are
  optional.
- One language and one narrator voice are sufficient.
- A local workstation is the rendering environment.
- The user can review and correct generated content.
- Music may be licensed/imported rather than generated.
- Captions may be burned in or delivered as a sidecar; the choice must be
  explicit and tested.
- The scene format, frame rate, and renderer remain provisional until their
  respective phases.

## 14. Definition of done

The MVP is done when the benchmark can be produced end to end through the Studio,
passes the functional and visual acceptance criteria, exports a verified 1080p
master, and the deterministic path is documented and reproducible. A polished
demo video without a working project workflow is not sufficient. A working
pipeline that produces visually unacceptable output is not sufficient either.

## 15. Phase 0 boundary

Phase 0 delivers only the workspace, Studio shell, quality gates, and
architecture documentation. It does not implement scene data, paint, motion,
camera, AI, audio, captions, composition, or export. The Studio panels are
placeholders and are labeled as such.

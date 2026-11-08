# Fableon Development Protocol

> This protocol governs collaboration between the product/architecture reviewer
> (ChatGPT), the implementing agent (OpenCode), and the repository. It exists to
> keep phases reviewable, honest, and safe. It applies to every phase, including
> corrective work.

## 1. Roles

| Role        | Responsibilities                                                                                                                     |
| ----------- | ------------------------------------------------------------------------------------------------------------------------------------ |
| ChatGPT     | Supplies the phase prompt, reviews the phase report, decides whether the phase passes, authorizes corrective work or the next phase. |
| OpenCode    | Inspects the repository, plans within scope, implements features, commits independently, executes verification, writes the report.   |
| Repository  | The authoritative record of code, documentation, tests, commits, and reported evidence.                                              |
| Human owner | Resolves product or scope decisions that the protocol cannot resolve; protects private credentials and external accounts.            |

The implementing agent works autonomously **within the current phase prompt**.
It does not negotiate scope by silently adding or removing requirements.

## 2. The phase loop

1. **ChatGPT supplies a phase prompt.** The prompt defines the phase objective,
   required features, commit messages, verification, and reporting format.
2. **OpenCode inspects the repository.** Before changing anything, inspect the
   file tree, package manager, Git status, Git history, existing docs, and any
   uncommitted work. Identify existing implementations to extend rather than
   overwrite.
3. **OpenCode implements features sequentially.** Work in the order given by the
   phase prompt. Keep each feature independently reviewable and testable.
4. **Each independently testable feature receives its own Git commit.** Use the
   specified commit message. Do not combine unrelated work. Ensure the commit
   represents the feature and its tests/docs.
5. **OpenCode runs validations.** Execute every required command and the runtime
   check. Record actual output, warnings, failures, and remediation. Never report
   an unexecuted check as passing.
6. **OpenCode produces a detailed phase report.** Commit it to
   `docs/reports/PHASE_XX_REPORT.md` using the required template.
7. **ChatGPT reviews the report.** The review checks scope, evidence, code
   quality, architecture, and unresolved issues.
8. **Any corrective work happens before the next phase.** Fixes are committed as
   focused corrective commits; history is not rewritten without explicit
   instruction.
9. **OpenCode must never advance phases without a new prompt.** A GO
   recommendation, a passing build, or a completed report does not authorize the
   next phase.

## 3. Repository inspection checklist

Before implementation, record:

- `git status --short`, current branch, remotes, and recent history.
- Untracked, modified, and staged files, including user work that must be
  preserved.
- Existing authoritative specifications, especially an MVP scope document. Read
  and preserve them; do not replace them with a conflicting interpretation.
- Package manager and lockfile (`pnpm-lock.yaml`), workspace definition, Node
  version constraints, and existing scripts.
- Existing TypeScript, lint, formatting, test, and build configuration.
- Any related implementation that should be extended safely.
- Existing documentation and reports that establish prior decisions.

If the repository is empty, state that explicitly in the phase report. If the
repository contains conflicting or ambiguous work, stop and report the conflict
rather than overwriting it.

## 4. Implementation rules

### 4.1 Scope

- Implement only the current phase. Do not begin the next phase, even if it
  seems efficient.
- Do not add speculative empty packages that merely mirror a future diagram.
  Document future modules instead.
- Do not introduce cloud infrastructure, databases, paid services, AI SDKs,
  Remotion, or rendering libraries before a phase requires them.
- Prefer a small, tested, functional implementation over scaffolding with no
  behavior.
- If a requirement is impossible in the environment, implement the closest safe
  alternative and document the deviation in the report.

### 4.2 Code quality

- Use strict TypeScript. Avoid `any`, unsafe casts, and disabled checks.
- Keep module boundaries explicit. Rendering engines must not depend on AI
  providers or the UI.
- Use versioned schemas for persisted/shared scene data once scene data exists.
- Favor deterministic behavior; avoid wall-clock time and unseeded randomness in
  evaluation paths.
- Keep dependencies minimal and justified.
- Use reusable UI primitives and keep placeholder controls clearly labeled.
- No hardcoded credentials, tokens, or secrets. Use environment configuration
  outside the repository.
- Preserve existing user files and uncommitted changes.

### 4.3 Documentation

- Read existing authoritative docs before writing new ones.
- Mark future decisions as provisional where evidence is incomplete.
- Keep code, docs, and reported status consistent. Do not let a polished UI or
  document imply unimplemented capability.
- Update README instructions when commands, prerequisites, or structure change.

## 5. Commit discipline

- One feature per commit. Include its tests and relevant documentation.
- Use Conventional Commit style and the exact message supplied by the phase
  prompt where one is given.
- Commit messages describe the change, not the process: `feat(web): create
fableon studio shell`, not `update files`.
- Do not stage unrelated changes, generated build output, caches, or secrets.
- Do not amend or rewrite history unless the reviewer explicitly requests it.
- Do not push to a remote unless explicitly instructed. Phase 0 explicitly
  prohibits pushing.
- Keep the working tree clean at phase completion except for documented
  environment artifacts.
- Ensure each commit is independently understandable. If a feature is too large
  for one reviewable commit, split it into coherent sub-features and report the
  SHAs.

## 6. Verification protocol

Required commands for the foundation phases:

```bash
pnpm install
pnpm lint
pnpm typecheck
pnpm test
pnpm build
```

Then verify runtime behavior from a production server:

```bash
pnpm start
# request / and /studio; verify HTTP status and rendered content
```

Use an available port if the default is occupied. Stop the server afterward.

### 6.1 Recording results

For every check, record in the report:

- the exact command;
- PASS, FAIL, or NOT RUN;
- a concise but relevant output excerpt;
- warnings or deprecations;
- remediation performed after a failure;
- whether the check was executed before or after documentation-only changes.

A build passing does not prove the application runs. A test suite passing does
not prove visual quality. Report each independently.

### 6.2 Failure handling

- Fix in-scope failures with the smallest reasonable change.
- Re-run the failed check and the affected dependent checks.
- If a failure is environmental (missing service, unavailable network, unsupported
  Node version), document it precisely and mark the check NOT RUN rather than
  PASS.
- If a check cannot be made to pass without going out of scope, stop and report
  the blocker with options.
- Never suppress a failure merely to make the report green. Do not disable lint
  rules globally, skip tests, or use placeholder assertions unless the reviewer
  explicitly accepts the trade-off and it is documented.

### 6.3 Test quality

- Tests must assert observable behavior or real invariants.
- Avoid snapshots that always pass or duplicate implementation details.
- Cover empty, invalid, boundary, and failure states where relevant.
- Execute the tests; do not infer their result from the build.

## 7. Phase report requirements

Create `docs/reports/PHASE_XX_REPORT.md` and commit it with the specified
message. The report must include:

### A. Executive summary

What was implemented and whether the phase achieved its goals.

### B. Initial repository state

What existed before implementation, including branch, commits, uncommitted
work, package manager, and any existing authoritative specs.

### C. Completed features

For each feature:

- feature identifier;
- implementation summary;
- files added/modified;
- full Git commit SHA;
- acceptance criteria results.

### D. Final repository structure

A meaningful file tree, excluding generated caches and dependencies.

### E. Architecture decisions

Important choices, trade-offs, and rejected alternatives.

### F. Verification results

A table with check, command, result, and notes. Include runtime verification and
any warnings. Use PASS, FAIL, or NOT RUN truthfully.

### G. Issues and limitations

Unresolved problems, workarounds, technical debt, and environmental constraints.

### H. Scope deviations

Any difference from the requested implementation and why. If there are none,
state that explicitly.

### I. Phase readiness

An explicit **GO** or **NO-GO** recommendation with evidence. A GO means the
current phase is ready for reviewer acceptance, not that the next phase may
start.

### J. Next-phase considerations

Prerequisites, open decisions, and risks relevant to the next phase, without
implementing it.

The report must include the final commit history and working-tree status when
requested. It must not include secrets or private credentials.

## 8. Review and gate criteria

A phase passes review only when:

- every required feature is present or has an approved, documented deviation;
- acceptance criteria are demonstrated with executed evidence;
- lint, typecheck, tests, build, and runtime checks are honestly reported;
- commits are focused and match the requested feature boundaries;
- documentation reflects the real state, not aspirational capability;
- no secrets, unrelated changes, or out-of-scope work are present;
- the working tree is clean and the report is committed.

The reviewer may return the phase for corrective work. Corrective work follows
the same feature/commit/verification/report discipline. It may not expand scope
without a new prompt.

## 9. Phase boundaries

- Phase N ends when its report is committed and reviewed.
- Phase N+1 starts only with a new phase prompt, even after a GO.
- Do not carry out "helpful" Phase N+1 work during a correction pass. Propose it
  in the report instead.
- Do not delete or rewrite phase reports from earlier phases.
- Keep historical evidence intact; supersede decisions with new documentation,
  not silent edits.

## 10. Conflict resolution and existing work

- If the phase prompt conflicts with an existing authoritative MVP spec, pause
  and report the conflict with the exact documents and lines involved.
- If uncommitted user work overlaps required changes, inspect it and preserve
  it. Prefer extending it. If that is unsafe, ask before overwriting.
- If a dependency or tool version is incompatible with the environment, choose
  the closest supported stable version, document the constraint, and verify the
  result.
- If a requested API or library does not exist, implement the behavior with
  available stable technology and record the deviation.

## 11. Security and ethics

- Never commit credentials, tokens, private keys, or provider secrets.
- Never exfiltrate project data or prompts to an external service without an
  explicit product decision and user consent.
- Validate untrusted project files before evaluation.
- Record provenance and licensing for generated or imported assets.
- Do not claim visual quality or user readiness that has not been reviewed.
- Do not push code or create external infrastructure unless explicitly
  instructed.

## 12. Communication expectations

The implementing agent should:

- state what it inspected before modifying the repository;
- make progress visible through focused commits;
- report blockers early;
- use precise file paths and commit SHAs;
- distinguish verified facts from assumptions;
- return the full phase report in the final response so it can be copied for
  review;
- end at the phase boundary.

## 13. Current phase authority

- Phase prompt: the current task definition from ChatGPT.
- Product bar: [MVP_SCOPE.md](MVP_SCOPE.md), once established.
- System direction: [ARCHITECTURE.md](ARCHITECTURE.md) and
  [ROADMAP.md](ROADMAP.md).
- Evidence of completion: `docs/reports/PHASE_XX_REPORT.md`.

If an existing authoritative MVP specification is present in the repository, it
takes precedence over an informal summary. Read and preserve it before
implementing.

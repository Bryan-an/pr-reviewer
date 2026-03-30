---
name: implement-video
description: >
  Implement a feature by analyzing a screen recording that shows the desired behavior.
  Use this skill when the user provides a video (.mov, .mp4, .gif, .webp) showing UI, animations,
  interactions, or navigation flows they want to replicate in their codebase. Also trigger when
  the user says "implement what's in this video", "build this from the recording",
  "I want this feature, here's a video", "replicate this behavior", "copy this UI from the video",
  or shares a screen recording of another app's feature to use as reference. This skill handles
  the full pipeline: video analysis, implementation plan, user confirmation, and code generation.
allowed-tools: Bash, Read, Write, Edit, Agent, Glob, Grep
argument-hint: ~/Desktop/feature-reference.mov
---

# Video Implement

Turn a screen recording of desired behavior into implemented code. The user records a video showing what they want — a UI layout, an animation, a user interaction flow, a navigation sequence — and this skill extracts a visual specification from the frames, produces an implementation plan for the user to approve, and then builds it.

**Argument**: $ARGUMENTS

## Step 0: Verify required permissions

This skill uses sub-agents that need specific permissions pre-approved in `settings.local.json`. Without them, sub-agents will be blocked and the analysis will fail silently.

Check that these entries exist in `.claude/settings.local.json` under `permissions.allow`:

```json
"Bash(ffmpeg:*)",
"Bash(ffprobe:*)",
"Bash(mkdir:*)",
"Bash(cp:*)",
"Write(/tmp/**)"
```

If any are missing, tell the user:

> This skill requires pre-approved permissions for its sub-agents to work. Add the following
> to your `.claude/settings.local.json` under `permissions.allow`:
>
> ```json
> "Bash(ffmpeg:*)",
> "Bash(ffprobe:*)",
> "Bash(mkdir:*)",
> "Bash(cp:*)",
> "Write(/tmp/**)"
> ```
>
> Then restart the conversation and run `/implement-video` again.

If all permissions are present, continue.

## Step 1: Resolve the video path

The user provides a video path as the argument. Resolve it:

- If it starts with `~`, expand to the user's home directory
- If it's a relative path, resolve against the current working directory
- The path may contain spaces — always quote it in shell commands
- Supported formats: `.mov`, `.mp4`, `.gif`, `.webp`

Verify the file exists:

```bash
ls -la "<resolved_path>"
```

If the file doesn't exist, tell the user and stop.

## Step 2: Verify ffmpeg is installed

```bash
which ffmpeg && which ffprobe
```

If either is missing, tell the user to install it with `brew install ffmpeg` and stop.

## Step 3: Create the output directory

```bash
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
OUTPUT_DIR="/tmp/video-implement/analysis_${TIMESTAMP}"
mkdir -p "${OUTPUT_DIR}/frames"
```

## Step 4: Extract video metadata

```bash
ffprobe -v quiet -print_format json -show_format -show_streams "<video_path>"
```

Save duration, resolution, FPS, codec, and file size to `${OUTPUT_DIR}/metadata.txt`.

If the video is longer than 60 seconds, warn the user and cap extraction at 60 seconds.

## Step 5: Extract frames

```bash
ffmpeg -i "<video_path>" -vf "fps=3" -q:v 2 -t 60 "${OUTPUT_DIR}/frames/frame_%04d.jpg" 2>&1
```

Count the extracted frames:

```bash
ls "${OUTPUT_DIR}/frames/" | wc -l
```

## Step 6: Analyze frames in batches via sub-agents

The frames must be analyzed by sub-agents so image data never enters the main conversation context. The goal here is different from bug detection — you're extracting a **feature specification** from the video.

### Batching strategy

- Batch size: **15 frames per sub-agent**
- Launch all batches in parallel

### For each batch, spawn a sub-agent with this prompt:

```
You are analyzing frames from a screen recording that shows a desired feature or behavior
to implement in a web app. Your job is to describe exactly what you see and — critically —
document the user interactions, animations, page transitions, and UI components shown.

Think of yourself as a UI/UX analyst extracting a specification from a demo video.

Context:
- This is a Next.js web app (App Router) with React 19, Tailwind CSS 4, and shadcn/ui components
- Frame rate: 3 fps, so each frame represents ~333ms of real time
- The video may be from a different app — focus on WHAT the UI does, not which app it is
- Pay attention to: component types, layout structure, colors, typography, spacing,
  animations, click/hover interactions, navigation patterns, loading states (skeletons,
  spinners), toast notifications, modal/dialog behavior, form interactions, table layouts

Frames to analyze (read each one with the Read tool):
<list of frame paths for this batch>

IMPORTANT — How to analyze:
1. Read ALL frames in this batch first before writing anything.
2. Compare each frame to the previous one to detect interactions and transitions.
3. For static frames, describe the UI layout in detail (components, hierarchy, spacing).
4. For frames that change, describe WHAT changed and WHY (user tapped something,
   animation progressed, screen transitioned, data loaded, etc.).

For each frame, write:

### Frame NNNN (T=X.Xs)
**Screen**: [identify the screen — e.g., "account list", "transfer form", "success modal"]
**UI components**: [list every visible component with approximate layout:
  - Navigation bar with back arrow and title "Transfers"
  - Card component showing account number "****1234" with balance "$1,250"
  - Primary button "Continue" at bottom, full width
  - etc.]
**Colors and styling**: [dominant colors, background color, text colors, shadows, borders]
**User interaction**: [what the user did between this frame and the previous one —
  tapped a button, scrolled, swiped, typed text, or NONE if no interaction detected]
**Animation state**: [if an animation is in progress, describe what's animating —
  e.g., "modal sliding up from bottom, currently at 60% height",
  "button scale animation, pressed state", "fade transition between screens"]
**Changes from previous frame**: [NONE if identical, or describe exactly what changed]

After all frames, write a **Batch Summary** with:
- Screens identified in this batch (list each unique screen/view)
- User interactions detected (list each tap, swipe, scroll with timestamp)
- Animations observed (describe each animation with start/end timestamps)
- Navigation flow (screen A → screen B at T=X.Xs)
- Component inventory (list all unique UI components seen)

Save your complete analysis to: ${OUTPUT_DIR}/batch_N_analysis.txt
```

## Step 7: Compile the feature specification

After all sub-agents complete, read all `batch_*_analysis.txt` files and compile `${OUTPUT_DIR}/spec.md`:

```markdown
# Feature Specification (from video)

**Source video**: <original filename>
**Duration**: <duration>s | **Resolution**: <width>x<height>
**Analyzed**: <timestamp>

## Feature Overview

<2-3 sentence description of what the feature does, based on everything observed in the video.>

## Screens

<For each unique screen identified, describe it:>

### Screen 1: <name>

**Purpose**: <what this screen does>
**Layout**:

- <describe the visual hierarchy from top to bottom>
  **Components**:
- <list each component with its type, content, position, and styling>
  **Interactions**:
- <what the user can do on this screen — taps, scrolls, inputs>

### Screen 2: <name>

...

## Navigation Flow

<Describe the complete flow from start to finish:>

1. User starts on [Screen 1]
2. User taps [element] → navigates to [Screen 2]
3. ...

## Animations and Transitions

<Describe each animation observed:>

1. **<animation name>**: <what animates, duration estimate, easing>
2. ...

## Component Inventory

<Consolidated list of all unique UI components needed:>

| Component | Type | Description |
| --------- | ---- | ----------- |
| ...       | ...  | ...         |

## Interaction Details

<Describe each user interaction and its visual feedback:>

1. **<interaction>**: <trigger> → <visual response> → <result>
2. ...
```

## Step 8: Present the specification and ask for confirmation

Tell the user:

- Where the spec is: `${OUTPUT_DIR}/spec.md`
- Where the frames are: `${OUTPUT_DIR}/frames/`
- Present the key sections inline: feature overview, screens, navigation flow, and animations

Then ask:

> This is what I extracted from the video. Before I start implementing, I need to know:
>
> 1. Does this match what you want? Anything to add or remove?
> 2. Where should this feature live in the codebase? (e.g., new route under `app/`, extend an existing page)
> 3. Are there existing components I should reuse? (e.g., shadcn/ui components, shared components in `components/`)
> 4. Does this need server-side logic? (e.g., new server actions, database models, API integrations)

**Do NOT proceed to implementation until the user confirms.** This checkpoint prevents wasting effort building the wrong thing. The user may correct details, add context about existing patterns, or scope the implementation differently than what the video shows.

## Step 9: Explore the codebase

Before writing any code, understand the existing patterns. Use Grep and Glob to:

1. Find similar existing pages/features that match the patterns seen in the video (search `app/`)
2. Check existing shared components that can be reused (search `components/`)
3. Check route-scoped components in `app/**/_components/` for patterns to follow
4. Find relevant server actions in `app/**/_actions/` if server mutations are needed
5. Check server-side code in `server/` if new API integrations or domain logic are needed
6. Look at existing loading states (`loading.tsx`, `*-skeleton.tsx`) and error boundaries (`error.tsx`)

This exploration informs the implementation plan — you want to follow existing conventions, not invent new ones.

## Step 10: Create the implementation plan

Based on the spec and codebase exploration, create a concrete implementation plan. Present it to the user:

```markdown
## Implementation Plan

### Files to create

- `app/<feature>/page.tsx` — page component (Server Component by default)
- `app/<feature>/_components/<component>.tsx` — route-scoped components
- `app/<feature>/_lib/routes.ts` — route builders
- `app/<feature>/_lib/search-params.ts` — search param keys (if needed)
- `app/<feature>/_actions/<action>.ts` — server actions (if needed)
- `app/<feature>/loading.tsx` — loading skeleton (if async data)
- `app/<feature>/error.tsx` — error boundary (if external API calls)
- `server/<domain>/<module>.ts` — domain/integration logic (if needed)
- ...

### Files to modify

- `components/<component>.tsx` — shared components (if creating reusable ones)
- `server/db/<module>.ts` — database queries (if new data access needed)
- `prisma/schema.prisma` — schema changes (if new models needed)
- ...

### Existing components to reuse

- shadcn/ui primitives from `components/ui/`
- `PageHeader` for page headers with actions
- `LoadingButton` for async action buttons
- `Markdown` for rendering markdown content
- `<other existing component>` for <purpose>
- ...

### Implementation sequence

1. Schema/migration changes (if needed)
2. Server-side domain logic (`server/`)
3. Server actions (`_actions/`)
4. Page component and route-scoped components
5. Loading skeleton and error boundary
6. ...
```

Wait for user confirmation before proceeding.

## Step 11: Implement

Follow the plan. Write code following all project conventions (CLAUDE.md rules). After implementation, present a summary of what was created/modified.

## Important

- All video analysis output goes to `/tmp/video-implement/` — never put frames or specs inside the project
- Frame images are ONLY read by sub-agents — never read frame images in the main conversation
- The TWO confirmation checkpoints (spec + plan) are critical — skip them and you risk building the wrong thing
- If the video shows behavior from another app, focus on the BEHAVIOR and UI PATTERN, not pixel-perfect replication. Adapt to the project's existing design system (Tailwind CSS theme tokens, shadcn/ui components, existing patterns in `components/`)
- If ffmpeg fails, suggest converting: `ffmpeg -i input.mov -c:v libx264 output.mp4`

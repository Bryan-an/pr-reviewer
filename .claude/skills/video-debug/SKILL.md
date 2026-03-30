---
name: debug-video
description: >
  Analyze screen recordings of web app bugs by extracting frames and producing a visual timeline.
  Use this skill when the user shares a video file (.mov, .mp4, .gif, .webp) of a bug, glitch,
  or unexpected behavior in the web app. Also trigger when the user says "debug this video",
  "analyze this recording", "what's happening in this screen recording", "I recorded a bug",
  or provides a path to a screen recording file. This is especially useful for animation bugs,
  flickering, layout shifts, loading state glitches, and visual issues that are hard to describe
  in words.
allowed-tools: Bash, Read, Write, Agent, Glob
argument-hint: ~/Desktop/Screen\ Recording\ 2026-03-28.mov
---

# Video Debug

Analyze a screen recording of a web app bug by extracting frames, examining them in batches via sub-agents, and producing a structured analysis report. The goal is to turn a video the user recorded into textual context you can reason about.

**Argument**: $ARGUMENTS

## Step 0: Verify required permissions

This skill uses sub-agents that need specific permissions pre-approved in `settings.local.json`. Without them, the sub-agents will be blocked and the analysis will fail silently.

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
> Then restart the conversation and run `/debug-video` again.

If all permissions are present, continue to Step 1.

## Step 1: Resolve the video path

The user provides a video path as the argument. Resolve it:

- If it starts with `~`, expand to the user's home directory
- If it's a relative path, resolve against the current working directory
- The path may contain spaces (macOS screen recordings often do) — always quote it in shell commands
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

Use a timestamp to keep analyses separate:

```bash
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
OUTPUT_DIR="/tmp/video-debug/analysis_${TIMESTAMP}"
mkdir -p "${OUTPUT_DIR}/frames"
```

Save the output directory path — you'll reference it throughout.

## Step 4: Extract video metadata

```bash
ffprobe -v quiet -print_format json -show_format -show_streams "<video_path>"
```

From the output, extract and save to `${OUTPUT_DIR}/metadata.txt`:

- Duration (seconds)
- Resolution (width x height)
- FPS (r_frame_rate)
- Codec
- File size

If the video is longer than 60 seconds, warn the user that analysis will be limited to the first 60 seconds and add `-t 60` to the ffmpeg command in the next step.

## Step 5: Extract frames

Extract frames at 3 fps (good balance between temporal detail for animations and total frame count):

```bash
ffmpeg -i "<video_path>" -vf "fps=3" -q:v 2 -t 60 "${OUTPUT_DIR}/frames/frame_%04d.jpg" 2>&1
```

Notes:

- `-q:v 2` gives high quality JPEG output
- `-t 60` caps at 60 seconds
- Frame numbering starts at `frame_0001.jpg`

Count the extracted frames:

```bash
ls "${OUTPUT_DIR}/frames/" | wc -l
```

## Step 6: Analyze frames in batches via sub-agents

This is the critical step. The frames must be analyzed by sub-agents so that image data never enters the main conversation context. Only text summaries come back.

### Batching strategy

- Batch size: **15 frames per sub-agent**
- For a 30s video at 3fps = ~90 frames = ~6 batches
- Each batch covers roughly 5 seconds of video

### For each batch, spawn a sub-agent with this prompt:

```
You are analyzing frames from a screen recording of a web app bug. Your job is to describe
exactly what you see in each frame and — critically — detect any CHANGES between consecutive
frames. Bugs manifest as things that CHANGE: elements that move, appear, disappear, resize,
change color, or shift position. A static layout issue is less interesting than a dynamic one.

Context:
- This is a Next.js web app (App Router) with React 19, Tailwind CSS 4, and shadcn/ui components
- Common issues to watch for: layout shifts (CLS), skeleton/loading state flickers, flash of
  unstyled content (FOUC), hydration mismatches (content changing after page load), z-index
  problems with modals/dialogs/popovers, animation glitches (collapsible panels, transitions),
  dark mode transition artifacts, elements appearing/disappearing unexpectedly, scroll jumps,
  sticky header overlap issues, incomplete loading states, wrong content flash during navigation
- Frame rate: 3 fps, so each frame represents ~333ms of real time

Frames to analyze (read each one with the Read tool):
<list of frame paths for this batch>

IMPORTANT — How to analyze:
1. Read ALL frames in this batch first before writing anything.
2. Compare each frame to the previous one. Note EXACT pixel positions of key elements.
   If an element was at x=40 in one frame and x=250 in the next, that's a layout shift.
   If an element was visible in one frame and gone in the next, that's a flicker.
3. Pay special attention to frames where ANYTHING changes — position, visibility, size, color.
   These transition frames are the most valuable for debugging.

For each frame, write:

### Frame NNNN (T=X.Xs)
**Screen state**: [what screen/view is shown — login, home, modal, etc.]
**UI elements**: [describe layout with approximate positions — e.g., "blue box at x~40, y~300"]
**Changes from previous frame**: [NONE if identical, or describe exactly what moved/changed]
**Visual anomalies**: [anything that looks wrong — misaligned elements, wrong colors,
  overlapping content, blank areas, flickering artifacts, half-rendered states]

After describing all frames in this batch, write a **Batch Summary** noting:
- Frame-to-frame differences detected (list specific frame pairs where changes occurred)
- Any state transitions that occurred during this batch
- Any anomalies or suspicious visual changes
- The overall "story" of what happened in these ~3 seconds

Save your complete analysis to: ${OUTPUT_DIR}/batch_N_analysis.txt
```

Launch all batch sub-agents in parallel (use the Agent tool with multiple calls in a single message). Each sub-agent should save its output to `batch_N_analysis.txt` in the output directory.

## Step 7: Compile the final analysis

After all sub-agents complete, read all `batch_*_analysis.txt` files and compile `${OUTPUT_DIR}/analysis.md`:

```markdown
# Video Debug Analysis

**Video**: <original filename>
**Duration**: <duration>s | **Resolution**: <width>x<height> | **FPS**: <fps>
**Analyzed**: <timestamp>
**Frames extracted**: <count> (at 3 fps)

## Bug Description

<Based on the batch analyses, describe the observed bug in 2-3 sentences.
What is the expected behavior vs. what actually happens?>

## Timeline

<Merge all batch frame descriptions into a single chronological timeline.
Don't repeat every frame — group frames that show the same stable state
and call out the KEY MOMENTS where something changes or goes wrong.>

### T=0.0s - T=X.Xs: <phase description>

<what's happening in this time window>

### T=X.Xs - T=Y.Ys: <BUG MOMENT>

<describe exactly what goes wrong, which frames show it>

### T=Y.Ys - T=Z.Zs: <phase description>

<what happens after the bug>

## Key Frames

<List the 3-5 most important frames with their timestamps and why they matter.
These are the frames that best capture the bug.>

| Frame          | Time   | Significance             |
| -------------- | ------ | ------------------------ |
| frame_NNNN.jpg | T=X.Xs | <why this frame matters> |

## Possible Causes

<Based on the visual evidence and Next.js/React/Tailwind knowledge, suggest 2-4 likely causes.
Be specific — reference the visual symptoms and connect them to code-level patterns.>

1. **<cause>**: <explanation linking visual evidence to code pattern>
2. **<cause>**: <explanation>

## Suggested Investigation

<Concrete next steps — which files to check, what to look for in code, what to log.>
```

## Step 8: Present results

Tell the user:

- Where the analysis is: `${OUTPUT_DIR}/analysis.md`
- Where the frames are: `${OUTPUT_DIR}/frames/`
- Read and present the key findings from `analysis.md` (the bug description, key frames, and possible causes sections)
- Ask if they want to dig deeper into any specific moment

## Important

- All output goes to `/tmp/video-debug/` — never create files inside the project directory
- Frame images are ONLY read by sub-agents — never read frame images in the main conversation
- If ffmpeg fails, check the video format and suggest converting: `ffmpeg -i input.mov -c:v libx264 output.mp4`
- For GIF/WebP inputs, ffmpeg handles them natively — no special flags needed

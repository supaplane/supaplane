# Design

Supaplane's visual system is the **Fold** system. It is small, deliberate, and opinionated. Paper and charcoal. One plane. Many riders. No recolouring the chassis.

This document is the spec. The brand prompt in [`brand-prompt.md`](brand-prompt.md) is the short form. The reference image inventory lives in the operator's Obsidian vault under `System/Attachments/supaplane-logo/` (32 root images, plus `remix/` and `aero/` exploration sets).

## Thesis

> The plane is the chassis. Identity rides on top.

Concretely:

- The paper plane is always the same paper plane. One cream colour, one fold geometry, one silhouette.
- Harness identity (Claude, Codex, Gemini, OpenCode, Cursor), human identity (avatar), and custom identity (SOUL mascot) all sit on top of the plane as a sticker or badge.
- Status (fly, form, land, crash) is expressed by the plane's posture and small motion. Never by recolouring the plane.
- Density of stickers expresses personality: one clean foil badge is a default agent; a cluster of mixed stickers is a custom SOUL plane.

This is also the multiplayer metaphor. The primary surface is a sky of planes in loose formation. You read who's running by reading the rider, not by parsing tabs.

## Marks

Four marks are locked. They are roles, not alternatives.

| Mark                       | Role      | Where it lives                                               | File                                         |
| -------------------------- | --------- | ------------------------------------------------------------ | -------------------------------------------- |
| `#07` flat mono silhouette | Structure | Favicon, 16-32px, CLI chrome, light docs                     | `supaplane-logo/07-flat-mono-silhouette.jpg` |
| `#10` flat app icon        | Product   | macOS dock, Electron app icon, GitHub social, dark UI chrome | `supaplane-logo/10-flat-app-icon-gen.jpg`    |
| `#01` cream paper icon     | Soul      | Marketing, OG image, hero, onboarding empty states           | `supaplane-logo/01-app-icon-cream.jpg`       |
| `#05` premium isometric    | Gallery   | Premium stills, blog covers, launch announcement             | `supaplane-logo/05-premium-isometric.jpg`    |

Mark hierarchy, smallest to largest: `#07` → `#10` → `#01` → `#05`. The mono mark (`#07`) is always available; the others rotate by surface.

Rules:

- Never tint the mono mark. It is `ink` or `paper-white`. Only.
- The flat app icon (`#10`) uses only `paper-100`, `paper-200`, `paper-300` on `charcoal-800`. No gradients.
- The cream and premium marks may carry soft warm shadows. No cyan, no metallic silver.
- The wordmark "Supaplane" sits next to `#07` in mono contexts, or alone with the `#10` icon in product chrome. Medium weight, slightly tight tracking.

## Palette

The Fold palette is paper and charcoal. Amber is a functional UI accent, not a brand colour. Hex values live in [`fold-tokens.css`](fold-tokens.css); this page is the meaning.

### Neutrals

| Token          | Hex       | Use                                |
| -------------- | --------- | ---------------------------------- |
| `ink`          | `#0A0A0A` | Mono mark, text on light           |
| `charcoal-950` | `#121212` | App background (matches the shell) |
| `charcoal-900` | `#1A1A1A` | Panels, sidebar                    |
| `charcoal-800` | `#242424` | Elevated cards, app icon tile      |
| `charcoal-700` | `#333333` | Borders, dividers                  |
| `fog`          | `#A8A29E` | Muted text, inactive               |

### Paper

| Token         | Hex       | Use                                      |
| ------------- | --------- | ---------------------------------------- |
| `paper-100`   | `#F5F0E8` | Primary paper (mark face, light mode bg) |
| `paper-200`   | `#E8E0D4` | Fold shade mid                           |
| `paper-300`   | `#D4C9B8` | Fold shade deep, taupe wing              |
| `paper-white` | `#FAFAF8` | Pure highlight, `#05` stills             |

The flat mark (`#10`) uses only `paper-100`, `paper-200`, `paper-300` on `charcoal-800`. The cream mark (`#01`) uses the same hues plus grain and soft warm shadow.

### Passenger (activity mark)

The chrome loading mark is a drawn passenger, not the `#07` silhouette. Two colours only. They do not invert in light mode — the creature stays cream on navy.

| Token             | Hex       | Use                          |
| ----------------- | --------- | ---------------------------- |
| `passenger-cream` | `#EDE3C4` | Egg body, working disc       |
| `passenger-navy`  | `#163A5F` | Eyes, smile, drawn line work |

### Accents (functional only)

| Token    | Hex (dark) | Hex (light) | Use                                        |
| -------- | ---------- | ----------- | ------------------------------------------ |
| `signal` | `#E8B33D`  | `#8C6110`   | Primary buttons, focus ring, "live" status |
| `fly`    | `#3D9B6E`  | `#3D9B6E`   | Success, landed                            |
| `crash`  | `#C45C5C`  | `#C45C5C`   | Errors only                                |

On `signal`, label text is `ink` in dark mode and `paper-white` in light mode.

Rules:

- Logo and brand chrome stay paper + charcoal.
- Amber (`signal`) is for UI signal. Buttons, focus rings, "live" indicators. Not identity.
- Errors use `crash` on UI chrome only. Never paint the plane red.

### Optional wink

| Token       | Hex                         | Use                                         |
| ----------- | --------------------------- | ------------------------------------------- |
| `supa-soft` | `#3ECF8E` at 10-15% opacity | Hover glows, selection, "local-first" badge |

`supa-soft` is a wink to the Supabase lineage, not a brand colour. Use sparingly.

## Typography

Geometric sans for product UI. Mono for logs and code.

| Role        | Family         | Weight            |
| ----------- | -------------- | ----------------- |
| Product UI  | Inter          | 400 / 500 / 600   |
| Wordmark    | Inter          | 500, -1% tracking |
| Logs / code | JetBrains Mono | 400 / 500         |

Wordmark rules:

- Medium weight, slightly tight tracking.
- Sentence case: "Supaplane", not "SUPAPLANE" or "supaplane".
- Sits beside the mark with a 1x mark-height gap.
- In product chrome, use `#07` next to it. In marketing hero, use `#01` or `#05`.

## Surfaces and corners

| Surface                | Background                                 | Corner radius                       |
| ---------------------- | ------------------------------------------ | ----------------------------------- |
| App                    | `charcoal-900` over `charcoal-950`         | 8-12 px                             |
| Panels                 | `charcoal-800` over `charcoal-900`         | 8 px                                |
| Buttons                | `signal` filled, `paper-100` ghost         | 8 px                                |
| App icon tile          | `charcoal-800`                             | 16-20% of tile side                 |
| Cards                  | `charcoal-800`, 1 px `charcoal-700` border | 12 px                               |
| Mark badges (stickers) | n/a (image)                                | rounded rectangle or circle die-cut |

The fold metaphor shows up in micro-motion (see below), not in corner shapes. Corners stay geometric.

## Sticker system

The sticker system is the identity layer. It is how harness, human, and SOUL identity are expressed on the shared chassis.

### Finish

- **Matte.** Default. Soft print, no shine. Used for harness badges (Claude, Codex, Gemini, OpenCode, Cursor).
- **Foil.** Holographic rainbow sheen. Premium / pro / favourite / SOUL rare drops. Visible at any size.
- **Mixed.** Both finishes on one plane. Tasteful and sparse, not sticker bomb.

### Placement zones

| Zone    | Purpose                    | Notes                                        |
| ------- | -------------------------- | -------------------------------------------- |
| Nose    | Primary harness badge      | Most prominent. ~25-30% of plane length.     |
| Wing    | Secondary harness or trait | One or two. Always clear of the fold line.   |
| Spine   | Status strip / trail       | Long thin foil tape. Crash state shows here. |
| Cluster | Custom SOUL personality    | 3+ stickers across the upper wing. Rare.     |

### Density

- **Sparse.** One sticker (typically foil on nose). Clean default agent.
- **Medium.** Two stickers (matte + foil, or two matte). Configured agent.
- **Dense.** Three to five stickers, mixed finishes. Custom SOUL plane. No more than five.

### Status as posture

| State     | Posture                                            | Mark         |
| --------- | -------------------------------------------------- | ------------ |
| Flying    | Level, faint motion lines                          | none         |
| Formation | Slight tilt, two faint wingmen                     | none         |
| Landed    | Flat on ground, green check near badge             | `fly` chip   |
| Crashed   | Wing tip crumpled, dipped nose, badge still on top | `crash` chip |

Crash never repaints the plane. The badge stays. Posture and chip colour do the work.

### Avatar / rider tokens

The badge that sits on the plane follows a fixed composition model:

- **Chassis.** Plane silhouette, paper colour, fixed.
- **Rider.** Either an official harness mark, a human avatar, or a SOUL mascot. The rider sits at the nose zone, ~25-30% of plane length.
- **Optional wing.** Secondary trait. Only on configured or dense planes.

Legal: only render official marks where the trademark permits. Fall back to monogram tiles (e.g. `C` for Claude, `X` for Codex) when uncertain.

## Motion

Motion is small and paper-like.

- **Default duration.** 120-180 ms.
- **Easing.** `cubic-bezier(0.22, 1, 0.36, 1)` (ease-out).
- **Fold.** Panel open. Scale from `0.96` to `1.00` plus 2° rotate. 160 ms.
- **Land.** Success. Plane tilts up 4°, then settles. 220 ms.
- **Crash.** Plane tilts down 8°, wing tip crumples in (SVG path morph). 260 ms.
- **Sticker apply.** Pop in: scale `0.6` to `1.0`, slight `rotate(-3deg)` to `0`, 140 ms with a soft bounce.
- **Activity mark.** Idle is the passenger egg (`passenger-cream` body, `passenger-navy` face). Eyes blink on a 5 s ease-in-out — `scaleY` only, never the body. Working lets the face go: cream disc, `fog` ring at 70%, `signal` moon on a 1.2 s linear rotor. The egg never spins. `prefers-reduced-motion` freezes the blink and the moon. Status tone lives on the chip, not the mark.

No spinning logos. No shimmer on the brand mark. The only thing that turns is the activity-mark moon. Plane motion is folding, landing, or being stuck with a sticker.

## Light and dark

The system inverts cleanly.

- **Dark (default).** `charcoal-*` background, `paper-*` mark and text. The default product surface.
- **Light.** `paper-100` background, `ink` mark, `charcoal-900` text. `#07` mono wins here. Used for marketing, docs, light-mode preference.

In dark, accent amber is `signal` (`#E8B33D`). In light, use the deeper amber (`#8C6110`) so label contrast stays at least 4.5:1.

## The Cast (passenger family)

The passengers are a rigged, procedural family modelled on the approved family sheet. The activity mark's egg is their resting form; landing pages, onboarding and marketing use the full cast.

- **Construction.** Body and legs are one gooey silhouette (blur/threshold); arms are thick, even sausages with broad round tips that bulge out of the body as rounded shoulders; the `passenger-navy` crease starts at the armpit, runs along the inner edge and stops short of the tip.
- **Colours.** Product surfaces: `passenger-cream` + `passenger-navy` only. Marketing may use the cast palettes (navy/cream, cream/navy, bronze, charcoal, sky, dusk).
- **Motion.** IK arms reach hand targets, legs step and plant, the body squashes and leans, and every pose value runs through a damped spring so actions blend with follow-through. 19 actions (idle, walk, run, hop, wave, cheer, jump, dance, love, shy, think, sad, surprised, scared, grumpy, sleepy, laugh, dizzy, throw plane), 6 props (suitcase, plane, balloon, coffee, backpack, passport), 4 hats (cap, pilot, shades, beanie).
- **Hats.** A navy crown on navy disappears — crowns get a cream rim (`hatfill`) so they read as hats.
- **Where it lives.** `@echohello/cast` (`packages/cast`) is the rig; `bun run --cwd packages/cast dev` runs the playground (family, variants, rig lab, parade, pose sheet). Design file: the Supaplane Figma file carries tokens, passenger variants, and the family / parade / pose-sheet compositions.

## Components

The components are minimal and rely on token, sticker, and mark primitives.

### Activity mark

- Idle: tall `passenger-cream` egg, `passenger-navy` dots and U-smile. No arms at 16 px.
- Working: cream disc, `fog` ring, `signal` moon. See Motion.
- Never recolour the egg for status. The chip carries tone.

### Status chip

- Background: `charcoal-800`.
- Text: `paper-100` body, `fog` for time stamps.
- Status dot: `fly` for landed, `signal` for live, `crash` for error.
- Padding: 6 px vertical, 10 px horizontal.
- Radius: 8 px.

### Button

- **Primary.** Background `signal`, text `ink` (dark) or `paper-white` (light). 8 px radius. Minimum height 44 px.
- **Ghost.** Border `charcoal-700`, text `paper-100`. 8 px radius.
- **Hover.** Background +6% lightness, 120 ms.
- **Focus.** 2 px outer ring `signal` at 60% opacity.

### Sidebar item

- Default: `charcoal-900`, `paper-100` text.
- Hover: `charcoal-800`.
- Selected: left 2 px `signal` bar, `paper-100` text, mono plane icon at 18 px (`#07`).
- Trailing meta: `fog` text, 12 px.

### Empty state

- Product chrome (sidebar, transcript) uses the idle activity mark at 28–32 px, not `#01`.
- Marketing empty states may still use a single `#01` plane (or `#10` flat if size is constrained) on `charcoal-900`.
- Title in `paper-100`, body in `fog`, primary CTA in `signal`.
- No illustration spam. One mark, one message.

## Avatar / rider identity

Agents and humans use the same visual language.

- Same plane chassis, always.
- A coloured tile badge sits on the nose zone (matte by default, foil if "favourite" or "rare").
- Sidebar lists show the plane + rider at 18 px.
- Fleet view (formation) shows them at 32 px or larger.

Avoid:

- Different shapes for human vs agent.
- Recoloured planes (the chassis is always paper).
- Cartoon avatars. The plane is the avatar; the rider is the sticker.

## Forbidden patterns

- Cyan sky gradient as a brand colour.
- Metallic silver, chrome, sci-fi glow.
- Rainbow logo (gradients across the whole mark).
- Recolouring the paper plane to mean "this is Codex" or "this is Claude".
- Painting the plane red for crashes.
- Drop shadow under the brand mark in product chrome (shadows are for premium stills and hero only).
- Tailwind palette defaults. Use the tokens above, exported as CSS custom properties and Tailwind theme keys.

## Reference inventory

Locked images, all under `System/Attachments/supaplane-logo/` in the operator's Obsidian vault:

- **Core marks 01-10.** Photoreal cream, monoline sage, fleet illustration, soul mascot, premium isometric, flat 2D, flat mono, Cursor-style 2.5D, flat facets black, flat cream app icon.
- **Design system ex-01-05.** Colour palette board, logo usage, dark/light UI, agent liveries (superseded by sticker system), mark hierarchy.
- **Identity / badges ex-06-13.** Badge grid, fleet marketing, formation UI, identity socket, wrong vs right, SOUL wizard, status posture, fleet sky.
- **Stickers ex-14-22.** Formation with stickers, sparse vs dense, sticker sheet, matte/foil/mixed, macro stickers, foil close-up, placement zones, icon row, customizer UI.
- **`remix/`** (16 images). Paper / jet hybrid explorations.
- **`aero/`** (71 images). Aero / FIDS / colour grid explorations.

For the locked brand, prefer the root set. Treat `remix/` and `aero/` as source material for future variants, not as canon.

## Implementation

The [Figma file](https://www.figma.com/design/1NrT8IG0Td40yzapRGVwPY/Supaplane) is the visual source. Implement from Foundations, Components, and the current desktop/mobile screens. Do not implement from Archive.

| Surface                                | Source                                                                 |
| -------------------------------------- | ---------------------------------------------------------------------- |
| CSS custom properties + Tailwind theme | [`fold-tokens.css`](fold-tokens.css) via `packages/web/src/styles.css` |
| React Native                           | `packages/app/src/theme.ts`                                            |
| Web chrome                             | `packages/web/src/components/`                                         |
| Native primitives                      | `packages/app/src/components/Button.tsx`, `TextField.tsx`              |

Desktop ≥1280: 288 px workspace rail, flexible transcript, inspection pane about 360–430 px. 768–1279: conversation first, drawers for navigation and inspection. Mobile <768: one route, 16–24 px gutters, controls ≥44 px. Transcripts scroll independently; do not scale the whole desktop UI down to fit.

## Cross-references

- [`brand-prompt.md`](brand-prompt.md) — short brand description, paste-ready.
- [`architecture.md`](architecture.md) — package and run-time topology; surfaces the design system serves.
- [`providers.md`](providers.md) — where rider identity (harness badges) come from.
- Build-research notes in the operator's Obsidian vault (`Notes/2026-07-08 - Supaplane Naming, Identity, and Setup Decisions.md`) — the full reasoning behind the Fold system.

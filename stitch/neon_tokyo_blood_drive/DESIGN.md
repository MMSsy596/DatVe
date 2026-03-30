# Design System Specification: Redacted Noir

## 1. Overview & Creative North Star: "The Crimson Monolith"
This design system moves away from the playful neon of the past toward a "Crimson Monolith" aesthetic—a high-contrast, cinematic experience that feels aggressive yet indisputably premium. The North Star is **Cinematic Brutalism**: a style characterized by massive typography, pitch-black voids, and light that doesn't just "glow," but bleeds into the darkness.

To break the "template" look, we abandon traditional symmetry. Layouts should favor intentional "weighted" imbalances, where a heavy display element on the left is balanced by vast negative space on the right. Overlapping elements—such as typography cutting into image containers—are encouraged to create a sense of depth and architectural tension.

## 2. Colors & Tonal Depth
The palette is a study in darkness. By utilizing a "Pitch Black" foundation, we allow the deep reds to carry an emissive quality, as if the UI is back-lit by a failing reactor or a late-night street scene.

### The Palette (Material Design 3 Mapping)
*   **Surface (Base):** `#131313` – The void.
*   **Primary:** `#FFB4A8` (Lightest Red for text/highlights) | **Primary Container:** `#CC0000` (The core Deep Red).
*   **Secondary Container:** `#8F0F07` (The Darker Crimson accent).
*   **Surface Containers:**
    *   `Lowest`: `#0E0E0E` (Used for "inset" areas)
    *   `High`: `#2A2A2A` (Used for "elevated" panels)
*   **On-Surface:** `#E5E2E1` (Off-white for readability, never pure white).

### The "No-Line" Rule
**Explicit Instruction:** You are prohibited from using 1px solid borders to define sections. In this system, boundaries are created through *Tonal Transition*. A section is defined by moving from `surface` (#131313) to `surface-container-low` (#1c1b1b). If a boundary feels too soft, increase the contrast between the two background tokens; do not add a stroke.

### The "Glass & Gradient" Rule
To achieve a premium feel, avoid flat blocks of red. Use linear gradients for primary CTAs: `primary-container` (#CC0000) transitioning to `secondary-container` (#8F0F07) at a 135-degree angle. For floating overlays, use `surface-container-highest` at 70% opacity with a `24px` backdrop blur.

## 3. Typography: Retro-Futurist Authority
We pair the technical precision of **Sora** (referred to here as *Space Grotesk* for display) with the humanist balance of **Manrope**.

*   **Display (Space Grotesk):** Set with tight letter-spacing (-0.05em). These are the "Monoliths" of your page. Use `display-lg` (3.5rem) to dominate the viewport.
*   **Headline (Space Grotesk):** High contrast. Always use `on-surface` or `primary` for headlines.
*   **Body (Manrope):** All functional text is Manrope. It provides a grounded, readable counterpoint to the aggressive display faces.
*   **Label (Space Grotesk):** Used for "System Data"—all-caps, tracked out (+0.1em) to feel like a HUD (Heads-Up Display).

## 4. Elevation & Depth: Tonal Layering
In a "Pitch Black" environment, traditional shadows are invisible. Therefore, we use **Light Leakage** and **Tonal Stacking**.

*   **The Layering Principle:** Instead of a shadow, an elevated card should be a lighter grey (`surface-container-high`) than the background.
*   **The Red Glow (Emissive Depth):** To signify the highest level of importance or an active state, apply a "Deep Red Glow." This is a `box-shadow` or `drop-shadow`: `0px 0px 30px rgba(204, 0, 0, 0.4)`. It should look like light hitting a foggy window.
*   **The "Ghost Border" Fallback:** If a layout requires a hard edge for accessibility, use the `outline-variant` (#5E3F3A) at **15% opacity**. It should be felt, not seen.

## 5. Components

### Buttons
*   **Primary:** Sharp 0px corners. Gradient fill (`primary-container` to `secondary-container`). Text is `on-primary-fixed` (Dark Red) for a "burned-in" look. 
*   **Tertiary:** No background. `primary` text. On hover, a subtle `0.5px` underline emerges from the center.

### Cards
*   **Styling:** Sharp 0px corners. No borders. Use `surface-container-lowest` for the card body. 
*   **Interaction:** On hover, the background shifts to `surface-container-high` and a subtle red "light leak" (2px solid left-border in `primary`) appears.

### Input Fields
*   **The HUD Style:** Underline only. Use `outline-variant` as the base line. When focused, the line turns `primary` (#FFB4A8) and emits a soft red glow.

### Lists & Dividers
*   **Forbid Dividers:** Do not use horizontal lines. Use the **Spacing Scale** (Step 8 or 12) to create "Voids" between content chunks. White space is your divider.

### Additional Component: "The Status Pulse"
A custom component for this system. A small 4px dot in `primary` with a concentric, breathing red animation. Use this to indicate "Live" data or active connectivity, reinforcing the retro-futuristic HUD vibe.

## 6. Do’s and Don’ts

### Do:
*   **Embrace the Dark:** Use `surface-container-lowest` (#0E0E0E) for large sections to make the red elements pop.
*   **Use Asymmetry:** Place a large headline on the far left and a small "HUD Label" on the far right.
*   **Tighten Spacing:** Use the `0.5` (0.125rem) spacing token for micro-adjustments in typography to create a high-density, technical look.

### Don't:
*   **Don't use Rounded Corners:** Every radius must be `0px`. Roundness kills the aggressive, cinematic tone.
*   **Don't use Pink:** Ensure all glows are sampled from `#CC0000`. If it looks pink, increase the saturation and decrease the lightness.
*   **Don't Center Everything:** Centered layouts feel like generic templates. Stick to strong vertical alignments on the grid edges.
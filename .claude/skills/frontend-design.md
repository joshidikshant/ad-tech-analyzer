---
name: frontend-design
description: Create distinctive, production-grade frontend interfaces with high design quality. Use this skill when the user asks to build web components, pages, or applications. Generates creative, polished code that avoids generic AI aesthetics.
triggers:
  - "design the dashboard"
  - "redesign the UI"
  - "improve the frontend"
  - "create a component"
  - "build a page"
  - "make it look better"
---

This skill guides creation of distinctive, production-grade frontend interfaces that avoid generic "AI slop" aesthetics. Implement real working code with exceptional attention to aesthetic details and creative choices.

The user provides frontend requirements: a component, page, application, or interface to build. They may include context about the purpose, audience, or technical constraints.

## Design Thinking

Before coding, understand the context and commit to a BOLD aesthetic direction:
- **Purpose**: What problem does this interface solve? Who uses it?
- **Tone**: Pick an extreme: brutally minimal, maximalist chaos, retro-futuristic, organic/natural, luxury/refined, playful/toy-like, editorial/magazine, brutalist/raw, art deco/geometric, soft/pastel, industrial/utilitarian, etc. There are so many flavors to choose from. Use these for inspiration but design one that is true to the aesthetic direction.
- **Constraints**: Technical requirements (framework, performance, accessibility).
- **Differentiation**: What makes this UNFORGETTABLE? What's the one thing someone will remember?

**CRITICAL**: Choose a clear conceptual direction and execute it with precision. Bold maximalism and refined minimalism both work - the key is intentionality, not intensity.

Then implement working code (HTML/CSS/JS, React, Vue, etc.) that is:
- Production-grade and functional
- Visually striking and memorable
- Cohesive with a clear aesthetic point-of-view
- Meticulously refined in every detail

## Frontend Aesthetics Guidelines

Focus on:
- **Typography**: Choose fonts that are beautiful, unique, and interesting. Avoid generic fonts like Arial and Inter; opt instead for distinctive choices that elevate the frontend's aesthetics; unexpected, characterful font choices. Pair a distinctive display font with a refined body font.
- **Color & Theme**: Commit to a cohesive aesthetic. Use CSS variables for consistency. Dominant colors with sharp accents outperform timid, evenly-distributed palettes.
- **Motion**: Use animations for effects and micro-interactions. Prioritize CSS-only solutions for HTML. Use Motion library for React when available. Focus on high-impact moments: one well-orchestrated page load with staggered reveals (animation-delay) creates more delight than scattered micro-interactions. Use scroll-triggering and hover states that surprise.
- **Spatial Composition**: Unexpected layouts. Asymmetry. Overlap. Diagonal flow. Grid-breaking elements. Generous negative space OR controlled density.
- **Backgrounds & Visual Details**: Create atmosphere and depth rather than defaulting to solid colors. Add contextual effects and textures that match the overall aesthetic. Apply creative forms like gradient meshes, noise textures, geometric patterns, layered transparencies, dramatic shadows, decorative borders, custom cursors, and grain overlays.

NEVER use generic AI-generated aesthetics like overused font families (Inter, Roboto, Arial, system fonts), cliched color schemes (particularly purple gradients on white backgrounds), predictable layouts and component patterns, and cookie-cutter design that lacks context-specific character.

Interpret creatively and make unexpected choices that feel genuinely designed for the context. No design should be the same. Vary between light and dark themes, different fonts, different aesthetics. NEVER converge on common choices (Space Grotesk, for example) across generations.

**IMPORTANT**: Match implementation complexity to the aesthetic vision. Maximalist designs need elaborate code with extensive animations and effects. Minimalist or refined designs need restraint, precision, and careful attention to spacing, typography, and subtle details. Elegance comes from executing the vision well.

Remember: Claude is capable of extraordinary creative work. Don't hold back, show what can truly be created when thinking outside the box and committing fully to a distinctive vision.

---

## Project-Specific Aesthetic Direction: Ad-Tech Analyzer

For the **ad-tech-analyzer** project, the established aesthetic is **Cyberpunk Data Forensics**:

### Visual Identity
- **Theme**: Dark, technical, investigator/forensics aesthetic
- **Mood**: Professional hacker discovering hidden advertising systems
- **Metaphor**: Digital forensics lab analyzing web traces
- **Differentiation**: NOT generic dark mode - Matrix meets data visualization dashboard

### Typography System
```
Display: Orbitron (700, 900) - Headlines, metrics, section titles
Body: DM Sans (400, 500, 600) - Descriptions, labels, paragraphs
Code: JetBrains Mono (400, 500) - URLs, vendor names, technical data, JSON
```

### Color Palette
```css
/* Background */
--color-bg-primary: #0a0e14 (deep space black)
--color-bg-secondary: #121820 (cards)
--color-bg-tertiary: #1a2332 (elevated surfaces)

/* Electric Accents */
--color-accent-primary: #00ff9f (neon green - primary actions)
--color-accent-secondary: #00d4ff (cyan - secondary highlights)
--color-accent-tertiary: #ff00ff (magenta - alerts/special)

/* Text */
--color-text-primary: #e6edf3
--color-text-secondary: #8b949e
--color-text-tertiary: #6e7681

/* Data Visualization (7 chart colors) */
--color-chart-1: #00ff9f (header bidding)
--color-chart-2: #00d4ff (SSPs)
--color-chart-3: #ff00ff (managed services)
--color-chart-4: #ffaa00 (analytics)
--color-chart-5: #ff4d6d (identity)
--color-chart-6: #7c3aed (ad servers)
--color-chart-7: #8b949e (other)
```

### Key Visual Characteristics
- High-contrast dark theme (deep blacks with electric accents)
- Glassmorphism cards with glowing borders
- Terminal-style data displays
- Monospace fonts for technical data
- Grid overlays and scan-line effects
- Pulsing/glowing active states
- Animated data streams and radar scanners

### Reusable Components
- **GlowCard**: Glassmorphism card with animated glowing border
- **MetricDisplay**: Animated counter with Orbitron font and glow effect
- **DataBadge**: Cyberpunk-styled badge for vendor names/categories
- **ScannerLoader**: Radar-style loading animation

### Animation Strategy
- **Page Load**: Header slides down, cards stagger in from bottom
- **Micro-interactions**: Hover scales + brightness, button glow intensifies
- **Data**: Count-up animations for metrics, chart draw-in animations
- **Loading**: Radar scanner with pulsing concentric circles

### Design Principles for This Project
1. **Data-dense but readable**: Use monospace for technical details, generous spacing
2. **Electric accents**: Neon green/cyan as primary colors, not decorative
3. **Investigative feel**: Terminal aesthetics, forensic precision
4. **Performance awareness**: Reduce motion for accessibility, optimize animations
5. **Dark always**: This is a dark-only interface, no light mode

### What to Avoid
- Generic dark mode with gray/white
- Rounded corners everywhere (use sparingly)
- Soft, pastel colors (this is high-contrast cyberpunk)
- Overuse of shadows (use glow effects instead)
- Light backgrounds or light text on dark (stick to established palette)

---

## Usage Examples

When user says:
- "Design a new metrics dashboard" → Use GlowCard, MetricDisplay components with established color system
- "Create a vendor list component" → Use DataBadge with monospace fonts, grid layout, hover effects
- "Add a chart for bid analytics" → Dark background, neon chart colors, glassmorphism tooltip
- "Build a loading state" → Use ScannerLoader or create similar radar/terminal-style animation

Always reference the established CSS variables, components, and aesthetic direction for consistency across the project.

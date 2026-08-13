Layout & Theme Overview:
Create a modern, dark-themed quiz game interface ("Pinguim Inteligente") inspired by high-stakes trivia shows. The overall aesthetic is dark slate/charcoal with clean cyan/neon blue accent highlights, subtle glows, and rounded UI components.

1. Navigation Bar (Top Bar)
Background: Very dark charcoal/black (#0d1117 or #12161f) with a full-width bottom border.

Left Section:

App logo: Square badge with rounded corners featuring a penguin icon in a graduation cap.

App Title: Pinguim Inteligente in bold white sans-serif.

Active Tab Underline: A bright cyan accent line under the branding area.

Center Navigation:

Nav links: PLAY (Active - bright cyan color), LEADERBOARD (Muted gray), ACHIEVEMENTS (Muted gray). Uppercase, monospace or crisp sans-serif font.

Right Section:

Score Display: Small top label HIGH SCORE in muted cyan, below it 1,240 pts in bold cream/yellowish typography.

User Profile Icon: Circular avatar icon on the far right.

2. Status Bar & Progress Indicator
Container: Positioned directly above the main question card.

Left Status:

Small avatar thumbnail on the left.

Text block: Muted uppercase label RODADA, bold white main text Pergunta 7/10.

Right Status:

Text block aligned to right: Muted uppercase label PRÊMIO ATUAL, bold gold/yellow text R$ 1.000.000.

Progress Bar:

Full-width thin horizontal bar underneath the status metrics.

Filled state: Bright cyan line representing 70% progress (7/10).

Unfilled state: Dark gray track.

3. Main Question & Options Card
Main Card Container:

Centered layout with dark slate background (#161b22 / #1c212d), rounded corners (border-radius: 16px), subtle outer drop-shadow.

Question Text:

Centered, clean white text (#ffffff), font-size approx 20px-22px, line-height 1.5.

Text content: "Qual foi o nome dado pelos portugueses ao Brasil logo após a sua descoberta?"

Answers Grid:

2x2 grid layout (display: grid; grid-template-columns: 1fr 1fr; gap: 16px;).

Option Buttons:

Dark gray background (#21262d), subtle border, hover state with border/background highlight.

Left Badge: Darker square box containing uppercase option letters (A, B, C, D) in bold white.

Label Text: Left-aligned white text alongside the badge (e.g., Terra de Santa Cruz, Ilha de Vera Cruz, Nova Lusitânia, Pindorama).

4. Footer
Background: Dark, matching the header.

Left Section: Monospace text with snowflake/ice icon: ❄ Scientific Arctic Research Project.

Center Links: Uppercase text links: SUPPORT PRIVACY.

Right Section: Copyright notice: © 2024 PINGUIM INTELIGENTE.

Color Palette Summary for CSS Variables:
CSS
:root {
  --bg-dark: #0b0e14;
  --card-bg: #161b26;
  --btn-bg: #212836;
  --text-main: #ffffff;
  --text-muted: #8b949e;
  --accent-cyan: #00d2ff;
  --accent-gold: #f5c518;
}
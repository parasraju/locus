---
version: alpha
name: Claude Calm Editorial
description: A minimal, high-trust AI product system with warm neutrals, restrained contrast, and refined serif-led typography.
colors:
  primary: "#141413"
  primary-contrast: "#FAF9F5"
  secondary: "#30302E"
  tertiary: "#D1CFC5"
  neutral: "#FAF9F5"
  surface: "#FFFFFF"
  on-surface: "#141413"
  muted: "#6A6861"
  border: "#D1CFC5"
  border-soft: "#D9775733"
  accent: "#000000"
  error: "#B42318"
typography:
  headline-display:
    fontFamily: "Anthropic Serif"
    fontSize: "44px"
    fontWeight: 330
    lineHeight: 1.2
    letterSpacing: "0px"
  headline-lg:
    fontFamily: "Anthropic Serif"
    fontSize: "35px"
    fontWeight: 330
    lineHeight: 1.2
    letterSpacing: "0px"
  headline-md:
    fontFamily: "Anthropic Serif"
    fontSize: "27px"
    fontWeight: 330
    lineHeight: 1.33
    letterSpacing: "0px"
  headline-sm:
    fontFamily: "Anthropic Sans"
    fontSize: "22px"
    fontWeight: 330
    lineHeight: 1.18
    letterSpacing: "0px"
  body-lg:
    fontFamily: "Anthropic Serif"
    fontSize: "17px"
    fontWeight: 330
    lineHeight: 1.6
    letterSpacing: "0px"
  body-md:
    fontFamily: "Anthropic Sans"
    fontSize: "17px"
    fontWeight: 400
    lineHeight: 1.5
    letterSpacing: "0px"
  body-sm:
    fontFamily: "Anthropic Sans"
    fontSize: "15px"
    fontWeight: 400
    lineHeight: 1.45
    letterSpacing: "0px"
  label-lg:
    fontFamily: "Anthropic Sans"
    fontSize: "17px"
    fontWeight: 600
    lineHeight: 1.2
    letterSpacing: "0px"
  label-md:
    fontFamily: "Anthropic Sans"
    fontSize: "15px"
    fontWeight: 600
    lineHeight: 1.2
    letterSpacing: "0px"
  label-sm:
    fontFamily: "Anthropic Sans"
    fontSize: "12px"
    fontWeight: 600
    lineHeight: 1.2
    letterSpacing: "0.02em"
  caption:
    fontFamily: "Anthropic Sans"
    fontSize: "13px"
    fontWeight: 400
    lineHeight: 1.35
    letterSpacing: "0px"
rounded:
  none: 0px
  sm: 4px
  md: 10px
  lg: 24px
  xl: 32px
  full: 9999px
spacing:
  xs: 8px
  sm: 16px
  md: 24px
  lg: 32px
  xl: 82px
  gutter: 24px
  section: 82px
components:
  button-primary:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.primary-contrast}"
    typography: "{typography.label-md}"
    rounded: "{rounded.md}"
    padding: "14px 20px"
    size: "auto"
    height: "44px"
  button-primary-hover:
    backgroundColor: "{colors.secondary}"
    textColor: "{colors.primary-contrast}"
    rounded: "{rounded.md}"
  button-secondary:
    backgroundColor: "{colors.neutral}"
    textColor: "{colors.on-surface}"
    typography: "{typography.label-md}"
    rounded: "{rounded.md}"
    padding: "14px 20px"
    height: "44px"
  button-secondary-hover:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.on-surface}"
    rounded: "{rounded.md}"
  button-link:
    backgroundColor: "transparent"
    textColor: "{colors.secondary}"
    typography: "{typography.body-md}"
    rounded: "{rounded.none}"
    padding: "0px"
  card:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.on-surface}"
    rounded: "{rounded.lg}"
    padding: "32px"
  input:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.on-surface}"
    typography: "{typography.body-md}"
    rounded: "{rounded.md}"
    padding: "14px 16px"
  chip:
    backgroundColor: "{colors.neutral}"
    textColor: "{colors.on-surface}"
    typography: "{typography.label-sm}"
    rounded: "{rounded.full}"
    padding: "8px 12px"
---

# Claude Calm Editorial

## Overview
Claude’s visual language is restrained, intelligent, and quietly premium. The interface feels spacious and editorial rather than dense or highly technical, which supports a trustworthy AI product aimed at broad professional use. The emotional tone is calm and refined, with subtle warmth coming from the off-white background and soft borders.

## Colors
- **Primary (#141413):** A deep near-black used for main headlines, primary actions, and high-emphasis UI text. It provides strong contrast without feeling harsh.
- **Primary contrast (#FAF9F5):** The warm paper-like light tone used on dark buttons and against dark text for a soft, approachable feel.
- **Secondary (#30302E):** A softer charcoal used for navigation text, link-like labels, and secondary emphasis. It keeps the interface legible while avoiding full black everywhere.
- **Tertiary (#D1CFC5):** A muted beige-gray used for borders, dividers, and neutral control outlines. It reinforces the quiet, minimal aesthetic.
- **Neutral (#FAF9F5):** The dominant background color across the site, creating an airy, low-contrast canvas.
- **Surface (#FFFFFF):** Used for cards and inset UI surfaces to distinguish content blocks from the warm page background.
- **On-surface (#141413):** The primary text color on cards and light surfaces, balancing clarity with elegance.
- **Muted (#6A6861):** Appropriate for helper text, metadata, and subtle captions where the content should recede.
- **Border (#D1CFC5):** The default line color for inputs, cards, and secondary buttons.
- **Border soft (#D9775733):** A very subtle tinted border used to keep elevated cards visible without adding heavy shadows.
- **Accent (#000000):** A pure black reserve for the strongest contrast moments, such as cursor-like highlights or ultra-bold accents.
- **Error (#B42318):** Reserved for validation states and destructive feedback, though the observed interface keeps error usage minimal.

## Typography
Two custom families define the system: Anthropic Serif for editorial headings and Anthropic Sans for functional UI text. Headings use an unusually light weight of 330, which gives the large type a graceful, literary quality instead of a heavy SaaS look. Body text is split between serif-led prose for marketing copy and sans-serif for controls, navigation, and utility text.

- **Headline display / lg / md:** Large serif headlines, set with tight but readable leading and no extra letter spacing. These are meant for hero statements and section introductions.
- **Headline sm:** A slightly smaller sans-serif headline style for UI-adjacent headings where structure matters more than drama.
- **Body lg:** Serif body copy for marketing lines and explanatory content; it feels calm and premium.
- **Body md / sm:** Sans-serif body styles for navigation, buttons, forms, and supportive text.
- **Label lg / md / sm:** Stronger sans labels for buttons and small controls. The smaller label uses a slight positive letter spacing for clarity at low sizes.
- **Caption:** Supporting microcopy and disclaimers, especially beneath forms and cards.

## Layout & Spacing
The layout is a wide, centered hero composition with generous negative space and a fixed-feeling editorial balance. Content blocks are separated by large vertical breathing room, and the spacing rhythm is based on clear steps of 8px, 16px, 24px, 32px, and a large 82px section scale. Cards and controls use comfortable internal padding rather than dense packing, which keeps the interface feeling calm and intentional.

Navigation sits in a single horizontal bar with compact spacing, while the main hero uses a two-column arrangement that allows the headline and signup card to breathe against the large illustrative panel. Section padding should stay generous, and containers should avoid feeling overly constrained or boxed in.

## Elevation & Depth
Depth is handled subtly rather than theatrically. The system relies on white surfaces, soft warm borders, and very light shadows to separate layers. Shadows are minimal and diffuse, so elevation reads as a gentle lift instead of a strong floating effect.

Use borders and tonal contrast as the primary hierarchy tool. Cards should feel lightly embossed on the background, while primary buttons rely on solid fill contrast instead of shadow.

## Shapes
The shape language is soft and modern, with rounded corners that stay consistent across major surfaces. Small controls use a modest 10px radius, while larger cards expand to 24px for a friendlier, more spacious feel. Pills and segmented controls should use fully rounded ends for a polished, approachable appearance.

## Components
- **Buttons:** Primary buttons should use `button-primary` with a dark fill, light text, 14px vertical and 20px horizontal padding, and a 44px height. Secondary buttons should use `button-secondary` with a light neutral background and a soft border feel. Link buttons should remain unboxed and underlined for low-emphasis actions.
- **Button states:** Hover states should shift subtly, not dramatically. The system favors color softening and contrast preservation over motion-heavy interaction changes.
- **Cards:** Use `card` for signup panels, feature modules, and content containers. Cards should have a white background, 24px radius, 32px padding, and a delicate border plus low shadow.
- **Inputs:** Inputs should match the calm surface language with a light border, 10px radius, and comfortable padding. Keep focus states clean and visible without introducing harsh outlines.
- **Chips:** Chips should feel compact and pill-like, using `chip` with full rounding and soft neutral fill.
- **Navigation links:** Top-level nav items are understated, using sans-serif labels with medium emphasis and no heavy decoration.
- **Forms and helper text:** Supporting copy should stay small, muted, and readable; legal text should never compete with the primary action.

## Do's and Don'ts
- Do keep the interface airy and editorial, with generous whitespace around key marketing content.
- Do use the serif headlines for brand storytelling and the sans-serif family for actions, nav, and utility UI.
- Do prefer soft borders and tonal surfaces over hard shadows or loud separators.
- Do keep buttons simple: solid dark primary, light secondary, and minimal link styling.
- Don't introduce saturated colors or bright gradients that break the calm, monochrome-first palette.
- Don't use heavy corner rounding on small controls; reserve the largest radii for cards and pills.
- Don't make shadows prominent or layered; depth should feel subtle and refined.
- Don't crowd layouts with dense blocks of text or tightly stacked components.
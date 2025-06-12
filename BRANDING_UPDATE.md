# AptlySaid Branding Update

This document outlines the complete rebranding from WellSaid to AptlySaid.

## Brand Overview

- **Brand Name:** AptlySaid
- **Tagline:** Your brand's voice, perfected.
- **Domain:** aptlysaid.com

## Visual Identity

### Logo
- **Icon:** Stylized chat bubble with integrated checkmark in the tail
- **Files Created:**
  - `/static/aptlysaid-logo.svg` - Full logo with wordmark
  - `/static/favicon.svg` - Favicon version
  - `/static/aptlysaid-icon-large.svg` - High-res icon for conversion
  - See `FAVICON_INSTRUCTIONS.md` for PNG generation

### Color Palette
- **Primary:** Deep Navy Blue (#1A2A4F)
- **Secondary:** Crisp Off-White (#F8F9FA)
- **Accent:** Sophisticated Muted Gold (#C5B358)
- **Neutral:** Neutral Grey (#848A96)

### Typography
- **Headlines:** Lora or Playfair Display (serif)
- **Body Text:** Inter or Lato (sans-serif)

## Files Updated

### Configuration
- `src/config.ts` - Updated brand name, URL, and description
- `src/app.css` - Updated color scheme and typography
- `tailwind.config.js` - Added AptlySaid color palette and fonts
- `src/app.html` - Added font imports and updated favicon references

### Components
- `src/lib/components/Logo.svelte` - Complete redesign with new logo
- `src/lib/components/Header.svelte` - Updated branding and navigation
- `src/lib/components/Footer.svelte` - Comprehensive footer with new branding
- `src/routes/+layout.svelte` - Updated with brand colors and metadata

### Pages
- `src/routes/(marketing)/+page.svelte` - Complete homepage redesign with:
  - New hero section
  - Features grid
  - How it works section
  - Testimonials
  - CTA section

## Next Steps

1. **Generate favicon.png** - Follow instructions in `FAVICON_INSTRUCTIONS.md`
2. **Update social media assets** - Create branded images for:
   - Twitter/X header and profile
   - LinkedIn company page
   - Facebook page
   - Open Graph images
3. **Update email templates** - Apply new branding to transactional emails
4. **Update documentation** - Ensure all docs reflect new branding
5. **Deploy changes** - Test thoroughly before going live

## Brand Guidelines

### Voice & Tone
- Professional yet approachable
- Confident without being arrogant
- Focus on customer success and time-saving benefits
- Emphasize "perfection" and "aptness" in messaging

### Key Messages
- "Your brand's voice, perfected"
- "Professional AI-powered review response management"
- "Save time while maintaining authentic customer relationships"
- "Transform reviews into growth opportunities"

## Technical Notes

- All colors are defined in both `app.css` (DaisyUI theme) and `tailwind.config.js`
- Logo component supports multiple sizes and variants
- Responsive design maintained throughout
- Accessibility considerations included (contrast ratios, semantic HTML)
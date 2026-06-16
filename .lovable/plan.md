Move the right-column content on the provider profile page into tabs so users don't have to scroll past long references to reach services.

Current problem: References, About, Specialties, Booking CTA, and Services are all stacked vertically. With multiple references, the Services section gets pushed far below the fold.

Proposed solution: Tab navigation in the right column with 3 tabs:

1. **Overview** — About bio, Specialties tags, Booking CTA
2. **References** — Publications & works (existing cards, now in a tab panel)
3. **Services** — Full services grid (moved from below-the-fold into a tab panel)

Tabs sit directly under the Verified/Licensed badges. Each tab panel is independently scrollable, but the overall right-column height is bounded so the Services tab is always one click away.

The left sidebar (avatar, identity, provider details, social links) remains fixed and unchanged.

The services section that currently lives below the fold at `#services` will be moved into the Services tab. The `#services` anchor can still scroll to the tab container.

Technical details:
- Add local React state for activeTab: 'overview' | 'references' | 'services'
- Render tab buttons as a clean horizontal pill row (rounded-full, active state with brand-purple background)
- Use conditional rendering for tab panels
- Remove the separate `<section id="services">` that currently renders below the hero card
- Update the Services preview pointer card to switch to the Services tab on click instead of smooth-scrolling
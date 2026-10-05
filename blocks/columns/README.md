# columns

Custom **columns** block. 

## Authoring (Document Authoring)

Model: `standalone`

Single block table. Content: one row, one cell of content.

## Supported variations

| Variation | Option class |
| --- | --- |
| Icon Scroll | `icon-scroll` |

## Default layouts (auto-detected)

Without an option class, `columns.js` adds a layout class based on the authored content:

| Content | Class | Desktop layout |
| --- | --- | --- |
| Every cell starts with an icon paragraph (`p > picture`) | `columns-items` | 2-3 equal items (41px gap), icon at 50% width centered with 8px radius, bold title 22px |
| Image cell + text cell with an `h1` | `columns-feature` | 1/3 square image + 2/3 text (41px gap), always full content width (also inside `narrow` sections); an all-caps paragraph after the h1 becomes a tag pill; h1 link never underlined |
| Image cell + text cell with an `h2`, image is an SVG illustration (or a standalone row in a `light-blue` section) | `columns-illustration` | 1200px boxed; 1/3 illustration (50% of its column, centered) + 2/3 text, outlined CTA |
| Image cell + text cell with an `h2` (photo) | `columns-media` | 1200px boxed; 50/50, photo at 60% of its column centered, 8px radius, vertically centered text, outlined CTA |
| Image cell + text cell without `h1`/`h2` (logo rows) | `columns-aside` | 1/4 logo + 3/4 text (23px gap); lone `<p><a>` links stay plain inline text links (strong/em CTAs stay buttons) |

All layouts stack on mobile with the image first.

## Universal Editor fields

N/A (Document Authoring project)

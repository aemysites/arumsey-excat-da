# video

Custom **video** block. 

## Authoring (Document Authoring)

Model: `standalone`

Single block table. Content: optional heading above a 16:9 video with poster image and centered play button.

| Video |
| --- |
| heading (optional) |
| poster image (optional) + video link |

The block reads the poster picture and the video link from any cell; everything else is shown as the heading above the player.

Supported video links:

| Source | Link |
| --- | --- |
| YouTube | `https://www.youtube.com/watch?v=…`, `https://youtu.be/…`, `/embed/…` |
| Vimeo | `https://vimeo.com/…` |
| Kaltura | iframe embed URL on `cdnapisec.kaltura.com` (or any URL containing `iframeembed=true`), e.g. `https://cdnapisec.kaltura.com/p/{partnerId}/sp/{partnerId}00/embedIframeJs/uiconf_id/{playerId}/partner_id/{partnerId}?iframeembed=true&entry_id={entryId}` |
| File | `.mp4` / `.webm` |

With a poster image, the player (an iframe for YouTube, Vimeo and Kaltura, a `<video>` for files) is inserted when the poster is clicked; without one, when the block scrolls into view. Kaltura iframes allow fullscreen and take their title from the heading.

## Supported variations

| Variation | Option class |
| --- | --- |
| Autoplay | `autoplay` (muted background playback, no controls) |

## Universal Editor fields

N/A (Document Authoring project)

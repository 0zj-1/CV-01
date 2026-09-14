# Portfolio opening prototype

Run `npm install` then `npm run dev` in this directory. The current development preview uses http://127.0.0.1:3001 (`npm run dev -- --port 3001`). Validate with `npm run build` and `npm run typecheck`.

- `components/ScrollVideoPrototype.tsx`: scroll target calculation, one on-demand requestAnimationFrame interpolation loop, video seeking, paused GSAP text timeline, and four text sequences.
- `styles/globals.css`: sticky fullscreen scene, light background, typography and placeholder portfolio section.
- `public/video/glass-sculpture.mp4`: supplied Abstract Glass Sculpture Background Loop.mp4, copied unchanged from the local Materials folder (the prompt's /mnt/data path is not used on this Mac).

## Adjustments

- Text timing: edit `TIMING` (0–1 scroll fractions) and `WORD_STARTS` at the top of the component. `enter` starts the reveal, `hold` is fully visible, `exit` starts fading, and `end` is fully hidden. The final scene remains visible after its hold point.
- Scroll length: edit `.scroll-section { height: 450vh; }`. Scrub travel is section height minus one viewport (350vh). After that, only the sticky text layer releases and moves upward. The video is a separate fixed layer, frozen at its final frame while placeholder works scroll above it.
- Smoothing: `SETTLE_SECONDS = 0.12`; larger values give slower catch-up. `SEEK_THRESHOLD` avoids insignificant time writes.
- Replace the video at `public/video/glass-sculpture.mp4`, or change the component's video src. Duration is read after metadata loads.

Scroll events only update the normalized target. A single RAF loop exponentially interpolates current progress, drives text and maps it to video duration. An active seek is allowed to complete before another is issued; the newest target wins. The loop sleeps after settling and wakes on scroll, resize, metadata or seek completion. No React state updates occur per frame. The video remains paused and reverses naturally with upward scrolling. Reduced motion exposes static text and removes smoothing.

## Portfolio transition

The video is fixed within `.portfolio-page`, outside the sticky text scene. At 350vh of scroll it settles at the final frame; further scrolling carries the final headline upward and brings `.works-section` into view, with no blank test section. Two clearly labeled placeholder projects stand in for future portfolio content. Scroll back into the intro to reverse the video.

## Slow headline exit

The final headline now uses an independent fixed anchor. After the video reaches its end, it initially moves upward 1px per scroll pixel. At `EXIT_SLOWDOWN_AT = 0.14` (14vh from the top), its speed changes to `EXIT_SPEED = 0.1`. Works keep native 1:1 scrolling and pass in front of the headline. The Selected Works labels, portfolio preamble and debug panel have been removed. These exit values are at the top of the component; motion is reversible and updated within the existing RAF loop.

## More works

`components/MoreWorks.tsx` adds the light-grey five-column horizontal gallery after Project 02. Edit `OTHER_WORKS` to replace the seven placeholder entries. Native horizontal scrolling, a focusable keyboard-scroll region and previous/next buttons reveal entries beyond the first five; controls disable at either end. The existing fixed final video frame remains behind the section. Gallery layout is under `.more-works` in the global stylesheet.

## Reference ending page

`components/EndingSection.tsx` follows the supplied short reference: invitation headline, four information columns, small print and an oversized cropped Mantis wordmark. Reference brand/contact labels are visual demo content, not working external links. The wireframe PNG is an AI-generated approximation, not the original 3D model or animation; the footage does not supply exact typography or all small print.

The footer starts after More Works. In the existing RAF loop, `targetEnding` maps its entry through one viewport to 0–1. `ENDING_BLUR_PX = 22` controls maximum background blur; the video's final time stays fixed. `--ending-progress` controls the invitation, tilted word, wireframe translation/rotation and wordmark reveal. Reverse scrolling clears the blur. The ending section is 170vh with a 100vh sticky stage, giving 70vh of final-page hold. Reduced motion removes the decorative translations. No second animation loop is introduced.

Asset: `public/images/ending-wireframe.png`. Layout: `.ending-*` in the global stylesheet.

## Ending animation
- `components/EndingSection.tsx`: edit `WORDS` for the rotating headline. Each word starts 2 seconds after the previous, and its letters enter 45ms apart; the CSS cycle is 8 seconds for four words.
- `styles/globals.css`: `ending-letter-jump` controls each masked letter jump; `glass-color` controls red / fluorescent green / dark blue holds and transitions.
- Fixed SVG turbulence and displacement in `EndingSection.tsx` deform the transparent glass silhouette. A GSAP ticker moves the noise field around a circle at constant speed (16-second period, 70-unit radius, fixed displacement 165), with no segmented scale or frequency keyframes. These are lightweight 2D deformations of a rendered glass asset, not a 3D simulation.
- The final stage has no background fill. The original video remains frozen and blurred underneath.
- CSS animations and the GSAP deformation ticker pause offscreen and when the document is hidden. Reduced motion shows static branding and a static glass object.
- Asset: `public/images/ending-glass.png`, generated with the built-in imagegen tool. Prompt: one isolated amorphous translucent ruby-red glass sculpture, asymmetric folded liquid form with three rounded lobes, realistic refraction and white studio reflections, fully visible on a transparent alpha background, no floor, text, or exterior shadow.

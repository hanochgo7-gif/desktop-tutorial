# Vantix: Before/After Vent Plan (labeled dramatization)

The output is labeled **"Dramatization"** in small text in the corner. The goal is maximum realism without passing AI footage off as a real job: that would be deceptive advertising (FTC) and could get the ad account blocked.

## Real-world reference (HVAC technician research + real photos)

- **Vent:** a typical Miami home (concrete block, ducts in the attic) has a ceiling supply register. Use a **10x10, 4-way, curved-blade** register: white stamped steel aged to ivory, two screws on opposite flanges, and a damper lever visible through the blades. Do not use a square cone diffuser, which is a commercial look.
- **Real dirt:**
  - Gray-brown dust felt on the blade edges, heaviest in the corners, with short lint hanging off.
  - Tiny black and dark-olive mold dots clustered at the corners and along the flange-ceiling joint, where condensation forms.
  - A soft gray halo (ghosting) on the ceiling in the 4 airflow directions, heavier on one side.
  - Rust pinpoints at the screws.
- **Fake tells (avoid):** uniform black goo, slime, green germs, perfectly symmetrical streaks, floating particles, dirt that doesn't follow the airflow.
- **A real after is clean, not new:**
  - The ivory yellowing stays.
  - Small paint chips and fresh screwdriver marks stay.
  - The halo is lighter but leaves a faint shadow outline.
- **How it's filmed:** iPhone held vertical, from a ladder, 1.5–3 ft from the vent. Cool flat light from the window, slight handheld shake.

Sources: [InspectAPedia: register stains](https://inspectapedia.com/interiors/HVAC_Air_Register_Stains.php) · [ACHR News: why dirt streaking occurs](https://achrnews.com/articles/128615-why-dirt-streaking-occurs-around-vents) · [Price Industries: smudging](https://blog.priceindustries.com/what-is-smudging) · [GBA: mold near AC registers](https://www.greenbuildingadvisor.com/question/mold-near-ac-registers-air-sealing-problem) · [PuroClean Coral Gables](https://www.puroclean.com/miami-fl-puroclean-coral-gables/wp-json/wp/v2/blog/21060)

## Pipeline: same vent in both shots

1. **"Before" image:** Nano Banana 2.1 at 2K, plus GPT Image 2.5 for comparison. 4 candidates, about 4.5 credits.
2. **Pick a winner:** strict test (below).
3. **"After" image:** an image **edit** of the winning before, not a new generation. This keeps the geometry, angle, light and ceiling identical. 2–3 candidates, about 6 credits.
4. **Video:** one 5s clip for each still with subtle handheld motion.
   - MiniMax H3 (2K): **10 credits per clip**.
   - Seedance 2.5 at 1080p: 80 credits per clip, only if H3 fails the test.
   - Estimate: 2–4 clips = **20–40 credits**.
5. **Edit:**
   - BEFORE (2.5s), then a swipe with a "whoosh", then AFTER (2.5s).
   - Phone-style grain, BEFORE/AFTER labels and a small "Dramatization" label.
   - Placed in the ad on the line "So what's building up inside your vents?" and before the end card.

**Total estimate:** about 30–60 credits out of 1,549.

## Prompts

**Before (dirty):**
> Unedited iPhone photo, vertical 9:16, taken from the third step of a 6-ft ladder about 2 feet below a residential ceiling supply register in a Miami concrete-block home. The register is a 10x10 four-way curved-blade stamped-steel register, white powder coat aged to ivory, face plate about 12 inches square, two painted-over Phillips screws centered on opposite flanges, multi-shutter damper with a small lever visible through the blades, cracked caulk line where the flange meets a white knockdown-texture drywall ceiling. Real neglect: uneven gray-brown dust felt on the blade edges and lips, heaviest in the four inside corners, short lint fur hanging from some blade edges, dark gray duct collar visible through the slots; tiny black and dark-olive pin-dot mildew clusters at two corners and along the flange-ceiling joint; a soft feathered gray smudge halo spreading 3–6 inches onto the ceiling in the four blade directions, darkest against the flange, heavier on one side; orange-brown rust pinpoints at one screw head. Cool flat window daylight bouncing off the white ceiling, slightly underexposed, slight phone wide-lens barrel distortion, mild sensor noise, slight handheld softness. Documentary job-site photo. No text, no watermark, no hands, no slime, no drips, no glow, no floating particles, no perfectly symmetrical streaks.

**After (clean, image edit of the winning before):**
> Same photo, same camera position, framing, lens distortion, lighting and ceiling texture. The register has been taken down, washed and reinstalled with the same screws: blade edges, corners and damper are now clean; all dust, lint and mildew dots are gone. Keep the ivory paint tone, the small paint chips at the screw holes with fresh screwdriver marks, a faint rust stain at one screw, and the dark duct collar visible through the slots. The ceiling halo is much lighter after wiping, but a faint gray shadow outline of the register remains. Clean, not brand new.

**Motion (image-to-video, for both clips):**
> Handheld iPhone footage from a ladder looking up at the ceiling register: very subtle natural hand drift and micro-shake, slight autofocus breathing, steady exposure. The camera does not orbit or zoom. The rigid metal register stays perfectly straight with a constant blade count and shape; no morphing, no bending lines, no floating dust, no new objects, no people.

## Strict test (every frame must pass all 12)

1. The blade count, curve and spacing are identical between before and after, and stable across every video frame.
2. All edges are straight lines, with no bending or melting.
3. Exactly 2 screws, in the same positions in both shots.
4. The ceiling texture is identical in both shots and doesn't "swim" in the video.
5. The dust is gray-brown and fibrous, on the edges and corners, never uniform.
6. The mold is tiny clustered dots at the corners only, not slime.
7. The halo follows the 4 airflow directions, with soft edges and no symmetry.
8. Light and shadow come from the same direction in both shots.
9. The after keeps the yellowing, the chips and a faint shadow outline, so it isn't brand new.
10. No text, logos, watermarks or extra objects.
11. No flicker, shimmering or morphing in the video.
12. It looks like a phone: natural noise and slight distortion, no "AI glow" or HDR.

Each candidate will also go to a separate reviewer who gets only the images, without my prompts.

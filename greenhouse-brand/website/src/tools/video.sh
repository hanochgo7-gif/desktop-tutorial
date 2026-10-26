#!/bin/sh
# Re-cuts the home hero from the original drone file. Usage: sh src/tools/video.sh /path/to/DJI_0024.MP4
# Clip: 32 s to 44 s (the drone pulls back from the net house; a truck gives the scale). Three framings, H.264 + VP9 each.
set -e
SRC="$1"; OUT="$(dirname "$0")/../../public/assets/video"; T="-ss 32 -t 12"
ffmpeg -v error -y $T -i "$SRC" -an -vf "scale=1600:900,fps=25,format=yuv420p" -c:v libx264 -preset veryslow -crf 30 -movflags +faststart "$OUT/hero-wide.mp4"
ffmpeg -v error -y $T -i "$SRC" -an -vf "scale=1280:720,fps=30,format=yuv420p" -c:v libx264 -preset slow -crf 28 -movflags +faststart "$OUT/hero-720.mp4"
ffmpeg -v error -y $T -i "$SRC" -an -vf "crop=810:1080:600:0,scale=720:960,fps=30,format=yuv420p" -c:v libx264 -preset slow -crf 28 -movflags +faststart "$OUT/hero-portrait.mp4"
for f in hero-wide hero-720 hero-portrait; do
  ffmpeg -v error -y -i "$OUT/$f.mp4" -c:v libvpx-vp9 -b:v 0 -crf 40 -row-mt 1 -deadline good -cpu-used 2 -an "$OUT/$f.webm"
done
# posters: first frame of each clip -> media-src; then run: python3 src/tools/images.py
ffmpeg -v error -y -i "$OUT/hero-wide.mp4" -frames:v 1 "$(dirname "$0")/../../media-src/hero-frame.png"
ffmpeg -v error -y -i "$OUT/hero-portrait.mp4" -frames:v 1 "$(dirname "$0")/../../media-src/hero-portrait-frame.png"
echo "videos written to $OUT"

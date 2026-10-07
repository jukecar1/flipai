#!/bin/bash
# usage: run_segments.sh <worker> <nworkers>; renders 2 s pieces of the 34 s of 3D (17 pieces) for impact_ny
cd /home/user/flipai
W=$1; N=$2
for ((i=W; i<17; i+=N)); do
  f=$(printf "clips/.frames/impact_ny/seg/s%02d.mp4" $i)
  if [ -f "$f" ] && ffprobe -v error -show_entries format=duration -of csv=p=0 "$f" >/dev/null 2>&1; then continue; fi
  a=$((i*2)); b=$((i*2+2))
  node clips/render.mjs impact_ny --dpr 2 --blur 1 --from $a --to $b --out "${f}.part.mp4" > "clips/.frames/impact_ny/seg/log_$i.txt" 2>&1 && mv "${f}.part.mp4" "$f"
done

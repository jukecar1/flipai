#!/bin/bash
# usage: run_segments.sh <worker> <nworkers>; renders 2 s pieces (31 pieces) for the statewage clip
cd /home/user/flipai
W=$1; N=$2
mkdir -p clips/.frames/statewage/seg
for ((i=W; i<28; i+=N)); do
  f=$(printf "clips/.frames/statewage/seg/s%02d.mp4" $i)
  if [ -f "$f" ] && ffprobe -v error -show_entries format=duration -of csv=p=0 "$f" >/dev/null 2>&1; then continue; fi
  a=$((i*2)); b=$((i*2+2)); [ $b -gt 55 ] && b=55
  node clips/render.mjs statewage --dpr 2 --blur 1 --from $a --to $b --out "${f}.part.mp4" > "clips/.frames/statewage/seg/log_$i.txt" 2>&1 && mv "${f}.part.mp4" "$f"
done

#!/bin/bash
# usage: run_segments.sh <worker> <nworkers>; renders 2 s pieces (31 pieces) for the door clip
cd /home/user/flipai
W=$1; N=$2
mkdir -p clips/.frames/door/seg
for ((i=W; i<31; i+=N)); do
  f=$(printf "clips/.frames/door/seg/s%02d.mp4" $i)
  if [ -f "$f" ] && ffprobe -v error -show_entries format=duration -of csv=p=0 "$f" >/dev/null 2>&1; then continue; fi
  a=$((i*2)); b=$((i*2+2)); [ $b -gt 62 ] && b=62
  node clips/render.mjs door --dpr 2 --blur 1 --from $a --to $b --out "${f}.part.mp4" > "clips/.frames/door/seg/log_$i.txt" 2>&1 && mv "${f}.part.mp4" "$f"
done

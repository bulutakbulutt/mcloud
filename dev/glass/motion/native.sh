#!/bin/zsh
# native.sh <first> <last> <step>: captures ScrollLab at each offset into motion/native/NNNN.png
L=${0:A:h:h}; M=$L/motion
coproc "$L/ScrollLab" "$M/content.png" 135
read -p line; id=${line#WINDOW }
i=0
for s in $(seq $1 $3 $2); do
  for try in 1 2 3; do print -p $s; read -p ready; [[ $ready == *key=true* ]] && break; echo "not key at $s, retrying" >&2; done
  screencapture -l $id -o -x $(printf "$M/native/%04d.png" $i); i=$((i+1))
done
kill %1 2>/dev/null
echo "native frames: $i window $id"

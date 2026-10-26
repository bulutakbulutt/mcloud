#!/bin/zsh
# capture.sh <pattern> [content] <out.png>: runs GlassLab, captures its window without shadow, quits it.
L=${0:A:h}; pat=$1; cont=${2:-empty}; out=$3
"$L/GlassLab" "$pat" "$cont" > "$L/.win.txt" 2>"$L/.err.txt" &
pid=$!
for i in {1..40}; do grep -q WINDOW "$L/.win.txt" 2>/dev/null && break; sleep 0.25; done
id=$(awk '/WINDOW/{print $2}' "$L/.win.txt")
sleep 0.6
screencapture -l "$id" -o -x "$out"; rc=$?
kill $pid 2>/dev/null; wait $pid 2>/dev/null
echo "pattern=$pat window=$id rc=$rc $(sips -g pixelWidth -g pixelHeight "$out" 2>/dev/null | awk '/pixel/{printf "%s ",$2}')"

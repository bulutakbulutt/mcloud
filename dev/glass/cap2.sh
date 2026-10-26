#!/bin/zsh
# cap2.sh <out.png> <args...>: runs Lab2, captures its window only while it is key (focused), quits.
# Glass in a window that is not key renders in its inactive state, so a shot taken while focus was elsewhere is
# retaken (up to 5 times); exits 1 if the window never held focus through a shot.
L=${0:A:h}; out=$1; shift
export KEYFILE="$L/.key"; rm -f "$KEYFILE"
"$L/Lab2" "$@" > "$L/.w2.txt" 2>"$L/.e2.txt" &
pid=$!
for i in {1..40}; do grep -q WINDOW "$L/.w2.txt" 2>/dev/null && break; sleep 0.25; done
id=$(awk '/WINDOW/{print $2}' "$L/.w2.txt"); ok=0
for try in {1..5}; do
  for i in {1..40}; do [ "$(cat $KEYFILE 2>/dev/null)" = 1 ] && break; sleep 0.1; done
  sleep 0.4
  [ "$(cat $KEYFILE)" = 1 ] || continue
  screencapture -l "$id" -o -x "$out"
  sleep 0.1
  [ "$(cat $KEYFILE)" = 1 ] && { ok=1; break; }
  echo "focus lost during $out, retaking" >&2
done
kill $pid 2>/dev/null; wait $pid 2>/dev/null
[ $ok = 1 ] || { echo "FAILED to capture $out with focus" >&2; exit 1; }

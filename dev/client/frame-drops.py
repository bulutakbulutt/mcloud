# Window recording (ScreenCaptureKit delivers a frame only when the window changed): while the content scrolls,
# consecutive frames should be one display frame apart (16.7ms at 60Hz); each extra 16.7ms in a gap is a dropped frame.
# python3 dev/client/frame-drops.py rec.mov [crop x,y,w,h in window points; default: the artist page area]
import sys, subprocess, numpy as np, json
path = sys.argv[1]; crop = [int(v) for v in (sys.argv[2] if len(sys.argv) > 2 else '280,75,820,300').split(',')]
cx, cy, cw, ch = [v * 2 for v in crop]; W, H = cw // 4, ch // 2
raw = subprocess.run(['ffmpeg', '-v', 'error', '-i', path, '-vf', f'crop={cw}:{ch}:{cx}:{cy},scale={W}:{H},format=gray', '-fps_mode', 'passthrough', '-f', 'rawvideo', '-'], capture_output=True).stdout
fr = np.frombuffer(raw, np.uint8).reshape(-1, H, W).astype(np.float32)
pts = sorted(float(l) for l in subprocess.run(['ffprobe', '-v', 'error', '-select_streams', 'v:0', '-show_entries', 'packet=pts_time', '-of', 'csv=p=0', path], capture_output=True, text=True).stdout.split())[:len(fr)]
def shift(a, b, R=60):
    best, bs = 1e9, 0
    for s in range(-R, R + 1):
        e = np.abs(a[s:] - b[:H - s]).mean() if s >= 0 else np.abs(a[:H + s] - b[-s:]).mean()
        if e < best: best, bs = e, s
    return bs
sh = np.array([shift(fr[i], fr[i + 1]) for i in range(len(fr) - 1)]); gap = np.diff(pts) * 1000
moving = np.abs(sh) >= 1
# a gap counts when the frames on both sides belong to the same motion (moving before and after)
drops, slots, worst = 0, 0, 0
for i in range(1, len(sh) - 1):
    if moving[i] and moving[i - 1]:
        slots += 1; extra = max(0, round(gap[i] / 16.67) - 1); drops += extra; worst = max(worst, gap[i])
print(json.dumps({'frames': len(fr), 'moving_intervals': slots, 'dropped_frames': drops, 'drop_pct': round(100 * drops / max(1, slots + drops), 2), 'worst_gap_ms': round(worst, 1),
  'median_gap_ms': round(float(np.median([gap[i] for i in range(1, len(sh) - 1) if moving[i] and moving[i - 1]] or [0])), 1)}))

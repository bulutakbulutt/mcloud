// swipe <totalPx> <steps> [outdir]: a trackpad-style two-finger scroll over Apple Music's content (phases began,
// changed..., ended, continuous deltas), posted through the HID tap with the cursor over the window. With outdir,
// captures the window after every step (Music must be frontmost: the glass is measured focused).
import AppKit
import CoreGraphics
let total = Double(CommandLine.arguments[1])!, steps = Int(CommandLine.arguments[2])!
let out = CommandLine.arguments.count > 3 ? CommandLine.arguments[3] : nil
let app = NSRunningApplication.runningApplications(withBundleIdentifier: "com.apple.Music").first!
app.activate()
usleep(400_000)
let list = CGWindowListCopyWindowInfo([.optionOnScreenOnly], kCGNullWindowID) as! [[String: Any]]
let w = list.first { ($0[kCGWindowOwnerPID as String] as? Int32) == app.processIdentifier && ($0[kCGWindowLayer as String] as? Int) == 0 }!
let id = w[kCGWindowNumber as String] as! Int, b = w[kCGWindowBounds as String] as! [String: CGFloat]
let p = CGPoint(x: b["X"]! + b["Width"]! * 0.6, y: b["Y"]! + b["Height"]! * 0.35)
CGWarpMouseCursorPosition(p); CGAssociateMouseAndMouseCursorPosition(1)
func scroll(_ dy: Int32, phase: Int64) {
  let e = CGEvent(scrollWheelEvent2Source: nil, units: .pixel, wheelCount: 1, wheel1: dy, wheel2: 0, wheel3: 0)!
  e.location = p
  e.setIntegerValueField(.scrollWheelEventIsContinuous, value: 1)
  e.setIntegerValueField(.scrollWheelEventScrollPhase, value: phase)   // 1 began, 2 changed, 4 ended
  e.setIntegerValueField(.scrollWheelEventMomentumPhase, value: 0)
  e.post(tap: .cghidEventTap)
}
func capture(_ i: Int) {
  guard let out else { return }
  let t = Process(); t.launchPath = "/usr/sbin/screencapture"; t.arguments = ["-l", "\(id)", "-o", "-x", String(format: "%@/s%03d.png", out, i)]; t.launch(); t.waitUntilExit()
}
let per = Int32((total / Double(steps)).rounded())
scroll(0, phase: 1); usleep(16_000)
for i in 0..<steps {
  scroll(per, phase: 2)
  if out != nil { usleep(120_000); if NSWorkspace.shared.frontmostApplication?.processIdentifier != app.processIdentifier { app.activate(); usleep(300_000) }; capture(i) } else { usleep(16_000) }
}
scroll(0, phase: 4)
print("window \(id) frontmost=\(NSWorkspace.shared.frontmostApplication?.localizedName ?? "?")")

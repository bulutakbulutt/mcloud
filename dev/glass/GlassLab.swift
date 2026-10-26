// GlassLab: a native macOS 26+ Liquid Glass capsule over measurement patterns, to calibrate the theme's SVG glass.
//   GlassLab <pattern> [content]
//   pattern: vstripes | hstripes | grays | line | black | white | gray:<0-255> | cards | photo:<path>
//   content: empty (default) | player (Apple Music style controls)
// Prints "WINDOW <id>" once the window is on screen; capture it with `screencapture -l <id> -o out.png`.
import SwiftUI
import AppKit

let args = CommandLine.arguments
let pattern = args.count > 1 ? args[1] : "vstripes"
let content = args.count > 2 ? args[2] : "empty"
// Same geometry as the theme's player: 700x54 capsule, 40pt of pattern around it.
let barW: CGFloat = 700, barH: CGFloat = 54, margin: CGFloat = 40

struct Pattern: View {
    var body: some View {
        Canvas { ctx, size in
            func fill(_ r: CGRect, _ c: Color) { ctx.fill(Path(r), with: .color(c)) }
            let all = CGRect(origin: .zero, size: size)
            switch pattern {
            case _ where pattern.hasPrefix("hline:"):
                // One 1pt white horizontal line at y = bar top + v (may be negative: above the bar).
                fill(all, .black); let v = CGFloat(Double(pattern.dropFirst(6))!)
                fill(CGRect(x: 0, y: margin + v - 0.5, width: size.width, height: 1), .white)
            case _ where pattern.hasPrefix("vline:"):
                fill(all, .black); let v = CGFloat(Double(pattern.dropFirst(6))!)
                fill(CGRect(x: margin + v - 0.5, y: 0, width: 1, height: size.height), .white)
            case "dot":
                fill(all, .black); fill(CGRect(x: margin + barW / 2 - 0.5, y: margin + barH / 2 - 0.5, width: 1, height: 1), .white)
            case "vstripes":
                fill(all, .black)
                // 2pt white stripes every 20pt, starting at x = margin (the bar's left edge).
                var x = margin.truncatingRemainder(dividingBy: 20)
                while x < size.width { fill(CGRect(x: x, y: 0, width: 2, height: size.height), .white); x += 20 }
            case "hstripes":
                fill(all, .black)
                var y = margin.truncatingRemainder(dividingBy: 10)
                while y < size.height { fill(CGRect(x: 0, y: y, width: size.width, height: 2), .white); y += 10 }
            case "grays":
                // 11 vertical bands across the bar, grey 0...255, to read the glass's tone curve.
                fill(all, .black)
                for i in 0..<11 {
                    let v = Double(i) / 10
                    fill(CGRect(x: margin + CGFloat(i) * barW / 11, y: 0, width: barW / 11 + 0.5, height: size.height), Color(.sRGB, white: v))
                }
            case "line":
                fill(all, .black)
                fill(CGRect(x: margin + barW / 2 - 1, y: 0, width: 2, height: size.height), .white)
                fill(CGRect(x: 0, y: margin + barH / 2 - 1, width: size.width, height: 2), .white)
            case "vramp":
                // Linear grey ramp top to bottom; blur leaves a linear ramp unchanged, so the grey read inside the
                // glass (through the inverse tone curve) says which row was sampled there.
                let n = Int(size.height * 2)
                for k in 0..<n { let y = CGFloat(k) / 2; fill(CGRect(x: 0, y: y, width: size.width, height: 0.5), Color(.sRGB, white: Double(y / size.height))) }
            case "hrampL", "hrampR":
                // Linear ramp over the 160pt around one end cap, constant beyond.
                let x0 = pattern == "hrampL" ? 0 : size.width - 160
                let n = Int(size.width * 2)
                for k in 0..<n { let x = CGFloat(k) / 2; let t = min(1, max(0, (x - x0) / 160)); fill(CGRect(x: x, y: 0, width: 0.5, height: size.height), Color(.sRGB, white: Double(t))) }
            case "black": fill(all, .black)
            case "white": fill(all, .white)
            case "cards":
                // Apple's reference shot: dark page, coloured cards starting ~17pt below the bar's top edge.
                fill(all, Color(.sRGB, red: 43/255, green: 40/255, blue: 41/255))
                let colors: [Color] = [Color(.sRGB, red: 0.35, green: 0.68, blue: 0.96), Color(.sRGB, red: 0.94, green: 0.55, blue: 0.16), Color(.sRGB, red: 0.94, green: 0.31, blue: 0.22), Color(.sRGB, red: 0.32, green: 0.72, blue: 0.26)]
                let w = (barW - 3 * 16) / 4
                for (i, c) in colors.enumerated() {
                    let r = CGRect(x: margin + CGFloat(i) * (w + 16), y: margin + 17, width: w, height: 200)
                    ctx.fill(Path(roundedRect: r, cornerRadius: 12), with: .color(c))
                    ctx.stroke(Path(ellipseIn: r.insetBy(dx: w * 0.2, dy: 30)), with: .color(.white.opacity(0.7)), lineWidth: 4)
                }
            default:
                if pattern.hasPrefix("gray:"), let v = Double(pattern.dropFirst(5)) { fill(all, Color(.sRGB, white: v / 255)) }
                else if pattern.hasPrefix("photo:"), let img = NSImage(contentsOfFile: String(pattern.dropFirst(6))) {
                    ctx.draw(Image(nsImage: img).resizable(), in: all)
                } else { fill(all, .gray) }
            }
        }
    }
}

struct PlayerContent: View {
    var body: some View {
        HStack(spacing: 14) {
            HStack(spacing: 10) {
                Image(systemName: "shuffle").foregroundStyle(.secondary)
                Image(systemName: "backward.fill")
                Image(systemName: "play.fill").font(.system(size: 20))
                Image(systemName: "forward.fill")
                Image(systemName: "repeat").foregroundStyle(.secondary)
            }
            RoundedRectangle(cornerRadius: 4).fill(.orange).frame(width: 34, height: 34)
            VStack(alignment: .leading, spacing: 1) {
                Text("Dile Kolay").font(.system(size: 13, weight: .semibold))
                Text("Ajda Pekkan — The Best Of Ajda Pekkan").font(.system(size: 12)).foregroundStyle(.secondary)
            }
            Spacer()
            Image(systemName: "ellipsis")
            Image(systemName: "quote.bubble")
            Image(systemName: "list.bullet")
            Image(systemName: "speaker.wave.2.fill")
        }
        .padding(.horizontal, 18)
    }
}

struct Lab: View {
    var body: some View {
        ZStack(alignment: .topLeading) {
            Pattern()
            Group {
                if content == "player" { PlayerContent() } else { Color.clear }
            }
            .frame(width: barW, height: barH)
            .glassEffect(.regular, in: .capsule)
            .offset(x: margin, y: margin)
        }
        .frame(width: barW + 2 * margin, height: barH + 2 * margin)
        .environment(\.colorScheme, .dark)
    }
}

final class AppDelegate: NSObject, NSApplicationDelegate {
    var window: NSWindow!
    func applicationDidFinishLaunching(_ n: Notification) {
        window = NSWindow(contentRect: NSRect(x: 200, y: 300, width: barW + 2 * margin, height: barH + 2 * margin), styleMask: [.borderless], backing: .buffered, defer: false)
        window.appearance = NSAppearance(named: .darkAqua)
        window.contentView = NSHostingView(rootView: Lab())
        window.isOpaque = true
        window.hasShadow = false
        window.level = .floating
        window.makeKeyAndOrderFront(nil)
        NSApp.activate(ignoringOtherApps: true)
        DispatchQueue.main.asyncAfter(deadline: .now() + 1.0) {
            print("WINDOW \(self.window.windowNumber) SCALE \(self.window.backingScaleFactor)"); fflush(stdout)
        }
    }
}

let app = NSApplication.shared
let delegate = AppDelegate()
app.delegate = delegate
app.setActivationPolicy(.regular)
app.run()

// ScrollLab: native Liquid Glass (NSGlassView, as in Apple Music) over a tall image that moves on command.
//   ScrollLab <content.png (2x)> [windowHeightPt]
// Reads offsets (pt) from stdin, one per line; after the frame showing that offset is on screen it prints
// "READY <offset>". Prints "WINDOW <id>" first.
import AppKit

let a = CommandLine.arguments
let rep = NSBitmapImageRep(data: try! Data(contentsOf: URL(fileURLWithPath: a[1])))!.retagging(with: NSScreen.main!.colorSpace!)!
let img = NSImage(); img.addRepresentation(rep)
let imgSize = NSSize(width: rep.pixelsWide / 2, height: rep.pixelsHigh / 2); img.size = imgSize
let winH = a.count > 2 ? CGFloat(Double(a[2])!) : 135
let winW: CGFloat = 781
let bar = NSRect(x: 40, y: winH - 40 - 55, width: 701, height: 55)

final class KeyWindow: NSWindow { override var canBecomeKey: Bool { true }; override var canBecomeMain: Bool { true } }
final class Delegate: NSObject, NSApplicationDelegate {
    var window: NSWindow!, imageView: NSImageView!
    func applicationDidFinishLaunching(_ n: Notification) {
        window = KeyWindow(contentRect: NSRect(x: 300, y: 300, width: winW, height: winH), styleMask: [.borderless], backing: .buffered, defer: false)
        window.appearance = NSAppearance(named: .darkAqua); window.hasShadow = false; window.level = .floating
        let root = NSView(frame: NSRect(x: 0, y: 0, width: winW, height: winH)); root.wantsLayer = true
        imageView = NSImageView(frame: NSRect(x: 0, y: 0, width: imgSize.width, height: imgSize.height))
        imageView.image = img; imageView.imageScaling = .scaleAxesIndependently
        root.addSubview(imageView)
        let cls = NSClassFromString("NSGlassView") as! NSGlassEffectView.Type
        let g = cls.init(frame: bar); g.style = .regular; g.cornerRadius = bar.height / 2; g.contentView = NSView(frame: NSRect(origin: .zero, size: bar.size))
        root.addSubview(g)
        window.contentView = root
        move(0)
        window.makeKeyAndOrderFront(nil); NSApp.activate(ignoringOtherApps: true)
        DispatchQueue.main.asyncAfter(deadline: .now() + 1.2) {
            print("WINDOW \(self.window.windowNumber)"); fflush(stdout)
            Thread.detachNewThread { while let line = readLine() { let v = CGFloat(Double(line) ?? 0); DispatchQueue.main.async { self.step(v) } } ; exit(0) }
        }
    }
    // Offset s shows the image's rows from s (pt, from its top) at the window's top.
    func move(_ s: CGFloat) { imageView.setFrameOrigin(NSPoint(x: 0, y: winH - imgSize.height + s)) }
    func step(_ s: CGFloat) {
        // Glass in a window that is not key renders in its background state: take focus back first.
        if !(window.isKeyWindow && NSApp.isActive) { NSApp.activate(ignoringOtherApps: true); window.makeKeyAndOrderFront(nil) }
        move(s); window.displayIfNeeded(); CATransaction.flush()
        // Two refreshes, so the glass (rendered by the window server) has caught up.
        DispatchQueue.main.asyncAfter(deadline: .now() + 0.15) { print("READY \(s) key=\(self.window.isKeyWindow && NSApp.isActive)"); fflush(stdout) }
    }
}
let app = NSApplication.shared
let d = Delegate(); app.delegate = d; app.setActivationPolicy(.regular); app.run()

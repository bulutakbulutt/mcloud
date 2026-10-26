// Lab2: puts one kind of native glass over a background image at Music's player geometry (701x55pt, 40pt in).
//   Lab2 <background.png> <kind> [variant]
//   kind: swiftui-regular | swiftui-clear | ns-regular | ns-clear | nsglass (Music's private NSGlassView) | none
//   variant: integer for NSGlassEffectView's private _variant (nsglass and ns-* only)
// Prints "WINDOW <id>" when on screen.
import SwiftUI
import AppKit

let a = CommandLine.arguments
let bgPath = a[1], kind = a.count > 2 ? a[2] : "nsglass", variant = a.count > 3 ? Int(a[3]) : nil
let loaded = NSBitmapImageRep(data: try! Data(contentsOf: URL(fileURLWithPath: bgPath)))!
// The pixels were read off this screen; tag them with its colour space so they are drawn back unchanged.
let image = NSImage(); image.addRepresentation(loaded.retagging(with: NSScreen.main!.colorSpace!)!)
// The PNG is in 2x pixels; draw it at 1pt per 2px.
let size = NSSize(width: image.representations[0].pixelsWide / 2, height: image.representations[0].pixelsHigh / 2)
image.size = size
let bar = NSRect(x: 40, y: size.height - 40 - 55, width: 701, height: 55)  // AppKit's y runs upward

// Borderless windows cannot become key by default, and glass in a window that is not key renders in its inactive
// (more diffuse) state. Apple Music's player is measured with its window focused.
final class KeyWindow: NSWindow { override var canBecomeKey: Bool { true }; override var canBecomeMain: Bool { true } }
final class Delegate: NSObject, NSApplicationDelegate {
    var window: NSWindow!
    func applicationDidFinishLaunching(_ n: Notification) {
        window = KeyWindow(contentRect: NSRect(x: 300, y: 300, width: size.width, height: size.height), styleMask: [.borderless], backing: .buffered, defer: false)
        window.appearance = NSAppearance(named: .darkAqua)
        window.hasShadow = false; window.level = .floating
        let root = NSView(frame: NSRect(origin: .zero, size: size))
        let bg = NSImageView(frame: root.bounds); bg.image = image; bg.imageScaling = .scaleAxesIndependently
        root.addSubview(bg)
        switch kind {
        case "swiftui-regular", "swiftui-clear":
            let glass: Glass = kind == "swiftui-clear" ? .clear : .regular
            let host = NSHostingView(rootView: Color.clear.frame(width: bar.width, height: bar.height).glassEffect(glass, in: .capsule))
            host.frame = bar; root.addSubview(host)
        case "ns-regular", "ns-clear", "nsglass":
            let cls: NSGlassEffectView.Type = kind == "nsglass" ? (NSClassFromString("NSGlassView") as! NSGlassEffectView.Type) : NSGlassEffectView.self
            let g = cls.init(frame: bar)
            g.style = kind == "ns-clear" ? .clear : .regular
            g.cornerRadius = bar.height / 2
            g.contentView = NSView(frame: NSRect(origin: .zero, size: bar.size))
            if let v = variant { g.setValue(v, forKey: "_variant") }
            root.addSubview(g)
        default: break
        }
        window.contentView = root
        window.makeKeyAndOrderFront(nil); NSApp.activate(ignoringOtherApps: true)
        // Keep the window key while it is being captured (a click elsewhere takes focus away), and publish whether
        // it is key right now in KEYFILE, so the capture script can check before and after each shot.
        let keyFile = ProcessInfo.processInfo.environment["KEYFILE"]
        Timer.scheduledTimer(withTimeInterval: 0.05, repeats: true) { _ in
            let key = self.window.isKeyWindow && NSApp.isActive
            if !key { NSApp.activate(ignoringOtherApps: true); self.window.makeKeyAndOrderFront(nil) }
            if let f = keyFile { try? (key ? "1" : "0").write(toFile: f, atomically: true, encoding: .utf8) }
        }
        DispatchQueue.main.asyncAfter(deadline: .now() + 1.2) { print("WINDOW \(self.window.windowNumber) key=\(self.window.isKeyWindow)"); fflush(stdout) }
    }
}
let app = NSApplication.shared
let d = Delegate(); app.delegate = d; app.setActivationPolicy(.regular); app.run()

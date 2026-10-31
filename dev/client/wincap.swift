// Records one app's window with ScreenCaptureKit, plus the app's audio, while the window stays behind other apps,
// so measurements don't take over the screen. Start Spotify in the background so Chromium keeps drawing it:
//   open -g -a Spotify --args --remote-debugging-port=9229 --disable-backgrounding-occluded-windows \
//     --disable-renderer-backgrounding --disable-background-timer-throttling
//   swiftc -O -o /tmp/wincap dev/client/wincap.swift && /tmp/wincap com.spotify.client <seconds> <out.mov> [fps]
// Frames arrive only when the window changed; dev/client/frame-drops.py counts dropped frames from the gaps.
import Foundation
import ScreenCaptureKit
import AVFoundation
import CoreMedia
import AppKit

// A command-line tool has no window-server connection until something asks for one; ScreenCaptureKit needs it.
_ = NSApplication.shared

let args = CommandLine.arguments
let bundle = args[1], seconds = Double(args[2])!, outURL = URL(fileURLWithPath: args[3]), fps = Int32(args.count > 4 ? args[4] : "60")!

final class Recorder: NSObject, SCStreamOutput, SCStreamDelegate {
  let writer: AVAssetWriter; let video: AVAssetWriterInput; let audio: AVAssetWriterInput
  var started = false, frames = 0, audioBuffers = 0
  init(url: URL, width: Int, height: Int) throws {
    try? FileManager.default.removeItem(at: url)
    writer = try AVAssetWriter(outputURL: url, fileType: .mov)
    video = AVAssetWriterInput(mediaType: .video, outputSettings: [AVVideoCodecKey: AVVideoCodecType.h264, AVVideoWidthKey: width, AVVideoHeightKey: height,
      AVVideoCompressionPropertiesKey: [AVVideoAverageBitRateKey: 40_000_000, AVVideoExpectedSourceFrameRateKey: 60]])
    audio = AVAssetWriterInput(mediaType: .audio, outputSettings: [AVFormatIDKey: kAudioFormatMPEG4AAC, AVSampleRateKey: 48000, AVNumberOfChannelsKey: 2, AVEncoderBitRateKey: 192000])
    video.expectsMediaDataInRealTime = true; audio.expectsMediaDataInRealTime = true
    writer.add(video); writer.add(audio)
  }
  func stream(_ stream: SCStream, didOutputSampleBuffer sb: CMSampleBuffer, of type: SCStreamOutputType) {
    guard sb.isValid else { return }
    if type == .screen {
      // Only complete frames carry new pixels; idle/blank statuses are skipped.
      guard let att = CMSampleBufferGetSampleAttachmentsArray(sb, createIfNecessary: false) as? [[SCStreamFrameInfo: Any]],
            let raw = att.first?[.status] as? Int, let status = SCFrameStatus(rawValue: raw), status == .complete else { return }
      if !started { writer.startWriting(); writer.startSession(atSourceTime: sb.presentationTimeStamp); started = true }
      if video.isReadyForMoreMediaData { video.append(sb); frames += 1 }
    } else if type == .audio, started, audio.isReadyForMoreMediaData { audio.append(sb); audioBuffers += 1 }
  }
}

let sema = DispatchSemaphore(value: 0)
Task {
  do {
    let content = try await SCShareableContent.excludingDesktopWindows(false, onScreenWindowsOnly: false)
    guard let window = content.windows.filter({ $0.owningApplication?.bundleIdentifier == bundle && $0.frame.width > 400 }).max(by: { $0.frame.width * $0.frame.height < $1.frame.width * $1.frame.height }) else { print("no window for \(bundle)"); exit(1) }
    let scale = 2, w = Int(window.frame.width) * scale, h = Int(window.frame.height) * scale
    let config = SCStreamConfiguration(); config.width = w; config.height = h
    config.minimumFrameInterval = CMTime(value: 1, timescale: fps); config.showsCursor = false; config.queueDepth = 8
    config.capturesAudio = true; config.sampleRate = 48000; config.channelCount = 2
    let filter = SCContentFilter(desktopIndependentWindow: window)
    let rec = try Recorder(url: outURL, width: w, height: h)
    let stream = SCStream(filter: filter, configuration: config, delegate: rec)
    try stream.addStreamOutput(rec, type: .screen, sampleHandlerQueue: DispatchQueue(label: "v"))
    try stream.addStreamOutput(rec, type: .audio, sampleHandlerQueue: DispatchQueue(label: "a"))
    try await stream.startCapture()
    print("recording window \(window.windowID) \(Int(window.frame.width))x\(Int(window.frame.height)) on screen: \(window.isOnScreen)")
    try await Task.sleep(nanoseconds: UInt64(seconds * 1e9))
    try await stream.stopCapture()
    rec.video.markAsFinished(); rec.audio.markAsFinished()
    await rec.writer.finishWriting()
    print("frames \(rec.frames) audio buffers \(rec.audioBuffers) -> \(outURL.path)")
  } catch { print("error: \(error)") }
  sema.signal()
}
sema.wait()

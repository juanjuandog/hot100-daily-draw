import AppKit
import Carbon.HIToolbox

final class FloatingPanel: NSPanel {
    override var canBecomeKey: Bool { true }
    override var canBecomeMain: Bool { false }
}

class DraggingView: NSView {
    private var dragStartLocation: NSPoint = .zero

    override func mouseDown(with event: NSEvent) {
        guard let window = self.window else { return }
        let mouseLocation = NSEvent.mouseLocation
        dragStartLocation = NSPoint(
            x: mouseLocation.x - window.frame.origin.x,
            y: mouseLocation.y - window.frame.origin.y
        )
    }

    override func mouseDragged(with event: NSEvent) {
        guard let window = self.window else { return }
        let mouseLocation = NSEvent.mouseLocation
        let newOrigin = NSPoint(
            x: mouseLocation.x - dragStartLocation.x,
            y: mouseLocation.y - dragStartLocation.y
        )
        window.setFrameOrigin(newOrigin)
    }
}

final class CountdownCardView: DraggingView {
    private let titleLabel = NSTextField(labelWithString: "秋招倒计时")
    private let countLabel = NSTextField(labelWithString: "")
    private let footerLabel = NSTextField(labelWithString: "")
    private var timer: Timer?

    override init(frame frameRect: NSRect) {
        super.init(frame: frameRect)
        wantsLayer = true
        layer?.cornerRadius = 28
        layer?.masksToBounds = true
        layer?.borderWidth = 1
        layer?.borderColor = NSColor(calibratedRed: 0.62, green: 0.81, blue: 0.98, alpha: 0.55).cgColor
        setupGradient()
        setupLabels()
        updateCountdown()
        timer = Timer.scheduledTimer(withTimeInterval: 3600, repeats: true) { [weak self] _ in
            self?.updateCountdown()
        }
    }

    required init?(coder: NSCoder) {
        fatalError("init(coder:) has not been implemented")
    }

    deinit {
        timer?.invalidate()
    }

    private func setupGradient() {
        let gradient = CAGradientLayer()
        gradient.colors = [
            NSColor(calibratedRed: 0.98, green: 0.995, blue: 1.0, alpha: 0.98).cgColor,
            NSColor(calibratedRed: 0.93, green: 0.97, blue: 1.0, alpha: 0.98).cgColor
        ]
        gradient.locations = [0, 1]
        gradient.startPoint = CGPoint(x: 0, y: 1)
        gradient.endPoint = CGPoint(x: 1, y: 0)
        gradient.cornerRadius = 28
        layer?.insertSublayer(gradient, at: 0)
    }

    override func layout() {
        super.layout()
        layer?.sublayers?.first?.frame = bounds
    }

    private func setupLabels() {
        titleLabel.font = NSFont.systemFont(ofSize: 15, weight: .semibold)
        titleLabel.textColor = NSColor(calibratedRed: 0.25, green: 0.45, blue: 0.72, alpha: 1)

        countLabel.font = NSFont.systemFont(ofSize: 32, weight: .heavy)
        countLabel.textColor = NSColor(calibratedRed: 0.13, green: 0.25, blue: 0.42, alpha: 1)

        footerLabel.font = NSFont.systemFont(ofSize: 12, weight: .medium)
        footerLabel.textColor = NSColor(calibratedRed: 0.39, green: 0.52, blue: 0.68, alpha: 1)

        let stack = NSStackView(views: [titleLabel, countLabel, footerLabel])
        stack.orientation = .vertical
        stack.alignment = .leading
        stack.spacing = 6
        stack.translatesAutoresizingMaskIntoConstraints = false

        addSubview(stack)

        NSLayoutConstraint.activate([
            stack.leadingAnchor.constraint(equalTo: leadingAnchor, constant: 20),
            stack.trailingAnchor.constraint(equalTo: trailingAnchor, constant: -20),
            stack.topAnchor.constraint(equalTo: topAnchor, constant: 18),
            stack.bottomAnchor.constraint(equalTo: bottomAnchor, constant: -18)
        ])
    }

    private func updateCountdown() {
        let calendar = Calendar.current
        let today = calendar.startOfDay(for: Date())
        let currentYear = calendar.component(.year, from: today)

        var targetComponents = DateComponents()
        targetComponents.year = currentYear
        targetComponents.month = 9
        targetComponents.day = 1

        let thisYearTarget = calendar.date(from: targetComponents) ?? today
        let targetDate: Date
        if today > thisYearTarget {
            targetComponents.year = currentYear + 1
            targetDate = calendar.date(from: targetComponents) ?? thisYearTarget
        } else {
            targetDate = thisYearTarget
        }

        let dayCount = calendar.dateComponents([.day], from: today, to: targetDate).day ?? 0
        countLabel.stringValue = "还剩 \(dayCount) 天"

        let formatter = DateFormatter()
        formatter.locale = Locale(identifier: "zh_CN")
        formatter.dateFormat = "M月d日"
        footerLabel.stringValue = "目标日：\(formatter.string(from: targetDate))"
    }
}

final class CountdownWindowController: NSWindowController {
    convenience init() {
        let cardSize = NSSize(width: 248, height: 116)
        let screen = NSScreen.main?.visibleFrame ?? NSRect(x: 0, y: 0, width: 1440, height: 900)
        let origin = NSPoint(
            x: screen.maxX - cardSize.width - 24,
            y: screen.maxY - cardSize.height - 20
        )

        let window = FloatingPanel(
            contentRect: NSRect(origin: origin, size: cardSize),
            styleMask: [.borderless, .nonactivatingPanel],
            backing: .buffered,
            defer: false
        )

        window.isOpaque = false
        window.backgroundColor = .clear
        window.hasShadow = true
        window.level = .statusBar
        window.collectionBehavior = [.canJoinAllSpaces, .fullScreenAuxiliary, .stationary, .ignoresCycle]
        window.isFloatingPanel = true
        window.hidesOnDeactivate = false
        window.becomesKeyOnlyIfNeeded = true
        window.isReleasedWhenClosed = false
        window.ignoresMouseEvents = false
        window.isMovableByWindowBackground = false
        window.contentView = CountdownCardView(frame: NSRect(origin: .zero, size: cardSize))

        self.init(window: window)
    }

    func toggleVisibility() {
        guard let window = window else { return }
        if window.isVisible {
            window.orderOut(nil)
        } else {
            window.makeKeyAndOrderFront(nil)
            window.orderFrontRegardless()
            NSApp.activate(ignoringOtherApps: true)
        }
    }
}

final class AppDelegate: NSObject, NSApplicationDelegate {
    private var windowController: CountdownWindowController?
    private var hotKeyRef: EventHotKeyRef?

    private static let hotKeySignature: OSType = 0x48543130
    private static let hotKeyId: UInt32 = 1

    func applicationDidFinishLaunching(_ notification: Notification) {
        NSApp.setActivationPolicy(.accessory)
        windowController = CountdownWindowController()
        windowController?.showWindow(nil)
        windowController?.window?.makeKeyAndOrderFront(nil)
        windowController?.window?.orderFrontRegardless()
        NSApp.activate(ignoringOtherApps: true)
        registerHotKey()
    }

    func applicationWillTerminate(_ notification: Notification) {
        if let hotKeyRef {
            UnregisterEventHotKey(hotKeyRef)
        }
    }

    private func registerHotKey() {
        var hotKeyID = EventHotKeyID(
            signature: Self.hotKeySignature,
            id: Self.hotKeyId
        )

        let eventSpec = EventTypeSpec(
            eventClass: OSType(kEventClassKeyboard),
            eventKind: UInt32(kEventHotKeyPressed)
        )

        InstallEventHandler(
            GetApplicationEventTarget(),
            { _, eventRef, userData in
                guard let eventRef else { return noErr }
                var hotKeyID = EventHotKeyID()
                let status = GetEventParameter(
                    eventRef,
                    EventParamName(kEventParamDirectObject),
                    EventParamType(typeEventHotKeyID),
                    nil,
                    MemoryLayout<EventHotKeyID>.size,
                    nil,
                    &hotKeyID
                )

                guard status == noErr,
                      hotKeyID.signature == AppDelegate.hotKeySignature,
                      hotKeyID.id == AppDelegate.hotKeyId,
                      let userData else {
                    return noErr
                }

                let delegate = Unmanaged<AppDelegate>.fromOpaque(userData).takeUnretainedValue()
                delegate.windowController?.toggleVisibility()
                return noErr
            },
            1,
            [eventSpec],
            UnsafeMutableRawPointer(Unmanaged.passUnretained(self).toOpaque()),
            nil
        )

        let modifiers = UInt32(controlKey) | UInt32(optionKey) | UInt32(shiftKey)
        RegisterEventHotKey(
            UInt32(kVK_ANSI_D),
            modifiers,
            hotKeyID,
            GetApplicationEventTarget(),
            0,
            &hotKeyRef
        )
    }
}

let app = NSApplication.shared
let delegate = AppDelegate()
app.delegate = delegate
app.run()

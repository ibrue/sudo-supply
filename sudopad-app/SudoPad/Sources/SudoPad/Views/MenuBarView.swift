import SwiftUI

/// Menu bar popover content — terminal-brutalist styling
struct MenuBarView: View {
    @ObservedObject var engine: SudoPadEngine

    var body: some View {
        VStack(alignment: .leading, spacing: 0) {
            // Header
            HStack {
                Text("[sudo]")
                    .font(.system(size: 14, weight: .bold, design: .monospaced))
                    .foregroundColor(Color(hex: 0x00FF41))
                Text("pad")
                    .font(.system(size: 14, weight: .regular, design: .monospaced))
                    .foregroundColor(.white)
                Spacer()
                Circle()
                    .fill(engine.isConnected ? Color(hex: 0x00FF41) : Color(hex: 0xFF3333))
                    .frame(width: 6, height: 6)
            }
            .padding(.horizontal, 16)
            .padding(.top, 14)
            .padding(.bottom, 10)

            Divider()
                .background(Color(hex: 0x1E1E1E))

            // Status
            VStack(alignment: .leading, spacing: 6) {
                statusRow(label: "app", value: engine.detectedApp)
                statusRow(label: "last", value: engine.lastAction)
                if !engine.lastMethod.isEmpty {
                    statusRow(label: "via", value: engine.lastMethod)
                }
            }
            .padding(.horizontal, 16)
            .padding(.vertical, 10)

            Divider()
                .background(Color(hex: 0x1E1E1E))

            // Button map
            VStack(alignment: .leading, spacing: 4) {
                Text("> button map")
                    .font(.system(size: 10, design: .monospaced))
                    .foregroundColor(Color(hex: 0x666666))
                    .padding(.bottom, 2)

                ForEach(PadAction.allCases, id: \.rawValue) { action in
                    HStack {
                        Text("F\(keyNumber(action))")
                            .font(.system(size: 11, design: .monospaced))
                            .foregroundColor(Color(hex: 0x00FF41))
                            .frame(width: 30, alignment: .leading)
                        Text(action.displayName)
                            .font(.system(size: 11, design: .monospaced))
                            .foregroundColor(.white)
                    }
                }
            }
            .padding(.horizontal, 16)
            .padding(.vertical, 10)

            Divider()
                .background(Color(hex: 0x1E1E1E))

            // Footer actions
            HStack {
                Button("Quit") {
                    NSApplication.shared.terminate(nil)
                }
                .buttonStyle(.plain)
                .font(.system(size: 11, design: .monospaced))
                .foregroundColor(Color(hex: 0x666666))

                Spacer()

                Text("v1.0.0")
                    .font(.system(size: 10, design: .monospaced))
                    .foregroundColor(Color(hex: 0x333333))
            }
            .padding(.horizontal, 16)
            .padding(.vertical, 10)
        }
        .frame(width: 300)
        .background(Color(hex: 0x0A0A0A))
    }

    private func statusRow(label: String, value: String) -> some View {
        HStack(alignment: .top) {
            Text("\(label):")
                .font(.system(size: 11, design: .monospaced))
                .foregroundColor(Color(hex: 0x666666))
                .frame(width: 36, alignment: .leading)
            Text(value)
                .font(.system(size: 11, design: .monospaced))
                .foregroundColor(.white)
                .lineLimit(2)
        }
    }

    private func keyNumber(_ action: PadAction) -> Int {
        switch action {
        case .approve: return 13
        case .reject:  return 14
        case .action3: return 15
        case .action4: return 16
        }
    }
}

extension Color {
    init(hex: UInt32) {
        let r = Double((hex >> 16) & 0xFF) / 255.0
        let g = Double((hex >> 8) & 0xFF) / 255.0
        let b = Double(hex & 0xFF) / 255.0
        self.init(red: r, green: g, blue: b)
    }
}

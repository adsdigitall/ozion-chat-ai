import SwiftUI

struct ContentView: View {
    private let appURL = URL(string: "https://app.mdii.com.br/dashboard")!
    @State private var isLoading = true
    @State private var errorMessage: String?
    @State private var reloadToken = UUID()

    var body: some View {
        ZStack {
            Color(red: 0.035, green: 0.035, blue: 0.043)
                .ignoresSafeArea()

            OzionWebView(
                url: appURL,
                reloadToken: reloadToken,
                isLoading: $isLoading,
                errorMessage: $errorMessage
            )
            .ignoresSafeArea(.container, edges: .bottom)

            if isLoading {
                loadingView
            }

            if let errorMessage {
                errorView(errorMessage)
            }
        }
    }

    private var loadingView: some View {
        VStack(spacing: 18) {
            ZStack {
                RoundedRectangle(cornerRadius: 22, style: .continuous)
                    .fill(.linearGradient(colors: [.green, .mint], startPoint: .topLeading, endPoint: .bottomTrailing))
                    .frame(width: 78, height: 78)

                Image(systemName: "bolt.fill")
                    .font(.system(size: 34, weight: .bold))
                    .foregroundStyle(.white)
            }
            .shadow(color: .green.opacity(0.25), radius: 28, y: 12)

            Text("Ozion")
                .font(.system(size: 28, weight: .bold, design: .rounded))
                .foregroundStyle(.white)

            ProgressView()
                .tint(.green)
        }
        .padding(28)
        .background(.ultraThinMaterial, in: RoundedRectangle(cornerRadius: 28, style: .continuous))
    }

    private func errorView(_ message: String) -> some View {
        VStack(spacing: 14) {
            Image(systemName: "wifi.exclamationmark")
                .font(.system(size: 36, weight: .semibold))
                .foregroundStyle(.yellow)

            Text("Não consegui abrir o Ozion")
                .font(.headline)
                .foregroundStyle(.white)

            Text(message)
                .font(.footnote)
                .multilineTextAlignment(.center)
                .foregroundStyle(.secondary)

            Button {
                errorMessage = nil
                isLoading = true
                reloadToken = UUID()
            } label: {
                Label("Tentar novamente", systemImage: "arrow.clockwise")
                    .font(.subheadline.weight(.semibold))
                    .padding(.horizontal, 18)
                    .padding(.vertical, 12)
            }
            .buttonStyle(.borderedProminent)
            .tint(.green)
        }
        .padding(24)
        .frame(maxWidth: 340)
        .background(.ultraThinMaterial, in: RoundedRectangle(cornerRadius: 24, style: .continuous))
        .padding()
    }
}

#Preview {
    ContentView()
}

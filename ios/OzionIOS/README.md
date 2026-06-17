# Ozion iOS

App iOS nativo em SwiftUI que abre `https://app.mdii.com.br` dentro de um `WKWebView`, com tela de carregamento e erro/recarregar.

## Como abrir

1. Instale/abra o Xcode completo.
2. Abra `ios/OzionIOS/OzionIOS.xcodeproj`.
3. Selecione o target `Ozion`.
4. Em **Signing & Capabilities**, escolha sua equipe Apple.
5. Rode no Simulator ou iPhone.

## Ajustes importantes

- Bundle ID atual: `br.com.mdii.ozion`.
- URL inicial: `https://app.mdii.com.br/dashboard`.
- O app depende do web app estar publicado e funcionando na Vercel.

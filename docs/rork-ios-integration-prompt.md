# PROMPT PER RORK MAX - Integrazione iOS Nativa (Swift/SwiftUI)

## PROBLEMA CRITICO
Le funzionalità di Aria (chat e voce) e le metriche non funzionano perché il codice iOS usa API web (React SDK, browser APIs) che **NON ESISTONO** in Swift nativo. Questo prompt fornisce le implementazioni **native iOS** corrette.

## CONFIGURAZIONE SUPABASE
```
URL: https://yzlszvvhbcasbzsaastq.supabase.co
Anon Key: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inl6bHN6dnZoYmNhc2J6c2Fhc3RxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MTY4ODg3MDUsImV4cCI6MjAzMjQ2NDcwNX0.8tYpQvH8yC96iG9Hsh9_rCoT4
```

**REGOLA CRITICA**: Ogni chiamata alle Edge Functions DEVE includere questi header:
```
Authorization: Bearer <access_token dalla sessione Supabase>
apikey: <anon_key>
Content-Type: application/json
```

**FALLBACK AUTH (CRITICO per ai-chat)**: Il backend `ai-chat` supporta 3 metodi di autenticazione in cascata:
1. **Header JWT** (Authorization: Bearer <userJWT>) — metodo primario
2. **Body accessToken** — se l'header fallisce, il backend prova con `accessToken` nel body JSON
3. **Body userId** — ultimo resort, il backend usa il service role per caricare il profilo

**OBBLIGATORIO**: Invia SEMPRE `accessToken` e `userId` nel body JSON di `ai-chat`:
```json
{
  "conversationHistory": [...],
  "accessToken": "<session.accessToken>",
  "userId": "<session.user.id>"
}
```
Questo garantisce che Aria abbia SEMPRE le sue istruzioni complete (~2500 righe), memorie e personalità, anche se il JWT nell'header viene ignorato o corrotto.

---

## INCOMPATIBILITÀ WEB → iOS NATIVO

| Funzionalità | Web (React) - NON USARE | iOS Nativo (Swift) - USARE |
|---|---|---|
| **Aria Chat streaming** | `fetch()` + `ReadableStream` | `URLSession` + `AsyncBytes` |
| **Aria Voce** | `@elevenlabs/react` (useConversation) | **WebSocket nativo** (`URLSessionWebSocketTask`) |
| **Speech Recognition** | `webkitSpeechRecognition` | `Speech.framework` (`SFSpeechRecognizer`) |
| **Speech Synthesis** | `window.speechSynthesis` | `AVSpeechSynthesizer` |
| **Audio playback** | `new Audio(url)` | `AVAudioPlayer` / `AVAudioEngine` |

---

## 1. ARIA CHAT (Streaming SSE con URLSession)

### Implementazione Swift CORRETTA

```swift
import Foundation

class AriaChatService {
    private let baseURL = "https://yzlszvvhbcasbzsaastq.supabase.co/functions/v1"
    
    /// Invia messaggio e ricevi risposta in streaming SSE
    func sendMessage(
        message: String,
        sessionId: String,
        conversationHistory: [[String: String]],
        accessToken: String,
        onChunk: @escaping (String) -> Void,
        onComplete: @escaping (String) -> Void,
        onError: @escaping (Error) -> Void
    ) {
        guard let url = URL(string: "\(baseURL)/ai-chat") else { return }
        
        var request = URLRequest(url: url)
        request.httpMethod = "POST"
        request.setValue("Bearer \(accessToken)", forHTTPHeaderField: "Authorization")
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        request.setValue("eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inl6bHN6dnZoYmNhc2J6c2Fhc3RxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MTY4ODg3MDUsImV4cCI6MjAzMjQ2NDcwNX0.8tYpQvH8yC96iG9Hsh9_rCoT4", forHTTPHeaderField: "apikey")
        
        // IMPORTANTE: Invia accessToken e userId anche nel body come fallback auth
        let userId = try? await SupabaseManager.shared.client.auth.session.user.id.uuidString
        let body: [String: Any] = [
            "message": message,
            "sessionId": sessionId,
            "conversationHistory": conversationHistory,
            "accessToken": accessToken,
            "userId": userId ?? ""
        ]
        request.httpBody = try? JSONSerialization.data(withJSONObject: body)
        
        // IMPORTANTE: Usare URLSession per streaming
        let task = URLSession.shared.dataTask(with: request) { data, response, error in
            if let error = error {
                onError(error)
                return
            }
            
            guard let data = data,
                  let text = String(data: data, encoding: .utf8) else { return }
            
            // Parse SSE response
            var fullResponse = ""
            let lines = text.components(separatedBy: "\n")
            
            for line in lines {
                if line.hasPrefix("data: ") {
                    let dataStr = String(line.dropFirst(6))
                    if dataStr == "[DONE]" { break }
                    
                    if let jsonData = dataStr.data(using: .utf8),
                       let json = try? JSONSerialization.jsonObject(with: jsonData) as? [String: Any],
                       let choices = json["choices"] as? [[String: Any]],
                       let delta = choices.first?["delta"] as? [String: Any],
                       let content = delta["content"] as? String {
                        fullResponse += content
                        DispatchQueue.main.async { onChunk(content) }
                    }
                }
            }
            
            DispatchQueue.main.async { onComplete(fullResponse) }
        }
        task.resume()
    }
    
    /// Versione con async/await e streaming reale
    func sendMessageStream(
        message: String,
        sessionId: String,
        conversationHistory: [[String: String]],
        accessToken: String
    ) -> AsyncThrowingStream<String, Error> {
        AsyncThrowingStream { continuation in
            guard let url = URL(string: "\(baseURL)/ai-chat") else {
                continuation.finish(throwing: URLError(.badURL))
                return
            }
            
            var request = URLRequest(url: url)
            request.httpMethod = "POST"
            request.setValue("Bearer \(accessToken)", forHTTPHeaderField: "Authorization")
            request.setValue("application/json", forHTTPHeaderField: "Content-Type")
            request.setValue("eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inl6bHN6dnZoYmNhc2J6c2Fhc3RxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MTY4ODg3MDUsImV4cCI6MjAzMjQ2NDcwNX0.8tYpQvH8yC96iG9Hsh9_rCoT4", forHTTPHeaderField: "apikey")
            
            // IMPORTANTE: Invia accessToken e userId anche nel body come fallback auth
            let userId = try? await SupabaseManager.shared.client.auth.session.user.id.uuidString
            let body: [String: Any] = [
                "message": message,
                "sessionId": sessionId,
                "conversationHistory": conversationHistory,
                "accessToken": accessToken,
                "userId": userId ?? ""
            ]
            request.httpBody = try? JSONSerialization.data(withJSONObject: body)
            
            let task = Task {
                do {
                    let (bytes, _) = try await URLSession.shared.bytes(for: request)
                    
                    for try await line in bytes.lines {
                        if line.hasPrefix("data: ") {
                            let dataStr = String(line.dropFirst(6))
                            if dataStr == "[DONE]" { break }
                            
                            if let jsonData = dataStr.data(using: .utf8),
                               let json = try? JSONSerialization.jsonObject(with: jsonData) as? [String: Any],
                               let choices = json["choices"] as? [[String: Any]],
                               let delta = choices.first?["delta"] as? [String: Any],
                               let content = delta["content"] as? String {
                                continuation.yield(content)
                            }
                        }
                    }
                    continuation.finish()
                } catch {
                    continuation.finish(throwing: error)
                }
            }
            
            continuation.onTermination = { _ in task.cancel() }
        }
    }
}
```

### SwiftUI ViewModel per Chat

```swift
@MainActor
class AriaChatViewModel: ObservableObject {
    @Published var messages: [ChatMessage] = []
    @Published var currentResponse = ""
    @Published var isLoading = false
    
    private let chatService = AriaChatService()
    private var sessionId: String?
    
    func sendMessage(_ text: String, accessToken: String, userId: String) async {
        // 1. Crea sessione se non esiste
        if sessionId == nil {
            sessionId = await createSession(userId: userId, accessToken: accessToken)
        }
        
        guard let sessionId = sessionId else { return }
        
        // 2. Aggiungi messaggio utente alla UI
        let userMsg = ChatMessage(role: "user", content: text)
        messages.append(userMsg)
        
        // 3. Salva in database
        await saveChatMessage(sessionId: sessionId, userId: userId, role: "user", content: text, accessToken: accessToken)
        
        // 4. Streaming risposta
        isLoading = true
        currentResponse = ""
        
        let history = messages.map { ["role": $0.role, "content": $0.content] }
        
        do {
            for try await chunk in chatService.sendMessageStream(
                message: text,
                sessionId: sessionId,
                conversationHistory: history,
                accessToken: accessToken
            ) {
                currentResponse += chunk
            }
            
            // 5. Aggiungi risposta completa
            let aiMsg = ChatMessage(role: "assistant", content: currentResponse)
            messages.append(aiMsg)
            
            // 6. Salva risposta in database
            await saveChatMessage(sessionId: sessionId, userId: userId, role: "assistant", content: currentResponse, accessToken: accessToken)
            
            currentResponse = ""
        } catch {
            print("Errore streaming: \(error)")
        }
        
        isLoading = false
    }
    
    func endSession(accessToken: String) async {
        guard let sessionId = sessionId else { return }
        
        // Chiudi sessione e processa
        // ... update session status to 'completed'
        // ... invoke 'process-session' edge function
        await processSession(sessionId: sessionId, accessToken: accessToken)
    }
    
    private func processSession(sessionId: String, accessToken: String) async {
        guard let url = URL(string: "https://yzlszvvhbcasbzsaastq.supabase.co/functions/v1/process-session") else { return }
        
        var request = URLRequest(url: url)
        request.httpMethod = "POST"
        request.setValue("Bearer \(accessToken)", forHTTPHeaderField: "Authorization")
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        request.setValue("eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inl6bHN6dnZoYmNhc2J6c2Fhc3RxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MTY4ODg3MDUsImV4cCI6MjAzMjQ2NDcwNX0.8tYpQvH8yC96iG9Hsh9_rCoT4", forHTTPHeaderField: "apikey")
        request.httpBody = try? JSONSerialization.data(withJSONObject: ["sessionId": sessionId])
        
        _ = try? await URLSession.shared.data(for: request)
    }
    
    // Helper functions for Supabase REST API calls
    private func createSession(userId: String, accessToken: String) async -> String? {
        // POST to Supabase REST API: /rest/v1/sessions
        // Return session ID
        return nil // implement with actual Supabase call
    }
    
    private func saveChatMessage(sessionId: String, userId: String, role: String, content: String, accessToken: String) async {
        // POST to Supabase REST API: /rest/v1/chat_messages
    }
}
```

---

## 2. ARIA VOCE (ElevenLabs via WebSocket Nativo)

### ⚠️ NON usare `@elevenlabs/react` — è solo per React/browser!

L'unica via per iOS nativo è connettersi direttamente al **WebSocket** di ElevenLabs usando la `signed_url`.

### Agent ID: `agent_2901khw977kbesesvd00yh2mbeyx`

### Implementazione Swift

```swift
import Foundation
import AVFoundation

class AriaVoiceService: NSObject, ObservableObject {
    @Published var isConnected = false
    @Published var isSpeaking = false
    @Published var transcript = ""
    
    private var webSocket: URLSessionWebSocketTask?
    private var audioEngine = AVAudioEngine()
    private var audioPlayer = AVAudioPlayerNode()
    
    private let baseURL = "https://yzlszvvhbcasbzsaastq.supabase.co/functions/v1"
    
    /// STEP 1: Ottieni signed URL dal backend
    func startSession(accessToken: String) async throws {
        // 1a. Ottieni signed_url (WebSocket) dal nostro backend
        guard let tokenURL = URL(string: "\(baseURL)/elevenlabs-conversation-token") else { return }
        
        var tokenRequest = URLRequest(url: tokenURL)
        tokenRequest.httpMethod = "POST"
        tokenRequest.setValue("Bearer \(accessToken)", forHTTPHeaderField: "Authorization")
        tokenRequest.setValue("application/json", forHTTPHeaderField: "Content-Type")
        tokenRequest.setValue("eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inl6bHN6dnZoYmNhc2J6c2Fhc3RxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MTY4ODg3MDUsImV4cCI6MjAzMjQ2NDcwNX0.8tYpQvH8yC96iG9Hsh9_rCoT4", forHTTPHeaderField: "apikey")
        tokenRequest.httpBody = "{}".data(using: .utf8)
        
        let (tokenData, _) = try await URLSession.shared.data(for: tokenRequest)
        let tokenJSON = try JSONSerialization.jsonObject(with: tokenData) as? [String: Any]
        
        guard let signedUrl = tokenJSON?["signed_url"] as? String else {
            throw NSError(domain: "AriaVoice", code: 1, userInfo: [NSLocalizedDescriptionKey: "No signed_url received"])
        }
        
        // 1b. Ottieni contesto (system prompt) dal nostro backend
        guard let contextURL = URL(string: "\(baseURL)/elevenlabs-context") else { return }
        
        var contextRequest = URLRequest(url: contextURL)
        contextRequest.httpMethod = "POST"
        contextRequest.setValue("Bearer \(accessToken)", forHTTPHeaderField: "Authorization")
        contextRequest.setValue("application/json", forHTTPHeaderField: "Content-Type")
        contextRequest.setValue("eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inl6bHN6dnZoYmNhc2J6c2Fhc3RxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MTY4ODg3MDUsImV4cCI6MjAzMjQ2NDcwNX0.8tYpQvH8yC96iG9Hsh9_rCoT4", forHTTPHeaderField: "apikey")
        contextRequest.httpBody = "{}".data(using: .utf8)
        
        let (contextData, _) = try await URLSession.shared.data(for: contextRequest)
        let contextJSON = try JSONSerialization.jsonObject(with: contextData) as? [String: Any]
        
        let systemPrompt = contextJSON?["system_prompt"] as? String ?? ""
        let firstMessage = contextJSON?["first_message"] as? String ?? "Ciao, come stai?"
        
        // 2. Connetti al WebSocket ElevenLabs
        await connectWebSocket(signedUrl: signedUrl, systemPrompt: systemPrompt, firstMessage: firstMessage)
    }
    
    /// STEP 2: Connessione WebSocket diretta a ElevenLabs
    private func connectWebSocket(signedUrl: String, systemPrompt: String, firstMessage: String) async {
        guard let url = URL(string: signedUrl) else { return }
        
        let session = URLSession(configuration: .default, delegate: nil, delegateQueue: nil)
        webSocket = session.webSocketTask(with: url)
        webSocket?.resume()
        
        DispatchQueue.main.async {
            self.isConnected = true
        }
        
        // Invia configurazione iniziale con override del system prompt
        let initMessage: [String: Any] = [
            "type": "conversation_initiation_client_data",
            "conversation_config_override": [
                "agent": [
                    "prompt": ["prompt": systemPrompt],
                    "first_message": firstMessage,
                    "language": "it"
                ]
            ]
        ]
        
        if let data = try? JSONSerialization.data(withJSONObject: initMessage),
           let str = String(data: data, encoding: .utf8) {
            try? await webSocket?.send(.string(str))
        }
        
        // Avvia audio capture + invio
        startAudioCapture()
        
        // Ascolta messaggi dal server
        listenForMessages()
    }
    
    /// STEP 3: Cattura audio dal microfono e invia via WebSocket
    private func startAudioCapture() {
        let audioSession = AVAudioSession.sharedInstance()
        try? audioSession.setCategory(.playAndRecord, mode: .voiceChat, options: [.defaultToSpeaker, .allowBluetooth])
        try? audioSession.setActive(true)
        
        let inputNode = audioEngine.inputNode
        let format = AVAudioFormat(commonFormat: .pcmFormatInt16, sampleRate: 16000, channels: 1, interleaved: false)!
        
        // Converter per downsampling
        let inputFormat = inputNode.outputFormat(forBus: 0)
        
        inputNode.installTap(onBus: 0, bufferSize: 4096, format: inputFormat) { [weak self] buffer, time in
            // Converti in base64 PCM 16kHz e invia via WebSocket
            guard let self = self else { return }
            
            // Semplificato: converti buffer in base64
            let audioData = self.bufferToData(buffer: buffer)
            let base64 = audioData.base64EncodedString()
            
            let audioMessage: [String: Any] = [
                "user_audio_chunk": base64
            ]
            
            if let data = try? JSONSerialization.data(withJSONObject: audioMessage),
               let str = String(data: data, encoding: .utf8) {
                self.webSocket?.send(.string(str)) { _ in }
            }
        }
        
        try? audioEngine.start()
    }
    
    /// STEP 4: Ascolta risposte audio dal server
    private func listenForMessages() {
        webSocket?.receive { [weak self] result in
            switch result {
            case .success(let message):
                switch message {
                case .string(let text):
                    self?.handleServerMessage(text)
                case .data(let data):
                    // Audio binario da riprodurre
                    self?.playAudioData(data)
                @unknown default:
                    break
                }
                // Continua ad ascoltare
                self?.listenForMessages()
                
            case .failure(let error):
                print("WebSocket error: \(error)")
                DispatchQueue.main.async {
                    self?.isConnected = false
                }
            }
        }
    }
    
    /// Gestisci messaggi JSON dal server ElevenLabs
    private func handleServerMessage(_ text: String) {
        guard let data = text.data(using: .utf8),
              let json = try? JSONSerialization.jsonObject(with: data) as? [String: Any],
              let type = json["type"] as? String else { return }
        
        switch type {
        case "user_transcript":
            // Trascrizione di ciò che ha detto l'utente
            if let event = json["user_transcription_event"] as? [String: Any],
               let transcript = event["user_transcript"] as? String {
                DispatchQueue.main.async {
                    self.transcript = transcript
                }
            }
            
        case "agent_response":
            // Risposta testuale di Aria
            if let event = json["agent_response_event"] as? [String: Any],
               let response = event["agent_response"] as? String {
                print("Aria dice: \(response)")
            }
            
        case "audio":
            // Audio base64 da riprodurre (solo WebSocket, non WebRTC)
            if let audioEvent = json["audio_event"] as? [String: Any],
               let audioBase64 = audioEvent["audio_base_64"] as? String,
               let audioData = Data(base64Encoded: audioBase64) {
                playAudioData(audioData)
            }
            
        case "interruption":
            // L'utente ha interrotto Aria
            stopPlayback()
            
        case "ping":
            // Rispondi con pong per mantenere la connessione
            let pong = ["type": "pong"]
            if let data = try? JSONSerialization.data(withJSONObject: pong),
               let str = String(data: data, encoding: .utf8) {
                webSocket?.send(.string(str)) { _ in }
            }
            
        default:
            break
        }
    }
    
    /// Riproduci audio ricevuto dal server
    private func playAudioData(_ data: Data) {
        DispatchQueue.main.async { self.isSpeaking = true }
        
        // Usa AVAudioPlayer per riprodurre il chunk audio
        DispatchQueue.global().async {
            do {
                let player = try AVAudioPlayer(data: data)
                player.play()
                
                // Aspetta che finisca
                while player.isPlaying {
                    Thread.sleep(forTimeInterval: 0.05)
                }
                
                DispatchQueue.main.async { self.isSpeaking = false }
            } catch {
                print("Errore riproduzione audio: \(error)")
                DispatchQueue.main.async { self.isSpeaking = false }
            }
        }
    }
    
    /// Ferma riproduzione audio
    private func stopPlayback() {
        DispatchQueue.main.async { self.isSpeaking = false }
    }
    
    /// Chiudi sessione
    func endSession() {
        audioEngine.stop()
        audioEngine.inputNode.removeTap(onBus: 0)
        webSocket?.cancel(with: .normalClosure, reason: nil)
        
        DispatchQueue.main.async {
            self.isConnected = false
            self.isSpeaking = false
        }
    }
    
    /// Helper: converti AVAudioPCMBuffer in Data
    private func bufferToData(buffer: AVAudioPCMBuffer) -> Data {
        let channelData = buffer.floatChannelData![0]
        let frameCount = Int(buffer.frameLength)
        
        var int16Data = [Int16](repeating: 0, count: frameCount)
        for i in 0..<frameCount {
            let sample = max(-1.0, min(1.0, channelData[i]))
            int16Data[i] = Int16(sample * Float(Int16.max))
        }
        
        return Data(bytes: &int16Data, count: frameCount * 2)
    }
}
```

### Approccio ALTERNATIVO più semplice: Aria Voice senza ElevenLabs

Se il WebSocket ElevenLabs è troppo complesso, usa `aria-agent-backend` con `AVSpeechSynthesizer` nativo:

```swift
class SimpleAriaVoice: ObservableObject {
    @Published var isListening = false
    @Published var isThinking = false
    @Published var isSpeaking = false
    @Published var transcript = ""
    
    private let speechRecognizer = SFSpeechRecognizer(locale: Locale(identifier: "it-IT"))
    private let audioEngine = AVAudioEngine()
    private let synthesizer = AVSpeechSynthesizer()
    private var recognitionTask: SFSpeechRecognitionTask?
    
    /// Avvia ascolto con Speech.framework nativo
    func startListening() {
        SFSpeechRecognizer.requestAuthorization { status in
            guard status == .authorized else { return }
        }
        
        let request = SFSpeechAudioBufferRecognitionRequest()
        request.shouldReportPartialResults = true
        
        let audioSession = AVAudioSession.sharedInstance()
        try? audioSession.setCategory(.record, mode: .measurement)
        try? audioSession.setActive(true)
        
        let inputNode = audioEngine.inputNode
        let format = inputNode.outputFormat(forBus: 0)
        
        inputNode.installTap(onBus: 0, bufferSize: 1024, format: format) { buffer, _ in
            request.append(buffer)
        }
        
        try? audioEngine.start()
        isListening = true
        
        recognitionTask = speechRecognizer?.recognitionTask(with: request) { [weak self] result, error in
            guard let result = result else { return }
            
            DispatchQueue.main.async {
                self?.transcript = result.bestTranscription.formattedString
            }
            
            // Quando l'utente smette di parlare (isFinal)
            if result.isFinal {
                self?.stopListening()
                Task { [weak self] in
                    await self?.sendToAria(text: result.bestTranscription.formattedString)
                }
            }
        }
    }
    
    func stopListening() {
        audioEngine.stop()
        audioEngine.inputNode.removeTap(onBus: 0)
        recognitionTask?.cancel()
        isListening = false
    }
    
    /// Invia testo a Aria backend e riproduci risposta
    private func sendToAria(text: String, accessToken: String = "") async {
        DispatchQueue.main.async { self.isThinking = true }
        
        guard let url = URL(string: "https://yzlszvvhbcasbzsaastq.supabase.co/functions/v1/aria-agent-backend") else { return }
        
        var request = URLRequest(url: url)
        request.httpMethod = "POST"
        request.setValue("Bearer \(accessToken)", forHTTPHeaderField: "Authorization")
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        request.setValue("eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inl6bHN6dnZoYmNhc2J6c2Fhc3RxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MTY4ODg3MDUsImV4cCI6MjAzMjQ2NDcwNX0.8tYpQvH8yC96iG9Hsh9_rCoT4", forHTTPHeaderField: "apikey")
        
        let body: [String: Any] = [
            "message": text,
            "conversationHistory": []
        ]
        request.httpBody = try? JSONSerialization.data(withJSONObject: body)
        
        do {
            let (data, _) = try await URLSession.shared.data(for: request)
            let json = try JSONSerialization.jsonObject(with: data) as? [String: Any]
            
            DispatchQueue.main.async { self.isThinking = false }
            
            if let response = json?["response"] as? String {
                // Riproduci con voce nativa iOS
                speak(text: response)
            }
        } catch {
            DispatchQueue.main.async { self.isThinking = false }
            print("Errore Aria: \(error)")
        }
    }
    
    /// Text-to-Speech con AVSpeechSynthesizer nativo
    private func speak(text: String) {
        let utterance = AVSpeechUtterance(string: text)
        utterance.voice = AVSpeechSynthesisVoice(language: "it-IT")
        utterance.rate = 0.5
        utterance.pitchMultiplier = 1.0
        
        DispatchQueue.main.async { self.isSpeaking = true }
        synthesizer.speak(utterance)
    }
}
```

---

## 3. DASHBOARD & WELLNESS SCORE

### Problema attuale
L'app legge `user_profiles.wellness_score` → sempre 0.

### Soluzione
Il Wellness Score è un **giudizio AI**, calcolato dalla Edge Function `ai-dashboard` e salvato in `user_profiles.ai_dashboard_cache`.

```swift
// 1. Chiama Edge Function per rigenerare (se cache scaduta)
func refreshDashboard(accessToken: String) async {
    guard let url = URL(string: "https://yzlszvvhbcasbzsaastq.supabase.co/functions/v1/ai-dashboard") else { return }
    
    var request = URLRequest(url: url)
    request.httpMethod = "POST"
    request.setValue("Bearer \(accessToken)", forHTTPHeaderField: "Authorization")
    request.setValue("application/json", forHTTPHeaderField: "Content-Type")
    request.setValue("<anon_key>", forHTTPHeaderField: "apikey")
    request.httpBody = "{}".data(using: .utf8)
    
    _ = try? await URLSession.shared.data(for: request)
}

// 2. Leggi dalla cache nel profilo (via Supabase REST API)
// GET /rest/v1/user_profiles?select=ai_dashboard_cache,ai_cache_updated_at&user_id=eq.<userId>
// Il campo ai_dashboard_cache contiene:
// {
//   "wellness_score": 7.5,        ← QUESTO è il vero punteggio
//   "wellness_trend": "stable",
//   "mood_summary": "...",
//   "energy_summary": "...",
//   "top_insights": [...],
//   "suggested_actions": [...]
// }
```

---

## 4. METRICHE GIORNALIERE (Vitals)

```swift
// Chiama la RPC get_daily_metrics via Supabase REST API
// POST /rest/v1/rpc/get_daily_metrics
// Body: { "p_user_id": "<userId>", "p_date": "2026-02-21" }

// Risposta:
// {
//   "vitals": { "mood": 7, "anxiety": 4, "energy": 6, "sleep": 8 },
//   "emotions": { "joy": 7, "sadness": 2, ... },
//   "life_areas": { "work": 7, "love": 6, ... },
//   "deep_psychology": { "rumination": 3, ... },
//   "has_checkin": true,
//   "has_sessions": true
// }
```

---

## 5. PROCESS-SESSION (OBBLIGATORIO dopo ogni conversazione)

```swift
func processSession(sessionId: String, accessToken: String) async {
    guard let url = URL(string: "https://yzlszvvhbcasbzsaastq.supabase.co/functions/v1/process-session") else { return }
    
    var request = URLRequest(url: url)
    request.httpMethod = "POST"
    request.setValue("Bearer \(accessToken)", forHTTPHeaderField: "Authorization")
    request.setValue("application/json", forHTTPHeaderField: "Content-Type")
    request.setValue("<anon_key>", forHTTPHeaderField: "apikey")
    request.httpBody = try? JSONSerialization.data(withJSONObject: ["sessionId": sessionId])
    
    _ = try? await URLSession.shared.data(for: request)
}
```

Questa funzione estrae automaticamente: emozioni, aree vita, psicologia, eventi, ricordi, summary AI.

---

## 6. TUTTE LE EDGE FUNCTIONS DISPONIBILI

| Funzione | Metodo | Descrizione |
|----------|--------|-------------|
| `ai-chat` | POST (streaming SSE) | Chat testuale con Aria — parsare SSE con `URLSession.bytes` |
| `ai-dashboard` | POST | Genera dashboard AI → risultato in `ai_dashboard_cache` |
| `ai-analysis` | POST | Analisi trend → risultato in `ai_analysis_cache` |
| `ai-insights` | POST | Insight rapidi → risultato in `ai_insights_cache` |
| `ai-checkins` | POST | Domande check-in → risultato in `ai_checkins_cache` |
| `process-session` | POST | Processa sessione completata (**OBBLIGATORIO**) |
| `elevenlabs-conversation-token` | POST | Signed URL WebSocket per voce ElevenLabs |
| `elevenlabs-context` | POST | System prompt + memoria per voce |
| `aria-agent-backend` | POST | **Fallback voce semplice** (no ElevenLabs, risposta JSON) |
| `create-objective-chat` | POST | Crea obiettivo via AI |
| `update-objective-chat` | POST | Aggiorna obiettivo via AI |
| `thematic-diary-chat` | POST | Chat nei diari tematici |
| `create-habit-chat` | POST | Crea abitudine via AI |
| `calculate-correlations` | POST | Calcola correlazioni |
| `detect-emotion-patterns` | POST | Rileva pattern emotivi |
| `generate-clinical-report` | POST | Genera report clinico |
| `real-time-context` | POST | Contesto real-time (meteo, ora) |

---

## 7. OPERAZIONI DATABASE (via Supabase Swift SDK o REST API)

### Daily Check-in
```swift
// POST /rest/v1/daily_checkins
// Body: {
//   "user_id": "<userId>",
//   "mood_value": 4,        // 1-5
//   "mood_emoji": "😊",
//   "notes": "{\"anxiety\":3,\"energy\":7,\"sleep\":8}"
// }
```

### Abitudini
```swift
// Leggi configurazione: GET /rest/v1/user_habits_config?user_id=eq.<userId>&is_active=eq.true
// Registra completamento: POST /rest/v1/daily_habits (upsert)
// Leggi streak: GET /rest/v1/habit_streaks?user_id=eq.<userId>
```

### Obiettivi
```swift
// Leggi: GET /rest/v1/user_objectives?user_id=eq.<userId>&status=eq.active
// Crea via AI: invoke 'create-objective-chat'
// Aggiorna via AI: invoke 'update-objective-chat'
```

### Sessioni passate
```swift
// GET /rest/v1/sessions?user_id=eq.<userId>&status=eq.completed&order=start_time.desc&limit=20
// Messaggi: GET /rest/v1/chat_messages?session_id=eq.<sessionId>&order=created_at.asc
```

---

## 8. ONBOARDING - ETÀ PRECISA (AGGIORNAMENTO CRITICO)

### Modifica al Quiz di Onboarding

Il quiz ora chiede l'**età precisa** (numero intero 13-99) invece delle fasce d'età generiche ("18-24", "25-34", ecc.).

**Su iOS, usa il selettore nativo `UIPickerView` / `Picker` di SwiftUI** per scegliere l'età:

```swift
struct AgePickerView: View {
    @Binding var selectedAge: Int?
    let ageRange = Array(13...99)
    
    var body: some View {
        VStack(spacing: 12) {
            Text("Quanti anni hai?")
                .font(.headline)
            
            Picker("Età", selection: Binding(
                get: { selectedAge ?? 25 },
                set: { selectedAge = $0 }
            )) {
                ForEach(ageRange, id: \.self) { age in
                    Text("\(age) anni").tag(age)
                }
            }
            .pickerStyle(.wheel) // ← SELETTORE NATIVO iOS A RUOTA
            .frame(height: 150)
        }
    }
}
```

### Salvataggio dell'età

Al completamento dell'onboarding, calcola `birth_date` dall'età e salvalo nel profilo:

```swift
// Calcolo birth_date dall'età
let birthYear = Calendar.current.component(.year, from: Date()) - selectedAge
let birthDate = "\(birthYear)-01-01" // Formato ISO

// PATCH /rest/v1/user_profiles?user_id=eq.<userId>
// Body include:
// {
//   "birth_date": "2001-01-01",
//   "onboarding_completed": true,
//   "onboarding_answers": {
//     "ageRange": "18-24",  ← calcolato dall'età per retrocompatibilità
//     "age": 25,            ← età precisa
//     ...altri campi...
//   }
// }
```

### Calcolo retrocompatibile di ageRange

```swift
func ageToRange(_ age: Int) -> String {
    switch age {
    case 13...17: return "13-17"
    case 18...24: return "18-24"
    case 25...34: return "25-34"
    case 35...44: return "35-44"
    case 45...54: return "45-54"
    case 55...64: return "55-64"
    default: return "65+"
    }
}
```

### Logica Occupazione Condizionale

La domanda "Cosa fai nella vita?" (Studio/Lavoro/Entrambi) viene mostrata **solo se l'età è tra 16 e 34**:

```swift
let showOccupation = (selectedAge ?? 0) >= 16 && (selectedAge ?? 0) <= 34
```

### Linguaggio Adattivo Automatico

**NON serve implementare nulla per il linguaggio adattivo su iOS.** L'Edge Function `aria-chat-ios` (che è un proxy verso `ai-chat`) riceve automaticamente le istruzioni `AGE_ADAPTIVE_LANGUAGE` basate sul `birth_date` salvato nel profilo. Aria parlerà in modo diverso a un 16enne, un 22enne, un 35enne, un 50enne o un 70enne — tutto gestito dal backend.

Le 6 fasce linguistiche sono:
- **13-17**: Slang Gen-Z/Alpha, emoji frequenti, tono da sorella maggiore
- **18-24**: Informale, mix italiano/inglese, tono da migliore amica
- **25-34**: Diretto, meno slang, tono da confidente
- **35-49**: Riflessivo, maturo, tono da amica saggia
- **50-64**: Caldo, rispettoso, tono da amica di lunga data
- **65+**: Chiaro, paziente, affettuoso, quasi senza emoji

---

## NOTE CRITICHE

1. **NON usare** `@elevenlabs/react`, `useConversation`, `webkitSpeechRecognition` — sono API **browser-only**
2. **Per la voce**: usa `URLSessionWebSocketTask` con `signed_url` da `elevenlabs-conversation-token`, OPPURE l'approccio semplice con `aria-agent-backend` + `AVSpeechSynthesizer`
3. **Per il chat streaming**: usa `URLSession.shared.bytes(for:)` con `AsyncBytes.lines`
4. **NON leggere** `user_profiles.wellness_score` — usa `ai_dashboard_cache`
5. **Ogni sessione** DEVE essere processata con `process-session`
6. **Fuso orario**: `Europe/Rome`
7. **Tutti gli header**: `Authorization: Bearer <token>`, `apikey: <anon_key>`, `Content-Type: application/json`
8. **Se ElevenLabs WebSocket è troppo complesso**, parti con l'approccio semplice (`aria-agent-backend` + TTS nativo) e migra dopo
9. **Età**: usa `Picker` nativo SwiftUI con `.pickerStyle(.wheel)` per il selettore età nell'onboarding. Salva `birth_date` nel profilo.
10. **Linguaggio adattivo**: automatico via backend, nessuna implementazione iOS necessaria

import { useEffect, useRef, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import JitsiIframe from "../components/Jitvideo.jsx";

const WS_URL = "ws://localhost:8000/ws";

const CandidateRoom = () => {
  const { id } = useParams();
  const navigate = useNavigate();

  // UI state
  const [isRecording, setIsRecording] = useState(false);
  const [transcript, setTranscript] = useState([]); // [{speaker,text}]
  const [sentimentScore, setSentimentScore] = useState(75);

  // Refs
  const wsRef = useRef(null);
  const recognitionRef = useRef(null);
  const fullScreenRef = useRef(null);

  // -------- WebSocket (candidate role) --------
  useEffect(() => {
    if (!id) return;
    try {
      wsRef.current?.close();
    } catch {}

    const ws = new WebSocket(WS_URL);
    wsRef.current = ws;

    ws.onopen = () => {
      ws.send(JSON.stringify({ type: "hello", role: "candidate", interview_id: String(id) }));
      // auto-start STT (can be toggled via button)
      setIsRecording(true);
      startListening();
    };

    ws.onmessage = () => {
      // candidate doesn’t need AI stream; interviewer receives those
    };

    ws.onerror = (err) => console.error("WS error:", err);

    ws.onclose = () => stopListening();

    return () => {
      try { ws.close(); } catch {}
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  // -------- STT: same behavior as your test page --------
  const sendSpeechChunk = (text) => {
    const cleaned = (text || "").trim();
    if (!cleaned) return;
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type: "speech_chunk", text: cleaned }));
    }
  };

  const startListening = async () => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      console.warn("SpeechRecognition API not available.");
      setIsRecording(false);
      return;
    }

    const isLocalhost = location.hostname === "localhost" || location.hostname === "127.0.0.1";
    if (!window.isSecureContext && !isLocalhost) {
      console.warn("SpeechRecognition requires https or localhost.");
      setIsRecording(false);
      return;
    }

    try {
      // prompt once to avoid repeated permission popups
      await navigator.mediaDevices.getUserMedia({ audio: true });
    } catch (err) {
      console.error("Microphone permission denied:", err);
      setIsRecording(false);
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = "en-US";

    recognition.onresult = (event) => {
      let finalTranscript = "";
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const seg = event.results[i][0]?.transcript || "";
        if (event.results[i].isFinal) finalTranscript += seg;
      }
      const cleaned = finalTranscript.trim();
      if (cleaned && wsRef.current?.readyState === WebSocket.OPEN) {
        setTranscript((prev) => [...prev, { speaker: "Candidate", text: cleaned }]);
        sendSpeechChunk(cleaned);
      }
    };

    recognition.onerror = (event) => {
      console.error("SpeechRecognition error:", event.error);
      if (event.error === "not-allowed" || event.error === "service-not-allowed") {
        stopListening();
        return;
      }
      if (isRecording) {
        try { recognition.stop(); } catch {}
        setTimeout(() => {
          try { recognition.start(); } catch (e) { console.error("restart failed", e); }
        }, 800);
      }
    };

    recognition.onend = () => {
      if (isRecording) {
        try { recognition.start(); } catch (e) { console.error("onend restart failed", e); }
      }
    };

    recognitionRef.current = recognition;
    try { recognition.start(); } catch (e) { console.error("recognition start failed", e); }
  };

  const stopListening = () => {
    setIsRecording(false);
    const r = recognitionRef.current;
    if (r) {
      try { r.onresult = null; r.onerror = null; r.onend = null; r.stop(); } catch {}
      recognitionRef.current = null;
    }
  };

  // -------- Anti-cheat (same UI behavior) --------
  // useEffect(() => {
  //   const enterFullScreen = () => {
  //     if (fullScreenRef.current && !document.fullscreenElement) {
  //       fullScreenRef.current.requestFullscreen().catch(() => {});
  //     }
  //   };
  //   const handleFullScreenChange = () => {
  //     if (!document.fullscreenElement) {
  //       alert("Warning: Exiting full screen is not allowed during the interview. Please return to full screen.");
  //       setTimeout(enterFullScreen, 1000);
  //     }
  //   };
  //   const handleVisibilityChange = () => {
  //     if (document.visibilityState === "hidden") {
  //       console.log("Tab switching detected");
  //     }
  //   };
  //   const handleContextMenu = (e) => { e.preventDefault(); return false; };
  //   const handleKeyDown = (e) => {
  //     if ((e.ctrlKey || e.metaKey) && ["c", "v", "a", "p", "s", "u", "tab"].includes(e.key)) { e.preventDefault(); return false; }
  //     if (e.altKey && e.key === "Tab") { e.preventDefault(); return false; }
  //     if (e.key === "F11") { e.preventDefault(); enterFullScreen(); return false; }
  //   };

  //   //enterFullScreen();
  //   document.addEventListener("fullscreenchange", handleFullScreenChange);
  //   document.addEventListener("visibilitychange", handleVisibilityChange);
  //   document.addEventListener("contextmenu", handleContextMenu);
  //   document.addEventListener("keydown", handleKeyDown);

  //   return () => {
  //     document.removeEventListener("fullscreenchange", handleFullScreenChange);
  //     document.removeEventListener("visibilitychange", handleVisibilityChange);
  //     document.removeEventListener("contextmenu", handleContextMenu);
  //     document.removeEventListener("keydown", handleKeyDown);
  //     stopListening();
  //     try { wsRef.current?.close(); } catch {}
  //     if (document.fullscreenElement) {
  //       document.exitFullscreen().catch(() => {});
  //     }
  //   };
  //   // eslint-disable-next-line react-hooks/exhaustive-deps
  // }, []);

  // Demo sentiment meter tick (unchanged)
  useEffect(() => {
    const t = setInterval(() => {
      setSentimentScore((s) => {
        const n = s + (Math.random() * 8 - 4);
        return Math.max(10, Math.min(95, Math.round(n)));
      });
    }, 3000);
    return () => clearInterval(t);
  }, []);

  return (
    <div ref={fullScreenRef} className="min-h-screen bg-gray-900 text-white">
      {/* Header */}
      <div className="bg-black/80 backdrop-blur-md p-4 border-b border-gray-800 flex justify-between items-center">
        <div className="flex items-center space-x-4">
          <div className="bg-gradient-to-r from-pink-600 to-purple-600 p-2 rounded-lg">
            <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"/>
            </svg>
          </div>
          <div>
            <h1 className="text-xl font-bold">Interview Session #{id}</h1>
            <p className="text-gray-400 text-sm">Software Engineer Position</p>
          </div>
        </div>
        <div className="flex items-center space-x-4">
          <div className="flex items-center">
            <span className={`inline-block w-3 h-3 rounded-full mr-2 ${isRecording ? "bg-red-500 animate-pulse" : "bg-gray-500"}`}></span>
            <span className="text-sm">{isRecording ? "Recording" : "Not Recording"}</span>
          </div>
          <button
            onClick={isRecording ? stopListening : startListening}
            className={`px-4 py-2 rounded-lg ${isRecording ? "bg-red-600 hover:bg-red-700" : "bg-green-600 hover:bg-green-700"} transition-colors`}
          >
            {isRecording ? "Stop Recording" : "Start Recording"}
          </button>
          <button
            onClick={() => { try { wsRef.current?.close(); } catch {}; navigate("/candidate-dashboard"); }}
            className="px-4 py-2 rounded-lg bg-purple-600 hover:bg-purple-700 transition-colors"
          >
            Leave Interview
          </button>
        </div>
      </div>

      {/* Main */}
      <div className="grid grid-cols-12 gap-4 p-4 h-[calc(100vh-72px)]">
        {/* Center: Video + Transcript */}
        <div className="col-span-9 flex flex-col h-full">
          {/* Video */}
          <div className="bg-black rounded-xl overflow-hidden mb-4 relative aspect-video">
            <JitsiIframe />
            <div className="absolute bottom-4 right-4 bg-black/70 backdrop-blur-sm p-2 rounded-lg">
              <div className="flex items-center space-x-2">
                <span className="text-sm">Sentiment:</span>
                <div className="w-32 h-3 bg-gray-700 rounded-full overflow-hidden">
                  <div className={`h-full ${sentimentScore > 70 ? "bg-green-500" : sentimentScore > 40 ? "bg-yellow-500" : "bg-red-500"}`} style={{ width: `${sentimentScore}%` }}></div>
                </div>
                <span className="text-sm font-medium">{sentimentScore}%</span>
              </div>
            </div>
          </div>

          {/* Transcript */}
          <div className="bg-gray-800/50 backdrop-blur-md rounded-xl border border-gray-700 p-4 flex-grow overflow-hidden flex flex-col">
            <h2 className="text-lg font-bold mb-4">Live Transcript</h2>
            <div className="overflow-y-auto flex-grow space-y-4 pr-2">
              {transcript.length > 0 ? (
                transcript.map((entry, idx) => (
                  <div key={idx} className="flex justify-end">
                    <div className="max-w-[80%] p-3 rounded-lg bg-purple-700 text-white rounded-tr-none">
                      <p className="text-xs font-bold mb-1 opacity-70">{entry.speaker}</p>
                      <p className="text-sm">{entry.text}</p>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-8 text-gray-400">
                  <p>No transcript available yet.</p>
                  <p className="text-sm mt-2">Start recording to capture the conversation.</p>
                </div>
              )}

              {/* Manual fallback sender */}
              <div className="mt-3 bg-gray-800/60 border border-gray-700 rounded-lg p-3">
                <p className="text-xs text-gray-400 mb-2">Manual chunk sender (fallback)</p>
                <div className="flex items-center space-x-2">
                  <input
                    id="manualChunk"
                    type="text"
                    placeholder="Type a sentence and press Send"
                    className="flex-1 px-3 py-2 bg-gray-900 border border-gray-700 rounded-lg text-sm"
                  />
                  <button
                    className="px-3 py-2 bg-purple-600 hover:bg-purple-500 rounded-lg text-sm"
                    onClick={() => {
                      const el = document.getElementById("manualChunk");
                      const val = el?.value || "";
                      const trimmed = val.trim();
                      if (trimmed) {
                        setTranscript((prev) => [...prev, { speaker: "Candidate", text: trimmed }]);
                        sendSpeechChunk(trimmed);
                        el.value = "";
                      }
                    }}
                  >
                    Send
                  </button>
                </div>
                <p className="text-[11px] text-gray-500 mt-2">
                  Sends <code>{"{type:'speech_chunk', text}"}</code> to the backend.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Right column intentionally empty for candidate (UI parity) */}
        <div className="col-span-3"></div>
      </div>
    </div>
  );
};

export default CandidateRoom;

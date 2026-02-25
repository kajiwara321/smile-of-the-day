import { useEffect, useRef, useState } from "react";
import logo from "/assets/openai-logomark.svg";
import EventLog from "./EventLog";
import SessionControls from "./SessionControls";
import ToolPanel from "./ToolPanel";

export default function App() {
  const [isSessionActive, setIsSessionActive] = useState(false);
  const [events, setEvents] = useState([]);
  const [dataChannel, setDataChannel] = useState(null);
  const peerConnection = useRef(null);
  const audioElement = useRef(null);
  const localStream = useRef(null);
  const shouldCreateResponseFromVad = useRef(true);

  async function startSession() {
    shouldCreateResponseFromVad.current = true;

    // Get a session token for OpenAI Realtime API
    const tokenResponse = await fetch("/token");
    const data = await tokenResponse.json();
    const EPHEMERAL_KEY = data.value || data.client_secret?.value;
    if (!EPHEMERAL_KEY) {
      throw new Error("Missing ephemeral client secret from /token");
    }

    // Create a peer connection
    const pc = new RTCPeerConnection();

    // Set up to play remote audio from the model
    audioElement.current = document.createElement("audio");
    audioElement.current.autoplay = true;
    pc.ontrack = (e) => (audioElement.current.srcObject = e.streams[0]);

    // Add local audio track for microphone input in the browser
    const stream = await navigator.mediaDevices.getUserMedia({
      audio: {
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true,
      },
    });
    localStream.current = stream;

    const [audioTrack] = stream.getAudioTracks();
    if (!audioTrack) {
      throw new Error("No microphone audio track available");
    }

    audioTrack.enabled = true;
    pc.addTrack(audioTrack, stream);

    // Debug: monitor microphone volume level
    const audioCtx = new AudioContext();
    const source = audioCtx.createMediaStreamSource(stream);
    const analyser = audioCtx.createAnalyser();
    analyser.fftSize = 256;
    source.connect(analyser);
    const freqData = new Uint8Array(analyser.frequencyBinCount);
    let maxVol = 0;
    const checkVol = setInterval(() => {
      analyser.getByteFrequencyData(freqData);
      const vol = Math.max(...freqData);
      if (vol > maxVol) {
        maxVol = vol;
        console.log(`[MIC] max volume so far: ${maxVol} (0=silent, 255=max)`);
      }
      const micIndicator = document.getElementById("mic-indicator");
      if (micIndicator) {
        const pct = Math.min(100, (vol / 255) * 100);
        micIndicator.style.width = `${pct}%`;
        micIndicator.style.background = vol > 30 ? "#22c55e" : "#e5e7eb";
      }
    }, 100);
    // Store cleanup
    pc._micCleanup = () => { clearInterval(checkVol); audioCtx.close(); };

    // Set up data channel for sending and receiving events
    const dc = pc.createDataChannel("oai-events");
    setDataChannel(dc);

    // Start the session using the Session Description Protocol (SDP)
    const offer = await pc.createOffer();
    await pc.setLocalDescription(offer);

    const baseUrl = "https://api.openai.com/v1/realtime/calls";
    const model = "gpt-realtime";
    const sdpResponse = await fetch(`${baseUrl}?model=${model}`, {
      method: "POST",
      body: offer.sdp,
      headers: {
        Authorization: `Bearer ${EPHEMERAL_KEY}`,
        "Content-Type": "application/sdp",
      },
    });

    const sdp = await sdpResponse.text();
    const answer = { type: "answer", sdp };
    await pc.setRemoteDescription(answer);

    peerConnection.current = pc;
  }

  // Stop current session, clean up peer connection and data channel
  function stopSession() {
    if (dataChannel) {
      dataChannel.close();
    }

    if (peerConnection.current) {
      peerConnection.current.getSenders().forEach((sender) => {
        if (sender.track) {
          sender.track.stop();
        }
      });
    }

    if (localStream.current) {
      localStream.current.getTracks().forEach((track) => track.stop());
      localStream.current = null;
    }

    if (peerConnection.current) {
      if (peerConnection.current._micCleanup) peerConnection.current._micCleanup();
      peerConnection.current.close();
    }

    setIsSessionActive(false);
    setDataChannel(null);
    peerConnection.current = null;
    shouldCreateResponseFromVad.current = true;
  }

  // Send a message to the model
  function sendClientEvent(message) {
    if (dataChannel) {
      const timestamp = new Date().toLocaleTimeString();
      message.event_id = message.event_id || crypto.randomUUID();

      // send event before setting timestamp since the backend peer doesn't expect this field
      dataChannel.send(JSON.stringify(message));

      // if guard just in case the timestamp exists by miracle
      if (!message.timestamp) {
        message.timestamp = timestamp;
      }
      setEvents((prev) => [message, ...prev]);
    } else {
      console.error(
        "Failed to send message - no data channel available",
        message,
      );
    }
  }

  // Send a text message to the model
  function sendTextMessage(message) {
    const event = {
      type: "conversation.item.create",
      item: {
        type: "message",
        role: "user",
        content: [
          {
            type: "input_text",
            text: message,
          },
        ],
      },
    };

    sendClientEvent(event);
    sendClientEvent({ type: "response.create" });
  }

  // Attach event listeners to the data channel when a new one is created
  useEffect(() => {
    if (dataChannel) {
      const configureTurnDetection = () => {
        // Send session.update with VAD config (after ToolPanel has sent its update)
        const sessionEvent = {
          type: "session.update",
          session: {
            type: "realtime",
            audio: {
              input: {
                turn_detection: {
                  type: "server_vad",
                  threshold: 0.3,
                  prefix_padding_ms: 300,
                  silence_duration_ms: 500,
                  create_response: true,
                  interrupt_response: true,
                },
              },
            },
          },
          event_id: crypto.randomUUID(),
        };
        dataChannel.send(JSON.stringify(sessionEvent));
        setEvents((prev) => [
          { ...sessionEvent, timestamp: new Date().toLocaleTimeString() },
          ...prev,
        ]);

        // Greet the user to confirm audio output works and prompt voice input
        const greetEvent = {
          type: "response.create",
          response: {
            instructions: "Greet the user briefly and let them know they can speak to you. Keep it under 10 words.",
          },
          event_id: crypto.randomUUID(),
        };
        dataChannel.send(JSON.stringify(greetEvent));
        setEvents((prev) => [
          { ...greetEvent, timestamp: new Date().toLocaleTimeString() },
          ...prev,
        ]);
      };

      // Append new server events to the list
      const onMessage = (e) => {
        const event = JSON.parse(e.data);
        if (!event.timestamp) {
          event.timestamp = new Date().toLocaleTimeString();
        }

        // After session.created, send VAD config (after ToolPanel also sends its session.update)
        if (event.type === "session.created") {
          setTimeout(() => configureTurnDetection(), 100);
        }

        if (
          event.type === "input_audio_buffer.speech_stopped" &&
          !shouldCreateResponseFromVad.current
        ) {
          sendClientEvent({ type: "response.create" });
        }

        setEvents((prev) => [event, ...prev]);
      };
      dataChannel.addEventListener("message", onMessage);

      // Set session active when the data channel is opened
      const onOpen = () => {
        setIsSessionActive(true);
        setEvents([]);
      };
      dataChannel.addEventListener("open", onOpen);

      return () => {
        dataChannel.removeEventListener("message", onMessage);
        dataChannel.removeEventListener("open", onOpen);
      };
    }
  }, [dataChannel]);

  return (
    <>
      <nav className="absolute top-0 left-0 right-0 h-16 flex items-center">
        <div className="flex items-center gap-4 w-full m-4 pb-2 border-0 border-b border-solid border-gray-200">
          <img style={{ width: "24px" }} src={logo} />
          <h1>realtime console</h1>
        </div>
      </nav>
      <main className="absolute top-16 left-0 right-0 bottom-0">
        <section className="absolute top-0 left-0 right-[380px] bottom-0 flex">
          <section className="absolute top-0 left-0 right-0 bottom-32 px-4 overflow-y-auto">
            <EventLog events={events} />
          </section>
          {isSessionActive && (
            <div className="absolute bottom-36 left-4 right-4 flex items-center gap-2">
              <span className="text-xs text-gray-500 whitespace-nowrap">🎤 mic</span>
              <div className="flex-1 h-3 bg-gray-200 rounded-full overflow-hidden">
                <div id="mic-indicator" className="h-full rounded-full transition-all duration-75" style={{width: "0%", background: "#e5e7eb"}} />
              </div>
            </div>
          )}
          <section className="absolute h-32 left-0 right-0 bottom-0 p-4">
            <SessionControls
              startSession={startSession}
              stopSession={stopSession}
              sendClientEvent={sendClientEvent}
              sendTextMessage={sendTextMessage}
              events={events}
              isSessionActive={isSessionActive}
            />
          </section>
        </section>
        <section className="absolute top-0 w-[380px] right-0 bottom-0 p-4 pt-0 overflow-y-auto">
          <ToolPanel
            sendClientEvent={sendClientEvent}
            sendTextMessage={sendTextMessage}
            events={events}
            isSessionActive={isSessionActive}
          />
        </section>
      </main>
    </>
  );
}

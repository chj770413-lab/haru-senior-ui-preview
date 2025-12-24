/* -----------------------------------------------------------
   1) Whisper API + 기기별 자동 음성 인식 엔진
----------------------------------------------------------- */

const WHISPER_API_URL =
  "https://harudonghaeng-ai-proxy.vercel.app/api/whisper";

/* ===============================
   음성 → 텍스트 스마트 인식
   =============================== */
function startSmartSTT(targetInputId) {
  const status = document.getElementById("voice-status");
  if (status) status.innerText = "🎙️ 듣고 있어요… 말씀해 주세요";

  const isIOS = /iPhone|iPad|iPod/i.test(navigator.userAgent);

  if (isIOS) {
    startWhisperIOS(targetInputId);
  } else {
    startWebSTT(targetInputId);
  }
}

/* ===============================
   Web Speech API
   =============================== */
function startWebSTT(targetInputId) {
  const inputBox = document.getElementById(targetInputId);
  if (!inputBox) return;

  const SpeechRecognition =
    window.SpeechRecognition || window.webkitSpeechRecognition;

  if (!SpeechRecognition) {
    alert("이 기기에서는 음성 인식이 지원되지 않습니다.");
    return;
  }

  const recognition = new SpeechRecognition();
  recognition.lang = "ko-KR";

  recognition.onresult = (event) => {
    inputBox.value = event.results[0][0].transcript;
    const status = document.getElementById("voice-status");
    if (status) status.innerText = "인식이 완료되었습니다";
  };

  recognition.onerror = () => {
    const status = document.getElementById("voice-status");
    if (status) status.innerText = "다시 한 번 눌러주세요 🙂";
  };

  recognition.onend = () => {
    const status = document.getElementById("voice-status");
    if (status) status.innerText = "";
  };

  recognition.start();
}

/* ===============================
   iOS Safari Whisper
   =============================== */
async function startWhisperIOS(targetInputId) {
  const inputBox = document.getElementById(targetInputId);

  try {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    const mediaRecorder = new MediaRecorder(stream, { mimeType: "audio/mp4" });
    let chunks = [];

    mediaRecorder.ondataavailable = (e) => chunks.push(e.data);

    mediaRecorder.onstop = async () => {
      const audioBlob = new Blob(chunks, { type: "audio/mp4" });
      chunks = [];
      stream.getTracks().forEach((track) => track.stop());

      if (audioBlob.size < 500) return;

      const formData = new FormData();
      formData.append("audio", audioBlob, "audio.mp4");

      try {
        const response = await fetch(WHISPER_API_URL, {
          method: "POST",
          body: formData,
        });

        const data = await response.json();
        if (data.text) inputBox.value = data.text;
      } catch {}
    };

    setTimeout(() => mediaRecorder.stop(), 6000);
    mediaRecorder.start();
  } catch {}
}

/* -----------------------------------------------------------
   2) TTS
----------------------------------------------------------- */
function speak(text) {
  const msg = new SpeechSynthesisUtterance(text);
  msg.lang = "ko-KR";
  speechSynthesis.speak(msg);
}

/* -----------------------------------------------------------
   3) UI 화면 전환
----------------------------------------------------------- */
function clearScreen() {
  document.getElementById("screen").innerHTML = "";
}

function show(type) {
  const screen = document.getElementById("screen");

  if (type === "ai") {
    screen.innerHTML = `
      <div class="screen-box">
        <h3>하루동행 건강 도우미</h3>

        <textarea 
          id="aiInput"
          class="input-area"
          placeholder="말하기 버튼을 누르고 말씀해주세요."
          style="width:100%;height:80px;font-size:16px;"></textarea>

        <div class="screen-buttons" style="margin-top:12px;">
          <button class="sub-btn" onclick="startSmartSTT('aiInput')">🎤 말하기</button>
          <button class="sub-btn" onclick="sendToAI()">AI에게 보내기</button>
        </div>

        <p id="voice-status" style="margin-top:8px;color:#666;font-size:14px;"></p>
        <div id="aiResponse" class="ai-response-box"
          style="margin-top:14px;font-size:17px;line-height:1.4;"></div>
      </div>`;
  }
}

/* -----------------------------------------------------------
   4) AI 응답 처리 (❗️문제 해결 핵심)
----------------------------------------------------------- */

let lastUserMessage = null;

async function sendToAI() {
  const text = document.getElementById("aiInput").value.trim();
  if (!text) return;

  const resBox = document.getElementById("aiResponse");
  resBox.innerHTML = "말씀을 듣고 있어요…";

  try {
    const response = await fetch(
      "https://harudonghaeng-ai-proxy.vercel.app/api/chat",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: text,
          lastMessage: lastUserMessage,
        }),
      }
    );

    if (!response.ok) throw new Error("server error");

    const data = await response.json();

    const reply =
      data.reply ||
      "말씀해 주신 내용을 기준으로 차분히 함께 살펴볼게요.";

    resBox.innerHTML = reply;
    speak(reply);

    lastUserMessage = text;
  } catch (err) {
    // ❌ 오류/지연/시스템 문구 완전 제거
    resBox.innerHTML =
      "말씀해 주셔서 고마워요. 조금 더 알려주시면 이어서 도와드릴게요.";
  }
}

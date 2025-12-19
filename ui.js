/* -----------------------------------------------------------
   1) Whisper API + 기기별 자동 음성 인식 엔진
----------------------------------------------------------- */

// Whisper API URL
const WHISPER_API_URL =
  "https://harudonghaeng-ai-proxy.vercel.app/api/whisper";


  /* ===============================
   음성 → 텍스트 스마트 인식 (최종)
   =============================== */
function startSmartSTT(targetInputId) {
  const status = document.getElementById("voice-status");
  if (status) status.innerText = "🎙️ 듣고 있어요… 말씀해 주세요";

  // 🔑 iOS Safari 판별 (핵심)
  const isIOS = /iPhone|iPad|iPod/i.test(navigator.userAgent);

  if (isIOS) {
    // ✅ 아이폰: Whisper (MediaRecorder)
    startWhisperIOS(targetInputId);
  } else {
    // ✅ 맥북 / 안드로이드: Web Speech API
    startWebSTT(targetInputId);
  }
}

/* ===============================
   맥북 / 안드로이드 (Chrome)
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
   아이폰 Safari 전용 Whisper
   =============================== */
async function startWhisperIOS(targetInputId) {
  const inputBox = document.getElementById(targetInputId);

  try {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });

    const mediaRecorder = new MediaRecorder(stream, {
      mimeType: "audio/mp4" // 🔑 iOS 필수
    });

    let chunks = [];

    mediaRecorder.ondataavailable = (e) => chunks.push(e.data);

    mediaRecorder.onstop = async () => {
  const audioBlob = new Blob(chunks, { type: "audio/mp4" });
  chunks = []; // ✅ 여기서 비워야 함
  stream.getTracks().forEach(track => track.stop()); // ✅ 그 다음 스트림 종료

  if (audioBlob.size < 500) {
    alert("음성이 인식되지 않았어요. 다시 말씀해 주세요.");
    return;
  }

  const formData = new FormData();
  formData.append("audio", audioBlob, "audio.mp4");

  try {
    const response = await fetch(WHISPER_API_URL, {
      method: "POST",
      body: formData,
    });

    const data = await response.json();
    if (data.text) inputBox.value = data.text;

    const status = document.getElementById("voice-status");
    if (status) status.innerText = "";
  } catch (e) {
    alert("Whisper 통신 오류가 발생했습니다.");
  }
};

    // 시니어 UX 기준 6초
    setTimeout(() => mediaRecorder.stop(), 6000);

  } catch (err) {
    alert("아이폰에서 마이크 권한을 허용해주세요.");
  }
}


/* -----------------------------------------------------------
   2) Whisper Fallback (모든 기기 지원)
----------------------------------------------------------- */

async function startWhisperFallback(targetInputId) {
  const inputBox = document.getElementById(targetInputId);

  try {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    const audioContext = new AudioContext();
    const source = audioContext.createMediaStreamSource(stream);
    const processor = audioContext.createScriptProcessor(4096, 1, 1);

    let pcmData = [];

    alert("🎤 말씀하세요. 6초 후 자동 종료됩니다.");

    source.connect(processor);
    processor.connect(audioContext.destination);

    processor.onaudioprocess = (event) => {
      const input = event.inputBuffer.getChannelData(0);
      pcmData.push(new Float32Array(input));
    };

    setTimeout(() => {
      processor.disconnect();
      source.disconnect();
      audioContext.close();
      stream.getTracks().forEach(track => track.stop());

      // WAV 파일 생성
      const wavBuffer = encodeWAV(pcmData, audioContext.sampleRate);
      const audioBlob = new Blob([wavBuffer], { type: "audio/wav" });

      if (audioBlob.size < 500) {
        alert("녹음 데이터가 비어 있어요. 다시 시도해주세요.");
        return;
      }

      const formData = new FormData();
      formData.append("audio", audioBlob, "audio.wav");

      // Whisper로 전송
      fetch(WHISPER_API_URL, {
        method: "POST",
        body: formData,
      })
        .then((res) => res.json())
        .then((data) => {
          if (data.text) inputBox.value = data.text;
          else alert("Whisper 인식 실패. 다시 시도해주세요.");
        })
        .catch(() => alert("Whisper 통신 오류가 발생했습니다."));
    }, 6000);

  } catch (err) {
    alert("마이크 접근 오류입니다. 권한을 확인해주세요.");
  }
}

// WAV 인코더 함수
function encodeWAV(pcmData, sampleRate) {
  const bytesPerSample = 2;
  const numChannels = 1;

  let totalLength = pcmData.reduce((acc, cur) => acc + cur.length, 0);
  const buffer = new ArrayBuffer(44 + totalLength * bytesPerSample);
  const view = new DataView(buffer);

  let offset = 0;

  // WAV 헤더 작성
  function writeString(str) {
    for (let i = 0; i < str.length; i++) {
      view.setUint8(offset++, str.charCodeAt(i));
    }
  }

  writeString("RIFF");
  view.setUint32(offset, 36 + totalLength * bytesPerSample, true); offset += 4;
  writeString("WAVE");
  writeString("fmt ");
  view.setUint32(offset, 16, true); offset += 4;
  view.setUint16(offset, 1, true); offset += 2;
  view.setUint16(offset, numChannels, true); offset += 2;
  view.setUint32(offset, sampleRate, true); offset += 4;
  view.setUint32(offset, sampleRate * numChannels * bytesPerSample, true); offset += 4;
  view.setUint16(offset, numChannels * bytesPerSample, true); offset += 2;
  view.setUint16(offset, bytesPerSample * 8, true); offset += 2;
  writeString("data");
  view.setUint32(offset, totalLength * bytesPerSample, true); offset += 4;

  // PCM 데이터 작성
  pcmData.forEach(chunk => {
    for (let i = 0; i < chunk.length; i++) {
      const sample = Math.max(-1, Math.min(1, chunk[i]));
      view.setInt16(offset, sample < 0 ? sample * 0x8000 : sample * 0x7FFF, true);
      offset += 2;
    }
  });

  return buffer;
}


/* -----------------------------------------------------------
   3) TTS (텍스트 → 음성)
----------------------------------------------------------- */

function speak(text) {
  const msg = new SpeechSynthesisUtterance(text);
  msg.lang = "ko-KR";
  speechSynthesis.speak(msg);
}

/* -----------------------------------------------------------
   4) UI 화면 전환 처리
----------------------------------------------------------- */

function clearScreen() {
  document.getElementById("screen").innerHTML = "";
}

function show(type) {
  const screen = document.getElementById("screen");

  if (type === "med") {
    screen.innerHTML = `
      <div class="screen-box">
        <h3>복약 체크하기</h3>
        <div class="screen-buttons">
          <button class="sub-btn" onclick="finish('아침 복약 완료')">아침 복약</button>
          <button class="sub-btn" onclick="finish('저녁 복약 완료')">저녁 복약</button>
        </div>
      </div>`;
  }

  if (type === "mood") {
    screen.innerHTML = `
      <div class="screen-box">
        <h3>오늘 기분은 어떠세요?</h3>
        <div class="screen-buttons">
          <button class="sub-btn" onclick="finish('좋음 기록됨')">🙂 좋음</button>
          <button class="sub-btn" onclick="finish('보통 기록됨')">😐 보통</button>
          <button class="sub-btn" onclick="finish('나쁨 기록됨')">🙁 나쁨</button>
        </div>
      </div>`;
  }

  if (type === "health") {
    screen.innerHTML = `
      <div class="screen-box">
        <h3>건강 상태 기록하기</h3>
        <div class="screen-buttons">
          <button class="sub-btn" onclick="finish('상태: 양호')">양호</button>
          <button class="sub-btn" onclick="finish('상태: 주의 필요')">주의 필요</button>
          <button class="sub-btn" onclick="finish('상태: 좋지 않음')">좋지 않음</button>
        </div>
      </div>`;
  }

  if (type === "ai") {
    screen.innerHTML = `
      <div class="screen-box">
        <h3>하루동행 건강 도우미</h3>

        <textarea 
          id="aiInput"
          class="input-area"
          placeholder="말하기 버튼을 누르고 말씀해주세요."
          style="width: 100%; height: 80px; margin-top: 8px; font-size: 16px;">
        </textarea>

        <div class="screen-buttons" style="margin-top:12px;">
          <button class="sub-btn" onclick="startSmartSTT('aiInput')">🎤 말하기</button>
          <button class="sub-btn" onclick="sendToAI()">AI에게 보내기</button>
        </div>
<p id="voice-status" style="margin-top:8px;color:#666;font-size:14px;"></p>

        <div id="aiResponse" class="ai-response-box"
          style="margin-top:14px; font-size:17px; line-height:1.4;"></div>
      </div>`;
  }
}

function finish(msg) {
  const screen = document.getElementById("screen");

  screen.innerHTML = `
    <div class="screen-box">
      <h3>
        기록 완료
        <img src="img/check-green.svg" class="check-icon" />
      </h3>
      <p class="check-message">${msg}</p>
    </div>`;

  setTimeout(() => clearScreen(), 1500);
}

/* -----------------------------------------------------------
   5) AI 응답 처리 (A단계: 직전 질문 1개 기억)
----------------------------------------------------------- */

let lastUserMessage = null; // 👈 파일 상단 또는 sendToAI 위에 1번만 선언

async function sendToAI() {
  const text = document.getElementById("aiInput").value.trim();
  if (!text) return;

  const resBox = document.getElementById("aiResponse");
  resBox.innerHTML = "⏳ 답변을 불러오는 중입니다...";

  try {
    const response = await fetch(
      "https://harudonghaeng-ai-proxy.vercel.app/api/chat",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: text,
          lastMessage: lastUserMessage, // 👈 직전 질문 전달
        }),
      }
    );

    const data = await response.json();
    const reply = data.reply || "잠시 후 다시 말씀해주세요.";

    resBox.innerHTML = reply;
    speak(reply); // 🔊 AI 음성 응답

    // 👇 여기서 마지막 질문 저장 (다음 질문용)
    lastUserMessage = text;

  } catch (err) {
    resBox.innerHTML = "잠시 응답이 늦어지고 있어요.<br>조금 후에 다시 한 번 말씀해 주세요.";
}
  }
window.onload = () => {
  show("ai");
};


/* -----------------------------------------------------------
   1) Whisper API + 기기별 자동 음성 인식 엔진
----------------------------------------------------------- */

// Whisper API URL
const WHISPER_API_URL =
  "https://harudonghaeng-ai-proxy.vercel.app/api/whisper";

/* 음성 → 텍스트 스마트 인식 */
async function startSmartSTT(targetInputId) {
  const inputBox = document.getElementById(targetInputId);

  // 기본 웹 STT 엔진 존재 여부 확인
  window.SpeechRecognition =
    window.SpeechRecognition || window.webkitSpeechRecognition;

  if (window.SpeechRecognition) {
    try {
      const recognition = new window.SpeechRecognition();
      recognition.lang = "ko-KR";

      recognition.onresult = (event) => {
        const text = event.results[0][0].transcript;
        inputBox.value = text;
      };

      recognition.onerror = () => {
        startWhisperFallback(targetInputId);
      };

      recognition.start();
      return;
    } catch (e) {
      console.log("웹 STT 오류 → Whisper로 전환");
    }
  }

  startWhisperFallback(targetInputId);
}

/* -----------------------------------------------------------
   2) Whisper Fallback (모든 기기 지원)
----------------------------------------------------------- */

async function startWhisperFallback(targetInputId) {
  const inputBox = document.getElementById(targetInputId);

  try {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    const mediaRecorder = new MediaRecorder(stream);
    let chunks = [];

    alert("🎤 말을 시작하세요. 6초 후 자동으로 멈춥니다.");

    mediaRecorder.ondataavailable = (e) => chunks.push(e.data);

    mediaRecorder.onstop = async () => {
      const audioBlob = new Blob(chunks, { type: "audio/webm" });

      const formData = new FormData();
      formData.append("audio", audioBlob);

      try {
        const response = await fetch(WHISPER_API_URL, {
          method: "POST",
          body: formData,
        });

        const data = await response.json();

        if (data.text) inputBox.value = data.text;
        else alert("음성 인식이 어려워요. 다시 시도해주세요!");
      } catch (err) {
        alert("Whisper 인식 오류가 발생했습니다.");
      }
    };

    mediaRecorder.start();
    setTimeout(() => mediaRecorder.stop(), 6000);
  } catch (err) {
    alert("마이크 접근이 불가합니다. 권한을 확인해주세요.");
  }
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
   5) AI 응답 처리
----------------------------------------------------------- */

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
        body: JSON.stringify({ message: text }),
      }
    );

    const data = await response.json();
    const reply = data.reply || "잠시 후 다시 말씀해주세요.";

    resBox.innerHTML = reply;
    speak(reply);
  } catch (err) {
    resBox.innerHTML = "⚠️ 연결 오류가 발생했습니다.";
  }
}

/* ------------------------------
   공통: 음성 입력(STT) + 음성 출력(TTS)
------------------------------ */

/* 음성 → 텍스트 (입력창에 자동 입력) */
function startSTT(targetInputId) {
  const recognition = new webkitSpeechRecognition();
  recognition.lang = "ko-KR";

  recognition.onresult = (event) => {
    const text = event.results[0][0].transcript;
    document.getElementById(targetInputId).value = text;
  };

  recognition.start();
}

/* 텍스트 → 음성 (AI 답변 읽어주기) */
function speak(text) {
  const msg = new SpeechSynthesisUtterance(text);
  msg.lang = "ko-KR";
  speechSynthesis.speak(msg);
}

/* ------------------------------
   기본 UI 기능
------------------------------ */

function clearScreen() {
  document.getElementById("screen").innerHTML = "";
}

function show(type) {
  const screen = document.getElementById("screen");

  /* ----- 복약 체크 ----- */
  if (type === "med") {
    screen.innerHTML = `
      <div class="screen-box">
        <h3>복약 체크하기</h3>
        <div class="screen-buttons">
          <button class="sub-btn" onclick="finish('아침 복약 완료')">아침 복약</button>
          <button class="sub-btn" onclick="finish('저녁 복약 완료')">저녁 복약</button>
        </div>
      </div>
    `;
  }

  /* ----- 기분 기록 ----- */
  if (type === "mood") {
    screen.innerHTML = `
      <div class="screen-box">
        <h3>오늘 기분은 어떠세요?</h3>
        <div class="screen-buttons">
          <button class="sub-btn" onclick="finish('좋음 기록됨')">🙂 좋음</button>
          <button class="sub-btn" onclick="finish('보통 기록됨')">😐 보통</button>
          <button class="sub-btn" onclick="finish('나쁨 기록됨')">🙁 나쁨</button>
        </div>
      </div>
    `;
  }

  /* ----- 건강 상태 ----- */
  if (type === "health") {
    screen.innerHTML = `
      <div class="screen-box">
        <h3>건강 상태 기록하기</h3>
        <div class="screen-buttons">
          <button class="sub-btn" onclick="finish('상태: 양호')">양호</button>
          <button class="sub-btn" onclick="finish('상태: 주의 필요')">주의 필요</button>
          <button class="sub-btn" onclick="finish('상태: 좋지 않음')">좋지 않음</button>
        </div>
      </div>
    `;
  }

  /* ------------------------------
     AI 건강 도우미 (STT + 입력창 + TTS)
  ------------------------------ */
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
          <button class="sub-btn" onclick="startSTT('aiInput')">🎤 말하기</button>
          <button class="sub-btn" onclick="sendToAI()">AI에게 보내기</button>
        </div>

        <div id="aiResponse" class="ai-response-box" 
             style="margin-top:14px; font-size:17px; line-height:1.4;">
        </div>
      </div>
    `;
  }
}

/* ------------------------------
   기록 완료 화면
------------------------------ */

function finish(msg) {
  const screen = document.getElementById("screen");
  screen.innerHTML = `
    <div class="screen-box">
      <h3>
        기록 완료
        <img src="img/check-green.svg" class="check-icon" />
      </h3>
      <p class="check-message">${msg}</p>
    </div>
  `;

  setTimeout(() => {
    clearScreen();
  }, 1500);
}

/* ------------------------------
   AI 호출 + 답변 음성 읽기
   (대표님의 Vercel API URL로 자동 교체할 예정)
------------------------------ */

async function sendToAI() {
  const text = document.getElementById("aiInput").value.trim();
  if (!text) return;

  const resBox = document.getElementById("aiResponse");
  resBox.innerHTML = "⏳ 답변을 불러오는 중입니다...";

  try {
    const response = await fetch("YOUR_API_URL_HERE", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message: text }),
    });

    const data = await response.json();

    const reply = data.reply || "죄송해요, 잠시 다시 말씀해주실 수 있을까요?";
    resBox.innerHTML = reply;

    // ⭐ AI 답변 음성으로 읽기
    speak(reply);

  } catch (err) {
    resBox.innerHTML = "⚠️ 연결 오류가 발생했어요. 잠시 후 다시 시도해주세요.";
  }
}

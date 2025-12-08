
function goPage(type) {
    const screen = document.getElementById('screen');

    if (type === 'med') {
        screen.innerHTML = `
            <div class="screen-box">
                <h3>복약 체크하기</h3>
                <button class='main-btn' onclick='finish("아침 복약 완료")'>아침 복약</button>
                <button class='main-btn' onclick='finish("저녁 복약 완료")'>저녁 복약</button>
            </div>`;
    }

    if (type === 'mood') {
        screen.innerHTML = `
            <div class="screen-box">
                <h3>오늘 기분은 어떠세요?</h3>
                <button class='main-btn' onclick='finish("오늘 기분: 좋음")'>🙂 좋음</button>
                <button class='main-btn' onclick='finish("오늘 기분: 보통")'>😐 보통</button>
                <button class='main-btn' onclick='finish("오늘 기분: 나쁨")'>🙁 나쁨</button>
            </div>`;
    }

    if (type === 'health') {
        screen.innerHTML = `
            <div class="screen-box">
                <h3>건강 상태 기록하기</h3>
                <button class='main-btn' onclick='finish("상태: 양호")'>양호</button>
                <button class='main-btn' onclick='finish("상태: 주의 필요")'>주의 필요</button>
                <button class='main-btn' onclick='finish("상태: 좋지 않음")'>좋지 않음</button>
            </div>`;
    }

    if (type === 'ai') {
    screen.innerHTML = `
        <div class="screen-box">
            <h3>하루동행 건강 도우미</h3>
            <p>조금만 기다려주세요 💙<br>
            하루동행이 더 안전한 건강 상담 기능을 준비하고 있어요.</p>
        </div>`;
}

}

function finish(msg) {
    const screen = document.getElementById('screen');
    screen.innerHTML = `
        <div class="screen-box">
            <h3>기록 완료</h3>
            <p>${msg}</p>
            <button class='main-btn' onclick='location.reload()'>홈으로 돌아가기</button>
        </div>`;
}

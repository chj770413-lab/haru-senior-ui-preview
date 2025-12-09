function hideAll(){
    document.querySelectorAll('.section').forEach(s=>s.style.display='none');
    document.getElementById('home').style.display='none';
}

function show(section){
    hideAll();
    document.getElementById(section).style.display='block';
}

function finish(msg){
    hideAll();
    document.getElementById('finish-msg').innerText = msg;
    document.getElementById('finish-box').style.display='block';

    setTimeout(()=>{
        goHome();
    },1500); // 1.5초 자동 홈 이동
}

function goHome(){
    hideAll();
    document.getElementById('home').style.display='block';
}

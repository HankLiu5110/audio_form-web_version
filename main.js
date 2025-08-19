(() => {
  const els = {
    setup:      document.getElementById('setup'),
    quiz:       document.getElementById('quiz'),
    userId:     document.getElementById('userId'),
    camSel:     document.getElementById('cameraSelect'),
    micSel:     document.getElementById('micSelect'),
    micBar:     document.getElementById('micBar'),
    prev:       document.getElementById('preview'),
    startBtn:   document.getElementById('startBtn'),
    refreshBtn: document.getElementById('refreshBtn'),
    qVideo:     document.getElementById('qVideo'),
    nextBtn:    document.getElementById('nextBtn'),
    subtitle:   document.getElementById('subtitle'),
    finish:     document.getElementById('finish'),
    downloads:  document.getElementById('downloads'),
    vadStatus:  document.getElementById('vadStatus'),
  };

  const S = {
    userId: '',
    stream: null,
    recorder: null,
    chunks: [],
    analyser: null,
    rafId: 0,
    devices: { cams: [], mics: [] },
    questions: [],
    qIndex: -1,
    waitTimer: null,
    waitLeft: 0,
    outputs: [], // {filename, blob}
    vad: null,
    isSpeaking: false,
    speechStartTs: 0,
    speechDuration: 0, // in ms
  };

  // ---------- 工具 ----------
  const ts = () => {
    const d = new Date();
    const pad = n => String(n).padStart(2,'0');
    return `${d.getFullYear()}${pad(d.getMonth()+1)}${pad(d.getDate())}_${pad(d.getHours())}${pad(d.getMinutes())}${pad(d.getSeconds())}`;
  };
  const setMicBar = v => {
    const pct = Math.max(0, Math.min(100, v));
    els.micBar.style.width = pct + '%';
    els.micBar.style.background = pct<60?'#10B981':(pct<80?'#F59E0B':'#EF4444');
  };
  const filenameFor = qid => `${S.userId || 'user'}_${qid}_${ts()}.webm`;

  // ---------- 裝置與預覽 ----------
  async function enumerateDevices(){
    const devices = await navigator.mediaDevices.enumerateDevices();
    S.devices.cams = devices.filter(d => d.kind === 'videoinput');
    S.devices.mics = devices.filter(d => d.kind === 'audioinput');

    els.camSel.innerHTML = '';
    S.devices.cams.forEach((d,i)=>{
      const opt = document.createElement('option');
      opt.value = d.deviceId;
      opt.textContent = d.label || `攝影機 ${i}`;
      els.camSel.appendChild(opt);
    });

    els.micSel.innerHTML = '';
    S.devices.mics.forEach((d,i)=>{
      const opt = document.createElement('option');
      opt.value = d.deviceId;
      opt.textContent = d.label || `麥克風 ${i}`;
      els.micSel.appendChild(opt);
    });
  }

  async function startPreview(){
    stopPreview();
    const camId = els.camSel.value || undefined;
    const micId = els.micSel.value || undefined;
    S.stream = await navigator.mediaDevices.getUserMedia({
      video: camId ? {deviceId:{exact:camId}} : true,
      audio: micId ? {deviceId:{exact:micId}} : true
    });
    els.prev.srcObject = S.stream;

    // Mic 電平
    const AC = new (window.AudioContext || window.webkitAudioContext)();
    const src = AC.createMediaStreamSource(S.stream);
    const analyser = AC.createAnalyser();
    analyser.fftSize = 1024;
    src.connect(analyser);
    S.analyser = analyser;

    (function loop(){
      const arr = new Uint8Array(analyser.frequencyBinCount);
      analyser.getByteTimeDomainData(arr);
      let sum=0; for(let i=0;i<arr.length;i++){ const v=(arr[i]-128)/128; sum+=v*v; }
      const rms = Math.sqrt(sum/arr.length);
      setMicBar(Math.min(100, Math.floor(rms*200)));
      S.rafId = requestAnimationFrame(loop);
    })();

    try { await enumerateDevices(); } catch {}
  }

  function stopPreview(){
    if (S.rafId) cancelAnimationFrame(S.rafId);
    S.rafId = 0; setMicBar(0);
    if (S.stream){
      S.stream.getTracks().forEach(t => t.stop());
      S.stream = null;
    }
    els.prev.srcObject = null;
  }

  // ---------- 題庫 ----------
  async function loadManifest(){
    const tag = document.getElementById('manifest-inline');
    if (tag && tag.textContent.trim()){
      try { return JSON.parse(tag.textContent); }
      catch(err){ throw new Error('內嵌題庫 JSON 解析失敗：'+err.message); }
    }
    if (window.QUIZ_MANIFEST) return window.QUIZ_MANIFEST;
    const res = await fetch('quiz/index.json');
    if (!res.ok) throw new Error('讀取 quiz/index.json 失敗：HTTP '+res.status);
    return await res.json();
  }

  // ---------- 問卷流程 ----------
  async function startQuiz(){
    S.userId = (els.userId.value||'').trim();
    localStorage.setItem('lastUserId', S.userId);
    els.setup.classList.remove('active');
    els.quiz.classList.add('active');

    els.qVideo.muted = false;
    els.qVideo.controls = false;

    const mf = await loadManifest();
    const intro = mf.intro;
    const rawQs = mf.qs || mf.questions || mf.items || [];
    S.questions = rawQs.map((q,i)=>({
      id:   q.id ?? (i+1),
      video:q.video,
      text: q.text || `題目 ${q.id ?? (i+1)}`,
      wait: Number(q.wait||0)|0
    }));

    if (intro && intro.video){
      els.subtitle.textContent = intro.text || '';
      await playVideo(intro.video);
      els.qVideo.onended = () => showQuestion(0);
    }else{
      showQuestion(0);
    }
  }

  function unlockNext(){
    if (S.waitTimer){ clearInterval(S.waitTimer); S.waitTimer = null; }
    if (S.vad) { S.vad.pause(); S.vad = null; }
    S.waitLeft = 0;
    els.nextBtn.disabled = false;
    els.nextBtn.textContent = '下一題';
  }

  async function showQuestion(i){
    if (i >= S.questions.length){ await finish(); return; }
    S.qIndex = i;
    const q = S.questions[i];
    els.subtitle.textContent = q.text || '';
    els.finish.classList.add('hidden');
    els.nextBtn.disabled = true;

    // New flow: Play video, then start recording and VAD onended.
    els.qVideo.onended = async () => {
      await startRecording(q.id);
      
      const requiredSpeechSecs = Math.max(0, Number(q.wait||0)|0);
      S.waitLeft = requiredSpeechSecs;

      if (requiredSpeechSecs > 0) {
        // VAD logic
        S.speechDuration = 0;
        S.isSpeaking = false;
        els.nextBtn.textContent = `請說話... (0/${requiredSpeechSecs}s)`;

        if (S.vad) { S.vad.pause(); }
        
        try {
          S.vad = await vad.MicVAD.new({
            stream: S.stream,
            onSpeechStart: () => {
              S.isSpeaking = true;
              S.speechStartTs = Date.now();
            },
            onSpeechEnd: () => {
              const durationMs = Date.now() - S.speechStartTs;
              S.speechDuration += durationMs;
              S.isSpeaking = false;
            },
          });
          S.vad.start();

          S.waitTimer = setInterval(() => {
            let currentDuration = S.speechDuration;
            if (S.isSpeaking) {
              currentDuration += Date.now() - S.speechStartTs;
            }
            const currentDurationSecs = Math.floor(currentDuration / 1000);

            if (currentDurationSecs >= requiredSpeechSecs) {
              unlockNext();
            } else {
              els.nextBtn.textContent = `請說話... (${currentDurationSecs}/${requiredSpeechSecs}s)`;
            }
          }, 250);
        } catch (e) {
          console.error("VAD failed to start", e);
          // Fallback to simple timer if VAD fails
          S.waitTimer = setInterval(()=> {
            S.waitLeft--;
            if (S.waitLeft<=0){ unlockNext(); }
            else { els.nextBtn.textContent = `下一題（等待 ${S.waitLeft}s）`; }
          },1000);
        }
      } else {
        unlockNext();
      }
    };

    await playVideo(q.video);
  }

  function playVideo(src){
    return new Promise((resolve,reject)=>{
      els.qVideo.loop = false;
      els.qVideo.onloadeddata = ()=>resolve();
      els.qVideo.onerror = ()=>reject(new Error('影片載入失敗：'+src));
      els.qVideo.src = src;
      const p = els.qVideo.play();
      if (p && typeof p.catch === 'function'){ p.catch(()=>{}); }
    });
  }

  async function startRecording(qid){
    if (!S.stream){ await startPreview(); }
    S.chunks = [];
    S.recorder = new MediaRecorder(S.stream, {mimeType: 'video/webm;codecs=vp8,opus'});
    S.recorder.ondataavailable = e => { if (e.data && e.data.size>0) S.chunks.push(e.data); };
    S.recorder.onstop = () => {
      const blob = new Blob(S.chunks, {type:'video/webm'});
      const name = filenameFor(qid);
      S.outputs.push({filename:name, blob});
      addDownloadLink(name, blob);
    };
    S.recorder.start();
  }

  function stopRecording(){
    if (S.recorder && S.recorder.state!=='inactive'){ S.recorder.stop(); }
  }

  function addDownloadLink(name, blob){
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = name;
    a.textContent = `下載 ${name}`;
    a.className = 'dl';
    const wrap = document.createElement('div');
    wrap.appendChild(a);
    els.downloads.appendChild(wrap);
  }

  // —— 這裡把 zip 功能放進同一作用域（可離線下載到「預設下載資料夾」）
  async function zipAllAndDownload() {
    if (!S.outputs.length) return;
    const zip = new JSZip();
    const user = (S.userId || 'user').trim() || 'user';
    const zipName = `${user}_${ts()}.zip`;

    S.outputs.forEach(out=>{
      const name = out.filename.replace(/\.webm$/i, '.mp4'); // 檔名改 .mp4（容器實為 webm）
      zip.file(name, out.blob);
    });

    zip.file("manifest.json", JSON.stringify({
      userId: user, createdAt: new Date().toISOString(),
      count: S.outputs.length, note: "影片實為 webm，需轉檔再得真正 mp4"
    }, null, 2));

    const blob = await zip.generateAsync({type:"blob", compression:"DEFLATE", compressionOptions:{level:6}});
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = zipName;
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
  }

  async function finish(){
    if (S.vad) { S.vad.pause(); S.vad = null; }
    if (S.waitTimer) { clearInterval(S.waitTimer); S.waitTimer = null; }
    
    els.subtitle.textContent = '問卷結束';
    els.finish.classList.remove('hidden');
    els.nextBtn.disabled = true;

    try { await zipAllAndDownload(); }
    catch(err){ alert('打包下載失敗：\n' + err.message); }

    // 回首頁 & 重置並保留預覽
    setTimeout(async ()=>{
      els.quiz.classList.remove('active');
      els.setup.classList.add('active');
      S.outputs = [];
      els.downloads.innerHTML = '';
      S.qIndex = -1;
      try{ await enumerateDevices(); await startPreview(); }catch{}
    }, 500);
  }

  // ---------- 事件 ----------
  els.startBtn.addEventListener('click', async ()=>{
    if (!els.userId.value.trim()){ alert('請輸入使用者代號'); return; }
    try{
      if (!S.stream) await startPreview(); // 只有沒串流才要權限，避免第二次彈窗
      await startQuiz();
    }catch(err){ alert('啟動失敗：\n' + err.message); }
  });

  els.refreshBtn.addEventListener('click', async ()=>{
    await enumerateDevices(); await startPreview();
  });

  els.nextBtn.addEventListener('click', ()=>{
    if (els.nextBtn.disabled) return;
    stopRecording();
    showQuestion(S.qIndex+1);
  });

  // ---------- 初始化：進頁就開預覽（只跳一次權限）
  (async function init(){
    els.userId.value = localStorage.getItem('lastUserId') || '';
    try{ await startPreview(); }catch(e){
      alert('請允許相機與麥克風以開始預覽：\n'+e.message); return;
    }
    try{ await enumerateDevices(); }catch{}
  })();
})();


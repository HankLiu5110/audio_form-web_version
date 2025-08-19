// 簡易 VAD（能量門檻）+ 秒數累計 + UI 狀態顯示
(() => {
  const els = {
    startBtn: document.getElementById('startBtn'),
    nextBtn: document.getElementById('nextBtn'),
    finishBtn: document.getElementById('finishBtn'),
    speakBtn: document.getElementById('speakBtn'),
    vadStatus: document.getElementById('vadStatus'),
    subtitle: document.getElementById('subtitle'),
    requiredSecsInput: document.getElementById('requiredSecs'),
  };

  const S = {
    ctx: null,
    micStream: null,
    srcNode: null,
    analyser: null,
    proc: null,
    rafId: null,

    speaking: false,
    speechStartTs: 0,
    speechAccumMs: 0,   // 只在 speaking=true 時累加
    requiredMs: 3000,   // 可由 UI 設定
    unlocked: false,

    // VAD 門檻與去抖
    threshold: 0.02,    // RMS 門檻（0~1）
    enterFrames: 3,     // 連續超過門檻幾幀才算開始說話
    exitFrames: 8,      // 連續低於門檻幾幀才算停止說話
    aboveCount: 0,
    belowCount: 0,
  };

  function setVadStatus(mode) {
    const el = els.vadStatus;
    if (!el) return;
    if (mode === 'speaking') {
      el.textContent = '說話中';
      el.style.color = '#10B981'; // 綠
      el.classList.remove('hidden');
    } else if (mode === 'idle') {
      el.textContent = '請回答';
      el.style.color = '#9CA3AF'; // 灰
      el.classList.remove('hidden');
    } else {
      el.textContent = '';
      el.classList.add('hidden');
    }
  }

  function formatSecs(ms) {
    return (ms / 1000).toFixed(1);
  }
  function updateSpeakBtnText() {
    const cur = Math.min(S.speechAccumMs + (S.speaking ? (Date.now() - S.speechStartTs) : 0), S.requiredMs);
    els.speakBtn.textContent = `請說話... (${formatSecs(cur)}/${formatSecs(S.requiredMs)}s)`;
  }

  async function setupAudio() {
    if (S.ctx) return;
    S.ctx = new (window.AudioContext || window.webkitAudioContext)();
    const mic = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
    S.micStream = mic;
    S.srcNode = S.ctx.createMediaStreamSource(mic);

    S.analyser = S.ctx.createAnalyser();
    S.analyser.fftSize = 2048;
    S.analyser.smoothingTimeConstant = 0.04;
    S.srcNode.connect(S.analyser);
  }

  function computeRMS() {
    const buf = new Float32Array(S.analyser.fftSize);
    S.analyser.getFloatTimeDomainData(buf);
    let sum = 0;
    for (let i = 0; i < buf.length; i++) {
      sum += buf[i] * buf[i];
    }
    return Math.sqrt(sum / buf.length);
  }

  function onSpeechStart() {
    if (S.speaking) return;
    S.speaking = true;
    S.speechStartTs = Date.now();
    setVadStatus('speaking');
  }

  function onSpeechEnd() {
    if (!S.speaking) return;
    const now = Date.now();
    S.speechAccumMs += (now - S.speechStartTs);
    S.speaking = false;
    setVadStatus('idle');
  }

  function checkUnlock() {
    const cur = S.speechAccumMs + (S.speaking ? (Date.now() - S.speechStartTs) : 0);
    if (!S.unlocked && cur >= S.requiredMs) {
      S.unlocked = true;
      els.nextBtn.disabled = false;
    }
  }

  function loop() {
    const rms = computeRMS();
    // 門檻去抖
    if (rms >= S.threshold) {
      S.aboveCount++;
      S.belowCount = 0;
      if (!S.speaking && S.aboveCount >= S.enterFrames) {
        onSpeechStart();
      }
    } else {
      S.belowCount++;
      S.aboveCount = 0;
      if (S.speaking && S.belowCount >= S.exitFrames) {
        onSpeechEnd();
      }
    }

    updateSpeakBtnText();
    checkUnlock();
    S.rafId = requestAnimationFrame(loop);
  }

  async function startAnswering() {
    els.startBtn.disabled = true;
    els.nextBtn.disabled = true;
    els.speakBtn.disabled = false;

    S.requiredMs = Math.max(0, Number(els.requiredSecsInput.value) || 0) * 1000;
    S.speechAccumMs = 0;
    S.unlocked = false;
    S.aboveCount = 0;
    S.belowCount = 0;
    updateSpeakBtnText();

    try {
      await setupAudio();
      if (S.ctx.state === 'suspended') await S.ctx.resume();
      setVadStatus('idle');
      S.rafId = requestAnimationFrame(loop);
      els.subtitle.textContent = '作答中：請說話至指定秒數。';
    } catch (err) {
      console.error('Audio setup failed:', err);
      els.subtitle.textContent = '無法啟用麥克風，請確認權限設定。';
      setVadStatus('hidden');
      els.startBtn.disabled = false;
    }
  }

  function stopAll() {
    cancelAnimationFrame(S.rafId);
    S.rafId = null;
    onSpeechEnd(); // 收尾，把最後一段累計進去
    if (S.ctx) { S.ctx.suspend().catch(() => {}); }
    setVadStatus('hidden');
    els.speakBtn.disabled = true;
  }

  function nextQuestion() {
    stopAll();
    els.subtitle.textContent = '已達標，可進入下一題（這裡僅示範 UI）。';
    els.startBtn.disabled = false;
    els.nextBtn.disabled = true;
  }
  function finishAll() {
    stopAll();
    els.subtitle.textContent = '問卷結束，感謝作答。';
    els.startBtn.disabled = true;
    els.nextBtn.disabled = true;
  }

  // 事件
  els.startBtn.addEventListener('click', startAnswering);
  els.nextBtn.addEventListener('click', nextQuestion);
  els.finishBtn.addEventListener('click', finishAll);
  els.requiredSecsInput.addEventListener('change', () => {
    S.requiredMs = Math.max(0, Number(els.requiredSecsInput.value) || 0) * 1000;
    updateSpeakBtnText();
  });

  // 初始狀態
  setVadStatus('hidden');
  updateSpeakBtnText();
})();

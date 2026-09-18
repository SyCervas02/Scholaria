              /* ── STUDENT QUIZ TAKING & SCORING ENGINE ── */

const takeQuizState = { 
  quiz: null, 
  items: [], 
  responses: {}, 
  submitting: false, 
  reviewMode: false, 
  reviewAnswers: [],
  timeLimitMinutes: 0,
  secondsLeft: 0,
  timerInterval: null
};

const interactiveState = {
  active: false,
  viewMode: 'lobby', // 'lobby' | 'playing' | 'summary'
  selectedFormat: 'all', // 'all' | 'multiple_choice' | 'identification' | 'matching'
  selectedCount: 'auto', // 'auto' | 10 | 15 | 20 | 25
  theme: 'purple', // 'purple' | 'cyber' | 'gold' | 'space'
  settings: {
    tts: false,
    music: true,
    sfx: true
  },
  activeItems: [],
  currentIndex: 0,
  score: 0,
  points: 0,
  streak: 0,
  maxStreak: 0,
  timer: 15,
  timerInterval: null,
  selectedAnswer: null,
  isAnswered: false,
  isFinished: false,
  feedbackText: '',
  feedbackType: ''
};

/* ── AUDIO SYNTHESIZER FOR GAMIFIED SFX ── */
function playGamifiedSfx(type) {
  if (!interactiveState.settings.sfx) return;
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    
    if (type === 'correct') {
      osc.type = 'sine';
      osc.frequency.setValueAtTime(523.25, ctx.currentTime); // C5
      osc.frequency.exponentialRampToValueAtTime(659.25, ctx.currentTime + 0.15); // E5
      gain.gain.setValueAtTime(0.2, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.25);
      osc.start();
      osc.stop(ctx.currentTime + 0.25);
    } else if (type === 'wrong') {
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(220, ctx.currentTime); // A3
      osc.frequency.exponentialRampToValueAtTime(146.83, ctx.currentTime + 0.2); // D3
      gain.gain.setValueAtTime(0.2, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.3);
      osc.start();
      osc.stop(ctx.currentTime + 0.3);
    } else if (type === 'click') {
      osc.type = 'sine';
      osc.frequency.setValueAtTime(800, ctx.currentTime);
      gain.gain.setValueAtTime(0.1, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.05);
      osc.start();
      osc.stop(ctx.currentTime + 0.05);
    }
  } catch (e) {
    // AudioContext fallback
  }
}

function speakQuestionText(text) {
  if (!interactiveState.settings.tts || !('speechSynthesis' in window)) return;
  try {
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 1.0;
    window.speechSynthesis.speak(utterance);
  } catch (e) {}
}

/* ── DYNAMIC SUBJECT THEME & ARTWORK ENGINE FOR ALL SECTIONS & GRADES ── */
function getSubjectSvg(subjectKey) {
  const svgs = {
    'earth-science': "<svg xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"0 0 1920 1080\" width=\"100%\" height=\"100%\">\n  <defs>\n    <radialGradient id=\"spaceBg\" cx=\"50%\" cy=\"40%\" r=\"75%\">\n      <stop offset=\"0%\" stop-color=\"#071b30\"/>\n      <stop offset=\"45%\" stop-color=\"#030d1a\"/>\n      <stop offset=\"100%\" stop-color=\"#01050a\"/>\n    </radialGradient>\n    <radialGradient id=\"earthGlow\" cx=\"50%\" cy=\"50%\" r=\"50%\">\n      <stop offset=\"70%\" stop-color=\"#38bdf8\" stop-opacity=\"0.8\"/>\n      <stop offset=\"85%\" stop-color=\"#0284c7\" stop-opacity=\"0.4\"/>\n      <stop offset=\"100%\" stop-color=\"#0284c7\" stop-opacity=\"0\"/>\n    </radialGradient>\n    <radialGradient id=\"earthSphere\" cx=\"35%\" cy=\"35%\" r=\"65%\">\n      <stop offset=\"0%\" stop-color=\"#7dd3fc\"/>\n      <stop offset=\"30%\" stop-color=\"#0284c7\"/>\n      <stop offset=\"65%\" stop-color=\"#034e7b\"/>\n      <stop offset=\"100%\" stop-color=\"#021f38\"/>\n    </radialGradient>\n    <radialGradient id=\"sunCorona\" cx=\"50%\" cy=\"50%\" r=\"50%\">\n      <stop offset=\"0%\" stop-color=\"#ffffff\"/>\n      <stop offset=\"20%\" stop-color=\"#fef08a\"/>\n      <stop offset=\"45%\" stop-color=\"#f59e0b\" stop-opacity=\"0.8\"/>\n      <stop offset=\"75%\" stop-color=\"#ea580c\" stop-opacity=\"0.3\"/>\n      <stop offset=\"100%\" stop-color=\"#ea580c\" stop-opacity=\"0\"/>\n    </radialGradient>\n    <radialGradient id=\"moonSphere\" cx=\"40%\" cy=\"40%\" r=\"60%\">\n      <stop offset=\"0%\" stop-color=\"#f8fafc\"/>\n      <stop offset=\"60%\" stop-color=\"#cbd5e1\"/>\n      <stop offset=\"100%\" stop-color=\"#475569\"/>\n    </radialGradient>\n    <linearGradient id=\"crustGrad\" x1=\"0%\" y1=\"0%\" x2=\"0%\" y2=\"100%\">\n      <stop offset=\"0%\" stop-color=\"#0284c7\" stop-opacity=\"0.2\"/>\n      <stop offset=\"35%\" stop-color=\"#047857\"/>\n      <stop offset=\"65%\" stop-color=\"#b45309\"/>\n      <stop offset=\"85%\" stop-color=\"#dc2626\"/>\n      <stop offset=\"100%\" stop-color=\"#7f1d1d\"/>\n    </linearGradient>\n  </defs>\n\n  <rect width=\"1920\" height=\"1080\" fill=\"url(#spaceBg)\"/>\n\n  <g fill=\"#ffffff\">\n    <circle cx=\"120\" cy=\"80\" r=\"1.5\" opacity=\"0.9\"/><circle cx=\"280\" cy=\"140\" r=\"2.5\" opacity=\"0.7\"/><circle cx=\"450\" cy=\"70\" r=\"1.2\" opacity=\"0.8\"/><circle cx=\"620\" cy=\"110\" r=\"2\" opacity=\"0.6\"/>\n    <circle cx=\"790\" cy=\"50\" r=\"2.8\" opacity=\"0.85\"/><circle cx=\"950\" cy=\"130\" r=\"1.5\" opacity=\"0.5\"/><circle cx=\"1120\" cy=\"65\" r=\"3\" opacity=\"0.9\"/><circle cx=\"1320\" cy=\"140\" r=\"1.8\" opacity=\"0.7\"/>\n    <circle cx=\"150\" cy=\"420\" r=\"2\" opacity=\"0.7\"/><circle cx=\"80\" cy=\"600\" r=\"2.5\" opacity=\"0.8\"/><circle cx=\"220\" cy=\"720\" r=\"1.5\" opacity=\"0.5\"/>\n    <circle cx=\"1780\" cy=\"620\" r=\"2.5\" opacity=\"0.8\"/><circle cx=\"1880\" cy=\"450\" r=\"2\" opacity=\"0.7\"/><circle cx=\"1820\" cy=\"780\" r=\"1.8\" opacity=\"0.6\"/>\n  </g>\n  <path d=\"M 120,80 L 280,140 L 450,70 L 620,110\" stroke=\"#38bdf8\" stroke-width=\"0.8\" opacity=\"0.4\" fill=\"none\"/>\n  <path d=\"M 790,50 L 950,130 L 1120,65\" stroke=\"#38bdf8\" stroke-width=\"0.8\" opacity=\"0.4\" fill=\"none\"/>\n\n  <!-- HERO TOP-LEFT: Sun Flare -->\n  <circle cx=\"180\" cy=\"180\" r=\"220\" fill=\"url(#sunCorona)\"/>\n  <circle cx=\"180\" cy=\"180\" r=\"48\" fill=\"#ffffff\"/>\n  <line x1=\"180\" y1=\"40\" x2=\"180\" y2=\"320\" stroke=\"#fde047\" stroke-width=\"2\" opacity=\"0.5\"/>\n  <line x1=\"40\" y1=\"180\" x2=\"320\" y2=\"180\" stroke=\"#fde047\" stroke-width=\"2\" opacity=\"0.5\"/>\n\n  <!-- Crescent Moon -->\n  <g transform=\"translate(360, 110)\">\n    <circle cx=\"35\" cy=\"35\" r=\"32\" fill=\"url(#moonSphere)\"/>\n    <circle cx=\"25\" cy=\"25\" r=\"6\" fill=\"#94a3b8\" opacity=\"0.6\"/>\n    <path d=\"M 35,3 A 32,32 0 0,0 35,67 A 26,32 0 0,1 35,3 Z\" fill=\"#030d1a\" opacity=\"0.75\"/>\n  </g>\n\n  <!-- HERO TOP-RIGHT: GLORIOUS EARTH GLOBE -->\n  <g transform=\"translate(1560, 310)\">\n    <circle cx=\"0\" cy=\"0\" r=\"260\" fill=\"url(#earthGlow)\"/>\n    <circle cx=\"0\" cy=\"0\" r=\"215\" fill=\"url(#earthSphere)\"/>\n    <path d=\"M -70,-130 Q -10,-150 40,-110 Q 90,-80 80,-20 Q 60,30 20,40 Q -30,50 -70,10 Q -90,-40 -70,-130 Z\" fill=\"#22c55e\" opacity=\"0.95\"/>\n    <path d=\"M 40,-110 Q 110,-90 140,-30 Q 150,20 110,50 Q 80,40 50,0 Q 30,-50 40,-110 Z\" fill=\"#15803d\" opacity=\"0.95\"/>\n    <path d=\"M -90,-20 Q -40,-10 -30,30 Q -20,90 -60,130 Q -110,110 -115,50 Q -110,10 -90,-20 Z\" fill=\"#16a34a\" opacity=\"0.95\"/>\n    <ellipse cx=\"-15\" cy=\"85\" rx=\"8\" ry=\"18\" fill=\"#15803d\" transform=\"rotate(20 -15 85)\"/>\n    <path d=\"M 70,70 Q 130,60 140,110 Q 120,145 70,130 Q 55,100 70,70 Z\" fill=\"#22c55e\" opacity=\"0.9\"/>\n    \n    <path d=\"M -180,-70 Q -100,-130 0,-70 T 170,-90\" stroke=\"#ffffff\" stroke-width=\"16\" fill=\"none\" opacity=\"0.75\" stroke-linecap=\"round\"/>\n    <path d=\"M -160,20 Q -60,-30 60,30 T 190,-10\" stroke=\"#ffffff\" stroke-width=\"20\" fill=\"none\" opacity=\"0.7\" stroke-linecap=\"round\"/>\n    <path d=\"M -140,90 Q -40,120 70,75 T 160,115\" stroke=\"#ffffff\" stroke-width=\"14\" fill=\"none\" opacity=\"0.65\" stroke-linecap=\"round\"/>\n\n    <!-- Orbital Satellite -->\n    <g transform=\"translate(-160, -140) rotate(-35)\">\n      <rect x=\"-42\" y=\"-10\" width=\"28\" height=\"20\" rx=\"2\" fill=\"#0284c7\" stroke=\"#38bdf8\" stroke-width=\"1.5\"/>\n      <rect x=\"14\" y=\"-10\" width=\"28\" height=\"20\" rx=\"2\" fill=\"#0284c7\" stroke=\"#38bdf8\" stroke-width=\"1.5\"/>\n      <rect x=\"-12\" y=\"-8\" width=\"24\" height=\"16\" rx=\"3\" fill=\"#f8fafc\" stroke=\"#94a3b8\" stroke-width=\"1.5\"/>\n      <circle cx=\"0\" cy=\"0\" r=\"3\" fill=\"#e11d48\"/>\n    </g>\n    <path d=\"M 0,-215 A 215,215 0 0,1 215,0 A 215,215 0 0,1 0,215 A 215,215 0 0,0 0,-215 Z\" fill=\"#01050a\" opacity=\"0.45\"/>\n  </g>\n\n  <!-- Orbital Rings -->\n  <g stroke=\"#38bdf8\" stroke-width=\"2\" fill=\"none\" opacity=\"0.45\">\n    <ellipse cx=\"960\" cy=\"650\" rx=\"980\" ry=\"320\" stroke-dasharray=\"14 10\"/>\n  </g>\n\n  <!-- BOTTOM: Geological Strata -->\n  <path d=\"M -100,820 Q 960,690 2020,820 L 2020,1080 L -100,1080 Z\" fill=\"url(#crustGrad)\"/>\n  <path d=\"M 0,890 L 180,820 L 380,880 L 620,790 L 890,870 L 1150,780 L 1420,860 L 1700,770 L 1920,840 L 1920,1080 L 0,1080 Z\" fill=\"#064e3b\" opacity=\"0.75\"/>\n  <path d=\"M 0,940 L 240,880 L 520,930 L 820,850 L 1100,920 L 1380,860 L 1650,910 L 1920,870 L 1920,1080 L 0,1080 Z\" fill=\"#022c22\" opacity=\"0.9\"/>\n  <path d=\"M 0,1040 Q 480,1000 960,1020 T 1920,1030 L 1920,1080 L 0,1080 Z\" fill=\"#ea580c\" opacity=\"0.85\"/>\n  <path d=\"M 0,1055 Q 500,1030 1000,1045 T 1920,1050 L 1920,1080 L 0,1080 Z\" fill=\"#fbbf24\" opacity=\"0.95\"/>\n</svg>",
    'drrr': "<svg xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"0 0 1920 1080\" width=\"100%\" height=\"100%\">\n  <defs>\n    <radialGradient id=\"drrrBg\" cx=\"50%\" cy=\"40%\" r=\"75%\">\n      <stop offset=\"0%\" stop-color=\"#2d120a\"/>\n      <stop offset=\"45%\" stop-color=\"#1c0b05\"/>\n      <stop offset=\"100%\" stop-color=\"#0a0301\"/>\n    </radialGradient>\n    <radialGradient id=\"magmaGlow\" cx=\"50%\" cy=\"50%\" r=\"50%\">\n      <stop offset=\"0%\" stop-color=\"#fef08a\"/>\n      <stop offset=\"25%\" stop-color=\"#f97316\"/>\n      <stop offset=\"60%\" stop-color=\"#dc2626\" stop-opacity=\"0.8\"/>\n      <stop offset=\"100%\" stop-color=\"#7f1d1d\" stop-opacity=\"0\"/>\n    </radialGradient>\n    <radialGradient id=\"shieldGlow\" cx=\"50%\" cy=\"50%\" r=\"50%\">\n      <stop offset=\"0%\" stop-color=\"#f59e0b\" stop-opacity=\"0.9\"/>\n      <stop offset=\"50%\" stop-color=\"#ea580c\" stop-opacity=\"0.4\"/>\n      <stop offset=\"100%\" stop-color=\"#ea580c\" stop-opacity=\"0\"/>\n    </radialGradient>\n    <linearGradient id=\"lavaStream\" x1=\"0%\" y1=\"0%\" x2=\"0%\" y2=\"100%\">\n      <stop offset=\"0%\" stop-color=\"#fef08a\"/>\n      <stop offset=\"30%\" stop-color=\"#f97316\"/>\n      <stop offset=\"80%\" stop-color=\"#dc2626\"/>\n      <stop offset=\"100%\" stop-color=\"#7f1d1d\"/>\n    </linearGradient>\n  </defs>\n\n  <rect width=\"1920\" height=\"1080\" fill=\"url(#drrrBg)\"/>\n\n  <!-- TOP-LEFT: Emergency Disaster Preparedness Shield & Seismograph Waveform -->\n  <g transform=\"translate(120, 90)\">\n    <circle cx=\"140\" cy=\"140\" r=\"160\" fill=\"url(#shieldGlow)\"/>\n    <!-- Safety Preparedness Shield -->\n    <path d=\"M 140,20 L 220,50 L 220,150 C 220,220 140,260 140,260 C 140,260 60,220 60,150 L 60,50 Z\" fill=\"#991b1b\" stroke=\"#f59e0b\" stroke-width=\"4.5\"/>\n    <path d=\"M 140,35 L 205,60 L 205,145 C 205,205 140,240 140,240 C 140,240 75,205 75,145 L 75,60 Z\" fill=\"#b91c1c\"/>\n    <!-- Emergency Hazard Warning Symbol -->\n    <polygon points=\"140,75 180,145 100,145\" fill=\"#fef08a\"/>\n    <polygon points=\"140,85 170,140 110,140\" fill=\"#f59e0b\"/>\n    <rect x=\"137\" y=\"100\" width=\"6\" height=\"22\" rx=\"3\" fill=\"#0f172a\"/>\n    <circle cx=\"140\" cy=\"130\" r=\"3.5\" fill=\"#0f172a\"/>\n\n    <!-- Earthquake Seismograph Richter Waveform -->\n    <g transform=\"translate(240, 60)\">\n      <rect x=\"0\" y=\"0\" width=\"340\" height=\"120\" rx=\"10\" fill=\"rgba(15, 23, 42, 0.75)\" stroke=\"#ea580c\" stroke-width=\"2\"/>\n      <text x=\"14\" y=\"24\" fill=\"#fdba74\" font-size=\"12\" font-family=\"monospace\" font-weight=\"bold\">SEISMOGRAPH • RICHTER SCALE</text>\n      <!-- Grid lines -->\n      <line x1=\"0\" y1=\"70\" x2=\"340\" y2=\"70\" stroke=\"#7c2d12\" stroke-width=\"1\" stroke-dasharray=\"4 4\"/>\n      <!-- Dynamic Seismic Tremor Spike Wave -->\n      <path d=\"M 10,70 L 50,70 L 65,55 L 75,85 L 90,65 L 105,75 L 125,70 L 140,30 L 155,105 L 170,20 L 185,110 L 200,45 L 215,85 L 235,60 L 255,75 L 275,70 L 330,70\" stroke=\"#f97316\" stroke-width=\"3\" fill=\"none\"/>\n      <!-- Magnitude readout -->\n      <text x=\"240\" y=\"30\" fill=\"#f87171\" font-size=\"15\" font-family=\"monospace\" font-weight=\"bold\">MAG: 7.2</text>\n    </g>\n  </g>\n\n  <!-- HERO TOP-RIGHT: Active Volcano Eruption & Lightning Ash Cloud -->\n  <g transform=\"translate(1550, 290)\">\n    <circle cx=\"0\" cy=\"-50\" r=\"260\" fill=\"url(#magmaGlow)\"/>\n\n    <!-- Pyroclastic Ash Cloud Plumes -->\n    <circle cx=\"-50\" cy=\"-140\" r=\"70\" fill=\"#44403c\" opacity=\"0.85\"/>\n    <circle cx=\"50\" cy=\"-160\" r=\"85\" fill=\"#292524\" opacity=\"0.9\"/>\n    <circle cx=\"0\" cy=\"-220\" r=\"80\" fill=\"#1c1917\" opacity=\"0.95\"/>\n    <circle cx=\"-90\" cy=\"-210\" r=\"60\" fill=\"#292524\" opacity=\"0.8\"/>\n    <circle cx=\"80\" cy=\"-220\" r=\"65\" fill=\"#44403c\" opacity=\"0.85\"/>\n\n    <!-- Volcanic Lightning Bolts inside Ash Plume -->\n    <path d=\"M -30,-220 L 0,-160 L -15,-155 L 20,-100\" stroke=\"#fef08a\" stroke-width=\"3.5\" fill=\"none\"/>\n    <path d=\"M 40,-240 L 65,-180 L 50,-175 L 80,-120\" stroke=\"#fef08a\" stroke-width=\"2.5\" fill=\"none\"/>\n\n    <!-- Volcanic Cone Peak -->\n    <polygon points=\"-240,240 -60,-80 60,-80 240,240\" fill=\"#1c1917\" stroke=\"#451a03\" stroke-width=\"3\"/>\n    \n    <!-- Glowing Crater Vent -->\n    <ellipse cx=\"0\" cy=\"-80\" rx=\"60\" ry=\"18\" fill=\"#fef08a\" stroke=\"#ea580c\" stroke-width=\"4\"/>\n    <ellipse cx=\"0\" cy=\"-80\" rx=\"40\" ry=\"10\" fill=\"#ffffff\"/>\n\n    <!-- Molten Lava Streams down Volcano slope -->\n    <path d=\"M -20,-75 Q -40,40 -90,140 T -140,240\" stroke=\"url(#lavaStream)\" stroke-width=\"12\" fill=\"none\" stroke-linecap=\"round\"/>\n    <path d=\"M 20,-75 Q 45,30 80,120 T 130,240\" stroke=\"url(#lavaStream)\" stroke-width=\"10\" fill=\"none\" stroke-linecap=\"round\"/>\n    <path d=\"M 0,-70 Q 10,50 -20,150 T -10,240\" stroke=\"url(#lavaStream)\" stroke-width=\"8\" fill=\"none\" stroke-linecap=\"round\"/>\n\n    <!-- Volcanic Bombs / Glowing Ejecta flying -->\n    <circle cx=\"-120\" cy=\"-100\" r=\"7\" fill=\"#fef08a\"/>\n    <circle cx=\"110\" cy=\"-90\" r=\"8\" fill=\"#f97316\"/>\n    <circle cx=\"-60\" cy=\"-40\" r=\"6\" fill=\"#f97316\"/>\n    <circle cx=\"140\" cy=\"-140\" r=\"5\" fill=\"#fef08a\"/>\n  </g>\n\n  <!-- Weather Radar Storm / Cyclone Vortex sweeping across the center -->\n  <g stroke=\"#ea580c\" stroke-width=\"1.8\" fill=\"none\" opacity=\"0.35\" stroke-dasharray=\"10 8\">\n    <ellipse cx=\"960\" cy=\"580\" rx=\"850\" ry=\"260\"/>\n    <ellipse cx=\"960\" cy=\"590\" rx=\"1050\" ry=\"320\"/>\n  </g>\n\n  <!-- BOTTOM: Tectonic Fault Line Rupture & Tsunami Wave Crest -->\n  <!-- Ocean Tsunami Wave (Left) -->\n  <path d=\"M 0,920 Q 250,750 480,880 Q 720,1020 960,940 L 960,1080 L 0,1080 Z\" fill=\"#0e7490\" opacity=\"0.75\"/>\n  <path d=\"M 0,960 Q 200,820 400,920 Q 600,1040 850,970 L 850,1080 L 0,1080 Z\" fill=\"#155e75\" opacity=\"0.9\"/>\n  <!-- Foam Crest -->\n  <path d=\"M 120,840 Q 240,780 340,820 T 460,890\" stroke=\"#ffffff\" stroke-width=\"6\" fill=\"none\" opacity=\"0.8\"/>\n\n  <!-- Tectonic Ground Rupture / Fault Fissure (Right) -->\n  <polygon points=\"850,960 1100,920 1350,970 1600,910 1920,950 1920,1080 850,1080\" fill=\"#292524\"/>\n  <polygon points=\"900,990 1200,950 1500,1000 1800,940 1920,970 1920,1080 900,1080\" fill=\"#1c1917\"/>\n  <!-- Glowing Magma Fault Line at very base -->\n  <path d=\"M 0,1040 L 300,1020 L 600,1050 L 900,1015 L 1200,1040 L 1500,1010 L 1920,1035 L 1920,1080 L 0,1080 Z\" fill=\"#dc2626\" opacity=\"0.9\"/>\n  <path d=\"M 0,1060 L 350,1045 L 750,1065 L 1150,1040 L 1550,1060 L 1920,1050 L 1920,1080 L 0,1080 Z\" fill=\"#fbbf24\" opacity=\"0.95\"/>\n</svg>",
    'biology': "<svg xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"0 0 1920 1080\" width=\"100%\" height=\"100%\">\n  <defs>\n    <radialGradient id=\"bioBg\" cx=\"50%\" cy=\"40%\" r=\"75%\">\n      <stop offset=\"0%\" stop-color=\"#064e3b\"/>\n      <stop offset=\"50%\" stop-color=\"#022c22\"/>\n      <stop offset=\"100%\" stop-color=\"#011611\"/>\n    </radialGradient>\n    <radialGradient id=\"cellGlow\" cx=\"50%\" cy=\"50%\" r=\"50%\">\n      <stop offset=\"0%\" stop-color=\"#34d399\" stop-opacity=\"0.9\"/>\n      <stop offset=\"50%\" stop-color=\"#059669\" stop-opacity=\"0.4\"/>\n      <stop offset=\"100%\" stop-color=\"#022c22\" stop-opacity=\"0\"/>\n    </radialGradient>\n    <linearGradient id=\"dnaGrad1\" x1=\"0%\" y1=\"0%\" x2=\"100%\" y2=\"100%\">\n      <stop offset=\"0%\" stop-color=\"#34d399\"/>\n      <stop offset=\"100%\" stop-color=\"#06b6d4\"/>\n    </linearGradient>\n    <linearGradient id=\"dnaGrad2\" x1=\"0%\" y1=\"0%\" x2=\"100%\" y2=\"100%\">\n      <stop offset=\"0%\" stop-color=\"#a7f3d0\"/>\n      <stop offset=\"100%\" stop-color=\"#10b981\"/>\n    </linearGradient>\n  </defs>\n\n  <rect width=\"1920\" height=\"1080\" fill=\"url(#bioBg)\"/>\n\n  <!-- TOP-LEFT: Giant Bioluminescent Cell -->\n  <g transform=\"translate(240, 240)\">\n    <circle cx=\"0\" cy=\"0\" r=\"190\" fill=\"url(#cellGlow)\"/>\n    <!-- Outer Cell Membrane -->\n    <path d=\"M 0,-150 C 90,-160 160,-90 150,0 C 140,80 90,150 0,140 C -80,150 -150,80 -140,0 C -150,-80 -90,-140 0,-150 Z\" fill=\"#047857\" stroke=\"#34d399\" stroke-width=\"4\" opacity=\"0.6\"/>\n    <!-- Nucleus -->\n    <circle cx=\"0\" cy=\"0\" r=\"65\" fill=\"#065f46\" stroke=\"#6ee7b7\" stroke-width=\"3\"/>\n    <circle cx=\"-10\" cy=\"-10\" r=\"28\" fill=\"#10b981\" opacity=\"0.8\"/>\n    <!-- Mitochondria & Organelles -->\n    <ellipse cx=\"65\" cy=\"-60\" rx=\"30\" ry=\"15\" fill=\"#f59e0b\" opacity=\"0.85\" transform=\"rotate(30 65 -60)\"/>\n    <ellipse cx=\"-70\" cy=\"55\" rx=\"32\" ry=\"16\" fill=\"#f59e0b\" opacity=\"0.85\" transform=\"rotate(-40 -70 55)\"/>\n    <circle cx=\"70\" cy=\"60\" r=\"14\" fill=\"#06b6d4\" opacity=\"0.9\"/>\n    <circle cx=\"-65\" cy=\"-60\" r=\"12\" fill=\"#06b6d4\" opacity=\"0.9\"/>\n    <!-- Floating Ribosomes -->\n    <circle cx=\"20\" cy=\"85\" r=\"5\" fill=\"#fde047\"/><circle cx=\"-25\" cy=\"95\" r=\"4\" fill=\"#fde047\"/><circle cx=\"95\" cy=\"15\" r=\"5\" fill=\"#fde047\"/>\n  </g>\n\n  <!-- RIGHT: Glorious Vertical DNA Double Helix (Unmistakable!) -->\n  <g transform=\"translate(1600, 80)\">\n    <!-- DNA rungs -->\n    <line x1=\"-70\" y1=\"80\" x2=\"70\" y2=\"80\" stroke=\"#f59e0b\" stroke-width=\"6\" stroke-linecap=\"round\"/>\n    <line x1=\"-90\" y1=\"160\" x2=\"90\" y2=\"160\" stroke=\"#38bdf8\" stroke-width=\"6\" stroke-linecap=\"round\"/>\n    <line x1=\"-60\" y1=\"240\" x2=\"60\" y2=\"240\" stroke=\"#ec4899\" stroke-width=\"6\" stroke-linecap=\"round\"/>\n    <line x1=\"0\" y1=\"320\" x2=\"0\" y2=\"320\" stroke=\"#10b981\" stroke-width=\"8\" stroke-linecap=\"round\"/>\n    <line x1=\"-60\" y1=\"400\" x2=\"60\" y2=\"400\" stroke=\"#f59e0b\" stroke-width=\"6\" stroke-linecap=\"round\"/>\n    <line x1=\"-90\" y1=\"480\" x2=\"90\" y2=\"480\" stroke=\"#38bdf8\" stroke-width=\"6\" stroke-linecap=\"round\"/>\n    <line x1=\"-60\" y1=\"560\" x2=\"60\" y2=\"560\" stroke=\"#ec4899\" stroke-width=\"6\" stroke-linecap=\"round\"/>\n    <line x1=\"0\" y1=\"640\" x2=\"0\" y2=\"640\" stroke=\"#10b981\" stroke-width=\"8\" stroke-linecap=\"round\"/>\n    <line x1=\"-60\" y1=\"720\" x2=\"60\" y2=\"720\" stroke=\"#f59e0b\" stroke-width=\"6\" stroke-linecap=\"round\"/>\n    <line x1=\"-90\" y1=\"800\" x2=\"90\" y2=\"800\" stroke=\"#38bdf8\" stroke-width=\"6\" stroke-linecap=\"round\"/>\n    <line x1=\"-60\" y1=\"880\" x2=\"60\" y2=\"880\" stroke=\"#ec4899\" stroke-width=\"6\" stroke-linecap=\"round\"/>\n\n    <!-- Strands -->\n    <path d=\"M -90,0 Q 0,160 90,320 T -90,640 T 90,960\" stroke=\"url(#dnaGrad1)\" stroke-width=\"12\" fill=\"none\" stroke-linecap=\"round\"/>\n    <path d=\"M 90,0 Q 0,160 -90,320 T 90,640 T -90,960\" stroke=\"url(#dnaGrad2)\" stroke-width=\"12\" fill=\"none\" stroke-linecap=\"round\"/>\n\n    <!-- Nucleotide nodes -->\n    <circle cx=\"-90\" cy=\"160\" r=\"10\" fill=\"#38bdf8\"/><circle cx=\"90\" cy=\"160\" r=\"10\" fill=\"#f59e0b\"/>\n    <circle cx=\"-90\" cy=\"480\" r=\"10\" fill=\"#38bdf8\"/><circle cx=\"90\" cy=\"480\" r=\"10\" fill=\"#f59e0b\"/>\n    <circle cx=\"-90\" cy=\"800\" r=\"10\" fill=\"#38bdf8\"/><circle cx=\"90\" cy=\"800\" r=\"10\" fill=\"#f59e0b\"/>\n  </g>\n\n  <!-- Botanical foliage at bottom corners -->\n  <g fill=\"#047857\" opacity=\"0.6\">\n    <!-- Left Leaf -->\n    <path d=\"M 0,1080 Q 80,820 280,780 C 220,860 160,960 0,1080 Z\"/>\n    <path d=\"M 0,1080 Q 180,880 380,920 C 300,980 220,1040 0,1080 Z\"/>\n    <!-- Right Leaf -->\n    <path d=\"M 1920,1080 Q 1840,820 1640,780 C 1700,860 1760,960 1920,1080 Z\"/>\n  </g>\n\n  <!-- Glowing organic particles -->\n  <g fill=\"#a7f3d0\" opacity=\"0.75\">\n    <circle cx=\"480\" cy=\"180\" r=\"6\"/><circle cx=\"720\" cy=\"120\" r=\"4\"/><circle cx=\"1180\" cy=\"150\" r=\"5\"/><circle cx=\"1380\" cy=\"220\" r=\"4\"/>\n    <circle cx=\"350\" cy=\"560\" r=\"5\"/><circle cx=\"1450\" cy=\"620\" r=\"6\"/><circle cx=\"850\" cy=\"820\" r=\"5\"/>\n  </g>\n</svg>",
    'mathematics': "<svg xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"0 0 1920 1080\" width=\"100%\" height=\"100%\">\n  <defs>\n    <radialGradient id=\"mathBg\" cx=\"50%\" cy=\"40%\" r=\"75%\">\n      <stop offset=\"0%\" stop-color=\"#1e1b4b\"/>\n      <stop offset=\"50%\" stop-color=\"#0f172a\"/>\n      <stop offset=\"100%\" stop-color=\"#020617\"/>\n    </radialGradient>\n    <pattern id=\"mathGrid\" width=\"60\" height=\"60\" patternUnits=\"userSpaceOnUse\">\n      <path d=\"M 60 0 L 0 0 0 60\" fill=\"none\" stroke=\"#4338ca\" stroke-width=\"1\" opacity=\"0.25\"/>\n    </pattern>\n    <linearGradient id=\"goldSpiral\" x1=\"0%\" y1=\"0%\" x2=\"100%\" y2=\"100%\">\n      <stop offset=\"0%\" stop-color=\"#fbbf24\"/>\n      <stop offset=\"50%\" stop-color=\"#f59e0b\"/>\n      <stop offset=\"100%\" stop-color=\"#d97706\"/>\n    </linearGradient>\n  </defs>\n\n  <rect width=\"1920\" height=\"1080\" fill=\"url(#mathBg)\"/>\n  <rect width=\"1920\" height=\"1080\" fill=\"url(#mathGrid)\"/>\n\n  <!-- TOP-LEFT: Cartesian Coordinate Graph with Sine & Cosine waves -->\n  <g transform=\"translate(100, 100)\">\n    <!-- Axes -->\n    <line x1=\"40\" y1=\"180\" x2=\"480\" y2=\"180\" stroke=\"#818cf8\" stroke-width=\"3\"/>\n    <polygon points=\"485,180 475,174 475,186\" fill=\"#818cf8\"/>\n    <line x1=\"120\" y1=\"20\" x2=\"120\" y2=\"340\" stroke=\"#818cf8\" stroke-width=\"3\"/>\n    <polygon points=\"120,15 114,25 126,25\" fill=\"#818cf8\"/>\n    <text x=\"470\" y=\"210\" fill=\"#a5b4fc\" font-size=\"18\" font-family=\"sans-serif\" font-weight=\"bold\">X</text>\n    <text x=\"90\" y=\"30\" fill=\"#a5b4fc\" font-size=\"18\" font-family=\"sans-serif\" font-weight=\"bold\">Y</text>\n    \n    <!-- Sine Wave -->\n    <path d=\"M 120,180 Q 180,80 240,180 T 360,180 T 480,180\" stroke=\"#06b6d4\" stroke-width=\"4.5\" fill=\"none\"/>\n    <!-- Cosine Wave -->\n    <path d=\"M 120,80 Q 180,180 240,280 T 360,80 T 480,280\" stroke=\"#ec4899\" stroke-width=\"3\" stroke-dasharray=\"8 6\" fill=\"none\"/>\n    <!-- Integral Area fill -->\n    <path d=\"M 120,180 Q 180,80 240,180 Z\" fill=\"#06b6d4\" opacity=\"0.2\"/>\n  </g>\n\n  <!-- Prominent Formulas -->\n  <g font-family=\"serif\" font-style=\"italic\" fill=\"#c7d2fe\" opacity=\"0.8\">\n    <text x=\"240\" y=\"380\" font-size=\"28\">e^{iπ} + 1 = 0</text>\n    <text x=\"120\" y=\"450\" font-size=\"32\">∫ f(x) dx = F(x) + C</text>\n    <text x=\"180\" y=\"530\" font-size=\"30\">∑ (1/n²) = π² / 6</text>\n    <text x=\"220\" y=\"610\" font-size=\"28\">a² + b² = c²</text>\n  </g>\n\n  <!-- HERO RIGHT: Golden Fibonacci Spiral & 3D Polyhedron -->\n  <g transform=\"translate(1550, 360)\">\n    <!-- Golden Spiral Curve -->\n    <path d=\"M 0,0 A 20,20 0 0,1 20,20 A 40,40 0 0,1 -20,60 A 80,80 0 0,1 -100,-20 A 140,140 0 0,1 40,-160 A 240,240 0 0,1 280,80 A 400,400 0 0,1 -120,480\" stroke=\"url(#goldSpiral)\" stroke-width=\"6\" fill=\"none\" stroke-linecap=\"round\"/>\n    \n    <!-- Fibonacci Rectangles -->\n    <rect x=\"-100\" y=\"-160\" width=\"140\" height=\"140\" stroke=\"#f59e0b\" stroke-width=\"1.5\" fill=\"none\" opacity=\"0.3\"/>\n    <rect x=\"-100\" y=\"-20\" width=\"80\" height=\"80\" stroke=\"#f59e0b\" stroke-width=\"1.5\" fill=\"none\" opacity=\"0.3\"/>\n    <rect x=\"-20\" y=\"20\" width=\"40\" height=\"40\" stroke=\"#f59e0b\" stroke-width=\"1.5\" fill=\"none\" opacity=\"0.3\"/>\n\n    <!-- 3D Wireframe Icosahedron -->\n    <g transform=\"translate(-160, 220)\" stroke=\"#38bdf8\" stroke-width=\"2.5\" fill=\"none\">\n      <polygon points=\"0,-90 75,-40 75,50 0,90 -75,50 -75,-40\" stroke=\"#818cf8\"/>\n      <polygon points=\"0,-50 45,-20 45,30 0,50 -45,30 -45,-20\" stroke=\"#38bdf8\" stroke-dasharray=\"4 4\"/>\n      <line x1=\"0\" y1=\"-90\" x2=\"0\" y2=\"-50\"/><line x1=\"75\" y1=\"-40\" x2=\"45\" y2=\"-20\"/><line x1=\"75\" y1=\"50\" x2=\"45\" y2=\"30\"/>\n      <line x1=\"0\" y1=\"90\" x2=\"0\" y2=\"50\"/><line x1=\"-75\" y1=\"50\" x2=\"-45\" y2=\"30\"/><line x1=\"-75\" y1=\"-40\" x2=\"-45\" y2=\"-20\"/>\n    </g>\n  </g>\n\n  <!-- Bottom Geometry compass & arcs -->\n  <g stroke=\"#6366f1\" stroke-width=\"2\" fill=\"none\" opacity=\"0.4\">\n    <circle cx=\"960\" cy=\"1080\" r=\"420\"/>\n    <circle cx=\"960\" cy=\"1080\" r=\"540\"/>\n    <line x1=\"500\" y1=\"1080\" x2=\"1420\" y2=\"1080\"/>\n  </g>\n</svg>",
    'physics': "<svg xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"0 0 1920 1080\" width=\"100%\" height=\"100%\">\n  <defs>\n    <radialGradient id=\"physBg\" cx=\"50%\" cy=\"40%\" r=\"75%\">\n      <stop offset=\"0%\" stop-color=\"#2e1065\"/>\n      <stop offset=\"50%\" stop-color=\"#0f0728\"/>\n      <stop offset=\"100%\" stop-color=\"#030014\"/>\n    </radialGradient>\n    <radialGradient id=\"atomCore\" cx=\"50%\" cy=\"50%\" r=\"50%\">\n      <stop offset=\"0%\" stop-color=\"#ffffff\"/>\n      <stop offset=\"30%\" stop-color=\"#f43f5e\"/>\n      <stop offset=\"70%\" stop-color=\"#881337\"/>\n      <stop offset=\"100%\" stop-color=\"#030014\" stop-opacity=\"0\"/>\n    </radialGradient>\n    <linearGradient id=\"prismRainbow\" x1=\"0%\" y1=\"0%\" x2=\"100%\" y2=\"100%\">\n      <stop offset=\"0%\" stop-color=\"#ef4444\"/>\n      <stop offset=\"20%\" stop-color=\"#f97316\"/>\n      <stop offset=\"40%\" stop-color=\"#eab308\"/>\n      <stop offset=\"60%\" stop-color=\"#22c55e\"/>\n      <stop offset=\"80%\" stop-color=\"#3b82f6\"/>\n      <stop offset=\"100%\" stop-color=\"#a855f7\"/>\n    </linearGradient>\n  </defs>\n\n  <rect width=\"1920\" height=\"1080\" fill=\"url(#physBg)\"/>\n\n  <!-- TOP-LEFT: Light Prism dispersing Rainbow Spectrum -->\n  <g transform=\"translate(120, 100)\">\n    <!-- White beam entering -->\n    <line x1=\"20\" y1=\"120\" x2=\"180\" y2=\"170\" stroke=\"#ffffff\" stroke-width=\"4\"/>\n    <!-- Glass Triangle Prism -->\n    <polygon points=\"220,70 160,210 280,210\" fill=\"rgba(255,255,255,0.12)\" stroke=\"#a855f7\" stroke-width=\"3\"/>\n    <!-- Refracted Rainbow Rays -->\n    <polygon points=\"230,165 460,110 460,250 240,195\" fill=\"url(#prismRainbow)\" opacity=\"0.8\"/>\n  </g>\n\n  <!-- Left: Spacetime Curvature Grid -->\n  <g transform=\"translate(140, 420)\" stroke=\"#7c3aed\" stroke-width=\"1.5\" fill=\"none\" opacity=\"0.45\">\n    <ellipse cx=\"200\" cy=\"180\" rx=\"180\" ry=\"70\"/>\n    <ellipse cx=\"200\" cy=\"190\" rx=\"130\" ry=\"50\"/>\n    <ellipse cx=\"200\" cy=\"200\" rx=\"80\" ry=\"30\"/>\n    <path d=\"M 20,180 Q 200,240 380,180\"/>\n    <path d=\"M 200,110 L 200,230\"/>\n  </g>\n\n  <!-- Formulas -->\n  <g font-family=\"serif\" font-style=\"italic\" fill=\"#e9d5ff\" opacity=\"0.85\">\n    <text x=\"180\" y=\"370\" font-size=\"36\" font-weight=\"bold\">E = mc²</text>\n    <text x=\"160\" y=\"690\" font-size=\"28\">F = G(m₁m₂ / r²)</text>\n    <text x=\"180\" y=\"750\" font-size=\"26\">Δx · Δp ≥ ℏ/2</text>\n  </g>\n\n  <!-- HERO RIGHT: GIANT QUANTUM ATOM MODEL (Iconic!) -->\n  <g transform=\"translate(1560, 380)\">\n    <!-- Core Nucleus Glow -->\n    <circle cx=\"0\" cy=\"0\" r=\"60\" fill=\"url(#atomCore)\"/>\n    <circle cx=\"-10\" cy=\"-8\" r=\"14\" fill=\"#ef4444\"/>\n    <circle cx=\"12\" cy=\"-10\" r=\"14\" fill=\"#3b82f6\"/>\n    <circle cx=\"-6\" cy=\"14\" r=\"14\" fill=\"#3b82f6\"/>\n    <circle cx=\"14\" cy=\"12\" r=\"14\" fill=\"#ef4444\"/>\n\n    <!-- 3 Orbital Ellipses -->\n    <g stroke=\"#38bdf8\" stroke-width=\"4\" fill=\"none\">\n      <ellipse cx=\"0\" cy=\"0\" rx=\"260\" ry=\"90\" transform=\"rotate(0)\"/>\n      <ellipse cx=\"0\" cy=\"0\" rx=\"260\" ry=\"90\" transform=\"rotate(60)\"/>\n      <ellipse cx=\"0\" cy=\"0\" rx=\"260\" ry=\"90\" transform=\"rotate(120)\"/>\n    </g>\n\n    <!-- Electrons in orbit -->\n    <circle cx=\"260\" cy=\"0\" r=\"12\" fill=\"#38bdf8\"><animate attributeName=\"opacity\" values=\"0.7;1;0.7\" dur=\"2s\" repeatCount=\"indefinite\"/></circle>\n    <circle cx=\"-130\" cy=\"-225\" r=\"12\" fill=\"#a855f7\"/>\n    <circle cx=\"-130\" cy=\"225\" r=\"12\" fill=\"#f43f5e\"/>\n  </g>\n\n  <!-- Floating particles & electromagnetic waves -->\n  <path d=\"M 0,920 Q 240,840 480,920 T 960,920 T 1440,920 T 1920,920\" stroke=\"#06b6d4\" stroke-width=\"3\" fill=\"none\" opacity=\"0.6\"/>\n  <path d=\"M 0,960 Q 240,1040 480,960 T 960,960 T 1440,960 T 1920,960\" stroke=\"#ec4899\" stroke-width=\"2.5\" fill=\"none\" opacity=\"0.5\"/>\n</svg>",
    'chemistry': "<svg xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"0 0 1920 1080\" width=\"100%\" height=\"100%\">\n  <defs>\n    <radialGradient id=\"chemBg\" cx=\"50%\" cy=\"40%\" r=\"75%\">\n      <stop offset=\"0%\" stop-color=\"#042f2e\"/>\n      <stop offset=\"50%\" stop-color=\"#021a1a\"/>\n      <stop offset=\"100%\" stop-color=\"#010c0c\"/>\n    </radialGradient>\n    <linearGradient id=\"flaskLiquid\" x1=\"0%\" y1=\"0%\" x2=\"0%\" y2=\"100%\">\n      <stop offset=\"0%\" stop-color=\"#2dd4bf\"/>\n      <stop offset=\"100%\" stop-color=\"#0d9488\"/>\n    </linearGradient>\n    <linearGradient id=\"flaskLiquid2\" x1=\"0%\" y1=\"0%\" x2=\"0%\" y2=\"100%\">\n      <stop offset=\"0%\" stop-color=\"#f59e0b\"/>\n      <stop offset=\"100%\" stop-color=\"#d97706\"/>\n    </linearGradient>\n  </defs>\n\n  <rect width=\"1920\" height=\"1080\" fill=\"url(#chemBg)\"/>\n\n  <!-- TOP-LEFT: Molecular 3D Lattice & Benzene Rings -->\n  <g transform=\"translate(160, 140)\">\n    <!-- Benzene Hexagon 1 -->\n    <polygon points=\"80,20 140,55 140,125 80,160 20,125 20,55\" stroke=\"#14b8a6\" stroke-width=\"4\" fill=\"none\"/>\n    <circle cx=\"80\" cy=\"90\" r=\"38\" stroke=\"#14b8a6\" stroke-width=\"3\" fill=\"none\"/>\n    <!-- Attached Hexagon 2 -->\n    <polygon points=\"140,55 200,20 260,55 260,125 200,160 140,125\" stroke=\"#2dd4bf\" stroke-width=\"4\" fill=\"none\"/>\n    <circle cx=\"200\" cy=\"90\" r=\"38\" stroke=\"#2dd4bf\" stroke-width=\"3\" fill=\"none\"/>\n    \n    <!-- Atoms at vertices -->\n    <circle cx=\"80\" cy=\"20\" r=\"8\" fill=\"#f43f5e\"/><circle cx=\"200\" cy=\"20\" r=\"8\" fill=\"#38bdf8\"/>\n    <circle cx=\"140\" cy=\"125\" r=\"8\" fill=\"#fde047\"/><circle cx=\"260\" cy=\"125\" r=\"8\" fill=\"#22c55e\"/>\n\n    <!-- Periodic Table Tiles -->\n    <g transform=\"translate(40, 240)\">\n      <rect x=\"0\" y=\"0\" width=\"75\" height=\"75\" rx=\"8\" fill=\"#0f766e\" stroke=\"#2dd4bf\" stroke-width=\"2\"/>\n      <text x=\"12\" y=\"24\" fill=\"#a7f3d0\" font-size=\"14\" font-family=\"sans-serif\">6</text>\n      <text x=\"25\" y=\"55\" fill=\"#ffffff\" font-size=\"30\" font-weight=\"bold\" font-family=\"sans-serif\">C</text>\n      \n      <rect x=\"90\" y=\"0\" width=\"75\" height=\"75\" rx=\"8\" fill=\"#0f766e\" stroke=\"#2dd4bf\" stroke-width=\"2\"/>\n      <text x=\"102\" y=\"24\" fill=\"#a7f3d0\" font-size=\"14\" font-family=\"sans-serif\">8</text>\n      <text x=\"115\" y=\"55\" fill=\"#ffffff\" font-size=\"30\" font-weight=\"bold\" font-family=\"sans-serif\">O</text>\n\n      <rect x=\"180\" y=\"0\" width=\"75\" height=\"75\" rx=\"8\" fill=\"#b45309\" stroke=\"#f59e0b\" stroke-width=\"2\"/>\n      <text x=\"192\" y=\"24\" fill=\"#fef08a\" font-size=\"14\" font-family=\"sans-serif\">79</text>\n      <text x=\"198\" y=\"55\" fill=\"#ffffff\" font-size=\"28\" font-weight=\"bold\" font-family=\"sans-serif\">Au</text>\n    </g>\n  </g>\n\n  <!-- HERO RIGHT: Glowing Erlenmeyer & Florence Flasks (Lab Beakers) -->\n  <g transform=\"translate(1520, 260)\">\n    <!-- Rising Vapor Bubbles -->\n    <circle cx=\"80\" cy=\"-60\" r=\"14\" fill=\"#2dd4bf\" opacity=\"0.6\"/>\n    <circle cx=\"120\" cy=\"-110\" r=\"18\" fill=\"#2dd4bf\" opacity=\"0.5\"/>\n    <circle cx=\"70\" cy=\"-170\" r=\"22\" fill=\"#2dd4bf\" opacity=\"0.4\"/>\n\n    <!-- Erlenmeyer Flask Outline -->\n    <path d=\"M 60,-20 L 60,80 L -60,280 L 220,280 L 100,80 L 100,-20 Z\" fill=\"rgba(255,255,255,0.06)\" stroke=\"#99f6e4\" stroke-width=\"5\"/>\n    <rect x=\"50\" y=\"-30\" width=\"60\" height=\"12\" rx=\"3\" fill=\"#99f6e4\"/>\n    <!-- Liquid in Flask -->\n    <path d=\"M -30,230 L 190,230 L 210,270 L -50,270 Z\" fill=\"url(#flaskLiquid)\" opacity=\"0.9\"/>\n    <!-- Liquid Bubbles -->\n    <circle cx=\"40\" cy=\"245\" r=\"8\" fill=\"#ffffff\" opacity=\"0.8\"/>\n    <circle cx=\"120\" cy=\"250\" r=\"10\" fill=\"#ffffff\" opacity=\"0.8\"/>\n    <circle cx=\"160\" cy=\"240\" r=\"6\" fill=\"#ffffff\" opacity=\"0.8\"/>\n\n    <!-- Round Bottom Florence Flask (Foreground) -->\n    <g transform=\"translate(-140, 110)\">\n      <path d=\"M 40,-10 L 40,50 C 40,50 0,60 -30,100 C -60,140 -50,190 -10,220 C 30,250 80,240 110,200 C 140,160 130,110 90,70 L 90,-10 Z\" fill=\"rgba(255,255,255,0.06)\" stroke=\"#fcd34d\" stroke-width=\"4\"/>\n      <!-- Amber Liquid -->\n      <path d=\"M -20,160 C 20,155 60,155 100,160 C 125,190 100,230 60,235 C 10,240 -25,200 -20,160 Z\" fill=\"url(#flaskLiquid2)\" opacity=\"0.85\"/>\n      <circle cx=\"40\" cy=\"185\" r=\"7\" fill=\"#ffffff\" opacity=\"0.8\"/>\n    </g>\n  </g>\n\n  <!-- Bottom Molecule connectors -->\n  <g stroke=\"#0f766e\" stroke-width=\"3\" fill=\"none\" opacity=\"0.5\">\n    <line x1=\"0\" y1=\"920\" x2=\"300\" y2=\"840\"/>\n    <line x1=\"300\" y1=\"840\" x2=\"600\" y2=\"920\"/>\n    <line x1=\"600\" y1=\"920\" x2=\"900\" y2=\"850\"/>\n    <line x1=\"900\" y1=\"850\" x2=\"1200\" y2=\"920\"/>\n    <line x1=\"1200\" y1=\"920\" x2=\"1500\" y2=\"860\"/>\n    <line x1=\"1500\" y1=\"860\" x2=\"1920\" y2=\"920\"/>\n  </g>\n</svg>",
    'business': "<svg xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"0 0 1920 1080\" width=\"100%\" height=\"100%\">\n  <defs>\n    <radialGradient id=\"bizBg\" cx=\"50%\" cy=\"40%\" r=\"75%\">\n      <stop offset=\"0%\" stop-color=\"#062319\"/>\n      <stop offset=\"45%\" stop-color=\"#03140e\"/>\n      <stop offset=\"100%\" stop-color=\"#010806\"/>\n    </radialGradient>\n    <radialGradient id=\"goldGlow\" cx=\"50%\" cy=\"50%\" r=\"50%\">\n      <stop offset=\"0%\" stop-color=\"#fbbf24\" stop-opacity=\"0.9\"/>\n      <stop offset=\"50%\" stop-color=\"#d97706\" stop-opacity=\"0.3\"/>\n      <stop offset=\"100%\" stop-color=\"#d97706\" stop-opacity=\"0\"/>\n    </radialGradient>\n    <linearGradient id=\"bullishGreen\" x1=\"0%\" y1=\"0%\" x2=\"0%\" y2=\"100%\">\n      <stop offset=\"0%\" stop-color=\"#34d399\"/>\n      <stop offset=\"100%\" stop-color=\"#059669\"/>\n    </linearGradient>\n    <linearGradient id=\"goldGrad\" x1=\"0%\" y1=\"0%\" x2=\"100%\" y2=\"100%\">\n      <stop offset=\"0%\" stop-color=\"#fef08a\"/>\n      <stop offset=\"40%\" stop-color=\"#f59e0b\"/>\n      <stop offset=\"100%\" stop-color=\"#b45309\"/>\n    </linearGradient>\n    <linearGradient id=\"towerGrad\" x1=\"0%\" y1=\"0%\" x2=\"0%\" y2=\"100%\">\n      <stop offset=\"0%\" stop-color=\"#064e3b\" stop-opacity=\"0.8\"/>\n      <stop offset=\"100%\" stop-color=\"#022c22\" stop-opacity=\"0.2\"/>\n    </linearGradient>\n  </defs>\n\n  <!-- Deep Emerald / Navy Corporate Wealth Canvas -->\n  <rect width=\"100%\" height=\"100%\" fill=\"url(#bizBg)\"/>\n\n  <!-- Perspective Financial Market Grid -->\n  <g stroke=\"#059669\" stroke-width=\"1\" opacity=\"0.2\">\n    <line x1=\"0\" y1=\"750\" x2=\"1920\" y2=\"750\"/>\n    <line x1=\"0\" y1=\"820\" x2=\"1920\" y2=\"820\"/>\n    <line x1=\"0\" y1=\"900\" x2=\"1920\" y2=\"900\"/>\n    <line x1=\"0\" y1=\"990\" x2=\"1920\" y2=\"990\"/>\n    <line x1=\"960\" y1=\"700\" x2=\"200\" y2=\"1080\"/>\n    <line x1=\"960\" y1=\"700\" x2=\"500\" y2=\"1080\"/>\n    <line x1=\"960\" y1=\"700\" x2=\"800\" y2=\"1080\"/>\n    <line x1=\"960\" y1=\"700\" x2=\"1120\" y2=\"1080\"/>\n    <line x1=\"960\" y1=\"700\" x2=\"1420\" y2=\"1080\"/>\n    <line x1=\"960\" y1=\"700\" x2=\"1720\" y2=\"1080\"/>\n  </g>\n\n  <!-- TOP-LEFT: Corporate Financial District Towers & Analytics Dashboard -->\n  <g opacity=\"0.85\">\n    <!-- Corporate Skyscrapers -->\n    <rect x=\"80\" y=\"160\" width=\"90\" height=\"360\" fill=\"url(#towerGrad)\" stroke=\"#10b981\" stroke-width=\"1.5\"/>\n    <rect x=\"190\" y=\"110\" width=\"120\" height=\"410\" fill=\"url(#towerGrad)\" stroke=\"#34d399\" stroke-width=\"2\"/>\n    <rect x=\"330\" y=\"190\" width=\"85\" height=\"330\" fill=\"url(#towerGrad)\" stroke=\"#10b981\" stroke-width=\"1.5\"/>\n    \n    <!-- Illuminated Office Windows -->\n    <g fill=\"#fbbf24\" opacity=\"0.6\">\n      <rect x=\"100\" y=\"190\" width=\"14\" height=\"8\"/>\n      <rect x=\"130\" y=\"190\" width=\"14\" height=\"8\"/>\n      <rect x=\"100\" y=\"220\" width=\"14\" height=\"8\"/>\n      <rect x=\"130\" y=\"250\" width=\"14\" height=\"8\"/>\n      <rect x=\"215\" y=\"140\" width=\"18\" height=\"10\"/>\n      <rect x=\"250\" y=\"140\" width=\"18\" height=\"10\"/>\n      <rect x=\"215\" y=\"170\" width=\"18\" height=\"10\"/>\n      <rect x=\"275\" y=\"200\" width=\"18\" height=\"10\"/>\n      <rect x=\"215\" y=\"240\" width=\"18\" height=\"10\"/>\n      <rect x=\"250\" y=\"280\" width=\"18\" height=\"10\"/>\n      <rect x=\"350\" y=\"220\" width=\"14\" height=\"8\"/>\n      <rect x=\"380\" y=\"250\" width=\"14\" height=\"8\"/>\n    </g>\n\n    <!-- Holographic Financial Analytics Card / Bar Chart -->\n    <rect x=\"70\" y=\"460\" width=\"360\" height=\"180\" rx=\"16\" fill=\"#022c22\" fill-opacity=\"0.7\" stroke=\"#10b981\" stroke-width=\"2\"/>\n    <text x=\"95\" y=\"495\" fill=\"#6ee7b7\" font-family=\"monospace\" font-size=\"14\" font-weight=\"bold\">MARKET GROWTH · +34.8%</text>\n    <!-- Bar charts -->\n    <rect x=\"100\" y=\"570\" width=\"28\" height=\"50\" rx=\"4\" fill=\"#059669\"/>\n    <rect x=\"145\" y=\"540\" width=\"28\" height=\"80\" rx=\"4\" fill=\"#10b981\"/>\n    <rect x=\"190\" y=\"555\" width=\"28\" height=\"65\" rx=\"4\" fill=\"#059669\"/>\n    <rect x=\"235\" y=\"515\" width=\"28\" height=\"105\" rx=\"4\" fill=\"#34d399\"/>\n    <rect x=\"280\" y=\"495\" width=\"28\" height=\"125\" rx=\"4\" fill=\"#6ee7b7\"/>\n    <rect x=\"325\" y=\"480\" width=\"28\" height=\"140\" rx=\"4\" fill=\"url(#goldGrad)\"/>\n  </g>\n\n  <!-- TOP-RIGHT: Giant Bullish Candlestick Market Chart, Exponential Trajectory & Gold Coin Stacks -->\n  <g transform=\"translate(1550, 320)\">\n    <circle cx=\"0\" cy=\"0\" r=\"260\" fill=\"url(#goldGlow)\" opacity=\"0.55\"/>\n\n    <!-- Candlestick chart elements -->\n    <!-- Candle 1 (Green) -->\n    <line x1=\"-200\" y1=\"-60\" x2=\"-200\" y2=\"160\" stroke=\"#10b981\" stroke-width=\"3\"/>\n    <rect x=\"-215\" y=\"-30\" width=\"30\" height=\"130\" rx=\"5\" fill=\"url(#bullishGreen)\" stroke=\"#6ee7b7\" stroke-width=\"2\"/>\n\n    <!-- Candle 2 (Amber) -->\n    <line x1=\"-130\" y1=\"-100\" x2=\"-130\" y2=\"90\" stroke=\"#f59e0b\" stroke-width=\"3\"/>\n    <rect x=\"-145\" y=\"-60\" width=\"30\" height=\"80\" rx=\"5\" fill=\"#d97706\" stroke=\"#fde68a\" stroke-width=\"2\"/>\n\n    <!-- Candle 3 (Strong Green) -->\n    <line x1=\"-60\" y1=\"-160\" x2=\"-60\" y2=\"60\" stroke=\"#10b981\" stroke-width=\"3\"/>\n    <rect x=\"-75\" y=\"-120\" width=\"30\" height=\"140\" rx=\"5\" fill=\"url(#bullishGreen)\" stroke=\"#6ee7b7\" stroke-width=\"2\"/>\n\n    <!-- Candle 4 (Massive Bullish Breakout) -->\n    <line x1=\"15\" y1=\"-240\" x2=\"15\" y2=\"-10\" stroke=\"#34d399\" stroke-width=\"3.5\"/>\n    <rect x=\"0\" y=\"-200\" width=\"30\" height=\"160\" rx=\"5\" fill=\"url(#bullishGreen)\" stroke=\"#a7f3d0\" stroke-width=\"2.5\"/>\n\n    <!-- Candle 5 (Peak Golden High) -->\n    <line x1=\"90\" y1=\"-280\" x2=\"90\" y2=\"-80\" stroke=\"#fbbf24\" stroke-width=\"3.5\"/>\n    <rect x=\"75\" y=\"-260\" width=\"30\" height=\"150\" rx=\"5\" fill=\"url(#goldGrad)\" stroke=\"#ffffff\" stroke-width=\"2\"/>\n\n    <!-- Rising Exponential Golden Profit Line -->\n    <path d=\"M -240,110 Q -120,-30 0,-140 T 170,-280\" stroke=\"url(#goldGrad)\" stroke-width=\"6\" fill=\"none\" stroke-linecap=\"round\"/>\n    <!-- Arrowhead at peak -->\n    <polygon points=\"170,-280 140,-270 160,-250\" fill=\"#fef08a\"/>\n\n    <!-- Stack of Golden Currency Coins (Peso / Dollar) -->\n    <g transform=\"translate(80, 120)\">\n      <!-- Coin 1 bottom -->\n      <ellipse cx=\"0\" cy=\"60\" rx=\"60\" ry=\"22\" fill=\"#b45309\" stroke=\"#f59e0b\" stroke-width=\"3\"/>\n      <ellipse cx=\"0\" cy=\"52\" rx=\"60\" ry=\"22\" fill=\"url(#goldGrad)\" stroke=\"#fef08a\" stroke-width=\"2.5\"/>\n      <!-- Coin 2 middle -->\n      <ellipse cx=\"0\" cy=\"35\" rx=\"60\" ry=\"22\" fill=\"#b45309\" stroke=\"#f59e0b\" stroke-width=\"3\"/>\n      <ellipse cx=\"0\" cy=\"27\" rx=\"60\" ry=\"22\" fill=\"url(#goldGrad)\" stroke=\"#fef08a\" stroke-width=\"2.5\"/>\n      <!-- Coin 3 top -->\n      <ellipse cx=\"0\" cy=\"10\" rx=\"60\" ry=\"22\" fill=\"#b45309\" stroke=\"#f59e0b\" stroke-width=\"3\"/>\n      <ellipse cx=\"0\" cy=\"2\" rx=\"60\" ry=\"22\" fill=\"url(#goldGrad)\" stroke=\"#fef08a\" stroke-width=\"2.5\"/>\n      <text x=\"0\" y=\"10\" text-anchor=\"middle\" fill=\"#78350f\" font-family=\"sans-serif\" font-size=\"24\" font-weight=\"900\">₱</text>\n    </g>\n\n    <!-- Floating Currency Symbols -->\n    <g fill=\"#fef08a\" font-family=\"sans-serif\" font-size=\"26\" font-weight=\"bold\" opacity=\"0.85\">\n      <text x=\"-180\" y=\"-180\">%</text>\n      <text x=\"-70\" y=\"-230\">$</text>\n      <text x=\"130\" y=\"-140\">📈</text>\n    </g>\n  </g>\n\n  <!-- BOTTOM: Golden Ledger Horizon & Corporate Balance Accents -->\n  <path d=\"M 0,980 L 400,940 L 800,970 L 1200,930 L 1600,960 L 1920,930 L 1920,1080 L 0,1080 Z\" fill=\"#022c22\" opacity=\"0.8\"/>\n  <path d=\"M 0,1020 L 500,990 L 1000,1020 L 1500,985 L 1920,1010 L 1920,1080 L 0,1080 Z\" fill=\"#064e3b\" opacity=\"0.9\"/>\n  <line x1=\"0\" y1=\"980\" x2=\"1920\" y2=\"930\" stroke=\"#10b981\" stroke-width=\"3\" opacity=\"0.6\"/>\n  <line x1=\"0\" y1=\"1020\" x2=\"1920\" y2=\"985\" stroke=\"#f59e0b\" stroke-width=\"3\" opacity=\"0.8\"/>\n</svg>",
    'ict-tech': "<svg xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"0 0 1920 1080\" width=\"100%\" height=\"100%\">\n  <defs>\n    <radialGradient id=\"ictBg\" cx=\"50%\" cy=\"40%\" r=\"75%\">\n      <stop offset=\"0%\" stop-color=\"#082f49\"/>\n      <stop offset=\"50%\" stop-color=\"#021422\"/>\n      <stop offset=\"100%\" stop-color=\"#00070e\"/>\n    </radialGradient>\n    <linearGradient id=\"chipGrad\" x1=\"0%\" y1=\"0%\" x2=\"100%\" y2=\"100%\">\n      <stop offset=\"0%\" stop-color=\"#0284c7\"/>\n      <stop offset=\"100%\" stop-color=\"#0369a1\"/>\n    </linearGradient>\n  </defs>\n\n  <rect width=\"1920\" height=\"1080\" fill=\"url(#ictBg)\"/>\n\n  <!-- TOP-LEFT: Holographic Code Terminal -->\n  <g transform=\"translate(120, 100)\">\n    <rect x=\"0\" y=\"0\" width=\"440\" height=\"280\" rx=\"14\" fill=\"rgba(15, 23, 42, 0.85)\" stroke=\"#0ea5e9\" stroke-width=\"2.5\"/>\n    <!-- Terminal Header -->\n    <rect x=\"0\" y=\"0\" width=\"440\" height=\"36\" rx=\"14\" fill=\"#1e293b\"/>\n    <circle cx=\"20\" cy=\"18\" r=\"6\" fill=\"#ef4444\"/><circle cx=\"40\" cy=\"18\" r=\"6\" fill=\"#f59e0b\"/><circle cx=\"60\" cy=\"18\" r=\"6\" fill=\"#22c55e\"/>\n    <text x=\"170\" y=\"24\" fill=\"#94a3b8\" font-size=\"13\" font-family=\"monospace\">terminal.sh</text>\n\n    <!-- Code text -->\n    <g font-family=\"monospace\" font-size=\"15\" fill=\"#f8fafc\">\n      <text x=\"24\" y=\"70\"><tspan fill=\"#38bdf8\">const</tspan> <tspan fill=\"#facc15\">system</tspan> = <tspan fill=\"#38bdf8\">new</tspan> <tspan fill=\"#4ade80\">QuantumAI</tspan>();</text>\n      <text x=\"24\" y=\"105\"><tspan fill=\"#c084fc\">async function</tspan> <tspan fill=\"#60a5fa\">runChallenge</tspan>() {</text>\n      <text x=\"44\" y=\"140\"><tspan fill=\"#38bdf8\">await</tspan> system.<tspan fill=\"#60a5fa\">compileEngine</tspan>();</text>\n      <text x=\"44\" y=\"175\"><tspan fill=\"#c084fc\">return</tspan> <tspan fill=\"#4ade80\">&quot;READY TO CODE&quot;</tspan>;</text>\n      <text x=\"24\" y=\"210\">}</text>\n      <text x=\"24\" y=\"245\" fill=\"#38bdf8\">&gt; system.status: <tspan fill=\"#4ade80\">ONLINE [200 OK]</tspan>_</text>\n    </g>\n  </g>\n\n  <!-- Left: Binary Matrix rain -->\n  <g font-family=\"monospace\" font-size=\"18\" fill=\"#0ea5e9\" opacity=\"0.45\">\n    <text x=\"140\" y=\"440\">01001001 01000011</text>\n    <text x=\"140\" y=\"480\">01010100 00100000</text>\n    <text x=\"140\" y=\"520\">01010011 01011001</text>\n    <text x=\"140\" y=\"560\">01010011 01010100</text>\n  </g>\n\n  <!-- HERO RIGHT: High-Tech CPU Microchip & Circuit Traces (Prominent!) -->\n  <g transform=\"translate(1560, 360)\">\n    <!-- Circuit Lines radiating -->\n    <g stroke=\"#0ea5e9\" stroke-width=\"3\" fill=\"none\">\n      <path d=\"M 0,-160 L 0,-240 L -80,-280\"/>\n      <circle cx=\"-80\" cy=\"-280\" r=\"6\" fill=\"#38bdf8\"/>\n      <path d=\"M 80,-160 L 160,-240 L 260,-240\"/>\n      <circle cx=\"260\" cy=\"-240\" r=\"6\" fill=\"#38bdf8\"/>\n      <path d=\"M 160,0 L 260,0 L 320,-60\"/>\n      <circle cx=\"320\" cy=\"-60\" r=\"6\" fill=\"#38bdf8\"/>\n      <path d=\"M 160,80 L 240,160 L 240,240\"/>\n      <circle cx=\"240\" cy=\"240\" r=\"6\" fill=\"#38bdf8\"/>\n      <path d=\"M -160,0 L -240,0 L -280,60\"/>\n      <circle cx=\"-280\" cy=\"60\" r=\"6\" fill=\"#38bdf8\"/>\n      <path d=\"M 0,160 L 0,240 L 60,280\"/>\n      <circle cx=\"60\" cy=\"280\" r=\"6\" fill=\"#38bdf8\"/>\n    </g>\n\n    <!-- Golden Bus Pins -->\n    <g fill=\"#f59e0b\">\n      <rect x=\"-140\" y=\"-175\" width=\"280\" height=\"15\" rx=\"3\"/>\n      <rect x=\"-140\" y=\"160\" width=\"280\" height=\"15\" rx=\"3\"/>\n      <rect x=\"-175\" y=\"-140\" width=\"15\" height=\"280\" rx=\"3\"/>\n      <rect x=\"160\" y=\"-140\" width=\"15\" height=\"280\" rx=\"3\"/>\n    </g>\n\n    <!-- Central Chip Package -->\n    <rect x=\"-140\" y=\"-140\" width=\"280\" height=\"280\" rx=\"18\" fill=\"url(#chipGrad)\" stroke=\"#38bdf8\" stroke-width=\"4\"/>\n    <rect x=\"-110\" y=\"-110\" width=\"220\" height=\"220\" rx=\"10\" fill=\"#0f172a\" stroke=\"#0ea5e9\" stroke-width=\"2\"/>\n    \n    <!-- Chip Logo -->\n    <text x=\"0\" y=\"-10\" fill=\"#38bdf8\" font-size=\"34\" font-weight=\"900\" font-family=\"sans-serif\" text-anchor=\"middle\">&lt; / &gt;</text>\n    <text x=\"0\" y=\"30\" fill=\"#ffffff\" font-size=\"22\" font-weight=\"bold\" font-family=\"monospace\" text-anchor=\"middle\">CORE-X</text>\n    <text x=\"0\" y=\"60\" fill=\"#f59e0b\" font-size=\"14\" font-family=\"monospace\" text-anchor=\"middle\">64-BIT PROCESSOR</text>\n  </g>\n\n  <!-- Bottom 3D Cyber Perspective Grid -->\n  <g stroke=\"#0284c7\" stroke-width=\"1.5\" opacity=\"0.5\">\n    <line x1=\"0\" y1=\"920\" x2=\"1920\" y2=\"920\"/>\n    <line x1=\"0\" y1=\"970\" x2=\"1920\" y2=\"970\"/>\n    <line x1=\"0\" y1=\"1030\" x2=\"1920\" y2=\"1030\"/>\n    <line x1=\"960\" y1=\"880\" x2=\"0\" y2=\"1080\"/>\n    <line x1=\"960\" y1=\"880\" x2=\"380\" y2=\"1080\"/>\n    <line x1=\"960\" y1=\"880\" x2=\"760\" y2=\"1080\"/>\n    <line x1=\"960\" y1=\"880\" x2=\"1160\" y2=\"1080\"/>\n    <line x1=\"960\" y1=\"880\" x2=\"1540\" y2=\"1080\"/>\n    <line x1=\"960\" y1=\"880\" x2=\"1920\" y2=\"1080\"/>\n  </g>\n</svg>",
    'english': "<svg xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"0 0 1920 1080\" width=\"100%\" height=\"100%\">\n  <defs>\n    <radialGradient id=\"engBg\" cx=\"50%\" cy=\"40%\" r=\"75%\">\n      <stop offset=\"0%\" stop-color=\"#1e1b4b\"/>\n      <stop offset=\"50%\" stop-color=\"#0f172a\"/>\n      <stop offset=\"100%\" stop-color=\"#020617\"/>\n    </radialGradient>\n    <linearGradient id=\"bookPage\" x1=\"0%\" y1=\"0%\" x2=\"100%\" y2=\"0%\">\n      <stop offset=\"0%\" stop-color=\"#fef3c7\"/>\n      <stop offset=\"50%\" stop-color=\"#fde68a\"/>\n      <stop offset=\"100%\" stop-color=\"#fef3c7\"/>\n    </linearGradient>\n    <radialGradient id=\"lampGlow\" cx=\"50%\" cy=\"50%\" r=\"50%\">\n      <stop offset=\"0%\" stop-color=\"#fde047\" stop-opacity=\"0.9\"/>\n      <stop offset=\"50%\" stop-color=\"#f59e0b\" stop-opacity=\"0.3\"/>\n      <stop offset=\"100%\" stop-color=\"#b45309\" stop-opacity=\"0\"/>\n    </radialGradient>\n  </defs>\n\n  <rect width=\"1920\" height=\"1080\" fill=\"url(#engBg)\"/>\n\n  <!-- TOP-LEFT: Classical Library Lantern & Bookshelf Archway -->\n  <g transform=\"translate(140, 100)\">\n    <circle cx=\"120\" cy=\"120\" r=\"140\" fill=\"url(#lampGlow)\"/>\n    <!-- Lantern Silhouette -->\n    <path d=\"M 120,20 L 140,60 L 100,60 Z\" fill=\"#f59e0b\"/>\n    <rect x=\"90\" y=\"60\" width=\"60\" height=\"90\" rx=\"6\" fill=\"#fef08a\" stroke=\"#78350f\" stroke-width=\"4\"/>\n    <line x1=\"120\" y1=\"60\" x2=\"120\" y2=\"150\" stroke=\"#78350f\" stroke-width=\"3\"/>\n    <line x1=\"90\" y1=\"105\" x2=\"150\" y2=\"105\" stroke=\"#78350f\" stroke-width=\"3\"/>\n    \n    <!-- Floating Quotes & Words -->\n    <g font-family=\"Georgia, serif\" font-style=\"italic\" fill=\"#fde68a\" opacity=\"0.8\">\n      <text x=\"240\" y=\"120\" font-size=\"28\">&ldquo;Words possess wondrous power.&rdquo;</text>\n      <text x=\"260\" y=\"170\" font-size=\"20\">&mdash; Literature &amp; Rhetoric</text>\n    </g>\n  </g>\n\n  <!-- HERO RIGHT: Giant Glowing Open Book & Feather Quill Pen -->\n  <g transform=\"translate(1540, 380)\">\n    <!-- Book Spine & Cover -->\n    <path d=\"M 0,160 Q -180,180 -260,140 L -260,-40 Q -180,0 0,-20 Q 180,0 260,-40 L 260,140 Q 180,180 0,160 Z\" fill=\"#78350f\" stroke=\"#b45309\" stroke-width=\"5\"/>\n    \n    <!-- Left Page -->\n    <path d=\"M 0,150 Q -160,165 -245,130 L -245,-30 Q -160,0 0,-15 Z\" fill=\"url(#bookPage)\"/>\n    <!-- Right Page -->\n    <path d=\"M 0,150 Q 160,165 245,130 L 245,-30 Q 160,0 0,-15 Z\" fill=\"url(#bookPage)\"/>\n\n    <!-- Page Text Lines -->\n    <g stroke=\"#92400e\" stroke-width=\"2.5\" opacity=\"0.6\">\n      <line x1=\"-210\" y1=\"10\" x2=\"-40\" y2=\"18\"/>\n      <line x1=\"-210\" y1=\"40\" x2=\"-40\" y2=\"48\"/>\n      <line x1=\"-210\" y1=\"70\" x2=\"-40\" y2=\"78\"/>\n      <line x1=\"-210\" y1=\"100\" x2=\"-60\" y2=\"108\"/>\n\n      <line x1=\"40\" y1=\"18\" x2=\"210\" y2=\"10\"/>\n      <line x1=\"40\" y1=\"48\" x2=\"210\" y2=\"40\"/>\n      <line x1=\"40\" y1=\"78\" x2=\"210\" y2=\"70\"/>\n      <line x1=\"40\" y1=\"108\" x2=\"180\" y2=\"100\"/>\n    </g>\n\n    <!-- Golden Feather Quill Pen -->\n    <g transform=\"translate(60, -120) rotate(-45)\">\n      <path d=\"M 0,0 C 30,-120 70,-180 120,-220 C 80,-150 40,-80 0,-10 Z\" fill=\"#fbbf24\" stroke=\"#f59e0b\" stroke-width=\"2\"/>\n      <path d=\"M 0,-10 L -10,30 L 5,10 Z\" fill=\"#d97706\"/>\n      <line x1=\"0\" y1=\"-10\" x2=\"80\" y2=\"-170\" stroke=\"#b45309\" stroke-width=\"2\"/>\n    </g>\n\n    <!-- Floating Letters ascending into the sky -->\n    <g font-family=\"Georgia, serif\" font-weight=\"bold\" fill=\"#fde047\" opacity=\"0.85\">\n      <text x=\"-120\" y=\"-120\" font-size=\"36\">A</text>\n      <text x=\"-40\" y=\"-170\" font-size=\"30\">B</text>\n      <text x=\"40\" y=\"-190\" font-size=\"40\">C</text>\n      <text x=\"140\" y=\"-140\" font-size=\"32\">&amp;</text>\n      <text x=\"-80\" y=\"-230\" font-size=\"28\">§</text>\n    </g>\n  </g>\n</svg>",
    'filipino': "<svg xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"0 0 1920 1080\" width=\"100%\" height=\"100%\">\n  <defs>\n    <radialGradient id=\"filBg\" cx=\"50%\" cy=\"40%\" r=\"75%\">\n      <stop offset=\"0%\" stop-color=\"#1e3a8a\"/>\n      <stop offset=\"50%\" stop-color=\"#0f172a\"/>\n      <stop offset=\"100%\" stop-color=\"#030712\"/>\n    </radialGradient>\n    <radialGradient id=\"sunGold\" cx=\"50%\" cy=\"50%\" r=\"50%\">\n      <stop offset=\"0%\" stop-color=\"#fef08a\"/>\n      <stop offset=\"40%\" stop-color=\"#fbbf24\"/>\n      <stop offset=\"80%\" stop-color=\"#f59e0b\"/>\n      <stop offset=\"100%\" stop-color=\"#d97706\"/>\n    </radialGradient>\n  </defs>\n\n  <rect width=\"1920\" height=\"1080\" fill=\"url(#filBg)\"/>\n\n  <!-- HERO RIGHT: 8-RAYED PHILIPPINE GOLDEN SUN & 3 STARS -->\n  <g transform=\"translate(1550, 320)\">\n    <!-- Sun Disc -->\n    <circle cx=\"0\" cy=\"0\" r=\"95\" fill=\"url(#sunGold)\" stroke=\"#fef08a\" stroke-width=\"3\"/>\n    \n    <!-- 8 Main Sun Rays with dual secondary split -->\n    <g fill=\"#fbbf24\">\n      <!-- 0 deg -->\n      <polygon points=\"-12,-90 0,-190 12,-90\"/>\n      <polygon points=\"-6,-90 -20,-170 0,-90\"/>\n      <polygon points=\"0,-90 20,-170 6,-90\"/>\n      <!-- 45 deg -->\n      <g transform=\"rotate(45)\">\n        <polygon points=\"-12,-90 0,-190 12,-90\"/>\n        <polygon points=\"-6,-90 -20,-170 0,-90\"/>\n        <polygon points=\"0,-90 20,-170 6,-90\"/>\n      </g>\n      <!-- 90 deg -->\n      <g transform=\"rotate(90)\">\n        <polygon points=\"-12,-90 0,-190 12,-90\"/>\n        <polygon points=\"-6,-90 -20,-170 0,-90\"/>\n        <polygon points=\"0,-90 20,-170 6,-90\"/>\n      </g>\n      <!-- 135 deg -->\n      <g transform=\"rotate(135)\">\n        <polygon points=\"-12,-90 0,-190 12,-90\"/>\n        <polygon points=\"-6,-90 -20,-170 0,-90\"/>\n        <polygon points=\"0,-90 20,-170 6,-90\"/>\n      </g>\n      <!-- 180 deg -->\n      <g transform=\"rotate(180)\">\n        <polygon points=\"-12,-90 0,-190 12,-90\"/>\n        <polygon points=\"-6,-90 -20,-170 0,-90\"/>\n        <polygon points=\"0,-90 20,-170 6,-90\"/>\n      </g>\n      <!-- 225 deg -->\n      <g transform=\"rotate(225)\">\n        <polygon points=\"-12,-90 0,-190 12,-90\"/>\n        <polygon points=\"-6,-90 -20,-170 0,-90\"/>\n        <polygon points=\"0,-90 20,-170 6,-90\"/>\n      </g>\n      <!-- 270 deg -->\n      <g transform=\"rotate(270)\">\n        <polygon points=\"-12,-90 0,-190 12,-90\"/>\n        <polygon points=\"-6,-90 -20,-170 0,-90\"/>\n        <polygon points=\"0,-90 20,-170 6,-90\"/>\n      </g>\n      <!-- 315 deg -->\n      <g transform=\"rotate(315)\">\n        <polygon points=\"-12,-90 0,-190 12,-90\"/>\n        <polygon points=\"-6,-90 -20,-170 0,-90\"/>\n        <polygon points=\"0,-90 20,-170 6,-90\"/>\n      </g>\n    </g>\n\n    <!-- 3 Golden Stars (Luzon, Visayas, Mindanao) -->\n    <polygon points=\"-240,-120 -230,-90 -200,-90 -225,-70 -215,-40 -240,-60 -265,-40 -255,-70 -280,-90 -250,-90\" fill=\"#fde047\"/>\n    <polygon points=\"240,-120 250,-90 280,-90 255,-70 265,-40 240,-60 215,-40 225,-70 200,-90 230,-90\" fill=\"#fde047\"/>\n    <polygon points=\"0,240 10,270 40,270 15,290 25,320 0,300 -25,320 -15,290 -40,270 -10,270\" fill=\"#fde047\"/>\n  </g>\n\n  <!-- TOP-LEFT: Baybayin Script Characters -->\n  <g transform=\"translate(140, 120)\">\n    <rect x=\"0\" y=\"0\" width=\"380\" height=\"130\" rx=\"14\" fill=\"rgba(255, 255, 255, 0.08)\" stroke=\"#f59e0b\" stroke-width=\"2\"/>\n    <text x=\"25\" y=\"55\" fill=\"#fde047\" font-size=\"44\" font-family=\"sans-serif\">ᜊ  ᜌ  ᜈᜒ  ᜑ  ᜈ᜔</text>\n    <text x=\"25\" y=\"100\" fill=\"#93c5fd\" font-size=\"20\" font-family=\"sans-serif\" font-weight=\"bold\">Bayanihan • Wika at Kultura</text>\n  </g>\n\n  <!-- BOTTOM: Mayon Volcano Perfect Cone Silhouette & Rice Terraces -->\n  <g fill=\"#0f766e\" opacity=\"0.8\">\n    <path d=\"M 0,1080 L 180,820 L 360,1080 Z\"/>\n    <!-- Mayon Cone -->\n    <path d=\"M 120,1080 Q 480,680 720,680 Q 960,680 1320,1080 Z\" fill=\"#047857\"/>\n  </g>\n  <!-- Scarlet Ribbon -->\n  <path d=\"M 0,980 Q 480,840 960,940 T 1920,920 L 1920,1080 L 0,1080 Z\" fill=\"#dc2626\" opacity=\"0.85\"/>\n</svg>",
    'social-studies': "<svg xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"0 0 1920 1080\" width=\"100%\" height=\"100%\">\n  <defs>\n    <radialGradient id=\"socBg\" cx=\"50%\" cy=\"40%\" r=\"75%\">\n      <stop offset=\"0%\" stop-color=\"#1e1b4b\"/>\n      <stop offset=\"50%\" stop-color=\"#0f172a\"/>\n      <stop offset=\"100%\" stop-color=\"#020617\"/>\n    </radialGradient>\n    <radialGradient id=\"compassGold\" cx=\"50%\" cy=\"50%\" r=\"50%\">\n      <stop offset=\"0%\" stop-color=\"#fef08a\"/>\n      <stop offset=\"60%\" stop-color=\"#f59e0b\"/>\n      <stop offset=\"100%\" stop-color=\"#b45309\"/>\n    </radialGradient>\n  </defs>\n\n  <rect width=\"1920\" height=\"1080\" fill=\"url(#socBg)\"/>\n\n  <!-- TOP-LEFT: Parthenon Greek Temple Columns -->\n  <g transform=\"translate(120, 100)\" fill=\"#e2e8f0\" stroke=\"#94a3b8\" stroke-width=\"2\">\n    <!-- Pediment Roof Triangle -->\n    <polygon points=\"180,20 20,80 340,80\"/>\n    <rect x=\"15\" y=\"80\" width=\"330\" height=\"16\"/>\n    <!-- Columns -->\n    <rect x=\"35\" y=\"96\" width=\"28\" height=\"160\" rx=\"3\"/>\n    <rect x=\"95\" y=\"96\" width=\"28\" height=\"160\" rx=\"3\"/>\n    <rect x=\"155\" y=\"96\" width=\"28\" height=\"160\" rx=\"3\"/>\n    <rect x=\"215\" y=\"96\" width=\"28\" height=\"160\" rx=\"3\"/>\n    <rect x=\"275\" y=\"96\" width=\"28\" height=\"160\" rx=\"3\"/>\n    <!-- Base -->\n    <rect x=\"10\" y=\"256\" width=\"340\" height=\"24\"/>\n  </g>\n\n  <!-- HERO RIGHT: Nautical Compass Rose & World Map Meridian Rings -->\n  <g transform=\"translate(1560, 360)\">\n    <!-- Meridian Globe Rings -->\n    <ellipse cx=\"0\" cy=\"0\" rx=\"240\" ry=\"240\" stroke=\"#f59e0b\" stroke-width=\"2.5\" fill=\"none\" opacity=\"0.35\"/>\n    <ellipse cx=\"0\" cy=\"0\" rx=\"240\" ry=\"90\" stroke=\"#f59e0b\" stroke-width=\"2\" fill=\"none\" opacity=\"0.3\"/>\n    <ellipse cx=\"0\" cy=\"0\" rx=\"90\" ry=\"240\" stroke=\"#f59e0b\" stroke-width=\"2\" fill=\"none\" opacity=\"0.3\"/>\n    <line x1=\"-250\" y1=\"0\" x2=\"250\" y2=\"0\" stroke=\"#f59e0b\" stroke-width=\"1.5\" opacity=\"0.4\"/>\n    <line x1=\"0\" y1=\"-250\" x2=\"0\" y2=\"250\" stroke=\"#f59e0b\" stroke-width=\"1.5\" opacity=\"0.4\"/>\n\n    <!-- 16-Point Ornate Compass Rose -->\n    <circle cx=\"0\" cy=\"0\" r=\"140\" stroke=\"#fbbf24\" stroke-width=\"3\" fill=\"none\"/>\n    <!-- North Point -->\n    <polygon points=\"0,0 -16,-20 0,-180\" fill=\"#dc2626\"/>\n    <polygon points=\"0,0 16,-20 0,-180\" fill=\"#ef4444\"/>\n    <!-- South Point -->\n    <polygon points=\"0,0 -16,20 0,180\" fill=\"#1e293b\"/>\n    <polygon points=\"0,0 16,20 0,180\" fill=\"#475569\"/>\n    <!-- East Point -->\n    <polygon points=\"0,0 20,-16 180,0\" fill=\"#d97706\"/>\n    <polygon points=\"0,0 20,16 180,0\" fill=\"#f59e0b\"/>\n    <!-- West Point -->\n    <polygon points=\"0,0 -20,-16 -180,0\" fill=\"#b45309\"/>\n    <polygon points=\"0,0 -20,16 -180,0\" fill=\"#d97706\"/>\n\n    <circle cx=\"0\" cy=\"0\" r=\"18\" fill=\"url(#compassGold)\" stroke=\"#ffffff\" stroke-width=\"2\"/>\n    <text x=\"0\" y=\"-195\" fill=\"#fde047\" font-size=\"24\" font-weight=\"bold\" font-family=\"serif\" text-anchor=\"middle\">N</text>\n  </g>\n</svg>",
    'pe-health': "<svg xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"0 0 1920 1080\" width=\"100%\" height=\"100%\">\n  <defs>\n    <radialGradient id=\"peBg\" cx=\"50%\" cy=\"40%\" r=\"75%\">\n      <stop offset=\"0%\" stop-color=\"#4c0519\"/>\n      <stop offset=\"45%\" stop-color=\"#1f020a\"/>\n      <stop offset=\"100%\" stop-color=\"#0a0104\"/>\n    </radialGradient>\n    <radialGradient id=\"trophyGlow\" cx=\"50%\" cy=\"50%\" r=\"50%\">\n      <stop offset=\"0%\" stop-color=\"#fbbf24\" stop-opacity=\"0.9\"/>\n      <stop offset=\"50%\" stop-color=\"#e11d48\" stop-opacity=\"0.4\"/>\n      <stop offset=\"100%\" stop-color=\"#881337\" stop-opacity=\"0\"/>\n    </radialGradient>\n  </defs>\n\n  <rect width=\"1920\" height=\"1080\" fill=\"url(#peBg)\"/>\n\n  <!-- TOP-LEFT: Vital ECG Heartbeat & Stopwatch -->\n  <g transform=\"translate(140, 110)\">\n    <rect x=\"0\" y=\"0\" width=\"380\" height=\"150\" rx=\"14\" fill=\"rgba(31, 2, 10, 0.75)\" stroke=\"#f43f5e\" stroke-width=\"2.5\"/>\n    <text x=\"20\" y=\"32\" fill=\"#fda4af\" font-size=\"13\" font-family=\"monospace\" font-weight=\"bold\">HEART RATE MONITOR • BPM 138</text>\n    <!-- ECG Pulse wave -->\n    <path d=\"M 10,85 L 60,85 L 75,70 L 90,100 L 105,85 L 130,85 L 145,30 L 160,135 L 175,20 L 190,110 L 205,85 L 240,85 L 255,70 L 270,95 L 285,85 L 360,85\" stroke=\"#fb7185\" stroke-width=\"3.5\" fill=\"none\"/>\n  </g>\n\n  <!-- HERO RIGHT: Golden Sports Victory Trophy & Laurel Wreath -->\n  <g transform=\"translate(1550, 360)\">\n    <circle cx=\"0\" cy=\"0\" r=\"220\" fill=\"url(#trophyGlow)\"/>\n    <!-- Trophy Cup -->\n    <path d=\"M -90,-120 L 90,-120 L 70,10 C 60,80 0,100 0,100 C 0,100 -60,80 -70,10 Z\" fill=\"#fbbf24\" stroke=\"#f59e0b\" stroke-width=\"4\"/>\n    <!-- Cup Rim & Base -->\n    <ellipse cx=\"0\" cy=\"-120\" rx=\"90\" ry=\"18\" fill=\"#fef08a\"/>\n    <rect x=\"-15\" y=\"100\" width=\"30\" height=\"60\" fill=\"#d97706\"/>\n    <rect x=\"-70\" y=\"160\" width=\"140\" height=\"30\" rx=\"6\" fill=\"#b45309\"/>\n    <!-- Handles -->\n    <path d=\"M -85,-90 C -150,-90 -140,-10 -70,0\" stroke=\"#f59e0b\" stroke-width=\"12\" fill=\"none\" stroke-linecap=\"round\"/>\n    <path d=\"M 85,-90 C 150,-90 140,-10 70,0\" stroke=\"#f59e0b\" stroke-width=\"12\" fill=\"none\" stroke-linecap=\"round\"/>\n    <text x=\"0\" y=\"10\" fill=\"#b45309\" font-size=\"44\" font-weight=\"bold\" font-family=\"sans-serif\" text-anchor=\"middle\">★</text>\n  </g>\n\n  <!-- BOTTOM: Athletic Running Track Lanes -->\n  <g stroke=\"#f43f5e\" stroke-width=\"2.5\" fill=\"none\" opacity=\"0.6\">\n    <ellipse cx=\"960\" cy=\"1150\" rx=\"920\" ry=\"320\"/>\n    <ellipse cx=\"960\" cy=\"1180\" rx=\"980\" ry=\"340\"/>\n    <ellipse cx=\"960\" cy=\"1210\" rx=\"1040\" ry=\"360\"/>\n    <ellipse cx=\"960\" cy=\"1240\" rx=\"1100\" ry=\"380\"/>\n  </g>\n</svg>",
    'general': "<svg xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"0 0 1920 1080\" width=\"100%\" height=\"100%\">\n  <defs>\n    <radialGradient id=\"genBg\" cx=\"50%\" cy=\"40%\" r=\"75%\">\n      <stop offset=\"0%\" stop-color=\"#0f2b5c\"/>\n      <stop offset=\"50%\" stop-color=\"#061838\"/>\n      <stop offset=\"100%\" stop-color=\"#020a17\"/>\n    </radialGradient>\n    <radialGradient id=\"starBurst\" cx=\"50%\" cy=\"50%\" r=\"50%\">\n      <stop offset=\"0%\" stop-color=\"#38bdf8\"/>\n      <stop offset=\"40%\" stop-color=\"#0284c7\" stop-opacity=\"0.6\"/>\n      <stop offset=\"100%\" stop-color=\"#0284c7\" stop-opacity=\"0\"/>\n    </radialGradient>\n  </defs>\n\n  <rect width=\"1920\" height=\"1080\" fill=\"url(#genBg)\"/>\n\n  <!-- TOP-LEFT: Scholastic Shield & Torch of Knowledge -->\n  <g transform=\"translate(140, 100)\">\n    <path d=\"M 0,0 L 180,0 L 180,120 C 180,200 90,260 90,260 C 90,260 0,200 0,120 Z\" fill=\"#1e3a8a\" stroke=\"#38bdf8\" stroke-width=\"4\"/>\n    <!-- Torch -->\n    <path d=\"M 80,180 L 100,180 L 95,90 L 85,90 Z\" fill=\"#f59e0b\"/>\n    <ellipse cx=\"90\" cy=\"70\" rx=\"20\" ry=\"30\" fill=\"#f97316\"/>\n    <ellipse cx=\"90\" cy=\"70\" rx=\"10\" ry=\"18\" fill=\"#fde047\"/>\n  </g>\n\n  <!-- HERO RIGHT: Glowing Graduation Cap & Academic Achievement Star -->\n  <g transform=\"translate(1550, 360)\">\n    <circle cx=\"0\" cy=\"0\" r=\"220\" fill=\"url(#starBurst)\"/>\n    \n    <!-- Cap Diamond Board -->\n    <polygon points=\"0,-90 190,-10 0,70 -190,-10\" fill=\"#0f172a\" stroke=\"#38bdf8\" stroke-width=\"4\"/>\n    <!-- Skull Cap Base -->\n    <path d=\"M -80,15 Q 0,120 80,15 L 80,55 Q 0,160 -80,55 Z\" fill=\"#0284c7\" stroke=\"#38bdf8\" stroke-width=\"2\"/>\n    <!-- Button & Tassel -->\n    <circle cx=\"0\" cy=\"-10\" r=\"10\" fill=\"#f59e0b\"/>\n    <path d=\"M 0,-10 Q 90,-20 120,80\" stroke=\"#f59e0b\" stroke-width=\"4\" fill=\"none\"/>\n    <rect x=\"110\" y=\"80\" width=\"20\" height=\"40\" rx=\"4\" fill=\"#f59e0b\"/>\n  </g>\n\n  <!-- Aurora Waves at bottom -->\n  <path d=\"M 0,840 Q 480,720 960,820 T 1920,780 L 1920,1080 L 0,1080 Z\" fill=\"#0284c7\" opacity=\"0.35\"/>\n  <path d=\"M 0,920 Q 520,840 1040,940 T 1920,880 L 1920,1080 L 0,1080 Z\" fill=\"#0369a1\" opacity=\"0.6\"/>\n</svg>"
  };
  const aliases = {
    'math': 'mathematics',
    'genmath': 'mathematics',
    'drarr': 'drrr',
    'disaster': 'drrr',
    'biz': 'business',
    'abm': 'business',
    'finance': 'business',
    'accounting': 'business',
    'ict': 'ict-tech',
    'tech': 'ict-tech',
    'history': 'social-studies',
    'social': 'social-studies',
    'es': 'earth-science',
    'earth': 'earth-science',
    'bio': 'biology',
    'phys': 'physics',
    'chem': 'chemistry',
    'eng': 'english',
    'fil': 'filipino',
    'pe': 'pe-health',
    'hope': 'pe-health'
  };
  return svgs[subjectKey] || (aliases[subjectKey] && svgs[aliases[subjectKey]]) || svgs['general'];
}

function matchSubjectName(text) {
  if (!text) return null;
  const s = String(text).toLowerCase().trim();

  // 1. DISASTER READINESS AND RISK REDUCTION (DRRR / DRARR)
  if (s.includes('disaster') || s.includes('risk reduction') || /\b(drrr|drarr|calamity|hazard)\b/i.test(s)) {
    return { key: 'drrr', name: 'Disaster Readiness and Risk Reduction', icon: '🌋', bgImg: 'assets/subjects/drrr.svg', accent: '#ea580c', cardGlow: 'rgba(234, 88, 12, 0.35)', badgeBg: 'linear-gradient(135deg, #ea580c, #dc2626)', svgMarkup: getSubjectSvg('drrr') };
  }

  // 2. PHYSICAL EDUCATION, HEALTH & PERSONAL DEVELOPMENT
  if (s.includes('physical education') || s.includes('p.e') || s.includes('fitness') || s.includes('health') || s.includes('hope') || s.includes('personal development') || s.includes('pansariling kaunlaran') || s.includes('kaunlaran') || /\b(pe|hope|perdev)\b/i.test(s)) {
    return { key: 'pe-health', name: 'Physical Education & Health', icon: '🏃', bgImg: 'assets/subjects/pe_health.svg', accent: '#e11d48', cardGlow: 'rgba(225, 29, 72, 0.35)', badgeBg: 'linear-gradient(135deg, #e11d48, #fb7185)', svgMarkup: getSubjectSvg('pe-health') };
  }

  // 3. FILIPINO & PANITIKAN
  if (s.includes('komunikasyon') || s.includes('panitikan') || s.includes('pagbasa') || s.includes('pagsusuri') || s.includes('piling larang') || /\b(filipino|fpl|kpwkp)\b/i.test(s)) {
    return { key: 'filipino', name: 'Filipino & Panitikan', icon: '🇵🇭', bgImg: 'assets/subjects/filipino.svg', accent: '#d97706', cardGlow: 'rgba(217, 119, 6, 0.35)', badgeBg: 'linear-gradient(135deg, #d97706, #2563eb)', svgMarkup: getSubjectSvg('filipino') };
  }

  // 4. ENGLISH & LITERATURE (Oral Comm, Purposive Communication, Reading & Writing, 21st Cent Lit, EAPP, Creative Writing, Creative Nonfiction)
  if (s.includes('oral comm') || s.includes('purpose comm') || s.includes('purposive comm') || s.includes('communication') || s.includes('reading and writing') || s.includes('reading & writing') || s.includes('creative writing') || s.includes('creative nonfiction') || s.includes('literat') || s.includes('eapp') || /\b(english|rws|speech|essay)\b/i.test(s)) {
    return { key: 'english', name: 'English & Literature', icon: '📖', bgImg: 'assets/subjects/english_lit.svg', accent: '#b45309', cardGlow: 'rgba(180, 83, 9, 0.35)', badgeBg: 'linear-gradient(135deg, #b45309, #d97706)', svgMarkup: getSubjectSvg('english') };
  }

  // 5. EARTH & ENVIRONMENTAL SCIENCES (Earth Science, Earth and Life Science, Geology, Astronomy, Meteorology)
  if (s.includes('earth and life') || s.includes('earth science') || s.includes('geology') || s.includes('astronomy') || s.includes('meteorolog') || s.includes('oceanog') || /\b(es|els|eals)\b/i.test(s)) {
    return { key: 'earth-science', name: 'Earth & Life Science', icon: '🌍', bgImg: 'assets/subjects/earth_science.svg', accent: '#0284c7', cardGlow: 'rgba(2, 132, 199, 0.35)', badgeBg: 'linear-gradient(135deg, #0284c7, #0d9488)', svgMarkup: getSubjectSvg('earth-science') };
  }

  // 6. BIOLOGY & LIFE SCIENCES (General Biology 1 & 2, Human Biology 1-3, Botany, Zoology, Biochemistry)
  if (s.includes('biology') || s.includes('human bio') || s.includes('genbio') || s.includes('biochem') || s.includes('botany') || s.includes('zoology') || s.includes('anatomy') || s.includes('genetics') || /\b(bio)\b/i.test(s)) {
    return { key: 'biology', name: 'General Biology', icon: '🧬', bgImg: 'assets/subjects/biology.svg', accent: '#059669', cardGlow: 'rgba(5, 150, 105, 0.35)', badgeBg: 'linear-gradient(135deg, #059669, #10b981)', svgMarkup: getSubjectSvg('biology') };
  }

  // 7. CHEMISTRY (General Chemistry 1 & 2, Organic, Inorganic, Stoichiometry)
  if (s.includes('chemistry') || s.includes('organic chem') || s.includes('inorganic') || s.includes('stoichiomet') || /\b(chem|genchem)\b/i.test(s)) {
    return { key: 'chemistry', name: 'General Chemistry', icon: '🧪', bgImg: 'assets/subjects/chemistry.svg', accent: '#0891b2', cardGlow: 'rgba(8, 145, 178, 0.35)', badgeBg: 'linear-gradient(135deg, #0891b2, #6366f1)', svgMarkup: getSubjectSvg('chemistry') };
  }

  // 8. PHYSICS & PHYSICAL SCIENCE (General Physics 1 & 2, Physical Science, Mechanics, Quantum, Electromagnetism)
  if (s.includes('physics') || s.includes('physical science') || s.includes('mechanic') || s.includes('quantum') || s.includes('thermodynam') || /\b(phys|genphys)\b/i.test(s)) {
    return { key: 'physics', name: 'General Physics', icon: '⚛️', bgImg: 'assets/subjects/physics.svg', accent: '#7c3aed', cardGlow: 'rgba(124, 58, 237, 0.35)', badgeBg: 'linear-gradient(135deg, #7c3aed, #2563eb)', svgMarkup: getSubjectSvg('physics') };
  }

  // 9. MATHEMATICS (General Math, Pre-Calculus, Basic Calculus, Differential Equations, Complex Numbers, Vectors, Statistics, Business Math)
  if (s.includes('math') || s.includes('calculus') || s.includes('calc') || s.includes('algebra') || s.includes('geom') || s.includes('stat') || s.includes('trigo') || s.includes('probabil') || s.includes('differential equation') || s.includes('complex number') || s.includes('vector') || /\b(gm|genmath|precalc)\b/i.test(s)) {
    return { key: 'mathematics', name: 'General Mathematics', icon: '📐', bgImg: 'assets/subjects/mathematics.svg', accent: '#4f46e5', cardGlow: 'rgba(79, 70, 229, 0.35)', badgeBg: 'linear-gradient(135deg, #4f46e5, #1e40af)', svgMarkup: getSubjectSvg('mathematics') };
  }

  // 10. ICT & COMPUTER TECHNOLOGIES (ITSM, Game Dev, Cybersecurity, Programming, Web Systems, Databases, CSS, EmpTech, MIL)
  if (/\bict\b/i.test(s) || s.includes('itsm') || s.includes('game dev') || s.includes('gamedev') || s.includes('cyber') || s.includes('security') || s.includes('database') || s.includes('dbms') || s.includes('program') || s.includes('comput') || s.includes('software') || s.includes('hardware') || s.includes('web systems') || s.includes('servicing') || s.includes('empowerment tech') || s.includes('media and info') || s.includes('media & info') || /\b(mil|emptech|css|cs|it)\b/i.test(s)) {
    return { key: 'ict-tech', name: 'Information & Communications Tech', icon: '💻', bgImg: 'assets/subjects/ict_tech.svg', accent: '#0d9488', cardGlow: 'rgba(13, 148, 136, 0.35)', badgeBg: 'linear-gradient(135deg, #0d9488, #2563eb)', svgMarkup: getSubjectSvg('ict-tech') };
  }

  // 11. BUSINESS, FINANCE, ACCOUNTANCY & ECONOMICS (ABM Strand - FABM 1 & 2, Business Finance, Economics, Marketing, OrgMan, Entrep)
  if (s.includes('account') || s.includes('business') || s.includes('finance') || s.includes('econom') || s.includes('market') || s.includes('organization and management') || s.includes('entrepreneurship') || s.includes('entrep') || /\b(fabm|abm|orgman)\b/i.test(s)) {
    return { key: 'business', name: 'Accountancy & Business Management', icon: '💼', bgImg: 'assets/subjects/business_finance.svg', accent: '#059669', cardGlow: 'rgba(5, 150, 105, 0.35)', badgeBg: 'linear-gradient(135deg, #059669, #d97706)', svgMarkup: getSubjectSvg('business') };
  }

  // 12. SOCIAL STUDIES, HUMANITIES & PHILOSOPHY (HUMSS Strand - UCSP, Philosophy, DISS, DIASS, Politics, World Religions, Community Engagement, Trends & Networks, Arts from Regions)
  if (s.includes('philo') || s.includes('social') || s.includes('society') || s.includes('culture') || s.includes('politi') || s.includes('govern') || s.includes('religion') || s.includes('belief') || s.includes('community') || s.includes('citizenship') || s.includes('solidarity') || s.includes('trends, network') || s.includes('arts from the regions') || /\b(ucsp|diss|diass|ppg|cpar|tnct)\b/i.test(s)) {
    return { key: 'social-studies', name: 'Social Studies & Philosophy', icon: '🏛️', bgImg: 'assets/subjects/social_studies.svg', accent: '#991b1b', cardGlow: 'rgba(153, 27, 27, 0.35)', badgeBg: 'linear-gradient(135deg, #991b1b, #b45309)', svgMarkup: getSubjectSvg('social-studies') };
  }

  // 13. ACADEMIC RESEARCH & CAPSTONE (Practical Research 1 & 2, Inquiries 3I, Research in Daily Life, Work Immersion, Homeroom Guidance)
  if (s.includes('research') || s.includes('inquiries') || s.includes('investigation') || s.includes('immersion') || s.includes('culminating') || s.includes('homeroom') || /\b(3i|hg)\b/i.test(s)) {
    return { key: 'general', name: 'Practical Research & Capstone', icon: '🎓', bgImg: 'assets/subjects/general_academic.svg', accent: '#2563eb', cardGlow: 'rgba(37, 99, 235, 0.35)', badgeBg: 'linear-gradient(135deg, #2563eb, #7c3aed)', svgMarkup: getSubjectSvg('general') };
  }

  return null;
}

function getSubjectTheme(subjectName, quizTitle, strandName, questions, lesson) {
  // Tier 1: Check Subject field directly
  let res = matchSubjectName(subjectName);
  if (res) return { ...res, name: subjectName || res.name };

  // Tier 2: Check Quiz Title
  res = matchSubjectName(quizTitle);
  if (res) return { ...res, name: subjectName || quizTitle || res.name };

  // Tier 3: Check Lesson / Description if available
  if (lesson) {
    res = matchSubjectName(lesson);
    if (res) return { ...res, name: subjectName || lesson || res.name };
  }

  // Tier 4: Check Question Content Prompts
  if (Array.isArray(questions) && questions.length > 0) {
    const qSample = questions.slice(0, 5).map(q => (q.question || '') + ' ' + (q.instructions || '')).join(' ');
    res = matchSubjectName(qSample);
    if (res) return { ...res, name: subjectName || quizTitle || res.name };
  }

  // Tier 5: Strand fallback if subject is completely generic or blank
  const st = String(strandName || '').toUpperCase().trim();
  if (st === 'ABM') {
    return { key: 'business', name: 'Accountancy & Business Management', icon: '💼', bgImg: 'assets/subjects/business_finance.svg', accent: '#059669', cardGlow: 'rgba(5, 150, 105, 0.35)', badgeBg: 'linear-gradient(135deg, #059669, #d97706)', svgMarkup: getSubjectSvg('business') };
  }
  if (st === 'TVL') {
    return { key: 'ict-tech', name: 'Information & Communications Tech', icon: '💻', bgImg: 'assets/subjects/ict_tech.svg', accent: '#0d9488', cardGlow: 'rgba(13, 148, 136, 0.35)', badgeBg: 'linear-gradient(135deg, #0d9488, #2563eb)', svgMarkup: getSubjectSvg('ict-tech') };
  }
  if (st === 'HUMSS') {
    return { key: 'social-studies', name: 'Humanities & Social Sciences', icon: '🏛️', bgImg: 'assets/subjects/social_studies.svg', accent: '#991b1b', cardGlow: 'rgba(153, 27, 27, 0.35)', badgeBg: 'linear-gradient(135deg, #991b1b, #b45309)', svgMarkup: getSubjectSvg('social-studies') };
  }
  if (st === 'STEM') {
    return { key: 'mathematics', name: 'STEM Sciences & Mathematics', icon: '📐', bgImg: 'assets/subjects/mathematics.svg', accent: '#4f46e5', cardGlow: 'rgba(79, 70, 229, 0.35)', badgeBg: 'linear-gradient(135deg, #4f46e5, #1e40af)', svgMarkup: getSubjectSvg('mathematics') };
  }

  // Default General Academic
  return {
    key: 'general',
    name: subjectName || quizTitle || 'General Academic',
    icon: '⚡',
    bgImg: 'assets/subjects/general_academic.svg',
    accent: '#2563eb',
    cardGlow: 'rgba(37, 99, 235, 0.35)',
    badgeBg: 'linear-gradient(135deg, #2563eb, #7c3aed)',
    svgMarkup: getSubjectSvg('general')
  };
}

function getStudentRunnerAvatarHtml() {
  const profile = (typeof CURRENT_PROFILE !== 'undefined' && CURRENT_PROFILE) ? CURRENT_PROFILE : null;
  if (profile?.avatar_url) {
    return `<img src="${escHtml(profile.avatar_url)}" class="iq-runner-profile-img" alt="Avatar"/>`;
  }
  const name = profile?.full_name || 'Student';
  const inits = typeof initialsFor === 'function' ? initialsFor(name) : (name ? name.substring(0, 2).toUpperCase() : 'ST');
  return `<div class="iq-runner-profile-initials">${escHtml(inits)}</div>`;
}

function buildQuizItems(quiz) {
  const items = [];
  (quiz?.questions || []).forEach((q, qi) => {
    if (q.type === 'multiple_choice') {
      items.push({ itemId: `q${qi}`, label: q.question, type: 'multiple_choice', options: q.options || [], correct: q.answer });
    } else if (q.type === 'identification') {
      items.push({ itemId: `q${qi}`, label: q.question, type: 'identification', correct: q.answer });
    } else if (q.type === 'matching') {
      (q.pairs || []).forEach((p, pi) => {
        items.push({
          itemId: `q${qi}_p${pi}`,
          label: `${q.instructions || 'Matching'} — ${p.left}`,
          type: 'matching',
          options: (q.pairs || []).map(x => x.right),
          correct: p.right
        });
      });
    }
  });
  return items;
}

function gradeItem(item, given) {
  if (given == null) return false;
  return String(given).trim().toLowerCase() === String(item.correct).trim().toLowerCase();
}

function startTakeQuizTimer() {
  clearInterval(takeQuizState.timerInterval);
  if (takeQuizState.timeLimitMinutes <= 0) return;
  takeQuizState.secondsLeft = takeQuizState.timeLimitMinutes * 60;
  updateTakeQuizTimerDisplay();

  takeQuizState.timerInterval = setInterval(() => {
    takeQuizState.secondsLeft--;
    updateTakeQuizTimerDisplay();
    if (takeQuizState.secondsLeft <= 0) {
      clearInterval(takeQuizState.timerInterval);
      handleTakeQuizTimeout();
    }
  }, 1000);
}

function updateTakeQuizTimerDisplay() {
  const timerEl = document.getElementById('tqTimerDisplay');
  if (!timerEl) return;
  const mins = Math.floor(Math.max(0, takeQuizState.secondsLeft) / 60);
  const secs = Math.max(0, takeQuizState.secondsLeft) % 60;
  timerEl.textContent = `⏱️ ${mins}:${secs < 10 ? '0' : ''}${secs}`;
  if (takeQuizState.secondsLeft <= 60) {
    timerEl.classList.add('urgent');
  } else {
    timerEl.classList.remove('urgent');
  }
}

function handleTakeQuizTimeout() {
  showToast('Time is up! Auto-submitting your quiz answers...', 'warning');
  submitQuizAttempt(true);
}

function openTakeQuizModal(quizId) {
  const quiz = customQuizzes.find(q => q.id === quizId);
  if (!quiz) { showToast('Quiz not found', 'error'); return; }
  const items = buildQuizItems(quiz);
  if (!items.length) { showToast('This quiz has no gradable items yet', 'error'); return; }

  const timeLimitMins = quiz.timeLimitMinutes
    || quiz.questions?.[0]?._meta?.timeLimitMinutes
    || quiz.questions?.[0]?._timeLimitMinutes
    || 0;

  clearInterval(takeQuizState.timerInterval);
  Object.assign(takeQuizState, {
    quiz,
    items,
    responses: {},
    submitting: false,
    reviewMode: false,
    reviewAnswers: [],
    timeLimitMinutes: timeLimitMins,
    secondsLeft: timeLimitMins * 60
  });

  const isInteractive = quiz.type === 'interactive' || quiz.questions?.[0]?._quiz_type === 'interactive';

  if (isInteractive) {
    initInteractiveQuiz();
  } else {
    interactiveState.active = false;
  }

  document.getElementById('takeQuizModal').classList.add('active');
  renderTakeQuizModal();

  // Interactive mode runs its own per-question countdown, so the global
  // time limit only applies to the standard quiz view.
  if (timeLimitMins > 0 && !isInteractive) {
    startTakeQuizTimer();
  }
}

function openReviewAttempt(quizId) {
  clearInterval(takeQuizState.timerInterval);
  const quiz = customQuizzes.find(q => q.id === quizId);
  const attempt = myQuizAttempts.find(a => a.quiz_id === quizId);
  if (!quiz || !attempt) { showToast('Attempt not found', 'error'); return; }
  const items = buildQuizItems(quiz);
  Object.assign(takeQuizState, {
    quiz,
    items,
    responses: {},
    submitting: false,
    reviewMode: true,
    reviewAnswers: attempt.answers || [],
    timeLimitMinutes: 0,
    secondsLeft: 0
  });
  interactiveState.active = false;
  document.getElementById('takeQuizModal').classList.add('active');
  renderTakeQuizModal();
}

function closeTakeQuizModal() {
  clearInterval(takeQuizState.timerInterval);
  if (interactiveState.timerInterval) {
    clearInterval(interactiveState.timerInterval);
    interactiveState.timerInterval = null;
  }
  if (window.speechSynthesis) window.speechSynthesis.cancel();
  interactiveState.active = false;
  document.getElementById('takeQuizModal').classList.remove('active');
}

function setTQAnswer(itemId, value) {
  takeQuizState.responses[itemId] = value;
}

/* ── INTERACTIVE GAME LOBBY & CUSTOMIZATION ── */

function initInteractiveQuiz() {
  if (interactiveState.timerInterval) clearInterval(interactiveState.timerInterval);
  Object.assign(interactiveState, {
    active: true,
    viewMode: 'lobby',
    selectedFormat: 'all',
    selectedCount: 'auto',
    activeItems: [...takeQuizState.items],
    currentIndex: 0,
    score: 0,
    points: 0,
    streak: 0,
    maxStreak: 0,
    timer: 15,
    timerInterval: null,
    selectedAnswer: null,
    isAnswered: false,
    isFinished: false,
    feedbackText: '',
    feedbackType: ''
  });
}

function setGamifiedFormat(format) {
  playGamifiedSfx('click');
  interactiveState.selectedFormat = format;
  renderTakeQuizModal();
}

function setGamifiedCount(count) {
  playGamifiedSfx('click');
  interactiveState.selectedCount = count;
  renderTakeQuizModal();
}

function toggleGamifiedSetting(key) {
  playGamifiedSfx('click');
  interactiveState.settings[key] = !interactiveState.settings[key];
  renderTakeQuizModal();
}

function cycleGamifiedTheme() {
  playGamifiedSfx('click');
  const themes = ['purple', 'cyber', 'gold', 'space'];
  const nextIdx = (themes.indexOf(interactiveState.theme) + 1) % themes.length;
  interactiveState.theme = themes[nextIdx];
  renderTakeQuizModal();
}

function getFilteredInteractiveItems() {
  let list = [...takeQuizState.items];
  if (interactiveState.selectedFormat !== 'all') {
    list = list.filter(it => it.type === interactiveState.selectedFormat);
  }
  if (interactiveState.selectedCount !== 'auto' && typeof interactiveState.selectedCount === 'number') {
    list = list.slice(0, interactiveState.selectedCount);
  }
  return list.length ? list : takeQuizState.items;
}

function startInteractiveGameSession() {
  playGamifiedSfx('click');
  interactiveState.activeItems = getFilteredInteractiveItems();
  interactiveState.viewMode = 'playing';
  interactiveState.currentIndex = 0;
  interactiveState.score = 0;
  interactiveState.points = 0;
  interactiveState.streak = 0;
  interactiveState.maxStreak = 0;
  interactiveState.isAnswered = false;
  interactiveState.isFinished = false;
  interactiveState.feedbackText = '';
  interactiveState.feedbackType = '';
  
  startInteractiveTimer();
  renderTakeQuizModal();
}

function startInteractiveTimer() {
  if (interactiveState.timerInterval) clearInterval(interactiveState.timerInterval);
  interactiveState.timer = 15;
  const currentItem = interactiveState.activeItems[interactiveState.currentIndex];
  if (currentItem) speakQuestionText(currentItem.label);

  interactiveState.timerInterval = setInterval(() => {
    interactiveState.timer--;
    const timerBar = document.getElementById('iqTimerBar');
    const timerText = document.getElementById('iqTimerText');
    if (timerBar) timerBar.style.width = `${(interactiveState.timer / 15) * 100}%`;
    if (timerText) timerText.textContent = `${interactiveState.timer}s`;
    
    if (interactiveState.timer <= 0) {
      clearInterval(interactiveState.timerInterval);
      handleInteractiveAnswer(null, true);
    }
  }, 1000);
}

function handleInteractiveAnswer(given, isTimeout = false) {
  if (interactiveState.isAnswered) return;
  if (interactiveState.timerInterval) clearInterval(interactiveState.timerInterval);
  
  const currentItem = interactiveState.activeItems[interactiveState.currentIndex];
  if (!currentItem) return;
  
  interactiveState.isAnswered = true;
  interactiveState.selectedAnswer = given;
  setTQAnswer(currentItem.itemId, given || '');
  
  const isCorrect = !isTimeout && gradeItem(currentItem, given);
  
  if (isCorrect) {
    playGamifiedSfx('correct');
    interactiveState.streak++;
    if (interactiveState.streak > interactiveState.maxStreak) {
      interactiveState.maxStreak = interactiveState.streak;
    }
    const mult = Math.min(3, 1 + Math.floor(interactiveState.streak / 2));
    const earnedPoints = 100 * mult + interactiveState.timer * 5;
    interactiveState.points += earnedPoints;
    interactiveState.score++;
    interactiveState.feedbackType = 'correct';
    interactiveState.feedbackText = `+${earnedPoints} PTS! ${mult > 1 ? `🔥 ${mult}x Combo!` : 'Correct!'}`;
  } else {
    playGamifiedSfx('wrong');
    interactiveState.streak = 0;
    interactiveState.feedbackType = 'incorrect';
    interactiveState.feedbackText = isTimeout
      ? `Time's up! Correct answer: ${currentItem.correct}`
      : `Incorrect! Correct answer: ${currentItem.correct}`;
  }
  
  renderTakeQuizModal();
}

function nextInteractiveQuestion() {
  if (interactiveState.currentIndex < interactiveState.activeItems.length - 1) {
    interactiveState.currentIndex++;
    interactiveState.isAnswered = false;
    interactiveState.selectedAnswer = null;
    interactiveState.feedbackText = '';
    interactiveState.feedbackType = '';
    startInteractiveTimer();
    renderTakeQuizModal();
  } else {
    if (interactiveState.timerInterval) clearInterval(interactiveState.timerInterval);
    interactiveState.viewMode = 'summary';
    interactiveState.isFinished = true;
    renderTakeQuizModal();
  }
}

function shareQuizLink() {
  playGamifiedSfx('click');
  const url = window.location.href;
  navigator.clipboard.writeText(url).then(() => {
    showToast('Quiz link copied to clipboard!', 'info');
  }).catch(() => {
    showToast('Quiz code: ' + (takeQuizState.quiz?.id || 'SCHOLARIA'), 'info');
  });
}

/* ── MODAL RENDER ROUTER ── */

function renderTakeQuizModal() {
  const titleEl = document.getElementById('takeQuizModalTitle');
  const subEl = document.getElementById('takeQuizModalSubtitle');
  const body = document.getElementById('takeQuizModalBody');
  const foot = document.getElementById('takeQuizModalFoot');
  if (!titleEl) return;
  const { quiz, items, responses, submitting, reviewMode, reviewAnswers } = takeQuizState;

  // 🌟 ALWAYS UPDATE SUBJECT BACKDROP TO FILL FULL SCREEN FOR ALL MODES & SUBJECTS
  const subTheme = getSubjectTheme(quiz?.subject, quiz?.title, quiz?.strand, quiz?.questions, quiz?.lesson);
  const backdropEl = document.getElementById('takeQuizBackdrop');
  if (backdropEl) {
    backdropEl.innerHTML = `${subTheme.svgMarkup}<div class="iq-subject-overlay"></div>`;
  }

  if (interactiveState.active && !reviewMode) {
    const themeClass = `iq-theme-${interactiveState.theme}`;

    /* ── LOBBY VIEW (MATCHING DASHBOARD STYLING & DYNAMIC SUBJECT BG) ── */
    if (interactiveState.viewMode === 'lobby') {
      const activeItems = takeQuizState.items;
      const teacherName = quiz?.createdBy ? 'Teacher' : 'Scholaria Instructor';
      
      titleEl.innerHTML = `⚡ Interactive: ${escHtml(quiz?.title.replace(' (Demo)', '') || 'Quiz')}`;
      subEl.textContent = `${escHtml(quiz?.subject || subTheme.name)} · ${activeItems.length} questions · Ready to challenge`;

      body.innerHTML = `
        
        <div class="iq-lobby-container">
          <div class="iq-lobby-grid">
            <!-- Left Info Card -->
            <div class="iq-lobby-card iq-info-card">
              <div>
                <div class="iq-quiz-badge" style="background: ${subTheme.badgeBg};">${subTheme.icon}</div>
                <h2 class="iq-quiz-title">${escHtml(quiz?.title.replace(' (Demo)', '') || 'Interactive Challenge')}</h2>
                <div class="iq-quiz-meta" style="color: ${subTheme.accent};">
                  <span class="iq-subject-pill" style="border-color:${subTheme.accent};color:${subTheme.accent};">${escHtml(quiz?.subject || subTheme.name)}</span> · ${activeItems.length} questions
                </div>
                <div class="iq-quiz-author">By : ${escHtml(teacherName)}</div>
              </div>
              <button class="iq-share-btn" onclick="shareQuizLink()">
                <svg viewBox="0 0 24 24" width="15" height="15" stroke="currentColor" fill="none" stroke-width="2"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/></svg>
                Share
              </button>
            </div>

            <!-- Right Progress & Start Card -->
            <div class="iq-lobby-card iq-progress-card">
              <div class="iq-runner-wrap">
                <div class="iq-runner-labels"><span>Start</span> <span>End</span></div>
                <div class="iq-runner-track">
                  <div class="iq-runner-progress" style="width: 0%; background: ${subTheme.accent};"></div>
                  <div class="iq-runner-avatar-wrap" style="left: 0%;">
                    ${getStudentRunnerAvatarHtml()}
                  </div>
                  <div class="iq-flag-icon">🏅</div>
                </div>
              </div>
              <div class="iq-remaining-lbl">${activeItems.length} questions remaining</div>
              <button class="iq-start-btn" style="background: ${subTheme.accent}; box-shadow: 0 4px 14px ${subTheme.cardGlow};" onclick="startInteractiveGameSession()">
                Start Game
              </button>
            </div>
          </div>
        </div>
      `;

      foot.innerHTML = `<button class="iq-exit-lobby-btn" onclick="closeTakeQuizModal()">Exit Lobby</button>`;
      return;
    }

    /* ── PLAYING VIEW ── */
    const activeList = interactiveState.activeItems;
    const progressPct = Math.round((interactiveState.currentIndex / activeList.length) * 100);
    titleEl.textContent = quiz ? `⚡ Interactive: ${quiz.title.replace(' (Demo)', '')}` : 'Interactive Quiz';
    subEl.textContent = `${escHtml(quiz?.subject || subTheme.name)} · Question ${interactiveState.currentIndex + 1} of ${activeList.length}`;
    
    if (interactiveState.viewMode === 'summary') {
      const pct = Math.round((interactiveState.score / activeList.length) * 100);
      const stars = pct >= 80 ? '⭐⭐⭐' : pct >= 60 ? '⭐⭐' : '⭐';
      body.innerHTML = `
        
        <div class="iq-finish-card ${themeClass}">
          <div class="iq-stars">${stars}</div>
          <h3>Quiz Completed!</h3>
          <p class="iq-subtitle">Great effort on completing the ${escHtml(quiz?.subject || subTheme.name)} interactive challenge!</p>
          <div class="iq-stats-grid">
            <div class="iq-stat-box">
              <div class="iq-stat-val" style="color:${subTheme.accent};">${interactiveState.points}</div>
              <div class="iq-stat-lbl">Total Score</div>
            </div>
            <div class="iq-stat-box">
              <div class="iq-stat-val" style="color:${subTheme.accent};">${interactiveState.score}/${activeList.length}</div>
              <div class="iq-stat-lbl">Accuracy (${pct}%)</div>
            </div>
            <div class="iq-stat-box">
              <div class="iq-stat-val">🔥 ${interactiveState.maxStreak}</div>
              <div class="iq-stat-lbl">Max Streak</div>
            </div>
          </div>
        </div>
      `;
      foot.innerHTML = `
        <button class="add-btn" ${submitting ? 'disabled' : ''} onclick="submitQuizAttempt()">
          ${submitting ? 'Submitting…' : 'Submit & Save Score'}
        </button>
      `;
      return;
    }
    
    const item = activeList[interactiveState.currentIndex];
    const mult = Math.min(3, 1 + Math.floor(interactiveState.streak / 2));
    
    let optionsHtml = '';
    if (item.type === 'multiple_choice') {
      optionsHtml = `<div class="iq-options-grid">
        ${(item.options || []).map((opt, i) => {
          const isSel = interactiveState.selectedAnswer === opt;
          const isCorrect = String(opt).trim().toLowerCase() === String(item.correct).trim().toLowerCase();
          let btnClass = 'iq-opt-btn';
          if (interactiveState.isAnswered) {
            if (isCorrect) btnClass += ' correct';
            else if (isSel) btnClass += ' wrong';
            else btnClass += ' disabled';
          }
          return `<button class="${btnClass}" ${interactiveState.isAnswered ? 'disabled' : ''} onclick="handleInteractiveAnswer('${escHtml(opt)}')">
            <span class="iq-opt-letter">${String.fromCharCode(65 + i)}</span>
            <span>${escHtml(opt)}</span>
          </button>`;
        }).join('')}
      </div>`;
    } else if (item.type === 'identification') {
      optionsHtml = `
        <div style="display:flex;gap:10px;margin-top:14px;">
          <input type="text" id="iqIdInput" placeholder="Type your answer here..." ${interactiveState.isAnswered ? 'disabled' : ''} style="flex:1;padding:12px 16px;border:1.5px solid var(--blue-light);border-radius:12px;font-size:14px;" onkeypress="if(event.key==='Enter') handleInteractiveAnswer(this.value)">
          <button class="add-btn" style="background:${subTheme.accent};" ${interactiveState.isAnswered ? 'disabled' : ''} onclick="handleInteractiveAnswer(document.getElementById('iqIdInput').value)">Submit</button>
        </div>
      `;
    } else {
      optionsHtml = `
        <div style="margin-top:14px;">
          <select id="iqMatchSelect" class="user-filter-select" style="width:100%;padding:12px;border-radius:12px;" ${interactiveState.isAnswered ? 'disabled' : ''} onchange="handleInteractiveAnswer(this.value)">
            <option value="">— Select matching answer —</option>
            ${(item.options || []).map(opt => `<option value="${escHtml(opt)}">${escHtml(opt)}</option>`).join('')}
          </select>
        </div>
      `;
    }
    
    body.innerHTML = `
      
      <div class="iq-game-header ${themeClass}">
        <div class="iq-runner-wrap" style="margin-bottom:12px;padding:0 4px;">
          <div class="iq-runner-labels"><span>Start</span> <span>End</span></div>
          <div class="iq-runner-track">
            <div class="iq-runner-progress" style="width: ${progressPct}%; background: ${subTheme.accent};"></div>
            <div class="iq-runner-avatar-wrap" style="left: ${progressPct}%;">
              ${getStudentRunnerAvatarHtml()}
            </div>
            <div class="iq-flag-icon">🏅</div>
          </div>
        </div>
        <div class="iq-timer-wrap">
          <div class="iq-timer-bar" id="iqTimerBar" style="width: ${(interactiveState.timer / 15) * 100}%"></div>
        </div>
        <div class="iq-top-bar">
          <span class="iq-timer-text" id="iqTimerText" style="color:${subTheme.accent};">${interactiveState.timer}s</span>
          <span class="iq-score-badge">🏆 ${interactiveState.points} PTS</span>
          <span class="iq-streak-badge ${interactiveState.streak > 1 ? 'hot' : ''}">🔥 ${interactiveState.streak}x Streak</span>
        </div>
      </div>
      
      <div class="iq-card ${themeClass}">
        <div class="iq-qtype" style="color:${subTheme.accent};">${subTheme.icon} ${item.type === 'multiple_choice' ? 'Multiple Choice' : item.type === 'identification' ? 'Identification' : 'Matching'} · ${escHtml(quiz?.subject || subTheme.name)}</div>
        <h3 class="iq-qtitle">${escHtml(item.label)}</h3>
        ${optionsHtml}
        ${interactiveState.feedbackText ? `
          <div class="iq-feedback ${interactiveState.feedbackType}">
            ${escHtml(interactiveState.feedbackText)}
          </div>
        ` : ''}
      </div>
    `;
    
    foot.innerHTML = `
      <button class="iq-exit-lobby-btn" style="background:#fee2e2;color:#dc2626;box-shadow:none;border:1px solid #fca5a5;" onclick="initInteractiveQuiz();renderTakeQuizModal();">Exit to Lobby</button>
      ${interactiveState.isAnswered ? `
        <button class="gen-btn" style="background:${subTheme.accent};" onclick="nextInteractiveQuestion()">
          ${interactiveState.currentIndex < activeList.length - 1 ? 'Next Question ➔' : 'View Summary 🏆'}
        </button>
      ` : ''}
    `;
    return;
  }

  /* ── STANDARD / REVIEW MODE RENDER ── */

  titleEl.textContent = quiz ? quiz.title.replace(' (Demo)', '') : 'Quiz';

  const timerHtml = (takeQuizState.timeLimitMinutes > 0 && !reviewMode)
    ? `<span class="tq-timer-badge" id="tqTimerDisplay">⏱️ ${Math.floor(takeQuizState.secondsLeft / 60)}:${(takeQuizState.secondsLeft % 60) < 10 ? '0' : ''}${takeQuizState.secondsLeft % 60}</span>`
    : '';

  subEl.innerHTML = reviewMode
    ? 'Reviewing your submitted answers'
    : `<div style="display:flex;align-items:center;justify-content:space-between;gap:10px;flex-wrap:wrap;margin-top:2px;">
        <span>${escHtml(quiz?.subject || subTheme.name)} · ${items.length} item${items.length === 1 ? '' : 's'} — answer everything, then submit</span>
        ${timerHtml}
      </div>`;

  body.innerHTML = `<div class="sq-container" style="width:100%;max-width:860px;margin:0 auto;background:#fff;border:1.5px solid var(--blue-light);border-radius:16px;padding:24px 28px;box-shadow:0 4px 18px rgba(37,99,235,0.05);">${items.map((it, idx) => {
    const reviewAns = reviewMode ? reviewAnswers.find(a => a.itemId === it.itemId) : null;
    let fieldHtml = '';
    if (it.type === 'multiple_choice') {
      const current = reviewMode ? (reviewAns ? reviewAns.given : null) : responses[it.itemId];
      fieldHtml = (it.options || []).map(opt => `
        <label style="display:flex;align-items:center;gap:8px;padding:5px 0;cursor:${reviewMode ? 'default' : 'pointer'};">
          <input type="radio" name="tq_${it.itemId}" value="${escHtml(opt)}" ${current === opt ? 'checked' : ''} ${reviewMode ? 'disabled' : ''} onchange="setTQAnswer('${it.itemId}', this.value)">
          <span>${escHtml(opt)}</span>
        </label>`).join('');
    } else if (it.type === 'identification') {
      const val = reviewMode ? (reviewAns ? reviewAns.given : '') : (responses[it.itemId] || '');
      fieldHtml = `<input type="text" value="${escHtml(val)}" placeholder="Type your answer" ${reviewMode ? 'disabled' : ''} oninput="setTQAnswer('${it.itemId}', this.value)" style="width:100%;padding:8px 10px;border:1.5px solid var(--blue-light);border-radius:8px;font-family:'DM Sans',sans-serif;font-size:13px;">`;
    } else if (it.type === 'matching') {
      const val = reviewMode ? (reviewAns ? reviewAns.given : '') : (responses[it.itemId] || '');
      fieldHtml = `<select class="user-filter-select" style="width:100%;" ${reviewMode ? 'disabled' : ''} onchange="setTQAnswer('${it.itemId}', this.value)">
        <option value="">— select a match —</option>
        ${(it.options || []).map(opt => `<option value="${escHtml(opt)}" ${val === opt ? 'selected' : ''}>${escHtml(opt)}</option>`).join('')}
      </select>`;
    }
    const resultTag = reviewMode && reviewAns
      ? `<div style="margin-top:6px;font-size:12px;font-weight:700;color:${reviewAns.isCorrect ? '#059669' : '#dc2626'};">
          ${reviewAns.isCorrect ? '✔ Correct' : `✘ Incorrect — correct answer: ${escHtml(String(it.correct))}`}
        </div>`
      : '';
    return `<div style="padding:14px 0;border-bottom:1px solid var(--blue-light);">
      <p style="font-weight:600;margin-bottom:8px;font-size:14px;">${idx + 1}. ${escHtml(it.label)}</p>
      ${fieldHtml}
      ${resultTag}
    </div>`;
  }).join('')}</div>`;

  foot.innerHTML = reviewMode
    ? `<button class="iq-exit-lobby-btn" onclick="closeTakeQuizModal()">Close Review</button>`
    : `<button class="iq-exit-lobby-btn" style="background:#fee2e2;color:#dc2626;box-shadow:none;border:1px solid #fca5a5;" onclick="closeTakeQuizModal()">Cancel</button>
       <button class="add-btn" style="background:${subTheme.accent};margin-left:auto;" ${submitting ? 'disabled' : ''} onclick="submitQuizAttempt()">${submitting ? 'Submitting…' : 'Submit Quiz'}</button>`;
}

async function submitQuizAttempt(isAutoSubmit = false) {
  const { quiz, items, responses, submitting } = takeQuizState;
  if (submitting) return;

  const targetItems = (interactiveState.active && interactiveState.activeItems.length)
    ? interactiveState.activeItems
    : items;

  if (!isAutoSubmit) {
    const unanswered = targetItems.some(it => responses[it.itemId] == null || responses[it.itemId] === '');
    if (unanswered) { showToast('Please answer every item before submitting', 'error'); return; }
  }

  clearInterval(takeQuizState.timerInterval);
  takeQuizState.submitting = true;
  renderTakeQuizModal();

  const gradedAnswers = targetItems.map(it => {
    const given = responses[it.itemId];
    return { itemId: it.itemId, label: it.label, type: it.type, given, correct: it.correct, isCorrect: gradeItem(it, given) };
  });
  const score = gradedAnswers.filter(a => a.isCorrect).length;
  const total = gradedAnswers.length;

  const attemptObj = {
    id: 'att_' + Date.now(),
    quiz_id: quiz.id,
    quiz_title: quiz.title || 'Quiz',
    student_id: CURRENT_PROFILE.id || CURRENT_PROFILE.school_id || 'stud_1',
    student_name: CURRENT_PROFILE.full_name || 'Student John Doe',
    section: CURRENT_PROFILE.section || 'Section A',
    subject: quiz.subject || CURRENT_PROFILE.strand || 'STEM, HUMSS',
    strand: CURRENT_PROFILE.strand || 'STEM',
    score,
    total_items: total,
    score_percentage: total ? Math.round((score / total) * 100) : 0,
    answers: gradedAnswers,
    submitted_at: new Date().toISOString()
  };

  try {
    const raw = localStorage.getItem('scholaria_all_attempts_v1');
    const list = raw ? JSON.parse(raw) : [];
    list.unshift(attemptObj);
    localStorage.setItem('scholaria_all_attempts_v1', JSON.stringify(list));
  } catch(e) {}

  try {
    const rawCR = localStorage.getItem('scholaria_class_records_v2');
    const listCR = rawCR ? JSON.parse(rawCR) : [];
    listCR.unshift(attemptObj);
    localStorage.setItem('scholaria_class_records_v2', JSON.stringify(listCR));
  } catch(e) {}

  // Dual insert into quiz_attempts AND dedicated class_records table
  try {
    await db.from('class_records').insert({
      student_id: String(CURRENT_PROFILE.id || CURRENT_PROFILE.school_id || 'seed_stud_1'),
      student_name: CURRENT_PROFILE.full_name || 'Student John Doe',
      section: CURRENT_PROFILE.section || 'Section A',
      subject: quiz.subject || CURRENT_PROFILE.strand || 'STEM, HUMSS',
      strand: CURRENT_PROFILE.strand || 'STEM',
      quiz_id: String(quiz.id),
      quiz_title: quiz.title || 'Quiz',
      score,
      total_items: total,
      score_percentage: total ? Math.round((score / total) * 100) : 0
    });
  } catch(crErr) {
    console.warn('Class Records table sync notice:', crErr);
  }

  let { error } = await db.from('quiz_attempts').insert({
    quiz_id: quiz.id,
    quiz_title: quiz.title || 'Quiz',
    student_id: CURRENT_PROFILE.id,
    student_name: CURRENT_PROFILE.full_name,
    score,
    total_items: total,
    answers: gradedAnswers
  });

  if (error) {
    const retry = await db.from('quiz_attempts').insert({
      quiz_id: quiz.id,
      student_id: CURRENT_PROFILE.id,
      score,
      total_items: total,
      answers: gradedAnswers
    });
    error = retry.error;
  }

  takeQuizState.submitting = false;
  if (error) {
    console.warn('Supabase insert notice:', error.message);
  }

  closeTakeQuizModal();
  showToast(`Submitted — score ${score}/${total}`, 'success');
  await loadMyAttemptsFromDB();
  if (typeof loadClassRecAttempts === 'function') {
    await loadClassRecAttempts(true);
  }
  if (currentPage === 'quizzes' || currentPage === 'dashboard' || currentPage === 'classrec' || currentPage === 'progress') {
    renderPage(currentPage);
  }
}

let myQuizAttempts = [];

async function loadMyAttemptsFromDB() {
  if (ROLE !== 'student') return;
  let dbAttempts = [];
  try {
    const { data, error } = await db.from('quiz_attempts').select('*').eq('student_id', CURRENT_PROFILE.id).order('submitted_at', { ascending: false });
    if (!error && data) dbAttempts = data;
  } catch(e) {}

  let localAttempts = [];
  try {
    const raw = localStorage.getItem('scholaria_all_attempts_v1');
    if (raw) {
      const list = JSON.parse(raw);
      localAttempts = list.filter(a => 
        String(a.student_id).toLowerCase() === String(CURRENT_PROFILE.id).toLowerCase() ||
        String(a.student_id).toLowerCase() === String(CURRENT_PROFILE.school_id || '').toLowerCase() ||
        (a.student_name && a.student_name.toLowerCase() === (CURRENT_PROFILE.full_name || '').toLowerCase())
      );
    }
  } catch(e) {}

  const combined = [...dbAttempts];
  localAttempts.forEach(la => {
    if (!combined.some(ca => (ca.id && ca.id === la.id) || (String(ca.quiz_id) === String(la.quiz_id)))) {
      combined.push(la);
    }
  });

  myQuizAttempts = typeof deduplicateQuizAttempts === 'function' ? deduplicateQuizAttempts(combined) : combined;

  if (typeof currentPage !== 'undefined' && (currentPage === 'progress' || currentPage === 'quizzes' || currentPage === 'dashboard')) {
    const mainContent = document.getElementById('mainContent');
    if (mainContent && typeof getPageContent === 'function') {
      mainContent.innerHTML = getPageContent(ROLE, currentPage);
    }
  }
}
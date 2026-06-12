// SOUND EFFECTS (Web Audio - NES style)
// ================================================================
const AudioCtx = window.AudioContext || window.webkitAudioContext;
let audioCtx;
function ensureAudio() { if (!audioCtx) audioCtx = new AudioCtx(); }

function playSound(type) {
  try {
    ensureAudio();
    const c = audioCtx;
    const osc = c.createOscillator();
    const gain = c.createGain();
    osc.connect(gain);
    gain.connect(c.destination);
    gain.gain.setValueAtTime(0.07, c.currentTime);

    switch(type) {
      case 'jump':
        osc.type = 'square';
        osc.frequency.setValueAtTime(380, c.currentTime);
        osc.frequency.linearRampToValueAtTime(760, c.currentTime + 0.12);
        gain.gain.exponentialRampToValueAtTime(0.001, c.currentTime + 0.18);
        osc.start(c.currentTime); osc.stop(c.currentTime + 0.18);
        break;
      case 'doublejump':
        osc.type = 'sine';
        osc.frequency.setValueAtTime(520, c.currentTime);
        osc.frequency.linearRampToValueAtTime(980, c.currentTime + 0.08);
        osc.frequency.linearRampToValueAtTime(1200, c.currentTime + 0.15);
        gain.gain.setValueAtTime(0.05, c.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, c.currentTime + 0.2);
        osc.start(c.currentTime); osc.stop(c.currentTime + 0.2);
        break;
      case 'coin':
        osc.type = 'square';
        osc.frequency.setValueAtTime(988, c.currentTime);
        osc.frequency.setValueAtTime(1319, c.currentTime + 0.06);
        gain.gain.exponentialRampToValueAtTime(0.001, c.currentTime + 0.18);
        osc.start(c.currentTime); osc.stop(c.currentTime + 0.18);
        break;
      case 'stomp':
        osc.type = 'square';
        osc.frequency.setValueAtTime(550, c.currentTime);
        osc.frequency.linearRampToValueAtTime(180, c.currentTime + 0.08);
        gain.gain.exponentialRampToValueAtTime(0.001, c.currentTime + 0.12);
        osc.start(c.currentTime); osc.stop(c.currentTime + 0.12);
        break;
      case 'powerup':
        osc.type = 'square';
        osc.frequency.setValueAtTime(523, c.currentTime);
        osc.frequency.setValueAtTime(659, c.currentTime + 0.07);
        osc.frequency.setValueAtTime(784, c.currentTime + 0.14);
        osc.frequency.setValueAtTime(1047, c.currentTime + 0.21);
        gain.gain.exponentialRampToValueAtTime(0.001, c.currentTime + 0.35);
        osc.start(c.currentTime); osc.stop(c.currentTime + 0.35);
        break;
      case 'shrink':
        osc.type = 'square';
        osc.frequency.setValueAtTime(784, c.currentTime);
        osc.frequency.setValueAtTime(523, c.currentTime + 0.08);
        osc.frequency.setValueAtTime(330, c.currentTime + 0.16);
        gain.gain.exponentialRampToValueAtTime(0.001, c.currentTime + 0.3);
        osc.start(c.currentTime); osc.stop(c.currentTime + 0.3);
        break;
      case 'die':
        osc.type = 'square';
        osc.frequency.setValueAtTime(580, c.currentTime);
        osc.frequency.linearRampToValueAtTime(90, c.currentTime + 0.55);
        gain.gain.exponentialRampToValueAtTime(0.001, c.currentTime + 0.6);
        osc.start(c.currentTime); osc.stop(c.currentTime + 0.6);
        break;
      case 'bump':
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(280, c.currentTime);
        osc.frequency.linearRampToValueAtTime(90, c.currentTime + 0.05);
        gain.gain.exponentialRampToValueAtTime(0.001, c.currentTime + 0.07);
        osc.start(c.currentTime); osc.stop(c.currentTime + 0.07);
        break;
      case 'brick':
        osc.type = 'square';
        osc.frequency.setValueAtTime(190, c.currentTime);
        osc.frequency.linearRampToValueAtTime(70, c.currentTime + 0.08);
        gain.gain.exponentialRampToValueAtTime(0.001, c.currentTime + 0.1);
        osc.start(c.currentTime); osc.stop(c.currentTime + 0.1);
        break;
      case 'flagpole':
        osc.type = 'square';
        gain.gain.setValueAtTime(0.05, c.currentTime);
        for (let i = 0; i < 8; i++) osc.frequency.setValueAtTime(380 + i * 75, c.currentTime + i * 0.07);
        gain.gain.exponentialRampToValueAtTime(0.001, c.currentTime + 0.7);
        osc.start(c.currentTime); osc.stop(c.currentTime + 0.7);
        break;
      case 'warning':
        osc.type = 'square';
        gain.gain.setValueAtTime(0.04, c.currentTime);
        osc.frequency.setValueAtTime(440, c.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, c.currentTime + 0.15);
        osc.start(c.currentTime); osc.stop(c.currentTime + 0.15);
        break;
      case 'gate_slam':
        osc.type = 'sawtooth';
        gain.gain.setValueAtTime(0.08, c.currentTime);
        osc.frequency.setValueAtTime(120, c.currentTime);
        osc.frequency.linearRampToValueAtTime(40, c.currentTime + 0.15);
        gain.gain.exponentialRampToValueAtTime(0.001, c.currentTime + 0.2);
        osc.start(c.currentTime); osc.stop(c.currentTime + 0.2);
        break;
      case 'boss_roar':
        osc.type = 'sawtooth';
        gain.gain.setValueAtTime(0.12, c.currentTime);
        osc.frequency.setValueAtTime(100, c.currentTime);
        osc.frequency.linearRampToValueAtTime(200, c.currentTime + 0.15);
        osc.frequency.linearRampToValueAtTime(50, c.currentTime + 0.6);
        gain.gain.linearRampToValueAtTime(0.14, c.currentTime + 0.1);
        gain.gain.exponentialRampToValueAtTime(0.001, c.currentTime + 0.8);
        osc.start(c.currentTime); osc.stop(c.currentTime + 0.8);
        break;
      case 'bosshit':
        osc.type = 'sawtooth';
        gain.gain.setValueAtTime(0.1, c.currentTime);
        osc.frequency.setValueAtTime(250, c.currentTime);
        osc.frequency.linearRampToValueAtTime(60, c.currentTime + 0.2);
        gain.gain.linearRampToValueAtTime(0.12, c.currentTime + 0.05);
        gain.gain.exponentialRampToValueAtTime(0.001, c.currentTime + 0.35);
        osc.start(c.currentTime); osc.stop(c.currentTime + 0.35);
        break;
      case 'bossdie':
        osc.type = 'sawtooth';
        gain.gain.setValueAtTime(0.1, c.currentTime);
        osc.frequency.setValueAtTime(350, c.currentTime);
        osc.frequency.linearRampToValueAtTime(25, c.currentTime + 1.2);
        gain.gain.linearRampToValueAtTime(0.12, c.currentTime + 0.1);
        gain.gain.exponentialRampToValueAtTime(0.001, c.currentTime + 1.5);
        osc.start(c.currentTime); osc.stop(c.currentTime + 1.5);
        break;
      case 'fireball':
        osc.type = 'sawtooth';
        gain.gain.setValueAtTime(0.05, c.currentTime);
        osc.frequency.setValueAtTime(600, c.currentTime);
        osc.frequency.linearRampToValueAtTime(200, c.currentTime + 0.12);
        gain.gain.exponentialRampToValueAtTime(0.001, c.currentTime + 0.15);
        osc.start(c.currentTime); osc.stop(c.currentTime + 0.15);
        break;
      case 'kick':
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(700, c.currentTime);
        osc.frequency.linearRampToValueAtTime(250, c.currentTime + 0.06);
        gain.gain.exponentialRampToValueAtTime(0.001, c.currentTime + 0.1);
        osc.start(c.currentTime); osc.stop(c.currentTime + 0.1);
        break;
      case '1up':
        osc.type = 'square';
        gain.gain.setValueAtTime(0.06, c.currentTime);
        osc.frequency.setValueAtTime(330, c.currentTime);
        osc.frequency.setValueAtTime(392, c.currentTime + 0.06);
        osc.frequency.setValueAtTime(523, c.currentTime + 0.12);
        osc.frequency.setValueAtTime(659, c.currentTime + 0.18);
        osc.frequency.setValueAtTime(784, c.currentTime + 0.24);
        osc.frequency.setValueAtTime(1047, c.currentTime + 0.30);
        gain.gain.exponentialRampToValueAtTime(0.001, c.currentTime + 0.45);
        osc.start(c.currentTime); osc.stop(c.currentTime + 0.45);
        break;
    }
  } catch(e) {}
}

function startStarMusic() {
  stopStarMusic();
  const notes = [
    523, 587, 659, 698, 784, 698, 784, 880,
    784, 698, 659, 587, 523, 587, 659, 698,
  ];
  let idx = 0;
  function playNote() {
    if (!audioCtx) { stopStarMusic(); return; }
    try {
      const c = audioCtx;
      const osc = c.createOscillator();
      const gain = c.createGain();
      osc.connect(gain); gain.connect(c.destination);
      osc.type = 'square';
      gain.gain.setValueAtTime(0.04, c.currentTime);
      osc.frequency.setValueAtTime(notes[idx % notes.length], c.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, c.currentTime + 0.1);
      osc.start(c.currentTime); osc.stop(c.currentTime + 0.12);
      idx++;
    } catch(e) {}
  }
  playNote();
  starMusicInterval = setInterval(playNote, 120);
}

function stopStarMusic() {
  if (starMusicInterval) { clearInterval(starMusicInterval); starMusicInterval = null; }
}


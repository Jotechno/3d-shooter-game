// Motor de Audio Sintetizado Procedural y Secuenciador Musical Synthwave (Web Audio API)
class SoundEngine {
  constructor() {
    this.ctx = null;
    this.enabled = true;
    this.musicEnabled = true;

    this.masterGain = null;
    this.sfxGain = null;
    this.musicGain = null;
    this.noiseBuffer = null;

    // Estado del secuenciador Synthwave
    this.isPlayingMusic = false;
    this.tempo = 124; // BPM estilo Outrun / Darksynth
    this.current16thStep = 0;
    this.nextNoteTime = 0;
    this.schedulerTimer = null;
    this.lookaheadMs = 25;
    this.scheduleAheadTime = 0.12;
  }

  init() {
    if (this.ctx) {
      if (this.ctx.state === 'suspended') {
        this.ctx.resume();
      }
      return;
    }
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtx) return;

    this.ctx = new AudioCtx();

    // Ganancia Maestra
    this.masterGain = this.ctx.createGain();
    this.masterGain.gain.value = this.enabled ? 0.5 : 0;
    this.masterGain.connect(this.ctx.destination);

    // Sub-mezcla para Efectos de Sonido (Disparos, Impactos)
    this.sfxGain = this.ctx.createGain();
    this.sfxGain.gain.value = 0.72;
    this.sfxGain.connect(this.masterGain);

    // Sub-mezcla para la Música Synthwave
    this.musicGain = this.ctx.createGain();
    this.musicGain.gain.value = this.musicEnabled ? 0.48 : 0;
    this.musicGain.connect(this.masterGain);

    this.createNoiseBuffer();
  }

  createNoiseBuffer() {
    if (!this.ctx) return;
    const bufferSize = this.ctx.sampleRate * 1.5;
    this.noiseBuffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const output = this.noiseBuffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      output[i] = Math.random() * 2 - 1;
    }
  }

  midiToFreq(midi) {
    return 440 * Math.pow(2, (midi - 69) / 12);
  }

  toggle() {
    this.enabled = !this.enabled;
    this.init();
    if (this.masterGain && this.ctx) {
      this.masterGain.gain.setTargetAtTime(this.enabled ? 0.5 : 0, this.ctx.currentTime, 0.03);
    }
    return this.enabled;
  }

  toggleMusic() {
    this.musicEnabled = !this.musicEnabled;
    this.init();
    if (this.musicGain && this.ctx) {
      this.musicGain.gain.setTargetAtTime(this.musicEnabled ? 0.48 : 0, this.ctx.currentTime, 0.04);
    }
    if (this.musicEnabled && !this.isPlayingMusic) {
      this.startMusic();
    }
    return this.musicEnabled;
  }

  // ==================== MOTOR DE MÚSICA SYNTHWAVE ====================
  startMusic() {
    this.init();
    if (!this.ctx || this.isPlayingMusic) return;

    this.isPlayingMusic = true;
    this.current16thStep = 0;
    this.nextNoteTime = this.ctx.currentTime + 0.05;

    this.schedulerTimer = setInterval(() => this.scheduler(), this.lookaheadMs);
  }

  stopMusic() {
    this.isPlayingMusic = false;
    if (this.schedulerTimer) {
      clearInterval(this.schedulerTimer);
      this.schedulerTimer = null;
    }
  }

  scheduler() {
    if (!this.isPlayingMusic || !this.ctx) return;
    while (this.nextNoteTime < this.ctx.currentTime + this.scheduleAheadTime) {
      this.scheduleSynthwaveStep(this.current16thStep, this.nextNoteTime);
      this.advanceStep();
    }
  }

  advanceStep() {
    const secondsPerBeat = 60.0 / this.tempo;
    this.nextNoteTime += 0.25 * secondsPerBeat; // Avanzar 1 semicorchea (1/16)
    this.current16thStep = (this.current16thStep + 1) % 128; // Ciclo de 8 compases (128 pasos)
  }

  scheduleSynthwaveStep(step, time) {
    if (!this.musicEnabled || !this.enabled) return;

    const stepInBar = step % 16;
    const barIndex = Math.floor(step / 16) % 4; // Progresión de 4 compases: Dm - Bb - Gm - A
    const isSecondHalf = step >= 64; // En los compases 5-8 entra el Lead Synth melódico

    // Progresión armónica Synthwave en Re menor (Dm -> Bb -> Gm -> A7)
    const bassRoots = [38, 34, 31, 33]; // D2, Bb1, G1, A1
    const arpChords = [
      [62, 65, 69, 74], // Dm: D4, F4, A4, D5
      [58, 62, 65, 72], // Bbmaj7: Bb3, D4, F4, C5
      [55, 58, 62, 67], // Gm: G3, Bb3, D4, G4
      [57, 61, 64, 69]  // A7: A3, C#4, E4, A4
    ];

    const rootMidi = bassRoots[barIndex];
    const chord = arpChords[barIndex];

    // 1. Batería Electrónica 80s (Kick, Gated Snare, Hi-Hats)
    if (stepInBar === 0 || stepInBar === 8 || (stepInBar === 14 && barIndex % 2 === 1)) {
      this.playSynthKick(time);
    }
    if (stepInBar === 4 || stepInBar === 12) {
      this.playGatedSnare(time);
    }
    // Hi-hat constante con acento en contratiempos
    this.playSynthHat(time, stepInBar % 4 === 2);

    // 2. Bajo Rolling Synthwave (16 semicorcheas con salto de octava energético)
    const octaveJump = stepInBar % 2 === 1 && (stepInBar === 3 || stepInBar === 7 || stepInBar === 11 || stepInBar === 15);
    const bassNote = octaveJump ? rootMidi + 12 : rootMidi;
    const accent = stepInBar % 4 === 0;
    this.playRollingBass(this.midiToFreq(bassNote), time, accent);

    // 3. Pad Atmosférico Neón al inicio de cada compás
    if (stepInBar === 0) {
      this.playSynthPad(chord, time, (60 / this.tempo) * 4);
    }

    // 4. Arpegiador Cristalino de 16 semicorcheas
    const arpPattern = [0, 1, 2, 3, 2, 1, 0, 2, 1, 2, 3, 2, 1, 0, 2, 3];
    const arpNoteMidi = chord[arpPattern[stepInBar]];
    this.playNeonArp(this.midiToFreq(arpNoteMidi), time);

    // 5. Melodía Lead Synthwave en la segunda mitad del ciclo (o estribillo de combate)
    if (isSecondHalf) {
      const leadSequence = [
        // Compás 5 (Dm)
        { step: 0, note: 74, dur: 0.45 },
        { step: 4, note: 72, dur: 0.22 },
        { step: 6, note: 69, dur: 0.55 },
        { step: 12, note: 65, dur: 0.4 },
        // Compás 6 (Bb)
        { step: 16, note: 70, dur: 0.45 },
        { step: 20, note: 69, dur: 0.22 },
        { step: 22, note: 65, dur: 0.55 },
        { step: 28, note: 62, dur: 0.4 },
        // Compás 7 (Gm)
        { step: 32, note: 67, dur: 0.45 },
        { step: 36, note: 70, dur: 0.45 },
        { step: 40, note: 74, dur: 0.65 },
        { step: 46, note: 72, dur: 0.22 },
        // Compás 8 (A7)
        { step: 48, note: 73, dur: 0.85 },
        { step: 56, note: 76, dur: 0.75 }
      ];

      const localStep = step - 64;
      for (let i = 0; i < leadSequence.length; i++) {
        if (leadSequence[i].step === localStep) {
          this.playCyberLead(this.midiToFreq(leadSequence[i].note), time, leadSequence[i].dur);
          break;
        }
      }
    }
  }

  playSynthKick(time) {
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(155, time);
    osc.frequency.exponentialRampToValueAtTime(38, time + 0.14);

    gain.gain.setValueAtTime(0.85, time);
    gain.gain.exponentialRampToValueAtTime(0.001, time + 0.22);

    osc.connect(gain);
    gain.connect(this.musicGain);

    osc.start(time);
    osc.stop(time + 0.23);
  }

  playGatedSnare(time) {
    // Cuerpo tonal del snare
    const osc = this.ctx.createOscillator();
    const oscGain = this.ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(210, time);
    osc.frequency.exponentialRampToValueAtTime(95, time + 0.11);

    oscGain.gain.setValueAtTime(0.42, time);
    oscGain.gain.exponentialRampToValueAtTime(0.001, time + 0.14);

    osc.connect(oscGain);
    oscGain.connect(this.musicGain);
    osc.start(time);
    osc.stop(time + 0.15);

    // Ruido con envolvente Gated Reverb ochentera
    if (this.noiseBuffer) {
      const noise = this.ctx.createBufferSource();
      noise.buffer = this.noiseBuffer;

      const filter = this.ctx.createBiquadFilter();
      filter.type = 'bandpass';
      filter.frequency.setValueAtTime(1650, time);
      filter.Q.setValueAtTime(0.8, time);

      const noiseGain = this.ctx.createGain();
      noiseGain.gain.setValueAtTime(0.38, time);
      noiseGain.gain.setValueAtTime(0.28, time + 0.11);
      noiseGain.gain.exponentialRampToValueAtTime(0.001, time + 0.22);

      noise.connect(filter);
      filter.connect(noiseGain);
      noiseGain.connect(this.musicGain);

      noise.start(time);
      noise.stop(time + 0.23);
    }
  }

  playSynthHat(time, isOpen = false) {
    if (!this.noiseBuffer) return;
    const noise = this.ctx.createBufferSource();
    noise.buffer = this.noiseBuffer;

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'highpass';
    filter.frequency.setValueAtTime(7500, time);

    const gain = this.ctx.createGain();
    const dur = isOpen ? 0.11 : 0.045;
    gain.gain.setValueAtTime(isOpen ? 0.16 : 0.09, time);
    gain.gain.exponentialRampToValueAtTime(0.001, time + dur);

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(this.musicGain);

    noise.start(time);
    noise.stop(time + dur + 0.01);
  }

  playRollingBass(freq, time, accent = false) {
    const osc = this.ctx.createOscillator();
    const sub = this.ctx.createOscillator();
    const filter = this.ctx.createBiquadFilter();
    const gain = this.ctx.createGain();

    osc.type = 'sawtooth';
    sub.type = 'square';

    osc.frequency.setValueAtTime(freq, time);
    sub.frequency.setValueAtTime(freq * 0.5, time);

    filter.type = 'lowpass';
    filter.Q.setValueAtTime(3.2, time);
    filter.frequency.setValueAtTime(accent ? 1650 : 1100, time);
    filter.frequency.exponentialRampToValueAtTime(160, time + 0.11);

    gain.gain.setValueAtTime(accent ? 0.34 : 0.26, time);
    gain.gain.exponentialRampToValueAtTime(0.001, time + 0.12);

    osc.connect(filter);
    sub.connect(filter);
    filter.connect(gain);
    gain.connect(this.musicGain);

    osc.start(time);
    sub.start(time);
    osc.stop(time + 0.125);
    sub.stop(time + 0.125);
  }

  playNeonArp(freq, time) {
    const osc = this.ctx.createOscillator();
    const filter = this.ctx.createBiquadFilter();
    const gain = this.ctx.createGain();

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(freq, time);

    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(2800, time);
    filter.frequency.exponentialRampToValueAtTime(450, time + 0.11);

    gain.gain.setValueAtTime(0.11, time);
    gain.gain.exponentialRampToValueAtTime(0.001, time + 0.12);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(this.musicGain);

    osc.start(time);
    osc.stop(time + 0.125);
  }

  playSynthPad(chordNotes, time, duration) {
    chordNotes.slice(0, 3).forEach((midi, idx) => {
      const osc = this.ctx.createOscillator();
      const filter = this.ctx.createBiquadFilter();
      const gain = this.ctx.createGain();

      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(this.midiToFreq(midi), time);
      osc.detune.setValueAtTime((idx - 1) * 9, time); // Engrosamiento estéreo/detune

      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(950, time);

      gain.gain.setValueAtTime(0.001, time);
      gain.gain.linearRampToValueAtTime(0.055, time + duration * 0.25);
      gain.gain.linearRampToValueAtTime(0.001, time + duration - 0.05);

      osc.connect(filter);
      filter.connect(gain);
      gain.connect(this.musicGain);

      osc.start(time);
      osc.stop(time + duration);
    });
  }

  playCyberLead(freq, time, duration) {
    const osc1 = this.ctx.createOscillator();
    const osc2 = this.ctx.createOscillator();
    const filter = this.ctx.createBiquadFilter();
    const gain = this.ctx.createGain();

    osc1.type = 'sawtooth';
    osc2.type = 'square';
    osc1.frequency.setValueAtTime(freq, time);
    osc2.frequency.setValueAtTime(freq, time);
    osc2.detune.setValueAtTime(10, time);

    filter.type = 'lowpass';
    filter.Q.setValueAtTime(2.5, time);
    filter.frequency.setValueAtTime(3400, time);
    filter.frequency.exponentialRampToValueAtTime(900, time + duration);

    gain.gain.setValueAtTime(0.005, time);
    gain.gain.linearRampToValueAtTime(0.16, time + 0.03);
    gain.gain.exponentialRampToValueAtTime(0.001, time + duration);

    osc1.connect(filter);
    osc2.connect(filter);
    filter.connect(gain);
    gain.connect(this.musicGain);

    osc1.start(time);
    osc2.start(time);
    osc1.stop(time + duration + 0.02);
    osc2.stop(time + duration + 0.02);
  }

  // ==================== EFECTOS DE SONIDO DE COMBATE ====================
  playPlayerShoot(weaponType = 0) {
    if (!this.enabled) return;
    this.init();
    if (!this.ctx) return;

    const now = this.ctx.currentTime;

    if (weaponType === 0) {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(720, now);
      osc.frequency.exponentialRampToValueAtTime(110, now + 0.14);

      gain.gain.setValueAtTime(0.45, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.15);

      osc.connect(gain);
      gain.connect(this.sfxGain);
      osc.start(now);
      osc.stop(now + 0.15);
    } else if (weaponType === 1) {
      const osc = this.ctx.createOscillator();
      const sub = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'square';
      sub.type = 'sawtooth';

      osc.frequency.setValueAtTime(1100, now);
      osc.frequency.exponentialRampToValueAtTime(65, now + 0.32);

      sub.frequency.setValueAtTime(240, now);
      sub.frequency.exponentialRampToValueAtTime(40, now + 0.32);

      gain.gain.setValueAtTime(0.6, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.34);

      osc.connect(gain);
      sub.connect(gain);
      gain.connect(this.sfxGain);

      osc.start(now);
      sub.start(now);
      osc.stop(now + 0.34);
      sub.stop(now + 0.34);
    } else {
      for (let i = 0; i < 3; i++) {
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(480 - i * 90, now);
        osc.frequency.exponentialRampToValueAtTime(55, now + 0.22);

        gain.gain.setValueAtTime(0.28, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.23);

        osc.connect(gain);
        gain.connect(this.sfxGain);
        osc.start(now);
        osc.stop(now + 0.23);
      }
    }
  }

  playAIShoot() {
    if (!this.enabled || !this.ctx) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(340, now);
    osc.frequency.exponentialRampToValueAtTime(85, now + 0.16);

    gain.gain.setValueAtTime(0.24, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.17);

    osc.connect(gain);
    gain.connect(this.sfxGain);
    osc.start(now);
    osc.stop(now + 0.17);
  }

  playHitConfirm(isCritical = false) {
    if (!this.enabled || !this.ctx) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(isCritical ? 1320 : 920, now);
    osc.frequency.setValueAtTime(isCritical ? 1760 : 1180, now + 0.04);

    gain.gain.setValueAtTime(0.42, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.11);

    osc.connect(gain);
    gain.connect(this.sfxGain);
    osc.start(now);
    osc.stop(now + 0.11);
  }

  playPlayerDamage() {
    if (!this.enabled || !this.ctx) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(150, now);
    osc.frequency.linearRampToValueAtTime(55, now + 0.22);

    gain.gain.setValueAtTime(0.55, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.24);

    osc.connect(gain);
    gain.connect(this.sfxGain);
    osc.start(now);
    osc.stop(now + 0.24);
  }

  playPickup(type = 'health') {
    if (!this.enabled || !this.ctx) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'triangle';
    if (type === 'health') {
      osc.frequency.setValueAtTime(523.25, now);
      osc.frequency.setValueAtTime(659.25, now + 0.07);
      osc.frequency.setValueAtTime(783.99, now + 0.14);
    } else {
      osc.frequency.setValueAtTime(440, now);
      osc.frequency.setValueAtTime(880, now + 0.08);
      osc.frequency.setValueAtTime(1320, now + 0.16);
    }

    gain.gain.setValueAtTime(0.38, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.28);

    osc.connect(gain);
    gain.connect(this.sfxGain);
    osc.start(now);
    osc.stop(now + 0.28);
  }

  playDash() {
    if (!this.enabled || !this.ctx) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(180, now);
    osc.frequency.exponentialRampToValueAtTime(460, now + 0.14);

    gain.gain.setValueAtTime(0.3, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.16);

    osc.connect(gain);
    gain.connect(this.sfxGain);
    osc.start(now);
    osc.stop(now + 0.16);
  }

  playRoundEnd(victory = true) {
    if (!this.enabled || !this.ctx) return;
    const now = this.ctx.currentTime;
    const notes = victory ? [523.25, 659.25, 783.99, 1046.5] : [392.0, 349.23, 311.13, 261.63];

    notes.forEach((freq, idx) => {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = victory ? 'triangle' : 'sawtooth';
      osc.frequency.setValueAtTime(freq, now + idx * 0.11);

      gain.gain.setValueAtTime(0.32, now + idx * 0.11);
      gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.11 + 0.28);

      osc.connect(gain);
      gain.connect(this.sfxGain);
      osc.start(now + idx * 0.11);
      osc.stop(now + idx * 0.11 + 0.29);
    });
  }
}

window.soundEngine = new SoundEngine();

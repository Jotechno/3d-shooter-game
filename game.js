// Controlador Principal del Juego 3D en Primera Persona ("NEXUS ARENA 3D")
class ArenaGame {
  constructor() {
    this.canvas = document.getElementById('game-canvas');
    this.radarCanvas = document.getElementById('radar-canvas');
    this.radarCtx = this.radarCanvas.getContext('2d');

    // Inicializar Escena Three.js, Cámara en Primera Persona y Renderizador WebGL
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x040812);
    this.scene.fog = new THREE.FogExp2(0x040812, 0.011);

    this.camera = new THREE.PerspectiveCamera(
      72,
      window.innerWidth / (window.innerHeight - 54),
      0.1,
      220
    );
    this.camera.rotation.order = 'YXZ';
    this.scene.add(this.camera);

    this.renderer = new THREE.WebGLRenderer({
      canvas: this.canvas,
      antialias: true,
      powerPreference: 'high-performance'
    });
    this.renderer.setSize(window.innerWidth, window.innerHeight - 54);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

    // Instanciar Arena, Sistema de Armas y Oponente IA
    this.arena = new ArenaWorld(this.scene);
    this.weapons = new WeaponSystem(this.scene, this.camera);
    this.ai = new AIOpponent(this.scene, this.arena);

    // Estado del Jugador
    this.player = {
      pos: new THREE.Vector3(0, 1.85, 26),
      vel: new THREE.Vector3(),
      yaw: 0, // Mirando hacia -Z (norte, donde está la IA)
      pitch: 0,
      eyeHeight: 1.85,
      hitRadius: 1.05,
      moveSpeed: 15.0,
      turnSpeed: 2.35,
      turnVelocity: 0,
      hp: 100,
      maxHp: 100,
      shield: 50,
      maxShield: 50,
      shieldRegenDelay: 0,
      dashCooldown: 0,
      overchargeTimer: 0,
      alive: true
    };

    // Estado de la Partida y Estadísticas
    this.gameState = 'LOBBY'; // 'LOBBY', 'PLAYING', 'ROUND_OVER', 'MATCH_OVER'
    this.roundsToWin = 2; // Mejor de 3 por defecto
    this.playerScore = 0;
    this.aiScore = 0;
    this.currentRound = 1;
    this.roundTime = 0;

    this.stats = {
      shotsFired: 0,
      shotsHit: 0,
      damageDealt: 0,
      pickupsCollected: 0
    };

    // Estado de Teclado (Flechas + Barra Espaciadora + Extras)
    this.keys = {
      ArrowUp: false,
      ArrowDown: false,
      ArrowLeft: false,
      ArrowRight: false,
      Space: false,
      KeyW: false,
      KeyS: false,
      KeyA: false,
      KeyD: false,
      KeyQ: false,
      KeyE: false,
      ShiftLeft: false
    };

    this.clock = new THREE.Clock();
    this.elapsedTime = 0;
    this.bannerTimeout = null;

    this.bindEvents();
    this.setupUI();
    this.updateHUD();

    // Iniciar bucle de renderizado 3D
    this.animate = this.animate.bind(this);
    requestAnimationFrame(this.animate);
  }

  bindEvents() {
    window.addEventListener('resize', () => {
      const w = window.innerWidth;
      const h = window.innerHeight - 54;
      this.camera.aspect = w / h;
      this.camera.updateProjectionMatrix();
      this.renderer.setSize(w, h);
    });

    window.addEventListener('keydown', (e) => {
      // Evitar que las flechas o la barra espaciadora desplacen la página o activen botones enfocados
      if (
        ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space', ' '].includes(e.code) ||
        ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', ' '].includes(e.key)
      ) {
        e.preventDefault();
      }

      if (e.code === 'ArrowUp') this.keys.ArrowUp = true;
      if (e.code === 'ArrowDown') this.keys.ArrowDown = true;
      if (e.code === 'ArrowLeft') this.keys.ArrowLeft = true;
      if (e.code === 'ArrowRight') this.keys.ArrowRight = true;
      if (e.code === 'Space' || e.key === ' ') this.keys.Space = true;

      if (e.code === 'KeyW') this.keys.KeyW = true;
      if (e.code === 'KeyS') this.keys.KeyS = true;
      if (e.code === 'KeyA') this.keys.KeyA = true;
      if (e.code === 'KeyD') this.keys.KeyD = true;
      if (e.code === 'KeyQ') this.keys.KeyQ = true;
      if (e.code === 'KeyE') this.keys.KeyE = true;

      if (e.code === 'ShiftLeft' || e.code === 'ShiftRight') {
        this.keys.ShiftLeft = true;
        if (this.gameState === 'PLAYING') {
          this.tryPlayerDash();
        }
      }

      // Selección de armas con teclas 1, 2, 3
      if (e.code === 'Digit1') this.selectWeaponSlot(0);
      if (e.code === 'Digit2') this.selectWeaponSlot(1);
      if (e.code === 'Digit3') this.selectWeaponSlot(2);

      // Iniciar desde el menú con Enter o reiniciar rápido con R
      if (e.code === 'Enter' && (this.gameState === 'LOBBY' || this.gameState === 'MATCH_OVER')) {
        if (window.soundEngine) window.soundEngine.init();
        this.startNewMatch();
      }
      if (e.code === 'KeyR' && this.gameState !== 'LOBBY') {
        this.startNewMatch();
      }

      this.updateLiveKeysHUD();
    });

    window.addEventListener('keyup', (e) => {
      if (e.code === 'ArrowUp') this.keys.ArrowUp = false;
      if (e.code === 'ArrowDown') this.keys.ArrowDown = false;
      if (e.code === 'ArrowLeft') this.keys.ArrowLeft = false;
      if (e.code === 'ArrowRight') this.keys.ArrowRight = false;
      if (e.code === 'Space' || e.key === ' ') this.keys.Space = false;

      if (e.code === 'KeyW') this.keys.KeyW = false;
      if (e.code === 'KeyS') this.keys.KeyS = false;
      if (e.code === 'KeyA') this.keys.KeyA = false;
      if (e.code === 'KeyD') this.keys.KeyD = false;
      if (e.code === 'KeyQ') this.keys.KeyQ = false;
      if (e.code === 'KeyE') this.keys.KeyE = false;
      if (e.code === 'ShiftLeft' || e.code === 'ShiftRight') this.keys.ShiftLeft = false;

      this.updateLiveKeysHUD();
    });
  }

  setupUI() {
    // Botón principal de Iniciar Duelo / Jugar de Nuevo
    const startBtn = document.getElementById('btn-start-match');
    startBtn.addEventListener('click', () => {
      startBtn.blur();
      if (window.soundEngine) window.soundEngine.init();
      this.startNewMatch();
    });

    // Selector de dificultad en el Lobby
    const diffBtns = document.querySelectorAll('.diff-btn[data-diff]');
    diffBtns.forEach((btn) => {
      btn.addEventListener('click', () => {
        diffBtns.forEach((b) => b.classList.remove('active'));
        btn.classList.add('active');
        const diff = btn.getAttribute('data-diff');
        this.ai.setDifficulty(diff);
        document.getElementById('nav-difficulty').value = diff;
        btn.blur();
      });
    });

    // Selector de modo de rondas en el Lobby
    const modeBtns = document.querySelectorAll('.diff-btn[data-rounds]');
    modeBtns.forEach((btn) => {
      btn.addEventListener('click', () => {
        modeBtns.forEach((b) => b.classList.remove('active'));
        btn.classList.add('active');
        this.roundsToWin = parseInt(btn.getAttribute('data-rounds'), 10);
        btn.blur();
      });
    });

    // Selector de dificultad en la barra superior
    const navDiff = document.getElementById('nav-difficulty');
    navDiff.addEventListener('change', (e) => {
      const diff = e.target.value;
      this.ai.setDifficulty(diff);
      diffBtns.forEach((b) => {
        b.classList.toggle('active', b.getAttribute('data-diff') === diff);
      });
      navDiff.blur();
      this.addCombatLog(`Dificultad IA ajustada a ${diff.toUpperCase()}`, 'pickup');
    });

    // Ranuras de armas en el HUD
    const slots = document.querySelectorAll('.weapon-slot');
    slots.forEach((slot, idx) => {
      slot.addEventListener('click', () => {
        this.selectWeaponSlot(idx);
        slot.blur();
      });
    });

    // Botón de Reiniciar Partida en la barra superior
    const restartBtn = document.getElementById('btn-restart');
    restartBtn.addEventListener('click', () => {
      restartBtn.blur();
      this.startNewMatch();
    });

    // Botón de Música Synthwave en la barra superior
    const musicBtn = document.getElementById('btn-music');
    if (musicBtn) {
      musicBtn.addEventListener('click', () => {
        musicBtn.blur();
        if (window.soundEngine) {
          const active = window.soundEngine.toggleMusic();
          musicBtn.textContent = active ? '🎵 Synthwave: ON' : '🎵 Synthwave: OFF';
          musicBtn.classList.toggle('active', active);
        }
      });
    }

    // Botón de Efectos de Audio en la barra superior
    const audioBtn = document.getElementById('btn-audio');
    audioBtn.addEventListener('click', () => {
      audioBtn.blur();
      if (window.soundEngine) {
        const active = window.soundEngine.toggle();
        audioBtn.textContent = active ? '🔊 Efectos: ON' : '🔇 Efectos: OFF';
        audioBtn.classList.toggle('active', active);
      }
    });

    // Botón de Pausar / Menú
    const pauseBtn = document.getElementById('btn-menu');
    pauseBtn.addEventListener('click', () => {
      pauseBtn.blur();
      this.showLobbyOverlay(
        'PAUSA TÁCTICA',
        'Configura la dificultad de la IA o continúa el duelo en la arena 3D.',
        'REANUDAR / NUEVO DUELO'
      );
      this.gameState = 'LOBBY';
    });

    // Botón de Pantalla Completa
    const fsBtn = document.getElementById('btn-fullscreen');
    fsBtn.addEventListener('click', () => {
      fsBtn.blur();
      if (!document.fullscreenElement) {
        document.documentElement.requestFullscreen().catch(() => {});
      } else {
        document.exitFullscreen().catch(() => {});
      }
    });
  }

  selectWeaponSlot(index) {
    this.weapons.selectWeapon(index);
    const slots = document.querySelectorAll('.weapon-slot');
    slots.forEach((s, i) => s.classList.toggle('active', i === index));
    const w = this.weapons.getCurrentWeapon();
    document.getElementById('hud-weapon-name').textContent = w.name;
  }

  updateLiveKeysHUD() {
    const map = [
      ['key-up', this.keys.ArrowUp],
      ['key-down', this.keys.ArrowDown],
      ['key-left', this.keys.ArrowLeft],
      ['key-right', this.keys.ArrowRight],
      ['key-space', this.keys.Space]
    ];
    map.forEach(([id, pressed]) => {
      const el = document.getElementById(id);
      if (el) el.classList.toggle('pressed', pressed);
    });
  }

  startNewMatch() {
    this.playerScore = 0;
    this.aiScore = 0;
    this.currentRound = 1;
    this.stats = {
      shotsFired: 0,
      shotsHit: 0,
      damageDealt: 0,
      pickupsCollected: 0
    };

    if (window.soundEngine) {
      window.soundEngine.init();
      window.soundEngine.startMusic();
    }

    document.getElementById('lobby-overlay').classList.add('hidden');
    document.getElementById('stats-summary-section').style.display = 'none';
    this.startRound();
  }

  startRound() {
    // Reiniciar jugador en el extremo Sur mirando al Norte (hacia el oponente IA)
    this.player.pos.set(0, this.player.eyeHeight, 26);
    this.player.vel.set(0, 0, 0);
    this.player.yaw = 0;
    this.player.pitch = 0;
    this.player.turnVelocity = 0;
    this.player.hp = this.player.maxHp;
    this.player.shield = this.player.maxShield;
    this.player.overchargeTimer = 0;
    this.player.dashCooldown = 0;
    this.player.alive = true;

    // Asegurar orientación vertical recta de la cámara (sin rotación Z de 180°)
    this.camera.up.set(0, 1, 0);
    this.camera.rotation.set(0, 0, 0, 'YXZ');

    // Reiniciar IA en el extremo Norte
    this.ai.reset(0, -26);
    this.arena.resetPickups();
    this.weapons.clearAll();

    this.roundTime = 0;
    this.gameState = 'PLAYING';

    this.showBanner(`RONDA ${this.currentRound} — ¡A COMBATIR!`);
    this.addCombatLog(`Ronda ${this.currentRound} iniciada contra NEXUS-9`, 'player-hit');
    this.updateHUD();
  }

  tryPlayerDash() {
    if (this.player.dashCooldown > 0 || !this.player.alive) return;
    this.player.dashCooldown = 2.8;

    const forward = new THREE.Vector3(-Math.sin(this.player.yaw), 0, -Math.cos(this.player.yaw));
    const right = new THREE.Vector3(Math.cos(this.player.yaw), 0, -Math.sin(this.player.yaw));

    const dashDir = new THREE.Vector3();
    if (this.keys.ArrowUp || this.keys.KeyW) dashDir.add(forward);
    else if (this.keys.ArrowDown || this.keys.KeyS) dashDir.sub(forward);
    if (this.keys.KeyA || this.keys.KeyQ) dashDir.sub(right);
    if (this.keys.KeyD || this.keys.KeyE) dashDir.add(right);

    if (dashDir.lengthSq() === 0) {
      dashDir.copy(forward);
    }
    dashDir.normalize();

    this.player.vel.addScaledVector(dashDir, 28);
    if (window.soundEngine) window.soundEngine.playDash();
    this.triggerScreenFX('boost-fx', 0.25);
  }

  onPlayerHit(damage) {
    if (!this.player.alive || this.gameState !== 'PLAYING') return;

    this.player.shieldRegenDelay = 3.5;

    if (this.player.shield > 0) {
      const absorbed = Math.min(this.player.shield, damage);
      this.player.shield -= absorbed;
      const rem = damage - absorbed;
      this.player.hp = Math.max(0, this.player.hp - rem);
    } else {
      this.player.hp = Math.max(0, this.player.hp - damage);
    }

    if (window.soundEngine) window.soundEngine.playPlayerDamage();
    this.triggerScreenFX('damage-fx', 0.28);
    this.addCombatLog(`NEXUS-9 te impactó (-${damage} PTS)`, 'ai-hit');

    if (this.player.hp <= 0) {
      this.player.alive = false;
      this.handleRoundEnd(false);
    }
  }

  onAIHit(damage, isCrit) {
    if (!this.ai.alive || this.gameState !== 'PLAYING') return;

    this.ai.takeDamage(damage);
    this.stats.shotsHit++;
    this.stats.damageDealt += damage;

    if (window.soundEngine) window.soundEngine.playHitConfirm(isCrit);

    // Mostrar Hitmarker en la retícula
    const hm = document.getElementById('hitmarker');
    hm.classList.add('active');
    clearTimeout(this.hmTimeout);
    this.hmTimeout = setTimeout(() => hm.classList.remove('active'), 110);

    if (isCrit) {
      this.addCombatLog(`¡IMPACTO CRÍTICO a NEXUS-9! (-${damage})`, 'player-hit');
    } else {
      this.addCombatLog(`Impacto confirmado a NEXUS-9 (-${damage})`, 'player-hit');
    }

    if (!this.ai.alive) {
      this.weapons.spawnImpactParticles(
        new THREE.Vector3(this.ai.pos.x, 1.8, this.ai.pos.z),
        0xffbe0b,
        35
      );
      this.handleRoundEnd(true);
    }
  }

  handleRoundEnd(playerWon) {
    this.gameState = 'ROUND_OVER';
    if (playerWon) {
      this.playerScore++;
      this.showBanner(`¡RONDA ${this.currentRound} GANADA!`);
      this.addCombatLog('¡NEXUS-9 neutralizado en esta ronda!', 'pickup');
    } else {
      this.aiScore++;
      this.showBanner(`RONDA ${this.currentRound} PERDIDA`);
      this.addCombatLog('Tu blindaje ha colapsado.', 'ai-hit');
    }

    if (window.soundEngine) window.soundEngine.playRoundEnd(playerWon);
    this.updateHUD();

    // Comprobar si alguien alcanzó las rondas para ganar la partida
    if (this.playerScore >= this.roundsToWin || this.aiScore >= this.roundsToWin) {
      setTimeout(() => {
        this.finishMatch(this.playerScore >= this.roundsToWin);
      }, 2100);
    } else {
      this.currentRound++;
      setTimeout(() => {
        if (this.gameState === 'ROUND_OVER') {
          this.startRound();
        }
      }, 2300);
    }
  }

  finishMatch(playerWonMatch) {
    this.gameState = 'MATCH_OVER';
    const accuracy =
      this.stats.shotsFired > 0
        ? Math.round((this.stats.shotsHit / this.stats.shotsFired) * 100)
        : 0;

    document.getElementById('stat-val-score').textContent = `${this.playerScore} - ${this.aiScore}`;
    document.getElementById('stat-val-dmg').textContent = this.stats.damageDealt;
    document.getElementById('stat-val-acc').textContent = `${accuracy}%`;
    document.getElementById('stat-val-pickups').textContent = this.stats.pickupsCollected;
    document.getElementById('stats-summary-section').style.display = 'block';

    if (playerWonMatch) {
      this.showLobbyOverlay(
        '¡VICTORIA EN LA ARENA!',
        `Has derrotado al oponente IA NEXUS-9 (${this.playerScore} a ${this.aiScore}) dominando la arena en primera persona.`,
        'JUGAR NUEVA PARTIDA'
      );
    } else {
      this.showLobbyOverlay(
        'DERROTA EN COMBATE',
        `El droide táctico NEXUS-9 ganó la serie (${this.aiScore} a ${this.playerScore}). ¡Ajusta tu estrategia, usa los pilares de cobertura y vuelve a intentarlo!`,
        'REVANCHA INMEDIATA'
      );
    }
  }

  showLobbyOverlay(title, desc, btnText) {
    document.getElementById('lobby-title-text').textContent = title;
    document.getElementById('lobby-desc-text').textContent = desc;
    document.getElementById('btn-start-match').textContent = btnText;
    document.getElementById('lobby-overlay').classList.remove('hidden');
  }

  showBanner(text) {
    const banner = document.getElementById('center-banner-text');
    banner.textContent = text;
    banner.classList.add('show');
    clearTimeout(this.bannerTimeout);
    this.bannerTimeout = setTimeout(() => {
      banner.classList.remove('show');
    }, 1850);
  }

  triggerScreenFX(className, duration = 0.25) {
    const el = document.querySelector(`.${className}`);
    if (!el) return;
    el.style.opacity = '1';
    setTimeout(() => {
      el.style.opacity = '0';
    }, duration * 1000);
  }

  addCombatLog(message, typeClass = '') {
    const container = document.getElementById('combat-log');
    if (!container) return;
    const item = document.createElement('div');
    item.className = `log-entry ${typeClass}`;
    item.textContent = `▸ ${message}`;
    container.prepend(item);
    while (container.children.length > 4) {
      container.removeChild(container.lastChild);
    }
  }

  checkPickupCollisions() {
    this.arena.pickups.forEach((p) => {
      if (!p.active) return;
      const dist = Math.hypot(this.player.pos.x - p.x, this.player.pos.z - p.z);
      if (dist < 2.15) {
        p.active = false;
        p.respawnTimer = p.respawnDuration;
        p.itemGroup.visible = false;
        p.padMat.emissiveIntensity = 0.05;
        this.stats.pickupsCollected++;

        if (p.type === 'health') {
          this.player.hp = Math.min(this.player.maxHp, this.player.hp + 40);
          this.player.shield = Math.min(this.player.maxShield, this.player.shield + 25);
          this.triggerScreenFX('heal-fx', 0.35);
          this.addCombatLog('Botiquín Nanobot (+40 Salud / +25 Escudo)', 'pickup');
          this.showBanner('+40 SALUD RESTAURADA');
          if (window.soundEngine) window.soundEngine.playPickup('health');
        } else {
          this.weapons.energy = this.weapons.maxEnergy;
          this.player.overchargeTimer = 8.0;
          this.triggerScreenFX('boost-fx', 0.35);
          this.addCombatLog('Núcleo de Sobrecarga (+35% Daño por 8s)', 'pickup');
          this.showBanner('¡SOBRECARGA DE ARMAS ACTIVA!');
          if (window.soundEngine) window.soundEngine.playPickup('overcharge');
        }
      }
    });
  }

  updatePlayerMovement(dt) {
    // 1. Giro de cámara en primera persona con Flecha Izquierda (←) y Flecha Derecha (→)
    const turnInput = (this.keys.ArrowLeft ? 1 : 0) - (this.keys.ArrowRight ? 1 : 0);
    const targetTurnVel = turnInput * this.player.turnSpeed;
    this.player.turnVelocity = THREE.MathUtils.lerp(
      this.player.turnVelocity,
      targetTurnVel,
      Math.min(1, dt * 16)
    );
    this.player.yaw += this.player.turnVelocity * dt;

    // 2. Avance y retroceso con Flecha Arriba (↑) y Flecha Abajo (↓) (+ soporte W/S y Strafe A/D/Q/E)
    const moveForwardInput =
      (this.keys.ArrowUp || this.keys.KeyW ? 1 : 0) -
      (this.keys.ArrowDown || this.keys.KeyS ? 1 : 0);
    const strafeInput =
      (this.keys.KeyD || this.keys.KeyE ? 1 : 0) -
      (this.keys.KeyA || this.keys.KeyQ ? 1 : 0);

    const forwardVec = new THREE.Vector3(-Math.sin(this.player.yaw), 0, -Math.cos(this.player.yaw));
    const rightVec = new THREE.Vector3(Math.cos(this.player.yaw), 0, -Math.sin(this.player.yaw));

    const moveDir = new THREE.Vector3()
      .addScaledVector(forwardVec, moveForwardInput)
      .addScaledVector(rightVec, strafeInput);

    const isMoving = moveDir.lengthSq() > 0.01;
    if (isMoving) {
      moveDir.normalize();
    }

    const desiredVel = moveDir.multiplyScalar(this.player.moveSpeed);
    this.player.vel.lerp(desiredVel, Math.min(1, dt * 11));

    // Aplicar desplazamiento y resolver colisiones con pilares y muros
    this.player.pos.x += this.player.vel.x * dt;
    this.player.pos.z += this.player.vel.z * dt;
    this.arena.resolveCircleCollision(this.player.pos, this.player.hitRadius);

    // Sincronizar cámara 3D con la posición y orientación del jugador (forzando Z=0 para evitar inversión)
    const headBob = isMoving ? Math.sin(this.elapsedTime * 11) * 0.045 : 0;
    this.camera.position.set(
      this.player.pos.x,
      this.player.eyeHeight + headBob,
      this.player.pos.z
    );
    this.camera.up.set(0, 1, 0);
    this.camera.rotation.set(this.player.pitch, this.player.yaw, 0, 'YXZ');

    // 3. Disparo con Barra Espaciadora
    if (this.keys.Space && this.player.alive) {
      const aiChestPos = this.ai.alive
        ? new THREE.Vector3(this.ai.pos.x, 1.85, this.ai.pos.z)
        : null;
      const fired = this.weapons.tryPlayerFire(
        this.player.pos,
        this.player.yaw,
        this.player.pitch,
        aiChestPos,
        this.player.overchargeTimer > 0
      );
      if (fired) {
        this.stats.shotsFired++;
      }
    }

    // Temporizadores de escudo, dash y sobrecarga
    if (this.player.shieldRegenDelay > 0) {
      this.player.shieldRegenDelay -= dt;
    } else if (this.player.shield < this.player.maxShield) {
      this.player.shield = Math.min(this.player.maxShield, this.player.shield + dt * 7.5);
    }

    if (this.player.dashCooldown > 0) {
      this.player.dashCooldown = Math.max(0, this.player.dashCooldown - dt);
    }

    if (this.player.overchargeTimer > 0) {
      this.player.overchargeTimer = Math.max(0, this.player.overchargeTimer - dt);
    }

    this.checkPickupCollisions();

    return { isMoving, turnInput };
  }

  updateTargetIndicators() {
    const ringEl = document.getElementById('crosshair-ring');
    const dirIndicatorEl = document.getElementById('enemy-direction-indicator');

    if (!this.ai.alive || this.gameState !== 'PLAYING') {
      ringEl.classList.remove('target-locked');
      dirIndicatorEl.style.opacity = '0';
      return;
    }

    const toAI = new THREE.Vector3(
      this.ai.pos.x - this.player.pos.x,
      0,
      this.ai.pos.z - this.player.pos.z
    ).normalize();
    const forward = new THREE.Vector3(-Math.sin(this.player.yaw), 0, -Math.cos(this.player.yaw));

    const dot = forward.x * toAI.x + forward.z * toAI.z;
    const cross = forward.x * toAI.z - forward.z * toAI.x; // Signo indica izquierda o derecha
    const hasLOS = this.arena.hasLineOfSight(this.player.pos, this.ai.pos);

    // Si la IA está centrada en la mira y con línea de visión
    if (dot > 0.965 && hasLOS) {
      ringEl.classList.add('target-locked');
    } else {
      ringEl.classList.remove('target-locked');
    }

    // Si la IA está fuera del cono frontal de visión, mostrar flecha direccional alrededor de la mira
    if (dot < 0.78) {
      dirIndicatorEl.style.opacity = '0.9';
      const angleDeg = cross > 0 ? 90 : -90;
      dirIndicatorEl.style.transform = `rotate(${angleDeg}deg)`;
    } else {
      dirIndicatorEl.style.opacity = '0';
    }
  }

  drawRadar() {
    const ctx = this.radarCtx;
    const w = this.radarCanvas.width;
    const h = this.radarCanvas.height;
    const scale = w / (this.arena.halfSize * 2);

    ctx.clearRect(0, 0, w, h);

    // Fondo del radar
    ctx.fillStyle = '#050b16';
    ctx.fillRect(0, 0, w, h);

    // Cuadrícula táctica
    ctx.strokeStyle = 'rgba(0, 240, 255, 0.09)';
    ctx.lineWidth = 1;
    for (let i = 0; i <= w; i += 26) {
      ctx.beginPath();
      ctx.moveTo(i, 0);
      ctx.lineTo(i, h);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(0, i);
      ctx.lineTo(w, i);
      ctx.stroke();
    }

    const toRadarX = (x) => (x + this.arena.halfSize) * scale;
    const toRadarY = (z) => (z + this.arena.halfSize) * scale;

    // Dibujar pilares y coberturas de la arena
    ctx.fillStyle = 'rgba(0, 240, 255, 0.28)';
    ctx.strokeStyle = 'rgba(0, 240, 255, 0.65)';
    this.arena.colliders.forEach((b) => {
      const rx = toRadarX(b.minX);
      const ry = toRadarY(b.minZ);
      const rw = b.w * scale;
      const rh = b.d * scale;
      ctx.fillRect(rx, ry, rw, rh);
      ctx.strokeRect(rx, ry, rw, rh);
    });

    // Dibujar potenciadores activos (Salud = Verde, Sobrecarga = Ámbar)
    this.arena.pickups.forEach((p) => {
      if (!p.active) return;
      ctx.fillStyle = p.type === 'health' ? '#00f59b' : '#ffbe0b';
      ctx.beginPath();
      ctx.arc(toRadarX(p.x), toRadarY(p.z), 3.5, 0, Math.PI * 2);
      ctx.fill();
    });

    // Dibujar proyectiles activos
    this.weapons.projectiles.forEach((proj) => {
      ctx.fillStyle = proj.owner === 'player' ? '#00f0ff' : '#ff1e56';
      ctx.fillRect(toRadarX(proj.pos.x) - 1.5, toRadarY(proj.pos.z) - 1.5, 3, 3);
    });

    // Dibujar cono de visión y posición del Jugador
    const px = toRadarX(this.player.pos.x);
    const py = toRadarY(this.player.pos.z);
    const lookAngle = -this.player.yaw - Math.PI / 2;

    ctx.fillStyle = 'rgba(0, 240, 255, 0.18)';
    ctx.beginPath();
    ctx.moveTo(px, py);
    ctx.arc(px, py, 34, lookAngle - 0.55, lookAngle + 0.55);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = '#00f0ff';
    ctx.beginPath();
    ctx.arc(px, py, 5, 0, Math.PI * 2);
    ctx.fill();

    // Dibujar posición del Oponente IA
    if (this.ai.alive) {
      const ax = toRadarX(this.ai.pos.x);
      const ay = toRadarY(this.ai.pos.z);

      ctx.fillStyle = '#ff1e56';
      ctx.beginPath();
      ctx.arc(ax, ay, 5.5, 0, Math.PI * 2);
      ctx.fill();

      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 1.2;
      ctx.stroke();
    }
  }

  updateHUD() {
    // Salud y escudo del jugador
    document.getElementById('hud-player-hp-num').textContent = Math.ceil(this.player.hp);
    document.getElementById('hud-player-hp-bar').style.width = `${(this.player.hp / this.player.maxHp) * 100}%`;
    document.getElementById('hud-player-shield-bar').style.width = `${(this.player.shield / this.player.maxShield) * 100}%`;

    const dashEl = document.getElementById('hud-dash-status');
    if (this.player.overchargeTimer > 0) {
      dashEl.textContent = `⚡ SOBRECARGA (${this.player.overchargeTimer.toFixed(1)}s)`;
      dashEl.style.color = '#ffbe0b';
    } else if (this.player.dashCooldown <= 0) {
      dashEl.textContent = 'IMPULSO (SHIFT): LISTO';
      dashEl.style.color = '#00f59b';
    } else {
      dashEl.textContent = `IMPULSO: ${this.player.dashCooldown.toFixed(1)}s`;
      dashEl.style.color = '#8aa0c2';
    }

    // Salud, escudo y estado táctico del Oponente IA
    const aiTotalHp = Math.ceil(this.ai.hp);
    const aiTotalShield = Math.ceil(this.ai.shield);
    document.getElementById('hud-ai-hp-num').textContent = `${aiTotalHp} HP | ${aiTotalShield} ESC`;
    document.getElementById('hud-ai-hp-bar').style.width = `${(this.ai.hp / this.ai.maxHp) * 100}%`;
    document.getElementById('hud-ai-shield-bar').style.width = `${(this.ai.shield / this.ai.maxShield) * 100}%`;
    document.getElementById('hud-ai-state').textContent = this.ai.state;

    // Energía del arma
    const energyPct = Math.floor(this.weapons.energy);
    document.getElementById('hud-weapon-energy-num').textContent = `${energyPct}%`;
    document.getElementById('hud-weapon-energy-bar').style.width = `${energyPct}%`;

    // Marcador de Rondas y Tiempo
    document.getElementById('score-player').textContent = this.playerScore;
    document.getElementById('score-ai').textContent = this.aiScore;
    document.getElementById('round-badge-text').textContent = `RONDA ${this.currentRound}`;

    const mins = Math.floor(this.roundTime / 60);
    const secs = Math.floor(this.roundTime % 60);
    document.getElementById('round-timer').textContent = `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  }

  animate() {
    requestAnimationFrame(this.animate);

    const dt = Math.min(this.clock.getDelta(), 0.05);
    this.elapsedTime += dt;

    // Actualizar animaciones del escenario 3D y potenciadores
    this.arena.update(dt, this.elapsedTime);

    if (this.gameState === 'PLAYING') {
      this.roundTime += dt;
      const { isMoving, turnInput } = this.updatePlayerMovement(dt);

      // Actualizar cerebro táctico de la IA
      this.ai.update(dt, this.elapsedTime, this.player.pos, this.player.vel, this.weapons);

      // Actualizar proyectiles, armas y partículas
      this.weapons.update(
        dt,
        isMoving,
        turnInput,
        this.arena,
        this.player,
        this.ai,
        (dmg) => this.onPlayerHit(dmg),
        (dmg, isCrit) => this.onAIHit(dmg, isCrit)
      );

      this.updateTargetIndicators();
      this.updateHUD();
    } else if (this.gameState === 'LOBBY') {
      // Vista panorámica cinematográfica de la arena mientras está en el menú de inicio
      const camRadius = 30;
      const angle = this.elapsedTime * 0.22;
      this.camera.position.set(
        Math.sin(angle) * camRadius,
        8.5 + Math.sin(this.elapsedTime * 0.6) * 1.5,
        Math.cos(angle) * camRadius
      );
      this.camera.up.set(0, 1, 0);
      this.camera.rotation.set(-0.22, angle, 0, 'YXZ');
    } else {
      // Fin de ronda: seguir actualizando partículas restantes
      this.weapons.update(dt, false, 0, this.arena, this.player, this.ai, null, null);
    }

    this.drawRadar();
    this.renderer.render(this.scene, this.camera);
  }
}

window.addEventListener('DOMContentLoaded', () => {
  window.arenaGame = new ArenaGame();
});

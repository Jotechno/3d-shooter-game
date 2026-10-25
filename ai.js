// Oponente Controlado por IA en 3D ("NEXUS-9 TITAN") con Máquina de Estados Táctica
class AIOpponent {
  constructor(scene, arena) {
    this.scene = scene;
    this.arena = arena;

    this.pos = new THREE.Vector3(0, 0, -26);
    this.vel = new THREE.Vector3();
    this.yaw = 0;
    this.hitRadius = 1.35;

    this.maxHp = 100;
    this.hp = 100;
    this.maxShield = 50;
    this.shield = 50;
    this.alive = true;

    this.difficulty = 'normal';
    this.difficultyConfigs = {
      easy: {
        label: 'RECLUTA',
        moveSpeed: 9.0,
        fireInterval: 0.95,
        projSpeed: 40,
        projDamage: 9,
        aimJitter: 0.14,
        predictionFactor: 0.15,
        dashCooldown: 6.5
      },
      normal: {
        label: 'VETERANO',
        moveSpeed: 12.2,
        fireInterval: 0.65,
        projSpeed: 50,
        projDamage: 12,
        aimJitter: 0.075,
        predictionFactor: 0.45,
        dashCooldown: 4.5
      },
      hard: {
        label: 'ÉLITE CYBER',
        moveSpeed: 15.2,
        fireInterval: 0.44,
        projSpeed: 62,
        projDamage: 15,
        aimJitter: 0.03,
        predictionFactor: 0.78,
        dashCooldown: 2.8
      }
    };

    // Estado táctico de la IA
    this.state = 'COMBATE TÁCTICO';
    this.strafeDir = 1;
    this.strafeTimer = 1.8;
    this.fireTimer = 0.8;
    this.dashTimer = 3.0;
    this.hitFlashTimer = 0;
    this.recentDamageAccum = 0;
    this.coverTarget = null;
    this.barrelToggle = false;

    this.buildMechModel();
  }

  buildMechModel() {
    this.group = new THREE.Group();
    this.group.position.copy(this.pos);

    // Materiales del Mech
    this.armorMat = new THREE.MeshStandardMaterial({
      color: 0x1b2438,
      roughness: 0.3,
      metalness: 0.75
    });
    this.accentMat = new THREE.MeshBasicMaterial({ color: 0xff1e56 });
    this.coreMat = new THREE.MeshBasicMaterial({ color: 0xff4d79 });

    // Anillo marcador en el suelo bajo el robot
    const ringGeo = new THREE.RingGeometry(1.15, 1.45, 32);
    const ringMat = new THREE.MeshBasicMaterial({
      color: 0xff1e56,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.75
    });
    this.floorRing = new THREE.Mesh(ringGeo, ringMat);
    this.floorRing.rotation.x = -Math.PI / 2;
    this.floorRing.position.y = 0.04;
    this.group.add(this.floorRing);

    // Sub-grupo flotante para animar levitación / marcha
    this.bodyRoot = new THREE.Group();
    this.group.add(this.bodyRoot);

    // Base propulsora inferior
    const pelvisGeo = new THREE.CylinderGeometry(0.65, 0.4, 0.8, 12);
    const pelvis = new THREE.Mesh(pelvisGeo, this.armorMat);
    pelvis.position.y = 0.75;
    this.bodyRoot.add(pelvis);

    // Torso blindado
    const torsoGeo = new THREE.BoxGeometry(1.45, 1.35, 0.95);
    const torso = new THREE.Mesh(torsoGeo, this.armorMat);
    torso.position.y = 1.75;
    this.bodyRoot.add(torso);

    // Núcleo del reactor en el pecho
    const coreGeo = new THREE.OctahedronGeometry(0.36, 1);
    this.coreMesh = new THREE.Mesh(coreGeo, this.coreMat);
    this.coreMesh.position.set(0, 1.78, 0.48);
    this.bodyRoot.add(this.coreMesh);

    // Hombreras angulares
    const shoulderGeo = new THREE.BoxGeometry(0.5, 0.48, 1.05);
    const leftShoulder = new THREE.Mesh(shoulderGeo, this.armorMat);
    leftShoulder.position.set(-0.95, 2.2, 0);
    const rightShoulder = new THREE.Mesh(shoulderGeo, this.armorMat);
    rightShoulder.position.set(0.95, 2.2, 0);
    this.bodyRoot.add(leftShoulder, rightShoulder);

    // Cañones de plasma en ambos brazos
    const cannonGeo = new THREE.CylinderGeometry(0.14, 0.18, 1.25, 10);
    cannonGeo.rotateX(Math.PI / 2);
    this.leftCannon = new THREE.Mesh(cannonGeo, this.armorMat);
    this.leftCannon.position.set(-1.05, 1.75, 0.45);

    this.rightCannon = new THREE.Mesh(cannonGeo, this.armorMat);
    this.rightCannon.position.set(1.05, 1.75, 0.45);

    const tipGeo = new THREE.CylinderGeometry(0.15, 0.15, 0.18, 10);
    tipGeo.rotateX(Math.PI / 2);
    const leftTip = new THREE.Mesh(tipGeo, this.accentMat);
    leftTip.position.z = 0.62;
    this.leftCannon.add(leftTip);

    const rightTip = new THREE.Mesh(tipGeo, this.accentMat);
    rightTip.position.z = 0.62;
    this.rightCannon.add(rightTip);

    this.bodyRoot.add(this.leftCannon, this.rightCannon);

    // Cabeza / Visor Cibernético (Zona de impacto crítico)
    this.headGroup = new THREE.Group();
    this.headGroup.position.set(0, 2.75, 0);

    const headGeo = new THREE.BoxGeometry(0.82, 0.58, 0.82);
    const headMesh = new THREE.Mesh(headGeo, this.armorMat);
    this.headGroup.add(headMesh);

    const visorGeo = new THREE.BoxGeometry(0.74, 0.18, 0.86);
    const visorMesh = new THREE.Mesh(visorGeo, this.accentMat);
    visorMesh.position.y = 0.04;
    this.headGroup.add(visorMesh);

    this.bodyRoot.add(this.headGroup);

    // Escudo de energía translúcido
    const shieldGeo = new THREE.SphereGeometry(1.75, 18, 16);
    this.shieldMat = new THREE.MeshBasicMaterial({
      color: 0xd946ef,
      transparent: true,
      opacity: 0.16,
      wireframe: true
    });
    this.shieldMesh = new THREE.Mesh(shieldGeo, this.shieldMat);
    this.shieldMesh.position.y = 1.75;
    this.bodyRoot.add(this.shieldMesh);

    this.scene.add(this.group);
  }

  setDifficulty(diffKey) {
    if (this.difficultyConfigs[diffKey]) {
      this.difficulty = diffKey;
    }
  }

  reset(spawnX = 0, spawnZ = -26) {
    this.pos.set(spawnX, 0, spawnZ);
    this.vel.set(0, 0, 0);
    this.hp = this.maxHp;
    this.shield = this.maxShield;
    this.alive = true;
    this.state = 'COMBATE TÁCTICO';
    this.fireTimer = 1.0;
    this.recentDamageAccum = 0;
    this.coverTarget = null;
    this.group.visible = true;
    this.group.position.copy(this.pos);
    this.shieldMesh.visible = true;
  }

  takeDamage(amount) {
    if (!this.alive) return;

    this.hitFlashTimer = 0.12;
    this.recentDamageAccum += amount;

    if (this.shield > 0) {
      const absorbed = Math.min(this.shield, amount);
      this.shield -= absorbed;
      const remainder = amount - absorbed;
      this.hp = Math.max(0, this.hp - remainder);
    } else {
      this.hp = Math.max(0, this.hp - amount);
    }

    this.shieldMesh.visible = this.shield > 0;

    if (this.hp <= 0) {
      this.alive = false;
      this.state = 'DESTRUIDO';
      this.group.visible = false;
    }
  }

  findBestCoverPoint(playerPos) {
    let bestPoint = null;
    let bestScore = -Infinity;

    for (let i = 0; i < this.arena.coverPoints.length; i++) {
      const pt = this.arena.coverPoints[i];
      // Evitar puntos fuera de la arena
      if (Math.abs(pt.x) > this.arena.halfSize - 3 || Math.abs(pt.z) > this.arena.halfSize - 3) {
        continue;
      }
      const distToAI = this.pos.distanceTo(pt);
      const distToPlayer = playerPos.distanceTo(pt);
      const blocksLOS = !this.arena.hasLineOfSight(pt, playerPos);

      // Preferir puntos cercanos a la IA que bloqueen la línea de visión del jugador
      const score = (blocksLOS ? 35 : 0) - distToAI * 0.9 + Math.min(distToPlayer, 25) * 0.4;
      if (score > bestScore) {
        bestScore = score;
        bestPoint = pt;
      }
    }
    return bestPoint;
  }

  update(dt, elapsedTime, playerPos, playerVel, weaponSystem) {
    if (!this.alive) return;

    const cfg = this.difficultyConfigs[this.difficulty] || this.difficultyConfigs.normal;

    // Disipar acumulador de daño reciente
    this.recentDamageAccum = Math.max(0, this.recentDamageAccum - dt * 15);

    // Regeneración ligera de escudo si no ha recibido daño recientemente
    if (this.recentDamageAccum <= 0.1 && this.shield < this.maxShield) {
      this.shield = Math.min(this.maxShield, this.shield + dt * 3.5);
      this.shieldMesh.visible = this.shield > 0;
    }

    // Efecto de parpadeo al recibir impacto
    if (this.hitFlashTimer > 0) {
      this.hitFlashTimer -= dt;
      this.armorMat.emissive.setHex(0xff1e56);
      this.armorMat.emissiveIntensity = 0.85;
    } else {
      this.armorMat.emissive.setHex(0x000000);
      this.armorMat.emissiveIntensity = 0;
    }

    // Evaluar distancia y línea de visión hacia el jugador
    const toPlayer = new THREE.Vector3().subVectors(playerPos, this.pos);
    toPlayer.y = 0;
    const distToPlayer = toPlayer.length();
    const dirToPlayer = toPlayer.clone().normalize();
    const hasLOS = this.arena.hasLineOfSight(this.pos, playerPos);

    // Orientar suavemente el Mech hacia el jugador
    const targetYaw = Math.atan2(dirToPlayer.x, dirToPlayer.z);
    let angleDiff = targetYaw - this.yaw;
    while (angleDiff > Math.PI) angleDiff -= Math.PI * 2;
    while (angleDiff < -Math.PI) angleDiff += Math.PI * 2;
    this.yaw += angleDiff * Math.min(1, dt * 8.5);
    this.group.rotation.y = this.yaw;

    // Temporizador de cambio de strafe
    this.strafeTimer -= dt;
    if (this.strafeTimer <= 0) {
      this.strafeDir = Math.random() > 0.5 ? 1 : -1;
      this.strafeTimer = 1.1 + Math.random() * 1.4;
    }

    // Temporizador de Dash Evasivo
    this.dashTimer -= dt;
    if (this.recentDamageAccum > 28 && this.dashTimer <= 0) {
      this.dashTimer = cfg.dashCooldown;
      this.strafeDir *= -1;
      this.state = 'MANIOBRA EVASIVA';
      const rightVec = new THREE.Vector3(-dirToPlayer.z, 0, dirToPlayer.x).multiplyScalar(this.strafeDir);
      this.vel.copy(rightVec).multiplyScalar(cfg.moveSpeed * 2.1);
    }

    // Selección de estado táctico en la máquina de estados
    const desiredVel = new THREE.Vector3();

    if (this.hp < 32 && this.shield <= 5 && hasLOS) {
      // Salud crítica: Buscar cobertura tras un pilar
      this.state = 'BUSCANDO COBERTURA';
      if (!this.coverTarget || this.pos.distanceTo(this.coverTarget) < 2.2) {
        this.coverTarget = this.findBestCoverPoint(playerPos);
      }
      if (this.coverTarget) {
        const toCover = new THREE.Vector3().subVectors(this.coverTarget, this.pos);
        toCover.y = 0;
        if (toCover.length() > 0.5) {
          desiredVel.copy(toCover.normalize()).multiplyScalar(cfg.moveSpeed * 1.12);
        }
      }
    } else if (!hasLOS) {
      // Sin línea de visión: Flanquear / Cazar al jugador rodeando obstáculos
      this.state = 'FLANQUEANDO';
      const rightVec = new THREE.Vector3(-dirToPlayer.z, 0, dirToPlayer.x).multiplyScalar(this.strafeDir);
      desiredVel
        .addScaledVector(dirToPlayer, 0.78)
        .addScaledVector(rightVec, 0.62)
        .normalize()
        .multiplyScalar(cfg.moveSpeed);
    } else {
      // En línea de visión: Combate táctico con Strafe y control de distancia
      this.state = 'COMBATE TÁCTICO';
      const rightVec = new THREE.Vector3(-dirToPlayer.z, 0, dirToPlayer.x).multiplyScalar(this.strafeDir);

      let forwardFactor = 0;
      if (distToPlayer > 24) forwardFactor = 0.65; // Acercarse
      else if (distToPlayer < 12) forwardFactor = -0.7; // Alejarse para mantener rango

      desiredVel
        .addScaledVector(dirToPlayer, forwardFactor)
        .addScaledVector(rightVec, 0.9)
        .normalize()
        .multiplyScalar(cfg.moveSpeed);
    }

    // Interpolación suave de velocidad y resolución de colisiones
    this.vel.lerp(desiredVel, Math.min(1, dt * 7.5));
    this.pos.addScaledVector(this.vel, dt);

    const prevX = this.pos.x;
    const prevZ = this.pos.z;
    this.arena.resolveCircleCollision(this.pos, this.hitRadius);

    // Si chocó con un pilar haciendo strafe, invertir dirección de strafe
    if (Math.hypot(this.pos.x - prevX, this.pos.z - prevZ) > 0.02) {
      this.strafeDir *= -1;
      this.strafeTimer = 1.2;
    }

    this.group.position.copy(this.pos);

    // Animación flotante del chasis y rotación del núcleo
    this.bodyRoot.position.y = Math.sin(elapsedTime * 5.0) * 0.1;
    this.coreMesh.rotation.y += dt * 3.2;
    this.shieldMesh.rotation.y -= dt * 1.2;

    // Recuperar posición de retroceso de los cañones
    this.leftCannon.position.z = THREE.MathUtils.lerp(this.leftCannon.position.z, 0.45, dt * 10);
    this.rightCannon.position.z = THREE.MathUtils.lerp(this.rightCannon.position.z, 0.45, dt * 10);

    // Lógica de Disparo de la IA (solo cuando tiene línea de visión o casi directa)
    this.fireTimer -= dt;
    if (this.fireTimer <= 0 && hasLOS && distToPlayer < 62) {
      this.fireTimer = cfg.fireInterval * (0.85 + Math.random() * 0.3);
      this.barrelToggle = !this.barrelToggle;

      // Alternar cañón izquierdo y derecho
      const activeCannon = this.barrelToggle ? this.leftCannon : this.rightCannon;
      activeCannon.position.z = 0.18; // Retroceso visual

      const muzzlePos = new THREE.Vector3();
      activeCannon.getWorldPosition(muzzlePos);
      muzzlePos.y = 1.75;

      // Predicción de movimiento del jugador según dificultad
      const travelTime = distToPlayer / cfg.projSpeed;
      const predictedTarget = new THREE.Vector3(
        playerPos.x + playerVel.x * travelTime * cfg.predictionFactor,
        1.45,
        playerPos.z + playerVel.z * travelTime * cfg.predictionFactor
      );

      const aimDir = new THREE.Vector3().subVectors(predictedTarget, muzzlePos).normalize();
      // Añadir dispersión según nivel de dificultad
      aimDir.x += (Math.random() - 0.5) * cfg.aimJitter;
      aimDir.z += (Math.random() - 0.5) * cfg.aimJitter;
      aimDir.normalize();

      weaponSystem.spawnAIProjectile(muzzlePos, aimDir, cfg.projSpeed, cfg.projDamage);
    }
  }
}

window.AIOpponent = AIOpponent;

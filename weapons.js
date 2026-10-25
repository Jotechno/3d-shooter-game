// Sistema de Armas en Primera Persona 3D, Proyectiles y Partículas de Impacto
class WeaponSystem {
  constructor(scene, camera) {
    this.scene = scene;
    this.camera = camera;

    this.weapons = [
      {
        id: 0,
        name: 'Rifle de Pulso NX-1',
        cooldown: 0.17,
        energyCost: 8,
        speed: 88,
        damage: 17,
        projectiles: 1,
        spread: 0.008,
        color: 0x00f0ff,
        radius: 0.24
      },
      {
        id: 1,
        name: 'Cañón de Riel VORTEX',
        cooldown: 0.56,
        energyCost: 26,
        speed: 145,
        damage: 44,
        projectiles: 1,
        spread: 0.001,
        color: 0xffbe0b,
        radius: 0.30
      },
      {
        id: 2,
        name: 'Dispersor TRIPLE-X',
        cooldown: 0.40,
        energyCost: 18,
        speed: 74,
        damage: 14,
        projectiles: 3,
        spread: 0.095,
        color: 0x00f59b,
        radius: 0.22
      }
    ];

    this.currentWeaponIndex = 0;
    this.cooldownTimer = 0;
    this.energy = 100;
    this.maxEnergy = 100;
    this.energyRegenRate = 28; // Energía por segundo

    this.recoilOffset = 0;
    this.bobPhase = 0;
    this.muzzleTimer = 0;

    this.projectiles = [];
    this.particles = [];

    this.buildFirstPersonWeapon();
  }

  buildFirstPersonWeapon() {
    this.fpGroup = new THREE.Group();

    // Chasis principal del rifle
    const bodyGeo = new THREE.BoxGeometry(0.16, 0.18, 0.68);
    const bodyMat = new THREE.MeshStandardMaterial({
      color: 0x162238,
      roughness: 0.3,
      metalness: 0.8
    });
    const bodyMesh = new THREE.Mesh(bodyGeo, bodyMat);
    this.fpGroup.add(bodyMesh);

    // Cañón superior alargado
    const barrelGeo = new THREE.CylinderGeometry(0.032, 0.038, 0.65, 12);
    barrelGeo.rotateX(Math.PI / 2);
    const barrelMat = new THREE.MeshStandardMaterial({
      color: 0x0b111e,
      roughness: 0.25,
      metalness: 0.9
    });
    const barrel = new THREE.Mesh(barrelGeo, barrelMat);
    barrel.position.set(0, 0.05, -0.22);
    this.fpGroup.add(barrel);

    // Rieles de energía luminosos (cambian de color según el arma activa)
    const railGeo = new THREE.BoxGeometry(0.175, 0.035, 0.56);
    this.railMat = new THREE.MeshBasicMaterial({ color: 0x00f0ff });
    const rail = new THREE.Mesh(railGeo, this.railMat);
    rail.position.set(0, 0.04, -0.1);
    this.fpGroup.add(rail);

    // Mira holográfica en el arma
    const scopeFrameGeo = new THREE.BoxGeometry(0.09, 0.08, 0.14);
    const scopeFrame = new THREE.Mesh(scopeFrameGeo, bodyMat);
    scopeFrame.position.set(0, 0.12, -0.05);
    this.fpGroup.add(scopeFrame);

    const holoGlassGeo = new THREE.PlaneGeometry(0.065, 0.055);
    this.holoGlassMat = new THREE.MeshBasicMaterial({
      color: 0x00f0ff,
      transparent: true,
      opacity: 0.45,
      side: THREE.DoubleSide
    });
    const holoGlass = new THREE.Mesh(holoGlassGeo, this.holoGlassMat);
    holoGlass.position.set(0, 0.14, -0.05);
    this.fpGroup.add(holoGlass);

    // Destello de cañón (Muzzle Flash)
    const flashGeo = new THREE.OctahedronGeometry(0.12, 0);
    this.flashMat = new THREE.MeshBasicMaterial({
      color: 0x00f0ff,
      transparent: true,
      opacity: 0.9
    });
    this.muzzleFlash = new THREE.Mesh(flashGeo, this.flashMat);
    this.muzzleFlash.position.set(0, 0.05, -0.58);
    this.muzzleFlash.visible = false;
    this.fpGroup.add(this.muzzleFlash);

    // Posición base en primera persona (abajo a la derecha de la cámara)
    this.basePos = new THREE.Vector3(0.32, -0.27, -0.55);
    this.fpGroup.position.copy(this.basePos);
    this.camera.add(this.fpGroup);
  }

  selectWeapon(index) {
    if (index < 0 || index >= this.weapons.length) return;
    this.currentWeaponIndex = index;
    const w = this.weapons[index];
    this.railMat.color.setHex(w.color);
    this.holoGlassMat.color.setHex(w.color);
    this.flashMat.color.setHex(w.color);
    this.recoilOffset = 0.08; // Pequeña animación de cambio de arma
  }

  getCurrentWeapon() {
    return this.weapons[this.currentWeaponIndex];
  }

  // Disparo del jugador (activado con Barra Espaciadora)
  tryPlayerFire(playerPos, cameraYaw, cameraPitch, aiTargetPos, isOvercharged = false) {
    const w = this.getCurrentWeapon();
    if (this.cooldownTimer > 0) return false;
    if (this.energy < w.energyCost) return false;

    this.cooldownTimer = w.cooldown;
    this.energy = Math.max(0, this.energy - w.energyCost);
    this.recoilOffset = w.id === 1 ? 0.18 : 0.11;
    this.muzzleTimer = 0.055;
    this.muzzleFlash.visible = true;
    this.muzzleFlash.rotation.z = Math.random() * Math.PI;

    // Punto de salida del cañón en coordenadas del mundo
    const muzzleWorldPos = new THREE.Vector3();
    this.muzzleFlash.getWorldPosition(muzzleWorldPos);

    // Dirección frontal de la cámara
    const forward = new THREE.Vector3(0, 0, -1);
    forward.applyEuler(new THREE.Euler(cameraPitch, cameraYaw, 0, 'YXZ'));

    // Asistencia sutil de puntería vertical/horizontal cuando jugamos con flechas
    // Si el enemigo está cerca del ángulo de mira del jugador, alinea suavemente la altura
    if (aiTargetPos) {
      const toAI = new THREE.Vector3().subVectors(aiTargetPos, muzzleWorldPos);
      const dist = toAI.length();
      const dirToAI = toAI.clone().normalize();
      const horizDot =
        (forward.x * dirToAI.x + forward.z * dirToAI.z) /
        (Math.hypot(forward.x, forward.z) * Math.hypot(dirToAI.x, dirToAI.z) || 1);

      // Si el jugador apunta dentro de ~8.5 grados horizontalmente del enemigo, magnetismo suave
      if (horizDot > 0.988 && dist < 65) {
        forward.lerp(dirToAI, 0.42).normalize();
      } else {
        // Ajustar altura para que los disparos vayan al torso del robot enemigo
        forward.y = dirToAI.y * 0.65;
        forward.normalize();
      }
    }

    const damageMultiplier = isOvercharged ? 1.35 : 1.0;
    const shotColor = isOvercharged ? 0xffbe0b : w.color;

    for (let i = 0; i < w.projectiles; i++) {
      const dir = forward.clone();
      if (w.projectiles > 1) {
        const angleOffset = (i - (w.projectiles - 1) / 2) * w.spread;
        dir.applyAxisAngle(new THREE.Vector3(0, 1, 0), angleOffset);
      } else if (w.spread > 0) {
        dir.x += (Math.random() - 0.5) * w.spread;
        dir.z += (Math.random() - 0.5) * w.spread;
        dir.normalize();
      }

      this.spawnProjectile({
        origin: muzzleWorldPos.clone(),
        direction: dir,
        speed: w.speed,
        damage: Math.round(w.damage * damageMultiplier),
        color: shotColor,
        radius: w.radius,
        owner: 'player'
      });
    }

    if (window.soundEngine) {
      window.soundEngine.playPlayerShoot(w.id);
    }

    return true;
  }

  // Disparo del oponente IA
  spawnAIProjectile(origin, direction, speed = 52, damage = 12) {
    this.spawnProjectile({
      origin: origin.clone(),
      direction: direction.clone().normalize(),
      speed,
      damage,
      color: 0xff1e56,
      radius: 0.28,
      owner: 'ai'
    });

    if (window.soundEngine) {
      window.soundEngine.playAIShoot();
    }
  }

  spawnProjectile({ origin, direction, speed, damage, color, radius, owner }) {
    const group = new THREE.Group();
    group.position.copy(origin);

    // Núcleo esférico brillante
    const coreGeo = new THREE.SphereGeometry(radius, 10, 10);
    const coreMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
    const core = new THREE.Mesh(coreGeo, coreMat);
    group.add(core);

    // Estela alargada de plasma
    const trailGeo = new THREE.CylinderGeometry(radius * 0.65, radius * 1.35, 1.5, 8);
    trailGeo.rotateX(Math.PI / 2);
    const trailMat = new THREE.MeshBasicMaterial({
      color,
      transparent: true,
      opacity: 0.85
    });
    const trail = new THREE.Mesh(trailGeo, trailMat);
    group.add(trail);

    // Orientar el proyectil hacia su dirección de avance
    const targetLook = origin.clone().add(direction);
    group.lookAt(targetLook);

    this.scene.add(group);

    this.projectiles.push({
      mesh: group,
      pos: group.position,
      vel: direction.clone().multiplyScalar(speed),
      damage,
      color,
      radius,
      owner,
      life: 2.2
    });
  }

  spawnImpactParticles(position, color = 0x00f0ff, count = 12) {
    for (let i = 0; i < count; i++) {
      const geo = new THREE.BoxGeometry(0.14, 0.14, 0.14);
      const mat = new THREE.MeshBasicMaterial({
        color,
        transparent: true,
        opacity: 1
      });
      const mesh = new THREE.Mesh(geo, mat);
      mesh.position.copy(position);

      const vel = new THREE.Vector3(
        (Math.random() - 0.5) * 14,
        Math.random() * 8 + 1,
        (Math.random() - 0.5) * 14
      );

      this.scene.add(mesh);
      this.particles.push({
        mesh,
        mat,
        vel,
        life: 0.35 + Math.random() * 0.25,
        maxLife: 0.6
      });
    }
  }

  update(dt, isMoving, turnInput, arena, playerState, aiOpponent, onPlayerHit, onAIHit) {
    // Cooldown y regeneración de energía
    if (this.cooldownTimer > 0) {
      this.cooldownTimer = Math.max(0, this.cooldownTimer - dt);
    }
    this.energy = Math.min(this.maxEnergy, this.energy + this.energyRegenRate * dt);

    // Destello del cañón
    if (this.muzzleTimer > 0) {
      this.muzzleTimer -= dt;
      if (this.muzzleTimer <= 0) {
        this.muzzleFlash.visible = false;
      }
    }

    // Animación de balanceo (weapon bob) y retroceso (recoil)
    if (isMoving) {
      this.bobPhase += dt * 10.5;
    } else {
      this.bobPhase += dt * 1.8;
    }

    this.recoilOffset = THREE.MathUtils.lerp(this.recoilOffset, 0, dt * 14);

    const bobX = Math.cos(this.bobPhase) * (isMoving ? 0.018 : 0.004);
    const bobY = Math.abs(Math.sin(this.bobPhase)) * (isMoving ? 0.022 : 0.005);

    this.fpGroup.position.set(
      this.basePos.x + bobX - turnInput * 0.02,
      this.basePos.y - bobY + this.recoilOffset * 0.22,
      this.basePos.z + this.recoilOffset
    );
    this.fpGroup.rotation.x = this.recoilOffset * 0.65;
    this.fpGroup.rotation.z = -turnInput * 0.06;

    // Actualizar proyectiles activos
    for (let i = this.projectiles.length - 1; i >= 0; i--) {
      const p = this.projectiles[i];
      p.life -= dt;
      if (p.life <= 0) {
        this.scene.remove(p.mesh);
        this.projectiles.splice(i, 1);
        continue;
      }

      // Sub-pasos para evitar que proyectiles rápidos atraviesen objetos
      const subSteps = 3;
      const stepDt = dt / subSteps;
      let hit = false;

      for (let s = 0; s < subSteps; s++) {
        p.pos.addScaledVector(p.vel, stepDt);

        // 1. Verificar colisión con muros/pilares de la arena
        if (arena.checkProjectileObstacleHit(p.pos, p.radius * 0.6)) {
          this.spawnImpactParticles(p.pos, p.color, 8);
          hit = true;
          break;
        }

        // 2. Si es disparo del jugador, verificar impacto contra el oponente IA
        if (p.owner === 'player' && aiOpponent && aiOpponent.alive) {
          const dx = p.pos.x - aiOpponent.pos.x;
          const dz = p.pos.z - aiOpponent.pos.z;
          const horizDist = Math.hypot(dx, dz);
          const inHeightRange = p.pos.y >= 0.2 && p.pos.y <= 3.6;

          if (horizDist <= aiOpponent.hitRadius + p.radius && inHeightRange) {
            // ¿Fue impacto crítico en la cabeza/núcleo superior?
            const isCrit = p.pos.y >= 2.15 && p.pos.y <= 3.3;
            const finalDmg = isCrit ? Math.round(p.damage * 1.35) : p.damage;
            this.spawnImpactParticles(p.pos, isCrit ? 0xffbe0b : p.color, isCrit ? 18 : 12);
            if (onAIHit) onAIHit(finalDmg, isCrit);
            hit = true;
            break;
          }
        }

        // 3. Si es disparo de la IA, verificar impacto contra el jugador
        if (p.owner === 'ai' && playerState.alive) {
          const dx = p.pos.x - playerState.pos.x;
          const dz = p.pos.z - playerState.pos.z;
          const horizDist = Math.hypot(dx, dz);

          if (horizDist <= playerState.hitRadius + p.radius) {
            this.spawnImpactParticles(p.pos, 0xff1e56, 12);
            if (onPlayerHit) onPlayerHit(p.damage, p.pos);
            hit = true;
            break;
          }
        }
      }

      if (hit) {
        this.scene.remove(p.mesh);
        this.projectiles.splice(i, 1);
      }
    }

    // Actualizar partículas de explosión/impacto
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const pt = this.particles[i];
      pt.life -= dt;
      if (pt.life <= 0) {
        this.scene.remove(pt.mesh);
        this.particles.splice(i, 1);
        continue;
      }
      pt.mesh.position.addScaledVector(pt.vel, dt);
      pt.vel.y -= 18 * dt; // Gravedad ligera
      pt.mesh.rotation.x += 6 * dt;
      pt.mesh.rotation.y += 6 * dt;
      pt.mat.opacity = Math.max(0, pt.life / pt.maxLife);
    }
  }

  clearAll() {
    this.projectiles.forEach((p) => this.scene.remove(p.mesh));
    this.projectiles = [];
    this.particles.forEach((pt) => this.scene.remove(pt.mesh));
    this.particles = [];
    this.energy = this.maxEnergy;
    this.cooldownTimer = 0;
  }
}

window.WeaponSystem = WeaponSystem;

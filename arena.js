// Construcción de la Arena 3D con Texturas Procedurales, Obstáculos de Cobertura y Potenciadores
class ArenaWorld {
  constructor(scene) {
    this.scene = scene;
    this.halfSize = 38; // Arena de 76x76 unidades
    this.colliders = []; // Cajas AABB { minX, maxX, minZ, maxZ, height, mesh, isPillar }
    this.coverPoints = []; // Puntos estratégicos para la IA
    this.pickups = [];
    this.animatedProps = [];

    this.buildLighting();
    this.buildSkybox();
    this.buildFloor();
    this.buildPerimeterWalls();
    this.buildObstacles();
    this.buildPickups();
  }

  createFloorTexture() {
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 512;
    const ctx = canvas.getContext('2d');

    // Fondo metálico oscuro
    ctx.fillStyle = '#080e1c';
    ctx.fillRect(0, 0, 512, 512);

    // Sub-rejilla fina
    ctx.strokeStyle = 'rgba(0, 240, 255, 0.08)';
    ctx.lineWidth = 2;
    const step = 64;
    for (let i = 0; i <= 512; i += step) {
      ctx.beginPath();
      ctx.moveTo(i, 0);
      ctx.lineTo(i, 512);
      ctx.stroke();

      ctx.beginPath();
      ctx.moveTo(0, i);
      ctx.lineTo(512, i);
      ctx.stroke();
    }

    // Borde principal brillante del mosaico
    ctx.strokeStyle = 'rgba(0, 240, 255, 0.32)';
    ctx.lineWidth = 4;
    ctx.strokeRect(2, 2, 508, 508);

    // Detalles diagonales en esquinas
    ctx.fillStyle = 'rgba(0, 240, 255, 0.18)';
    ctx.fillRect(10, 10, 14, 14);
    ctx.fillRect(488, 10, 14, 14);
    ctx.fillRect(10, 488, 14, 14);
    ctx.fillRect(488, 488, 14, 14);

    const tex = new THREE.CanvasTexture(canvas);
    tex.wrapS = THREE.RepeatWrapping;
    tex.wrapT = THREE.RepeatWrapping;
    tex.repeat.set(16, 16);
    return tex;
  }

  createWallTexture(accentColor = '#00f0ff') {
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 256;
    const ctx = canvas.getContext('2d');

    const grad = ctx.createLinearGradient(0, 0, 0, 256);
    grad.addColorStop(0, '#0a1326');
    grad.addColorStop(0.5, '#11203d');
    grad.addColorStop(1, '#070d19');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 512, 256);

    // Paneles industriales
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.08)';
    ctx.lineWidth = 3;
    for (let x = 0; x < 512; x += 128) {
      ctx.strokeRect(x + 6, 12, 116, 232);
    }

    // Franjas de neón horizontales
    ctx.fillStyle = accentColor;
    ctx.fillRect(0, 24, 512, 6);
    ctx.fillRect(0, 224, 512, 8);

    const tex = new THREE.CanvasTexture(canvas);
    tex.wrapS = THREE.RepeatWrapping;
    tex.wrapT = THREE.ClampToEdgeWrapping;
    tex.repeat.set(6, 1);
    return tex;
  }

  buildLighting() {
    const ambient = new THREE.AmbientLight(0x88b4ff, 0.65);
    this.scene.add(ambient);

    const hemi = new THREE.HemisphereLight(0x00f0ff, 0x090d16, 0.55);
    hemi.position.set(0, 40, 0);
    this.scene.add(hemi);

    const dirLight = new THREE.DirectionalLight(0xffffff, 0.8);
    dirLight.position.set(25, 45, 20);
    this.scene.add(dirLight);

    // Luces puntuales temáticas en las esquinas de la arena
    const cornerColors = [0x00f0ff, 0xff1e56, 0x00f0ff, 0xffbe0b];
    const coords = [
      [-28, 10, -28],
      [28, 10, -28],
      [-28, 10, 28],
      [28, 10, 28]
    ];
    coords.forEach((pos, idx) => {
      const pl = new THREE.PointLight(cornerColors[idx], 1.1, 55);
      pl.position.set(pos[0], pos[1], pos[2]);
      this.scene.add(pl);
    });
  }

  buildSkybox() {
    // Cúpula estelar y anillos orbitales sobre la arena
    const starGeo = new THREE.BufferGeometry();
    const starCount = 700;
    const positions = new Float32Array(starCount * 3);
    for (let i = 0; i < starCount; i++) {
      const r = 110 + Math.random() * 60;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.random() * Math.PI * 0.48;
      positions[i * 3] = r * Math.sin(phi) * Math.cos(theta);
      positions[i * 3 + 1] = Math.abs(r * Math.cos(phi)) + 8;
      positions[i * 3 + 2] = r * Math.sin(phi) * Math.sin(theta);
    }
    starGeo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    const starMat = new THREE.PointsMaterial({
      color: 0x99e6ff,
      size: 1.1,
      transparent: true,
      opacity: 0.85
    });
    const stars = new THREE.Points(starGeo, starMat);
    this.scene.add(stars);

    // Anillo energético superior de la arena
    const ringGeo = new THREE.TorusGeometry(42, 0.45, 12, 64);
    const ringMat = new THREE.MeshBasicMaterial({ color: 0x00f0ff, transparent: true, opacity: 0.45 });
    const skyRing = new THREE.Mesh(ringGeo, ringMat);
    skyRing.rotation.x = Math.PI / 2;
    skyRing.position.y = 26;
    this.scene.add(skyRing);
    this.animatedProps.push({ mesh: skyRing, rotY: 0.25 });
  }

  buildFloor() {
    const floorGeo = new THREE.PlaneGeometry(this.halfSize * 2, this.halfSize * 2);
    const floorMat = new THREE.MeshStandardMaterial({
      map: this.createFloorTexture(),
      roughness: 0.45,
      metalness: 0.5
    });
    const floor = new THREE.Mesh(floorGeo, floorMat);
    floor.rotation.x = -Math.PI / 2;
    this.scene.add(floor);

    // Anillo central luminoso en el suelo
    const centerRingGeo = new THREE.RingGeometry(6.5, 7.2, 48);
    const centerRingMat = new THREE.MeshBasicMaterial({
      color: 0x00f0ff,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.65
    });
    const centerRing = new THREE.Mesh(centerRingGeo, centerRingMat);
    centerRing.rotation.x = -Math.PI / 2;
    centerRing.position.y = 0.03;
    this.scene.add(centerRing);

    // Línea divisoria central entre las zonas de inicio
    const lineGeo = new THREE.PlaneGeometry(this.halfSize * 2, 0.35);
    const lineMat = new THREE.MeshBasicMaterial({
      color: 0xff1e56,
      transparent: true,
      opacity: 0.38,
      side: THREE.DoubleSide
    });
    const centerLine = new THREE.Mesh(lineGeo, lineMat);
    centerLine.rotation.x = -Math.PI / 2;
    centerLine.position.y = 0.02;
    this.scene.add(centerLine);
  }

  buildPerimeterWalls() {
    const wallHeight = 9;
    const wallThickness = 2;
    const span = this.halfSize * 2 + wallThickness;

    const wallMatCyan = new THREE.MeshStandardMaterial({
      map: this.createWallTexture('#00f0ff'),
      roughness: 0.35,
      metalness: 0.6
    });
    const wallMatMagenta = new THREE.MeshStandardMaterial({
      map: this.createWallTexture('#ff1e56'),
      roughness: 0.35,
      metalness: 0.6
    });

    const walls = [
      // Norte (Zona IA)
      { x: 0, z: -this.halfSize - wallThickness / 2, w: span, d: wallThickness, mat: wallMatMagenta },
      // Sur (Zona Jugador)
      { x: 0, z: this.halfSize + wallThickness / 2, w: span, d: wallThickness, mat: wallMatCyan },
      // Oeste
      { x: -this.halfSize - wallThickness / 2, z: 0, w: wallThickness, d: span, mat: wallMatCyan },
      // Este
      { x: this.halfSize + wallThickness / 2, z: 0, w: wallThickness, d: span, mat: wallMatMagenta }
    ];

    walls.forEach((w) => {
      const geo = new THREE.BoxGeometry(w.w, wallHeight, w.d);
      const mesh = new THREE.Mesh(geo, w.mat);
      mesh.position.set(w.x, wallHeight / 2, w.z);
      this.scene.add(mesh);
    });
  }

  buildObstacles() {
    // Estructura de pilares y muros tácticos dentro de la arena
    const obstacleDefs = [
      // 4 Pilares centrales alrededor del anillo central
      { x: -10, z: -10, w: 4.2, h: 6.5, d: 4.2, color: 0x00f0ff },
      { x: 10, z: -10, w: 4.2, h: 6.5, d: 4.2, color: 0xff1e56 },
      { x: -10, z: 10, w: 4.2, h: 6.5, d: 4.2, color: 0x00f0ff },
      { x: 10, z: 10, w: 4.2, h: 6.5, d: 4.2, color: 0xff1e56 },

      // 4 Barreras alargadas en los flancos para cobertura lateral
      { x: -23, z: 0, w: 3.2, h: 4.8, d: 9.0, color: 0x00f59b },
      { x: 23, z: 0, w: 3.2, h: 4.8, d: 9.0, color: 0x00f59b },
      { x: 0, z: -22, w: 9.0, h: 4.5, d: 3.0, color: 0xff1e56 },
      { x: 0, z: 22, w: 9.0, h: 4.5, d: 3.0, color: 0x00f0ff },

      // 4 Columnas exteriores en los cuadrantes
      { x: -22, z: -20, w: 3.8, h: 6.0, d: 3.8, color: 0xffbe0b },
      { x: 22, z: -20, w: 3.8, h: 6.0, d: 3.8, color: 0xffbe0b },
      { x: -22, z: 20, w: 3.8, h: 6.0, d: 3.8, color: 0xffbe0b },
      { x: 22, z: 20, w: 3.8, h: 6.0, d: 3.8, color: 0xffbe0b }
    ];

    obstacleDefs.forEach((def) => {
      const group = new THREE.Group();
      group.position.set(def.x, 0, def.z);

      // Cuerpo principal del bloque
      const bodyGeo = new THREE.BoxGeometry(def.w, def.h, def.d);
      const bodyMat = new THREE.MeshStandardMaterial({
        color: 0x101c35,
        roughness: 0.35,
        metalness: 0.7
      });
      const bodyMesh = new THREE.Mesh(bodyGeo, bodyMat);
      bodyMesh.position.y = def.h / 2;
      group.add(bodyMesh);

      // Anillo de neón luminoso en el pilar
      const trimGeo = new THREE.BoxGeometry(def.w + 0.14, 0.32, def.d + 0.14);
      const trimMat = new THREE.MeshBasicMaterial({ color: def.color });
      const trimTop = new THREE.Mesh(trimGeo, trimMat);
      trimTop.position.y = def.h - 0.6;
      group.add(trimTop);

      const trimBottom = new THREE.Mesh(trimGeo, trimMat);
      trimBottom.position.y = 0.6;
      group.add(trimBottom);

      this.scene.add(group);

      const halfW = def.w / 2;
      const halfD = def.d / 2;
      this.colliders.push({
        minX: def.x - halfW,
        maxX: def.x + halfW,
        minZ: def.z - halfD,
        maxZ: def.z + halfD,
        centerX: def.x,
        centerZ: def.z,
        w: def.w,
        d: def.d,
        height: def.h,
        mesh: bodyMesh
      });

      // Generar nodos tácticos alrededor del obstáculo para la IA
      const offset = Math.max(halfW, halfD) + 3.2;
      this.coverPoints.push(
        new THREE.Vector3(def.x + offset, 0, def.z),
        new THREE.Vector3(def.x - offset, 0, def.z),
        new THREE.Vector3(def.x, 0, def.z + offset),
        new THREE.Vector3(def.x, 0, def.z - offset)
      );
    });
  }

  buildPickups() {
    const pickupDefs = [
      { x: -16, z: 0, type: 'health' },
      { x: 16, z: 0, type: 'health' },
      { x: -30, z: -10, type: 'overcharge' },
      { x: 30, z: 10, type: 'overcharge' }
    ];

    pickupDefs.forEach((def) => {
      const group = new THREE.Group();
      group.position.set(def.x, 0, def.z);

      // Pedestal en el suelo
      const padGeo = new THREE.CylinderGeometry(1.4, 1.7, 0.25, 24);
      const isHealth = def.type === 'health';
      const mainColor = isHealth ? 0x00f59b : 0xffbe0b;

      const padMat = new THREE.MeshStandardMaterial({
        color: 0x122238,
        emissive: mainColor,
        emissiveIntensity: 0.35
      });
      const pad = new THREE.Mesh(padGeo, padMat);
      pad.position.y = 0.125;
      group.add(pad);

      // Cristal / Icono flotante
      const itemGroup = new THREE.Group();
      itemGroup.position.y = 1.6;

      const coreGeo = isHealth
        ? new THREE.OctahedronGeometry(0.75, 0)
        : new THREE.IcosahedronGeometry(0.75, 0);
      const coreMat = new THREE.MeshStandardMaterial({
        color: mainColor,
        emissive: mainColor,
        emissiveIntensity: 0.75,
        roughness: 0.2,
        metalness: 0.3
      });
      const coreMesh = new THREE.Mesh(coreGeo, coreMat);
      itemGroup.add(coreMesh);

      const haloGeo = new THREE.TorusGeometry(1.05, 0.06, 8, 28);
      const haloMat = new THREE.MeshBasicMaterial({ color: mainColor });
      const haloMesh = new THREE.Mesh(haloGeo, haloMat);
      itemGroup.add(haloMesh);

      group.add(itemGroup);
      this.scene.add(group);

      this.pickups.push({
        type: def.type,
        x: def.x,
        z: def.z,
        active: true,
        respawnTimer: 0,
        respawnDuration: 14, // Segundos para reaparecer
        itemGroup,
        padMat
      });
    });
  }

  update(dt, elapsedTime) {
    // Animar anillos del cielo
    this.animatedProps.forEach((prop) => {
      if (prop.rotY) prop.mesh.rotation.z += prop.rotY * dt;
    });

    // Animar pickups y gestionar su reaparición
    this.pickups.forEach((p) => {
      if (!p.active) {
        p.respawnTimer -= dt;
        if (p.respawnTimer <= 0) {
          p.active = true;
          p.itemGroup.visible = true;
          p.padMat.emissiveIntensity = 0.35;
        }
      } else {
        p.itemGroup.rotation.y += dt * 2.2;
        p.itemGroup.position.y = 1.55 + Math.sin(elapsedTime * 3.5 + p.x) * 0.22;
      }
    });
  }

  resetPickups() {
    this.pickups.forEach((p) => {
      p.active = true;
      p.respawnTimer = 0;
      p.itemGroup.visible = true;
      p.padMat.emissiveIntensity = 0.35;
    });
  }

  // Resuelve colisiones circulares con los límites de la arena y los pilares (con deslizamiento suave)
  resolveCircleCollision(pos, radius = 1.15) {
    const limit = this.halfSize - radius;
    if (pos.x < -limit) pos.x = -limit;
    if (pos.x > limit) pos.x = limit;
    if (pos.z < -limit) pos.z = -limit;
    if (pos.z > limit) pos.z = limit;

    for (let i = 0; i < this.colliders.length; i++) {
      const box = this.colliders[i];
      const closestX = Math.max(box.minX, Math.min(pos.x, box.maxX));
      const closestZ = Math.max(box.minZ, Math.min(pos.z, box.maxZ));

      const dx = pos.x - closestX;
      const dz = pos.z - closestZ;
      const distSq = dx * dx + dz * dz;

      if (distSq < radius * radius) {
        const dist = Math.sqrt(distSq);
        if (dist > 0.0001) {
          const overlap = radius - dist;
          pos.x += (dx / dist) * overlap;
          pos.z += (dz / dist) * overlap;
        } else {
          // En caso de penetración exacta en el centro, empujar hacia el borde más cercano
          const leftPen = Math.abs(pos.x - box.minX);
          const rightPen = Math.abs(box.maxX - pos.x);
          const topPen = Math.abs(pos.z - box.minZ);
          const botPen = Math.abs(box.maxZ - pos.z);
          const minPen = Math.min(leftPen, rightPen, topPen, botPen);
          if (minPen === leftPen) pos.x = box.minX - radius;
          else if (minPen === rightPen) pos.x = box.maxX + radius;
          else if (minPen === topPen) pos.z = box.minZ - radius;
          else pos.z = box.maxZ + radius;
        }
      }
    }
  }

  // Comprueba si un punto 3D impacta algún muro o pilar
  checkProjectileObstacleHit(point, radius = 0.25) {
    if (
      Math.abs(point.x) >= this.halfSize - radius ||
      Math.abs(point.z) >= this.halfSize - radius ||
      point.y <= 0.05
    ) {
      return true;
    }

    for (let i = 0; i < this.colliders.length; i++) {
      const b = this.colliders[i];
      if (
        point.y <= b.height &&
        point.x >= b.minX - radius &&
        point.x <= b.maxX + radius &&
        point.z >= b.minZ - radius &&
        point.z <= b.maxZ + radius
      ) {
        return true;
      }
    }
    return false;
  }

  // Verifica si existe línea de visión limpia entre dos posiciones 2D/3D (para la IA y asistencia)
  hasLineOfSight(posA, posB) {
    const steps = 22;
    for (let i = 1; i < steps; i++) {
      const t = i / steps;
      const x = posA.x + (posB.x - posA.x) * t;
      const z = posA.z + (posB.z - posA.z) * t;

      for (let j = 0; j < this.colliders.length; j++) {
        const b = this.colliders[j];
        if (x >= b.minX && x <= b.maxX && z >= b.minZ && z <= b.maxZ) {
          return false;
        }
      }
    }
    return true;
  }
}

window.ArenaWorld = ArenaWorld;

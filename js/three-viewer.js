/**
 * three-viewer.js
 * ---------------
 * Interactive 3D Digital Twin & CAD Viewer for LoRa-OptiMesh Hardware Showcase.
 * Built with Three.js (r128) & OrbitControls.
 *
 * Features:
 * - Procedural 4-Tier CAD Assembly:
 *     Tier 1: Transparent Polycarbonate Lid, 0.96" SSD1306 OLED, Status LED, Buzzer, Sub-GHz Stubby Antenna
 *     Tier 2: FR-4 PCB, ESP32-S3 Dual-Core SoC, Semtech SX1276 / Ra-02 LoRa, PSRAM, Flash, Type-C ports
 *     Tier 3: Power Subsystem, 3.2V 3200 mAh LiFePO4 Cell, Low-Iq LDO Regulator
 *     Tier 4: Anodized Aluminium Baseplate, 4x Neodymium Disc Magnets, Flange Clamps
 *     Probes: 4x Stainless Steel SS316 1-Wire DS18B20 Temperature Probes
 * - Dynamic 0.96" OLED Canvas Texture reflecting real-time telemetry from Digital Twin
 * - Smooth Exploded CAD View animation
 * - Camera presets (ISO, Top, Front, PCB Macro)
 * - Wireframe & Auto-Rotate modes
 * - Custom GLTF/GLB drag-and-drop loader
 */

class LoRaOptiMeshViewer {
  constructor(containerId) {
    this.container = document.getElementById(containerId);
    if (!this.container) return;

    this.scene = null;
    this.camera = null;
    this.renderer = null;
    this.controls = null;

    // Component Groups
    this.mainGroup = null;
    this.tier1_Lid = null;
    this.tier2_PCB = null;
    this.tier3_Battery = null;
    this.tier4_Base = null;
    this.sensorProbes = null;

    // Exploded View State
    this.isExploded = false;
    this.explodedProgress = 0; // 0 (assembled) to 1 (fully exploded)
    this.targetExploded = 0;
    this.isWireframe = false;
    this.isAutoRotate = true;

    // OLED Screen Texture & Canvas
    this.oledCanvas = document.createElement('canvas');
    this.oledCanvas.width = 256;
    this.oledCanvas.height = 128;
    this.oledCtx = this.oledCanvas.getContext('2d');
    this.oledTexture = null;

    // Status LED mesh reference
    this.statusLedMesh = null;
    this.statusLedLight = null;

    this.init();
  }

  init() {
    const width = this.container.clientWidth || 800;
    const height = this.container.clientHeight || 500;

    // 1. Scene
    this.scene = new THREE.Scene();

    // 2. Camera
    this.camera = new THREE.PerspectiveCamera(40, width / height, 0.1, 100);
    this.camera.position.set(4.5, 3.8, 5.2);

    // 3. Renderer with Tone Mapping & Soft Shadows
    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    this.renderer.setSize(width, height);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.15;
    this.container.appendChild(this.renderer.domElement);

    // 4. Orbit Controls
    this.controls = new THREE.OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.05;
    this.controls.maxDistance = 14;
    this.controls.minDistance = 2.0;
    this.controls.maxPolarAngle = Math.PI / 2 + 0.1;
    this.controls.target.set(0, 0, 0);
    this.controls.autoRotate = this.isAutoRotate;
    this.controls.autoRotateSpeed = 1.0;

    // 5. Lighting Setup
    this.setupLighting();

    // 6. Build 3D Hardware Model
    this.buildOptiMeshModel();

    // 7. Ground Shadow Plane
    this.buildShadowPlane();

    // 8. Event Listeners
    window.addEventListener('resize', () => this.onWindowResize());

    // 9. Initial OLED Screen Texture
    this.updateOledScreen({
      lmtd: 50.0,
      u: 482.1,
      rf: 0.00052,
      fuel: 83.8,
      isAlert: true
    });

    // 10. Animation Loop
    this.animate();
  }

  setupLighting() {
    // Ambient Light
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.85);
    this.scene.add(ambientLight);

    // Hemisphere Light for subtle sky/ground gradients
    const hemiLight = new THREE.HemisphereLight(0x67e8f9, 0x0f172a, 0.5);
    hemiLight.position.set(0, 10, 0);
    this.scene.add(hemiLight);

    // Key Light (Main soft directional light from top-right)
    const keyLight = new THREE.DirectionalLight(0xffffff, 1.3);
    keyLight.position.set(6, 9, 6);
    keyLight.castShadow = true;
    keyLight.shadow.mapSize.width = 2048;
    keyLight.shadow.mapSize.height = 2048;
    keyLight.shadow.camera.near = 1;
    keyLight.shadow.camera.far = 25;
    keyLight.shadow.bias = -0.0005;
    keyLight.shadow.radius = 2.5;
    this.scene.add(keyLight);

    // Cyan Accent Fill Light
    const cyanLight = new THREE.DirectionalLight(0x00f0ff, 0.8);
    cyanLight.position.set(-6, 3, -4);
    this.scene.add(cyanLight);

    // Purple/Violet Rim Light from behind for crisp edge separation
    const rimLight = new THREE.DirectionalLight(0x8b5cf6, 0.5);
    rimLight.position.set(0, -2, -6);
    this.scene.add(rimLight);
  }

  buildShadowPlane() {
    const shadowGeo = new THREE.PlaneGeometry(12, 12);
    const shadowMat = new THREE.ShadowMaterial({ opacity: 0.35 });
    const shadowMesh = new THREE.Mesh(shadowGeo, shadowMat);
    shadowMesh.rotation.x = -Math.PI / 2;
    shadowMesh.position.y = -1.45;
    shadowMesh.receiveShadow = true;
    this.scene.add(shadowMesh);
  }

  buildOptiMeshModel() {
    this.mainGroup = new THREE.Group();

    // ==========================================
    // High-Tech Industrial Materials Palette
    // ==========================================
    const polyCarbonateMat = new THREE.MeshPhysicalMaterial({
      color: 0x1e293b,
      metalness: 0.1,
      roughness: 0.2,
      transmission: 0.75,
      opacity: 0.88,
      transparent: true,
      ior: 1.5,
      reflectivity: 0.85
    });

    const pcbMat = new THREE.MeshStandardMaterial({
      color: 0x064e3b, // Dark industrial emerald FR-4 PCB
      metalness: 0.25,
      roughness: 0.45
    });

    const chipMetalMat = new THREE.MeshStandardMaterial({
      color: 0xe2e8f0,
      metalness: 0.9,
      roughness: 0.2
    });

    const goldPinMat = new THREE.MeshStandardMaterial({
      color: 0xf59e0b,
      metalness: 0.88,
      roughness: 0.25
    });

    const baseAnodizedMat = new THREE.MeshStandardMaterial({
      color: 0x0f172a, // Deep charcoal anodized aluminium
      metalness: 0.7,
      roughness: 0.35
    });

    const magnetChromeMat = new THREE.MeshStandardMaterial({
      color: 0xf8fafc,
      metalness: 0.95,
      roughness: 0.1
    });

    const batteryCyanMat = new THREE.MeshStandardMaterial({
      color: 0x0284c7, // Industrial cobalt / LiFePO4 wrap
      metalness: 0.3,
      roughness: 0.35
    });

    const steelProbeMat = new THREE.MeshStandardMaterial({
      color: 0xf1f5f9,
      metalness: 0.95,
      roughness: 0.15
    });

    // ==========================================
    // TIER 1: Top Polycarbonate Lid & OLED Display
    // ==========================================
    this.tier1_Lid = new THREE.Group();

    // Main Lid Enclosure Box
    const lidGeo = new THREE.BoxGeometry(2.4, 0.45, 1.8);
    const lidMesh = new THREE.Mesh(lidGeo, polyCarbonateMat);
    lidMesh.castShadow = true;
    this.tier1_Lid.add(lidMesh);

    // OLED Screen Surface with Dynamic Canvas Texture
    this.oledTexture = new THREE.CanvasTexture(this.oledCanvas);
    const oledGeo = new THREE.PlaneGeometry(1.15, 0.62);
    const oledMat = new THREE.MeshBasicMaterial({
      map: this.oledTexture,
      toneMapped: false
    });
    const oledMesh = new THREE.Mesh(oledGeo, oledMat);
    oledMesh.rotation.x = -Math.PI / 2;
    oledMesh.position.set(-0.35, 0.23, 0);
    this.tier1_Lid.add(oledMesh);

    // OLED Bezel Frame
    const bezelGeo = new THREE.BoxGeometry(1.22, 0.04, 0.7);
    const bezelMat = new THREE.MeshStandardMaterial({ color: 0x020617, roughness: 0.8 });
    const bezelMesh = new THREE.Mesh(bezelGeo, bezelMat);
    bezelMesh.position.set(-0.35, 0.22, 0);
    this.tier1_Lid.add(bezelMesh);

    // Status LED (Dual-color indicator)
    const ledGeo = new THREE.SphereGeometry(0.065, 16, 16);
    const ledMat = new THREE.MeshBasicMaterial({ color: 0x10b981 });
    this.statusLedMesh = new THREE.Mesh(ledGeo, ledMat);
    this.statusLedMesh.position.set(0.65, 0.23, -0.4);
    this.tier1_Lid.add(this.statusLedMesh);

    // Piezo Buzzer Module (Audible alert disk)
    const buzzerGeo = new THREE.CylinderGeometry(0.18, 0.18, 0.1, 24);
    const buzzerMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, metalness: 0.3 });
    const buzzerMesh = new THREE.Mesh(buzzerGeo, buzzerMat);
    buzzerMesh.position.set(0.65, 0.24, 0.3);
    this.tier1_Lid.add(buzzerMesh);

    // 923 MHz Sub-GHz Stubby SMA Antenna
    const antBaseGeo = new THREE.CylinderGeometry(0.11, 0.13, 0.2, 16);
    const antBaseMesh = new THREE.Mesh(antBaseGeo, goldPinMat);
    antBaseMesh.position.set(0.9, 0.3, -0.6);
    this.tier1_Lid.add(antBaseMesh);

    const antWhipGeo = new THREE.CylinderGeometry(0.07, 0.08, 1.25, 16);
    const antWhipMat = new THREE.MeshStandardMaterial({ color: 0x111827, roughness: 0.5 });
    const antWhipMesh = new THREE.Mesh(antWhipGeo, antWhipMat);
    antWhipMesh.position.set(0.9, 0.95, -0.6);
    this.tier1_Lid.add(antWhipMesh);

    // 4 Corner Enclosure Screws (IP67 Fasteners)
    const screwGeo = new THREE.CylinderGeometry(0.055, 0.055, 0.05, 12);
    [
      [-1.05, -0.75], [1.05, -0.75],
      [-1.05, 0.75], [1.05, 0.75]
    ].forEach(([x, z]) => {
      const screw = new THREE.Mesh(screwGeo, chipMetalMat);
      screw.position.set(x, 0.23, z);
      this.tier1_Lid.add(screw);
    });

    this.tier1_Lid.position.y = 0.55;
    this.mainGroup.add(this.tier1_Lid);

    // ==========================================
    // TIER 2: ESP32-S3 & LoRa SX1276 PCB Board
    // ==========================================
    this.tier2_PCB = new THREE.Group();

    const pcbBoardGeo = new THREE.BoxGeometry(2.2, 0.06, 1.6);
    const pcbBoardMesh = new THREE.Mesh(pcbBoardGeo, pcbMat);
    pcbBoardMesh.castShadow = true;
    this.tier2_PCB.add(pcbBoardMesh);

    // ESP32-S3 Microcontroller with Metal RF Shield
    const espShieldGeo = new THREE.BoxGeometry(0.7, 0.12, 0.6);
    const espShieldMesh = new THREE.Mesh(espShieldGeo, chipMetalMat);
    espShieldMesh.position.set(-0.5, 0.08, 0);
    this.tier2_PCB.add(espShieldMesh);

    // Semtech SX1276 / Ai-Thinker Ra-02 LoRa Module
    const loraShieldGeo = new THREE.BoxGeometry(0.55, 0.1, 0.5);
    const loraShieldMesh = new THREE.Mesh(loraShieldGeo, chipMetalMat);
    loraShieldMesh.position.set(0.4, 0.07, -0.3);
    this.tier2_PCB.add(loraShieldMesh);

    // Brass antenna standoff rod (matching physical hardware)
    const loraAntRodGeo = new THREE.CylinderGeometry(0.04, 0.04, 0.8, 12);
    const loraAntRodMesh = new THREE.Mesh(loraAntRodGeo, goldPinMat);
    loraAntRodMesh.position.set(0.62, 0.45, -0.45);
    this.tier2_PCB.add(loraAntRodMesh);

    // Dual Type-C USB Ports
    const usbGeo = new THREE.BoxGeometry(0.18, 0.08, 0.22);
    const usbMat = new THREE.MeshStandardMaterial({ color: 0x94a3b8, metalness: 0.9 });
    const usb1 = new THREE.Mesh(usbGeo, usbMat);
    usb1.position.set(-0.95, 0.06, -0.3);
    const usb2 = new THREE.Mesh(usbGeo, usbMat);
    usb2.position.set(-0.95, 0.06, 0.3);
    this.tier2_PCB.add(usb1);
    this.tier2_PCB.add(usb2);

    // Potentiometer simulation knob (RV1 10k from physical hardware)
    const potBaseGeo = new THREE.CylinderGeometry(0.12, 0.12, 0.14, 16);
    const potBaseMat = new THREE.MeshStandardMaterial({ color: 0x16a34a, metalness: 0.2 });
    const potMesh = new THREE.Mesh(potBaseGeo, potBaseMat);
    potMesh.position.set(0.7, 0.1, 0.4);
    this.tier2_PCB.add(potMesh);

    // Terminal Connector Block for DS18B20 1-Wire
    const termGeo = new THREE.BoxGeometry(0.28, 0.18, 0.5);
    const termMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, metalness: 0.2 });
    const termMesh = new THREE.Mesh(termGeo, termMat);
    termMesh.position.set(0.0, 0.1, 0.5);
    this.tier2_PCB.add(termMesh);

    this.tier2_PCB.position.y = 0.18;
    this.mainGroup.add(this.tier2_PCB);

    // ==========================================
    // TIER 3: LiFePO4 Battery & BMS Power Layer
    // ==========================================
    this.tier3_Battery = new THREE.Group();

    // 3200 mAh LiFePO4 Cell (26650 cylindrical form factor)
    const batGeo = new THREE.CylinderGeometry(0.35, 0.35, 1.6, 24);
    batGeo.rotateZ(Math.PI / 2);
    const batMesh = new THREE.Mesh(batGeo, batteryCyanMat);
    batMesh.castShadow = true;
    batMesh.position.set(0, 0, 0);
    this.tier3_Battery.add(batMesh);

    // Battery Positive Terminal Cap
    const capGeo = new THREE.CylinderGeometry(0.15, 0.15, 0.1, 16);
    capGeo.rotateZ(Math.PI / 2);
    const posCap = new THREE.Mesh(capGeo, chipMetalMat);
    posCap.position.set(0.85, 0, 0);
    this.tier3_Battery.add(posCap);

    // LDO Ultra-low Quiescent Regulator IC (< 25 uA)
    const ldoGeo = new THREE.BoxGeometry(0.25, 0.1, 0.25);
    const ldoMat = new THREE.MeshStandardMaterial({ color: 0x020617 });
    const ldoMesh = new THREE.Mesh(ldoGeo, ldoMat);
    ldoMesh.position.set(-0.6, 0.22, 0.4);
    this.tier3_Battery.add(ldoMesh);

    this.tier3_Battery.position.y = -0.22;
    this.mainGroup.add(this.tier3_Battery);

    // ==========================================
    // TIER 4: Baseplate & Neodymium Clamp-On Mount
    // ==========================================
    this.tier4_Base = new THREE.Group();

    const baseGeo = new THREE.BoxGeometry(2.5, 0.25, 1.9);
    const baseMesh = new THREE.Mesh(baseGeo, baseAnodizedMat);
    baseMesh.castShadow = true;
    baseMesh.receiveShadow = true;
    this.tier4_Base.add(baseMesh);

    // 4 Corner Neodymium Disc Magnets for pipe flange mounting
    const magnetGeo = new THREE.CylinderGeometry(0.22, 0.22, 0.12, 20);
    [
      [-0.8, -0.6], [0.8, -0.6],
      [-0.8, 0.6], [0.8, 0.6]
    ].forEach(([x, z]) => {
      const magnet = new THREE.Mesh(magnetGeo, magnetChromeMat);
      magnet.position.set(x, -0.16, z);
      magnet.castShadow = true;
      this.tier4_Base.add(magnet);
    });

    // Flange Clamp Wings
    const bracketGeo = new THREE.BoxGeometry(0.22, 0.35, 0.55);
    const bracketMat = new THREE.MeshStandardMaterial({ color: 0x334155, metalness: 0.8 });
    const bLeft = new THREE.Mesh(bracketGeo, bracketMat);
    bLeft.position.set(-1.3, 0, 0);
    const bRight = new THREE.Mesh(bracketGeo, bracketMat);
    bRight.position.set(1.3, 0, 0);
    this.tier4_Base.add(bLeft);
    this.tier4_Base.add(bRight);

    this.tier4_Base.position.y = -0.65;
    this.mainGroup.add(this.tier4_Base);

    // ==========================================
    // Sensor Probes: 4x SS316 Thermowells
    // ==========================================
    this.sensorProbes = new THREE.Group();
    const probeGeo = new THREE.CylinderGeometry(0.055, 0.055, 0.95, 16);

    const probeConfigs = [
      { label: 'Th,in', angle: -0.7, r: 2.2 },
      { label: 'Th,out', angle: -0.2, r: 2.5 },
      { label: 'Tc,in', angle: 0.3, r: 2.5 },
      { label: 'Tc,out', angle: 0.8, r: 2.2 }
    ];

    probeConfigs.forEach((cfg) => {
      const probeMesh = new THREE.Mesh(probeGeo, steelProbeMat);
      probeMesh.position.set(Math.cos(cfg.angle) * cfg.r, -0.85, Math.sin(cfg.angle) * cfg.r);
      probeMesh.rotation.x = Math.PI / 4;
      probeMesh.castShadow = true;
      this.sensorProbes.add(probeMesh);
    });

    this.mainGroup.add(this.sensorProbes);

    // Add Main Assembly to Three Scene
    this.scene.add(this.mainGroup);
  }

  updateOledScreen(data) {
    const ctx = this.oledCtx;
    const w = this.oledCanvas.width;
    const h = this.oledCanvas.height;

    // Dark high-contrast OLED background
    ctx.fillStyle = '#020617';
    ctx.fillRect(0, 0, w, h);

    // Top Status Header Bar
    ctx.fillStyle = data.isAlert ? '#f43f5e' : '#00f0ff';
    ctx.fillRect(0, 0, w, 22);

    ctx.fillStyle = '#020617';
    ctx.font = 'bold 11px monospace';
    ctx.fillText('LoRa-OptiMesh  AS923', 8, 15);
    ctx.fillText(data.isAlert ? 'CRITICAL' : 'OPTIMAL', 188, 15);

    // Live Readout Text
    ctx.fillStyle = '#00f0ff';
    ctx.font = '13px monospace';
    ctx.fillText(`LMTD: ${data.lmtd.toFixed(1)}°C`, 10, 44);
    ctx.fillText(`U:    ${data.u.toFixed(1)} W/m²K`, 10, 64);

    // Fouling Rf & Fuel Penalty
    if (data.isAlert) {
      ctx.fillStyle = '#f43f5e';
      ctx.fillText(`Rf:   ${data.rf.toFixed(5)}!`, 10, 84);
      ctx.fillStyle = '#fbbf24';
      ctx.fillText(`Fuel: +${data.fuel.toFixed(1)} Nm³/h`, 10, 104);
    } else {
      ctx.fillStyle = '#10b981';
      ctx.fillText(`Rf:   ${data.rf.toFixed(5)} OK`, 10, 84);
      ctx.fillStyle = '#94a3b8';
      ctx.fillText(`Fuel: 0.00 Nm³/h`, 10, 104);
    }

    // Border Frame
    ctx.strokeStyle = data.isAlert ? '#f43f5e' : '#00f0ff';
    ctx.lineWidth = 2;
    ctx.strokeRect(1, 1, w - 2, h - 2);

    if (this.oledTexture) {
      this.oledTexture.needsUpdate = true;
    }

    // Update physical LED indicator
    if (this.statusLedMesh) {
      this.statusLedMesh.material.color.setHex(data.isAlert ? 0xf43f5e : 0x10b981);
    }
  }

  setExploded(isExploded) {
    this.isExploded = isExploded;
    this.targetExploded = isExploded ? 1.0 : 0.0;
  }

  setWireframe(isWireframe) {
    this.isWireframe = isWireframe;
    if (this.mainGroup) {
      this.mainGroup.traverse((child) => {
        if (child.isMesh && child.material && child.material !== this.oledTexture) {
          child.material.wireframe = isWireframe;
        }
      });
    }
  }

  setAutoRotate(enable) {
    this.isAutoRotate = enable;
    this.controls.autoRotate = enable;
    this.controls.autoRotateSpeed = 1.0;
  }

  setCameraPreset(preset) {
    const duration = 650;
    let targetPos = new THREE.Vector3(4.5, 3.8, 5.2);
    let targetLook = new THREE.Vector3(0, 0, 0);

    switch (preset) {
      case 'iso':
        targetPos.set(4.5, 3.8, 5.2);
        targetLook.set(0, 0, 0);
        this.setExploded(false);
        break;
      case 'top':
        targetPos.set(0, 6.8, 0.01);
        targetLook.set(0, 0, 0);
        this.setExploded(false);
        break;
      case 'front':
        targetPos.set(0, 0.4, 5.8);
        targetLook.set(0, 0, 0);
        this.setExploded(false);
        break;
      case 'pcb':
        targetPos.set(1.2, 2.2, 2.0);
        targetLook.set(0, 0.1, 0);
        this.setExploded(true);
        break;
    }

    const startPos = this.camera.position.clone();
    const startLook = this.controls.target.clone();
    const startTime = performance.now();

    const animateCam = (time) => {
      const elapsed = time - startTime;
      const progress = Math.min(elapsed / duration, 1.0);
      const ease = 1 - Math.pow(1 - progress, 3); // Cubic ease out

      this.camera.position.lerpVectors(startPos, targetPos, ease);
      this.controls.target.lerpVectors(startLook, targetLook, ease);
      this.controls.update();

      if (progress < 1.0) {
        requestAnimationFrame(animateCam);
      }
    };
    requestAnimationFrame(animateCam);
  }

  loadCustomModel(file) {
    const reader = new FileReader();
    reader.onload = (e) => {
      const contents = e.target.result;
      const loader = new THREE.GLTFLoader();

      loader.parse(contents, '', (gltf) => {
        if (this.mainGroup) {
          this.scene.remove(this.mainGroup);
        }

        const customModel = gltf.scene;

        const box = new THREE.Box3().setFromObject(customModel);
        const center = box.getCenter(new THREE.Vector3());
        const size = box.getSize(new THREE.Vector3());

        const maxDim = Math.max(size.x, size.y, size.z);
        const scale = 3.2 / (maxDim || 1);
        customModel.scale.set(scale, scale, scale);
        customModel.position.sub(center.multiplyScalar(scale));

        customModel.traverse((child) => {
          if (child.isMesh) {
            child.castShadow = true;
            child.receiveShadow = true;
          }
        });

        this.mainGroup = customModel;
        this.scene.add(this.mainGroup);

        alert('Model 3D (.glb / .gltf) berhasil diunggah dan dimuat ke dalam kanvas!');
      }, (error) => {
        console.error('Error loading 3D model:', error);
        alert('Gagal memuat berkas 3D. Pastikan format berkas adalah .glb atau .gltf yang valid.');
      });
    };

    reader.readAsArrayBuffer(file);
  }

  onWindowResize() {
    if (!this.container || !this.renderer) return;
    const width = this.container.clientWidth;
    const height = this.container.clientHeight;

    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(width, height);
  }

  animate() {
    requestAnimationFrame(() => this.animate());

    // Exploded View Smooth Interpolation
    if (Math.abs(this.explodedProgress - this.targetExploded) > 0.005) {
      this.explodedProgress += (this.targetExploded - this.explodedProgress) * 0.08;

      if (this.tier1_Lid && this.tier2_PCB && this.tier3_Battery && this.tier4_Base) {
        this.tier1_Lid.position.y = 0.55 + this.explodedProgress * 1.45;
        this.tier2_PCB.position.y = 0.18 + this.explodedProgress * 0.55;
        this.tier3_Battery.position.y = -0.22 - this.explodedProgress * 0.45;
        this.tier4_Base.position.y = -0.65 - this.explodedProgress * 1.15;
        if (this.sensorProbes) {
          this.sensorProbes.position.y = -this.explodedProgress * 0.8;
        }
      }
    }

    this.controls.update();
    this.renderer.render(this.scene, this.camera);
  }
}

window.LoRaOptiMeshViewer = LoRaOptiMeshViewer;

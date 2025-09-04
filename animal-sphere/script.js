/* global THREE */
(() => {
  const container = document.getElementById("scene");
  const tooltip = document.createElement("div");
  tooltip.className = "tooltip";
  document.body.appendChild(tooltip);

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(55, window.innerWidth / window.innerHeight, 0.1, 2000);
  camera.position.set(0, 0, 18);

  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setSize(window.innerWidth, window.innerHeight);
  container.appendChild(renderer.domElement);
  renderer.sortObjects = true;

  const ambient = new THREE.AmbientLight(0xffffff, 0.9);
  scene.add(ambient);

  // Soft auto-rotate group like Apple Watch grid feel
  const globe = new THREE.Group();
  scene.add(globe);

  // Subtle wireframe sphere backdrop
  const wireGeom = new THREE.SphereGeometry(9.5, 32, 32);
  const wireMat = new THREE.MeshBasicMaterial({ color: 0x1b2a58, wireframe: true, transparent: true, opacity: 0.25 });
  const wireSphere = new THREE.Mesh(wireGeom, wireMat);
  scene.add(wireSphere);

  const raycaster = new THREE.Raycaster();
  const mouse = new THREE.Vector2();
  let hovered = null;

  const spriteSize = 2.0;
  const radius = 9;
  let sprites = [];
  let animalData = [];

  fetch("animals.json").then(r => r.json()).then(data => {
    animalData = data;
    createSprites(data);
  });

  function createSprites(data){
    const loader = new THREE.TextureLoader();
    if (typeof loader.setCrossOrigin === "function"){
      loader.setCrossOrigin("anonymous");
    }
    const goldSpiral = (i, n) => {
      const phi = Math.acos(1 - 2 * (i + 0.5) / n);
      const theta = Math.PI * (1 + Math.sqrt(5)) * (i + 0.5);
      return { phi, theta };
    };
    sprites = data.map((animal, i) => {
      const tex = loader.load(animal.image, undefined, undefined, () => {});
      tex.colorSpace = THREE.SRGBColorSpace;
      const mat = new THREE.SpriteMaterial({ map: tex, transparent: true, depthTest: false, depthWrite: false });
      const sp = new THREE.Sprite(mat);
      sp.scale.set(spriteSize, spriteSize, 1);
      const { phi, theta } = goldSpiral(i, data.length);
      const pos = new THREE.Vector3().setFromSphericalCoords(radius, phi, theta);
      sp.position.copy(pos);
      sp.userData = { idx: i, name: animal.name };
      globe.add(sp);
      return sp;
    });
  }

  // Slow auto-rotate
  let autoRotate = 0.0035;

  function animate(){
    requestAnimationFrame(animate);
    globe.rotation.y += autoRotate;
    renderer.render(scene, camera);
  }
  animate();

  // Drag controls for rotating the globe
  const drag = { active: false, startX: 0, startY: 0, prevX: 0, prevY: 0, moved: false };
  const rotateSpeed = 0.0055;
  const clamp = (v, min, max) => Math.min(Math.max(v, min), max);

  const onPointerDown = (e) => {
    drag.active = true;
    drag.moved = false;
    drag.startX = e.clientX;
    drag.startY = e.clientY;
    drag.prevX = e.clientX;
    drag.prevY = e.clientY;
    autoRotate = 0; // pause autorotate while dragging
  };
  const onPointerMove = (e) => {
    if (!drag.active) return;
    const dx = e.clientX - drag.prevX;
    const dy = e.clientY - drag.prevY;
    if (Math.abs(e.clientX - drag.startX) > 2 || Math.abs(e.clientY - drag.startY) > 2){
      drag.moved = true;
    }
    globe.rotation.y += dx * rotateSpeed;
    globe.rotation.x = clamp(globe.rotation.x + dy * rotateSpeed, -Math.PI * 0.48, Math.PI * 0.48);
    drag.prevX = e.clientX;
    drag.prevY = e.clientY;
  };
  const onPointerUp = () => {
    drag.active = false;
    autoRotate = 0.0035; // resume gentle autorotate
  };
  renderer.domElement.addEventListener("pointerdown", onPointerDown);
  window.addEventListener("pointermove", onPointerMove);
  window.addEventListener("pointerup", onPointerUp);

  // Keyboard rotation controls
  window.addEventListener("keydown", (e) => {
    const step = 0.12;
    if (e.key === "ArrowLeft") { globe.rotation.y -= step; autoRotate = 0.0018; }
    if (e.key === "ArrowRight") { globe.rotation.y += step; autoRotate = 0.0018; }
    if (e.key === "ArrowUp") { globe.rotation.x = clamp(globe.rotation.x - step, -Math.PI * 0.48, Math.PI * 0.48); autoRotate = 0.0018; }
    if (e.key === "ArrowDown") { globe.rotation.x = clamp(globe.rotation.x + step, -Math.PI * 0.48, Math.PI * 0.48); autoRotate = 0.0018; }
  });

  // Zoom controls (wheel) and touch pinch zoom
  const minZ = 13;
  const maxZ = 28;
  const applyZoom = (delta) => {
    camera.position.z = clamp(camera.position.z + delta, minZ, maxZ);
  };
  renderer.domElement.addEventListener("wheel", (e) => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? 1 : -1;
    applyZoom(delta);
  }, { passive: false });

  let pinchState = { active: false, startDist: 0, startZ: camera.position.z };
  const getTouchDist = (t0, t1) => {
    const dx = t0.clientX - t1.clientX;
    const dy = t0.clientY - t1.clientY;
    return Math.hypot(dx, dy);
  };
  renderer.domElement.addEventListener("touchstart", (e) => {
    if (e.touches.length === 2){
      pinchState.active = true;
      pinchState.startDist = getTouchDist(e.touches[0], e.touches[1]);
      pinchState.startZ = camera.position.z;
    }
  }, { passive: true });
  renderer.domElement.addEventListener("touchmove", (e) => {
    if (pinchState.active && e.touches.length === 2){
      const dist = getTouchDist(e.touches[0], e.touches[1]);
      const scale = pinchState.startDist / Math.max(1, dist);
      camera.position.z = clamp(pinchState.startZ * scale, minZ, maxZ);
    }
  }, { passive: true });
  renderer.domElement.addEventListener("touchend", () => {
    pinchState.active = false;
  });

  // Interactions
  window.addEventListener("mousemove", (e) => {
    mouse.x = (e.clientX / window.innerWidth) * 2 - 1;
    mouse.y = -(e.clientY / window.innerHeight) * 2 + 1;
    raycaster.setFromCamera(mouse, camera);
    const intersects = raycaster.intersectObjects(globe.children, true);
    if (intersects.length > 0){
      const obj = intersects[0].object;
      if (hovered !== obj){
        if (hovered){ hovered.material.opacity = 1.0; hovered.scale.set(spriteSize, spriteSize, 1); }
        hovered = obj;
        hovered.material.opacity = 0.85;
        hovered.scale.set(spriteSize * 1.12, spriteSize * 1.12, 1);
      }
      tooltip.textContent = obj.userData?.name || "";
      tooltip.style.left = e.clientX + "px";
      tooltip.style.top = e.clientY + "px";
      tooltip.style.opacity = 1;
      autoRotate = 0.0018;
    } else {
      if (hovered){ hovered.material.opacity = 1.0; hovered.scale.set(spriteSize, spriteSize, 1); }
      hovered = null;
      tooltip.style.opacity = 0;
      autoRotate = 0.0035;
    }
  });

  window.addEventListener("click", () => {
    if (drag.moved) { return; }
    raycaster.setFromCamera(mouse, camera);
    const intersects = raycaster.intersectObjects(globe.children, true);
    if (intersects.length > 0){
      const idx = intersects[0].object.userData.idx;
      openPanel(animalData[idx]);
    }
  });

  window.addEventListener("resize", () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
  });

  const panel = document.getElementById("detailPanel");
  const overlay = document.getElementById("overlay");
  const title = document.getElementById("detailTitle");
  const text = document.getElementById("detailText");
  const img = document.getElementById("detailImage");
  const closeBtn = document.getElementById("closePanel");
  const playBtn = document.getElementById("playSound");
  let currentAudio = null;

  function openPanel(animal){
    if (!animal) return;
    title.textContent = animal.name;
    img.src = animal.image;
    text.innerHTML = (animal.paragraphs || []).map(p => `<p>${p}</p>`).join("");
    overlay.classList.add("show");
    overlay.setAttribute("aria-hidden", "false");
    panel.classList.add("open");
    panel.setAttribute("aria-hidden", "false");
    playBtn.onclick = () => {
      try{ if (currentAudio){ currentAudio.pause(); } } catch(_){}
      currentAudio = new Audio(animal.sound);
      currentAudio.play().catch(() => {});
    };
  }
  function closePanel(){
    overlay.classList.remove("show");
    overlay.setAttribute("aria-hidden", "true");
    panel.classList.remove("open");
    panel.setAttribute("aria-hidden", "true");
    if (currentAudio){ try{ currentAudio.pause(); } catch(_){} }
  }
  closeBtn.addEventListener("click", closePanel);
  overlay.addEventListener("click", closePanel);
})();


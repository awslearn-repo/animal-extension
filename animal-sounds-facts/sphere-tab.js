/* global THREE */
(() => {
  const container = document.getElementById("scene");
  const tooltip = document.createElement("div");
  tooltip.className = "tooltip";
  document.body.appendChild(tooltip);

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 3000);
  camera.position.set(0, 0, 28);

  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setSize(window.innerWidth, window.innerHeight);
  container.appendChild(renderer.domElement);

  const ambient = new THREE.AmbientLight(0xffffff, 1.0);
  scene.add(ambient);

  const globe = new THREE.Group();
  scene.add(globe);

  // No visible sphere: we omit adding any mesh/wireframe. Only sprites are placed in spherical coordinates.

  const raycaster = new THREE.Raycaster();
  const mouse = new THREE.Vector2();
  let hovered = null;

  const spriteSize = 3.2; // bigger
  const radius = 16; // bigger sphere radius
  let sprites = [];
  let animalData = [];

  fetch("sphere-animals.json").then(r => r.json()).then(data => {
    animalData = data;
    createSprites(data);
  });

  function createSprites(data){
    const loader = new THREE.TextureLoader();
    const goldenSpiral = (i, n) => {
      const phi = Math.acos(1 - 2 * (i + 0.5) / n);
      const theta = Math.PI * (1 + Math.sqrt(5)) * (i + 0.5);
      return { phi, theta };
    };
    sprites = data.map((animal, i) => {
      const tex = loader.load(animal.image, undefined, undefined, () => {});
      tex.colorSpace = THREE.SRGBColorSpace;
      const mat = new THREE.SpriteMaterial({ map: tex, transparent: true, depthTest: true });
      const sp = new THREE.Sprite(mat);
      sp.scale.set(spriteSize, spriteSize, 1);
      const { phi, theta } = goldenSpiral(i, data.length);
      const pos = new THREE.Vector3().setFromSphericalCoords(radius, phi, theta);
      sp.position.copy(pos);
      sp.userData = { idx: i, name: animal.name };
      globe.add(sp);
      return sp;
    });
  }

  // No auto-rotate: user drives movement via mouse drag
  let isDragging = false;
  let prevMouse = new THREE.Vector2();
  let rotationVelocity = new THREE.Vector2(0, 0);
  let lastTimestamp = performance.now();

  function animate(now){
    requestAnimationFrame(animate);
    const dt = Math.min(0.05, (now - lastTimestamp) / 1000);
    lastTimestamp = now;

    // inertial easing for nicer feel
    globe.rotation.y += rotationVelocity.x * dt;
    globe.rotation.x += rotationVelocity.y * dt;
    rotationVelocity.multiplyScalar(0.94);

    renderer.render(scene, camera);
  }
  requestAnimationFrame(animate);

  // Drag controls
  function onPointerDown(e){
    isDragging = true;
    prevMouse.set(e.clientX, e.clientY);
  }
  function onPointerMove(e){
    mouse.x = (e.clientX / window.innerWidth) * 2 - 1;
    mouse.y = -(e.clientY / window.innerHeight) * 2 + 1;

    if (isDragging){
      const dx = e.clientX - prevMouse.x;
      const dy = e.clientY - prevMouse.y;
      prevMouse.set(e.clientX, e.clientY);
      const sensitivity = 0.0035;
      rotationVelocity.x = dx * sensitivity;
      rotationVelocity.y = dy * sensitivity;
    }

    raycaster.setFromCamera(mouse, camera);
    const intersects = raycaster.intersectObjects(globe.children, true);
    if (intersects.length > 0){
      const obj = intersects[0].object;
      if (hovered !== obj){
        if (hovered){ hovered.material.opacity = 1.0; hovered.scale.set(spriteSize, spriteSize, 1); }
        hovered = obj;
        hovered.material.opacity = 0.9;
        hovered.scale.set(spriteSize * 1.12, spriteSize * 1.12, 1);
      }
      tooltip.textContent = obj.userData?.name || "";
      tooltip.style.left = e.clientX + "px";
      tooltip.style.top = e.clientY + "px";
      tooltip.style.opacity = 1;
    } else {
      if (hovered){ hovered.material.opacity = 1.0; hovered.scale.set(spriteSize, spriteSize, 1); }
      hovered = null;
      tooltip.style.opacity = 0;
    }
  }
  function onPointerUp(){
    isDragging = false;
  }

  window.addEventListener("mousedown", onPointerDown);
  window.addEventListener("mousemove", onPointerMove);
  window.addEventListener("mouseup", onPointerUp);
  window.addEventListener("mouseleave", onPointerUp);

  // Click to open detail
  window.addEventListener("click", () => {
    raycaster.setFromCamera(mouse, camera);
    const intersects = raycaster.intersectObjects(globe.children, true);
    if (intersects.length > 0){
      const idx = intersects[0].object.userData.idx;
      openPanel(animalData[idx]);
    }
  });

  // Resize
  window.addEventListener("resize", () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
  });

  // Detail panel logic (same as popup)
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
      try{ if (currentAudio){ currentAudio.pause(); } } catch(_){ }
      currentAudio = new Audio(animal.sound);
      currentAudio.play().catch(() => {});
    };
  }
  function closePanel(){
    overlay.classList.remove("show");
    overlay.setAttribute("aria-hidden", "true");
    panel.classList.remove("open");
    panel.setAttribute("aria-hidden", "true");
    if (currentAudio){ try{ currentAudio.pause(); } catch(_){ } }
  }
  document.getElementById("closePanel").addEventListener("click", closePanel);
  document.getElementById("overlay").addEventListener("click", closePanel);
})();


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
    const goldSpiral = (i, n) => {
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


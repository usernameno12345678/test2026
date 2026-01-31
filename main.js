const canvas = document.getElementById("scene");
const video = document.getElementById("video");
const videoInputs = [
  { key: "front", label: "Перед", input: document.getElementById("video-front") },
  { key: "right", label: "Право", input: document.getElementById("video-right") },
  { key: "back", label: "Назад", input: document.getElementById("video-back") },
  { key: "left", label: "Лево", input: document.getElementById("video-left") },
  { key: "up", label: "Верх", input: document.getElementById("video-up") },
  { key: "down", label: "Низ", input: document.getElementById("video-down") },
];
const activeFaceLabel = document.getElementById("active-face");
const playButton = document.getElementById("play-button");

const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(window.innerWidth, window.innerHeight);

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(
  45,
  window.innerWidth / window.innerHeight,
  0.1,
  100
);
camera.position.z = 3.6;

const geometry = new THREE.SphereGeometry(1.1, 96, 96);

const texture = new THREE.VideoTexture(video);
texture.minFilter = THREE.LinearFilter;
texture.magFilter = THREE.LinearFilter;
texture.colorSpace = THREE.SRGBColorSpace;

const material = new THREE.MeshBasicMaterial({ map: texture });
const sphere = new THREE.Mesh(geometry, material);
scene.add(sphere);
renderer.setClearColor(0xff0000, 1);

const state = {
  isDragging: false,
  pointerX: 0,
  pointerY: 0,
  lastX: 0,
  lastY: 0,
  targetRotationX: 0,
  targetRotationY: 0,
  activeFace: "front",
};

const clamp = (value, min, max) => Math.min(Math.max(value, min), max);
const stepAngle = Math.PI / 2;
const lerp = (start, end, alpha) => start + (end - start) * alpha;
const normalizeAngle = (value) => {
  const full = Math.PI * 2;
  return ((value % full) + full) % full;
};

const sources = {};

function updateActiveFaceLabel() {
  const match = videoInputs.find((item) => item.key === state.activeFace);
  if (match) {
    activeFaceLabel.textContent = match.label;
  }
}

function setActiveFace(key) {
  if (state.activeFace === key) return;
  state.activeFace = key;
  updateActiveFaceLabel();
  if (sources[key]) {
    video.src = sources[key];
    video.load();
    video.addEventListener(
      "loadedmetadata",
      () => {
        attemptPlay();
      },
      { once: true }
    );
  }
}

function snapRotation() {
  const snappedX = clamp(
    Math.round(sphere.rotation.x / stepAngle) * stepAngle,
    -stepAngle,
    stepAngle
  );
  const snappedY = Math.round(sphere.rotation.y / stepAngle) * stepAngle;
  state.targetRotationX = snappedX;
  state.targetRotationY = snappedY;

  const normalizedY = normalizeAngle(snappedY);
  const stepIndex = Math.round(normalizedY / stepAngle) % 4;

  if (snappedX >= stepAngle * 0.5) {
    setActiveFace("down");
  } else if (snappedX <= -stepAngle * 0.5) {
    setActiveFace("up");
  } else {
    const sideMap = ["front", "right", "back", "left"];
    setActiveFace(sideMap[stepIndex]);
  }
}

function onPointerDown(event) {
  if (event.pointerType === "touch") {
    event.preventDefault();
  }
  state.isDragging = true;
  state.pointerX = event.clientX;
  state.pointerY = event.clientY;
  state.lastX = state.pointerX;
  state.lastY = state.pointerY;
  attemptPlay();
}

function onPointerMove(event) {
  if (!state.isDragging) return;
  if (event.pointerType === "touch") {
    event.preventDefault();
  }
  const deltaX = event.clientX - state.lastX;
  const deltaY = event.clientY - state.lastY;
  state.lastX = event.clientX;
  state.lastY = event.clientY;
  sphere.rotation.y += deltaX * 0.005;
  sphere.rotation.x += deltaY * 0.005;
  sphere.rotation.x = clamp(sphere.rotation.x, -stepAngle, stepAngle);
}

function onPointerUp() {
  state.isDragging = false;
  snapRotation();
}

canvas.addEventListener("pointerdown", onPointerDown, { passive: false });
window.addEventListener("pointermove", onPointerMove, { passive: false });
window.addEventListener("pointerup", onPointerUp);
window.addEventListener("pointercancel", onPointerUp);

function attemptPlay() {
  if (!video.src) return;
  const playPromise = video.play();
  if (playPromise && typeof playPromise.catch === "function") {
    playPromise.catch(() => {
      // Autoplay blocked; user can press the button.
    });
  }
}

videoInputs.forEach(({ key, input }) => {
  if (!input) return;
  input.addEventListener("change", (event) => {
    const file = event.target.files[0];
    if (!file) return;
    sources[key] = URL.createObjectURL(file);
    if (!video.src) {
      setActiveFace(key);
    }
  });
});

playButton.addEventListener("click", () => {
  attemptPlay();
});

function onResize() {
  const { innerWidth, innerHeight } = window;
  camera.aspect = innerWidth / innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(innerWidth, innerHeight);
}

window.addEventListener("resize", onResize);

function animate() {
  if (!state.isDragging) {
    sphere.rotation.x = lerp(
      sphere.rotation.x,
      state.targetRotationX,
      0.12
    );
    sphere.rotation.y = lerp(
      sphere.rotation.y,
      state.targetRotationY,
      0.12
    );
  }
  renderer.render(scene, camera);
  requestAnimationFrame(animate);
}

updateActiveFaceLabel();
snapRotation();
animate();

const canvas = document.getElementById("scene");
const video = document.getElementById("video");
const videoInput = document.getElementById("video-input");
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
};

const clamp = (value, min, max) => Math.min(Math.max(value, min), max);

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
  sphere.rotation.x = clamp(sphere.rotation.x, -Math.PI / 2, Math.PI / 2);
}

function onPointerUp() {
  state.isDragging = false;
}

canvas.addEventListener("pointerdown", onPointerDown, { passive: false });
window.addEventListener("pointermove", onPointerMove, { passive: false });
window.addEventListener("pointerup", onPointerUp);

function attemptPlay() {
  if (!video.src) return;
  const playPromise = video.play();
  if (playPromise && typeof playPromise.catch === "function") {
    playPromise.catch(() => {
      // Autoplay blocked; user can press the button.
    });
  }
}

videoInput.addEventListener("change", (event) => {
  const file = event.target.files[0];
  if (!file) return;
  const url = URL.createObjectURL(file);
  video.src = url;
  video.load();
  video.addEventListener(
    "loadedmetadata",
    () => {
      attemptPlay();
    },
    { once: true }
  );
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
  renderer.render(scene, camera);
  requestAnimationFrame(animate);
}

animate();

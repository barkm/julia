import "./style.css";

import * as THREE from "three";
import { GPUComputationRenderer } from "three/examples/jsm/misc/GPUComputationRenderer.js";

const renderer = new THREE.WebGLRenderer({
  powerPreference: "high-performance",
});
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(window.devicePixelRatio);
const canvas = renderer.domElement;
document.body.appendChild(canvas);

const computationRenderer = new GPUComputationRenderer(
  window.devicePixelRatio * window.innerWidth,
  window.devicePixelRatio * window.innerHeight,
  renderer
);
const material = computationRenderer.createShaderMaterial(
  `
    const float squaredRadius = 2.0 * 2.0;
    const float maxIterations = 500.0;
    const float minIntensity = 0.75;
    uniform vec2 c;
    vec2 f(vec2 z) {
      return vec2(
        z.x * z.x - z.y * z.y + c.x,
        2.0 * z.x * z.y + c.y
      );
    }
    float squareNorm(vec2 z) {
      return z.x * z.x + z.y * z.y;
    }
    void main() {
        vec2 z = gl_FragCoord.xy;
        float minResolution = min(resolution.x, resolution.y);
        z.x -= (resolution.x - minResolution) / 2.0;
        z.y -= (resolution.y - minResolution) / 2.0;
        z = 2.5 * (2.0 * (z / minResolution) - 1.0);
        float i = 0.0;
        for (; i < maxIterations; i++) {
          if (squareNorm(z) > squaredRadius) { break; }
          z = f(z);
        }
        float intensity = i / maxIterations;
        gl_FragColor = vec4(vec3(0.0), minIntensity * pow(intensity, 0.5));
    }
  `,
  {
    c: { value: [0, 0] },
  }
);
// @ts-ignore
const target = computationRenderer.createRenderTarget();
computationRenderer.doRenderTarget(material, target);

const camera = new THREE.Camera();
const scene = new THREE.Scene();
scene.background = target.texture;

const currentC = material.uniforms.c.value;
let targetC: [number, number] = [-0.8, 0.156];

const updateC = (x: number, y: number) => {
  targetC[0] = 2 * (x / window.innerWidth - 0.5);
  targetC[1] = -2 * (y / window.innerHeight - 0.5);
};

canvas.addEventListener("mousemove", (event: MouseEvent) =>
  updateC(event.x, event.y)
);
canvas.addEventListener("touchmove", (event: TouchEvent) =>
  updateC(event.touches[0].pageX, event.touches[0].pageY)
);

const distance = (c1: [number, number], c2: [number, number]) => {
  return Math.sqrt((c1[0] - c2[0]) ** 2 + (c1[1] - c2[1]) ** 2);
};

const momentum = 0.9;

const animate = () => {
  requestAnimationFrame(animate);
  if (distance(currentC, targetC) > 0.001) {
    computationRenderer.doRenderTarget(material, target);
    renderer.render(scene, camera);
    currentC[0] = momentum * currentC[0] + (1 - momentum) * targetC[0];
    currentC[1] = momentum * currentC[1] + (1 - momentum) * targetC[1];
    material.needsUpdate = true;
  }
};

animate();

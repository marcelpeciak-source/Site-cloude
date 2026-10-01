// Lightweight post-processing for the particle scene: one extra full-screen pass.
//  - Bloom: the scene is rendered into an RGBA8 target with mipmaps; the final pass sums a
//    few blurred mip levels ("mip bloom") instead of running a multi-pass blur chain.
//    RGBA8 rather than half-float: mipmap generation for it works on every WebGL2 device.
//  - Chromatic aberration: radial RGB split that grows with scroll velocity.
// The scene renders on black here; the page background colour is added back in the final pass.
import * as THREE from 'three';

const vertexShader = /* glsl */ `
varying vec2 vUv;
void main() {
  vUv = uv;
  gl_Position = vec4(position.xy, 0.0, 1.0);
}
`;

const fragmentShader = /* glsl */ `
uniform sampler2D tScene;
uniform vec2 uTexel;
uniform float uBloom;
uniform float uAberration;
uniform vec3 uBg;
varying vec2 vUv;

vec3 glowAt(vec2 uv, float lod) {
  // 5 taps around the point smooth out the blockiness of the small mip levels.
  vec2 o = uTexel * exp2(lod) * 0.75;
  vec3 c = textureLod(tScene, uv, lod).rgb * 0.36;
  c += textureLod(tScene, uv + vec2(o.x, o.y), lod).rgb * 0.16;
  c += textureLod(tScene, uv + vec2(-o.x, o.y), lod).rgb * 0.16;
  c += textureLod(tScene, uv + vec2(o.x, -o.y), lod).rgb * 0.16;
  c += textureLod(tScene, uv + vec2(-o.x, -o.y), lod).rgb * 0.16;
  return c;
}

void main() {
  vec2 uv = vUv;
  vec2 d = uv - 0.5;
  vec2 shift = d * uAberration * (0.35 + dot(d, d) * 3.0);

  vec3 col;
  col.r = texture(tScene, uv + shift).r;
  col.g = texture(tScene, uv).g;
  col.b = texture(tScene, uv - shift).b;

  vec3 glow = textureLod(tScene, uv, 2.5).rgb * 0.55 + glowAt(uv, 4.0) * 0.8 + glowAt(uv, 5.5) * 0.55;
  col += glow * uBloom;

  gl_FragColor = vec4(uBg + col, 1.0);
}
`;

export function createPostFX(renderer, { bloom = 0.9 } = {}) {
  const target = new THREE.WebGLRenderTarget(1, 1, {
    type: THREE.UnsignedByteType,
    minFilter: THREE.LinearMipmapLinearFilter,
    magFilter: THREE.LinearFilter,
    generateMipmaps: true,
    depthBuffer: false,
  });

  const uniforms = {
    tScene: { value: target.texture },
    uTexel: { value: new THREE.Vector2() },
    uBloom: { value: bloom },
    uAberration: { value: 0.003 },
    // Raw sRGB values of the page background (#07070b); written as-is, like the CSS colour.
    uBg: { value: new THREE.Vector3(7 / 255, 7 / 255, 11 / 255) },
  };
  const material = new THREE.ShaderMaterial({ uniforms, vertexShader, fragmentShader, depthTest: false, depthWrite: false });
  const quad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), material);
  quad.frustumCulled = false;
  const quadScene = new THREE.Scene();
  quadScene.add(quad);
  const quadCamera = new THREE.Camera();
  const black = new THREE.Color(0x000000);
  const prevClear = new THREE.Color();

  return {
    uniforms,
    setSize(width, height) {
      target.setSize(width, height);
      uniforms.uTexel.value.set(1 / width, 1 / height);
    },
    render(scene, camera) {
      renderer.getClearColor(prevClear);
      const prevAlpha = renderer.getClearAlpha();
      renderer.setRenderTarget(target);
      renderer.setClearColor(black, 1);
      renderer.clear();
      renderer.render(scene, camera); // mipmaps are regenerated after rendering to the target
      renderer.setRenderTarget(null);
      renderer.setClearColor(prevClear, prevAlpha);
      renderer.render(quadScene, quadCamera);
    },
    dispose() {
      target.dispose();
      material.dispose();
      quad.geometry.dispose();
    },
  };
}

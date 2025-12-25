"use client";
import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { MeshLine, MeshLineMaterial } from "three.meshline";
import { createNoise2D } from "simplex-noise";

// Helper utilities
const Calc = {
  map: (
    value: number,
    inMin: number,
    inMax: number,
    outMin: number,
    outMax: number
  ) => outMin + ((value - inMin) / (inMax - inMin)) * (outMax - outMin),
  rand: (min: number, max: number) => min + Math.random() * (max - min),
  clamp: (value: number, min: number, max: number) =>
    Math.max(min, Math.min(max, value)),
};

const Ease = {
  outExpo: (t: number, b: number, c: number, d: number) =>
    t === d ? b + c : c * (-Math.pow(2, (-10 * t) / d) + 1) + b,
  inOutExpo: (t: number, b: number, c: number, d: number) =>
    t === 0
      ? b
      : t === d
      ? b + c
      : (t /= d / 2) < 1
      ? (c / 2) * Math.pow(2, 10 * (t - 1)) + b
      : (c / 2) * (-Math.pow(2, -10 * --t) + 2) + b,
};

// Walker class
class Walker {
  simplex: (x: number, y: number) => number;
  total: number;
  x: number;
  y: number;
  dir: number;
  speed: number;
  delta: number;
  time: number;
  angleRange: number;
  away: number;
  depth: number;
  position: THREE.Vector3;
  path: Array<{ x: number; y: number; z: number }>;
  angle!: number;

  constructor(config: any) {
    this.simplex = config.simplex;
    this.total = config.total;
    this.x = config.x;
    this.y = config.y;
    this.dir = config.dir;
    this.speed = config.speed;
    this.delta = config.delta;
    this.time = config.time;
    this.angleRange = config.angleRange;
    this.away = config.away;
    this.depth = config.depth;
    this.position = new THREE.Vector3(this.x, this.y, 0);
    this.path = [];
    this.build();
  }

  build() {
    for (let i = 0; i < this.total; i++) {
      this.step(i / this.total);
    }
  }

  step(p: number) {
    this.time += this.delta;
    this.angle = Calc.map(
      this.simplex(this.time, 0),
      -1,
      1,
      -this.angleRange,
      this.angleRange
    );
    this.speed = Calc.map(
      this.simplex(this.time, 1000),
      -1,
      1,
      0,
      0.01
    );
    this.dir += this.angle;
    this.position.x += Math.cos(this.dir) * this.speed;
    this.position.y += Math.sin(this.dir) * this.speed;
    if (this.away) {
      this.position.z = Calc.map(p, 0, 1, this.depth / 2, -this.depth / 2);
    } else {
      this.position.z = Calc.map(p, 0, 1, -this.depth / 2, this.depth / 2);
    }
    this.path.push({
      x: this.position.x,
      y: this.position.y,
      z: this.position.z,
    });
  }
}

// Generator class (updated to accept params)
class Generator {
  fov!: number;
  camera!: THREE.PerspectiveCamera;
  scene!: THREE.Scene;
  renderer!: THREE.WebGLRenderer;
  orbit!: OrbitControls;
  meshes!: THREE.Mesh[];
  meshGroup!: THREE.Object3D;
  meshGroupScale!: number;
  meshGroupScaleTarget!: number;
  resolution!: THREE.Vector2;
  dpr!: number;
  simplex!: (x: number, y: number) => number;
  count!: number;
  stems!: number;
  edge!: number;
  lastTime!: number;
  currentTime!: number;
  deltaTime!: number;
  deltaTimeNorm!: number;
  progress!: number;
  progressed!: boolean;
  progressModulo!: number;
  progressEffective!: number;
  progressEased!: number;

  params: Record<string, number | boolean>;

  constructor(mount: HTMLDivElement, params: Record<string, number | boolean>) {
    this.params = params;
    this.setupCamera();
    this.setupScene();
    this.setupRenderer(mount);
    this.setupLines();
    this.setupOrbit();
    this.lastTime = Date.now();
    this.currentTime = Date.now();
    this.deltaTime = 0;
    this.deltaTimeNorm = 0;
    this.progress = 0;
    this.progressed = false;
    this.progressModulo = 0;
    this.progressEffective = 0;
    this.progressEased = 0;
    this.meshes = [];
    this.listen();
    this.onResize();
    this.reset();
    this.loop();
  }

  setupCamera() {
    this.fov = 75;
    this.camera = new THREE.PerspectiveCamera(this.fov, window.innerWidth / window.innerHeight, 0.01, 1000);
    this.camera.position.z = 10;
  }

  setupScene() {
    this.scene = new THREE.Scene();
  }

  setupRenderer(mount: HTMLDivElement) {
    this.renderer = new THREE.WebGLRenderer({
      antialias: true,
    });
    mount.appendChild(this.renderer.domElement);
  }

  setupOrbit() {
    this.orbit = new (OrbitControls as any)(
      this.camera,
      this.renderer.domElement
    ) as OrbitControls;
    this.orbit.enableDamping = true;
    this.orbit.dampingFactor = 0.2;
    (this.orbit as any).enableKeys = false;
  }

  setupLines() {
    this.meshes = [];
    this.meshGroup = new THREE.Object3D();
    this.meshGroupScale = 1;
    this.meshGroupScaleTarget = 1;
    this.scene.add(this.meshGroup);
  }

  generate() {
    this.simplex = createNoise2D();
    this.count = this.params.lines as number;
    this.stems = this.params.stems as number;
    this.edge = 0;
    this.scene.background = (this.params.invert as boolean)
      ? new THREE.Color("#fff")
      : new THREE.Color("#000");
    for (let i = 0; i < this.count; i++) {
      let centered = Math.random() > 0.5;
      let walker = new Walker({
        simplex: this.simplex,
        total: this.params.iterations as number,
        x: centered ? 0 : Calc.rand(-1, 1),
        y: centered ? 0 : Calc.rand(-1, 1),
        dir: (i / this.count) * ((Math.PI * 2) / this.stems),
        speed: 0,
        delta: this.params["noise-speed"] as number,
        angleRange: this.params["angle-range"] as number,
        away: 0,
        depth: this.params.depth as number,
        time: i * 1000,
      });
      const points: THREE.Vector3[] = [];
      for (let j = 0, len = walker.path.length; j < len; j++) {
        let p = walker.path[j];
        let x = p.x;
        let y = p.y;
        let z = p.z;
        this.edge = Math.max(this.edge, Math.abs(x), Math.abs(y));
        points.push(new THREE.Vector3(x, y, z));
      }
      const geometry = new THREE.BufferGeometry().setFromPoints(points);
      let line = new MeshLine();
      const widthCallback = (p: number): number => {
        let size = 1;
        let n = size - Math.abs(Calc.map(p, 0, 1, -size, size)) + 0.1;
        return n;
      };
      line.setGeometry(geometry, widthCallback);
      let material = new MeshLineMaterial({
        blending: (this.params.invert as boolean)
          ? THREE.NormalBlending
          : THREE.AdditiveBlending,
        color: new THREE.Color(
          `hsl(${
            360 +
            (this.params.hue as number) +
            Calc.map(
              i,
              0,
              this.count,
              -(this.params["hue-range"] as number),
              this.params["hue-range"] as number
            )
          }, 100%, ${(this.params.lightness as number)}%)`
        ) as any,
        depthTest: false,
        opacity: 1,
        transparent: true,
        lineWidth: 0.04,
        resolution: this.resolution,
      } as any);
      for (let k = 0; k < this.stems; k++) {
        let mesh = new THREE.Mesh(line.geometry, material as unknown as THREE.Material);
        mesh.rotation.z = Calc.map(k, 0, this.stems, 0, Math.PI * 2);
        this.meshes.push(mesh);
        this.meshGroup.add(mesh);
      }
    }
  }

  worldToScreen(vector: THREE.Vector3, camera: THREE.Camera) {
    vector.project(camera);
    let cx = window.innerWidth / 2;
    let cy = window.innerHeight / 2;
    vector.x = vector.x * cx + cx;
    vector.y = -(vector.y * cy) + cy;
    return vector;
  }

  reset() {
    if (this.meshes) {
      this.meshes.length = 0;
    }
    if (this.meshGroup) {
      while (this.meshGroup.children.length) {
        this.meshGroup.remove(this.meshGroup.children[0]);
      }
    }
    this.camera.position.x = 0;
    this.camera.position.y = 0;
    this.camera.position.z = 10;
    this.camera.lookAt(new THREE.Vector3());
    this.progress = 0;
    this.progressed = false;
    this.progressModulo = 0;
    this.progressEffective = 0;
    this.progressEased = 0;
    this.generate();
    requestAnimationFrame(() => {
      let tick = 0;
      let exit = 50;
      let scale = 1;
      this.meshGroup.scale.set(scale, scale, scale);
      let scr = this.worldToScreen(
        new THREE.Vector3(0, this.edge, 0),
        this.camera
      );
      while (scr.y < window.innerHeight * 0.2 && tick <= exit) {
        scale -= 0.05;
        scr = this.worldToScreen(
          new THREE.Vector3(0, this.edge * scale, 0),
          this.camera
        );
        tick++;
      }
      this.meshGroupScaleTarget = scale;
    });
  }

  listen() {
    // Resize handled in useEffect
  }

  onResize() {
    this.resolution = new THREE.Vector2(
      window.innerWidth,
      window.innerHeight
    );
    this.dpr = window.devicePixelRatio > 1 ? 2 : 1;
    this.camera.aspect = this.resolution.x / this.resolution.y;
    this.camera.updateProjectionMatrix();
    this.renderer.setPixelRatio(this.dpr);
    this.renderer.setSize(this.resolution.x, this.resolution.y);
  }

  loop() {
    this.lastTime = this.currentTime;
    this.currentTime = Date.now();
    this.deltaTime = this.currentTime - this.lastTime;
    this.deltaTimeNorm = this.deltaTime / (1000 / 60);
    this.meshGroup.rotation.x = Math.cos(Date.now() * 0.001) * 0.1;
    this.meshGroup.rotation.y = Math.sin(Date.now() * 0.001) * -0.1;
    this.progress += 0.005 * this.deltaTimeNorm;
    if (this.progress > 1) {
      this.progressed = true;
    }
    this.progressModulo = this.progress % 2;
    this.progressEffective =
      this.progressModulo < 1
        ? this.progressModulo
        : 1 - (this.progressModulo - 1);
    this.progressEased = this.progressed
      ? Ease.inOutExpo(this.progressEffective, 0, 1, 1)
      : Ease.outExpo(this.progressEffective, 0, 1, 1);
    let i = this.meshes.length;
    while (i--) {
      let mesh = this.meshes[i];
      const mat = mesh.material as any;
      if (mat.uniforms) {
        mat.uniforms.opacity.value = Calc.clamp(
          this.progressEffective * 2,
          0,
          1
        );
        mat.uniforms.visibility.value = this.progressEased;
      }
    }
    this.meshGroupScale = this.meshGroupScaleTarget;
    this.meshGroup.scale.set(
      this.meshGroupScale,
      this.meshGroupScale,
      this.meshGroupScale
    );
    this.orbit.update();
    this.renderer.render(this.scene, this.camera);
    requestAnimationFrame(() => this.loop());
  }

  updateParams(newParams: Record<string, number | boolean>) {
    this.params = { ...this.params, ...newParams };
    this.reset();
  }

  resetFlower() {
    this.reset();
  }

  saveImage() {
    this.renderer.render(this.scene, this.camera);
    const link = document.createElement("a");
    link.href = this.renderer.domElement.toDataURL("image/png");
    link.download = `simplex-flower-${Date.now()}.png`;
    link.click();
  }
}

export default function Home() {
  const mountRef = useRef<HTMLDivElement>(null);
  const [params, setParams] = useState<Record<string, number | boolean>>({
    lines: 3,
    stems: 5,
    "angle-range": 0.01,
    depth: 5,
    "noise-speed": 0.0003,
    iterations: 3000,
    hue: 300,
    "hue-range": 90,
    lightness: 60,
    invert: false,
  });
  const [generator, setGenerator] = useState<Generator | null>(null);
  const [minimized, setMinimized] = useState(false);

  useEffect(() => {
    if (!mountRef.current) return;

    let resizeHandler: (() => void) | null = null;

    const timeoutId = setTimeout(() => {
      const gen = new Generator(mountRef.current!, params);
      setGenerator(gen);
      (mountRef.current as any).generator = gen;

      resizeHandler = () => gen.onResize();
      window.addEventListener("resize", resizeHandler);
    }, 250);

    return () => {
      clearTimeout(timeoutId);
      if (resizeHandler) {
        window.removeEventListener("resize", resizeHandler);
      }
      if (generator && mountRef.current) {
        mountRef.current.removeChild(generator.renderer.domElement);
        generator.renderer.dispose();
        generator.scene.clear();
      }
    };
  }, []);

  const handleParamChange = (id: string, value: number | boolean) => {
    setParams((prev) => {
      const newParams = { ...prev, [id]: value };
      if (generator) {
        generator.updateParams(newParams);
      }
      return newParams;
    });
  };

  const handleRandomize = () => {
    const randomParams: Record<string, number | boolean> = {
      lines: Math.floor(Calc.rand(1, 7)),
      stems: Math.floor(Calc.rand(1, 11)),
      "angle-range": Calc.rand(0.002, 0.018),
      depth: Calc.rand(0, 10),
      "noise-speed": Calc.rand(0.000001, 0.0005),
      iterations: Math.floor(Calc.rand(500, 8001)),
      hue: Math.floor(Calc.rand(0, 361)),
      "hue-range": Math.floor(Calc.rand(0, 91)),
      lightness: Math.floor(Calc.rand(0, 101)),
      invert: Math.random() > 0.5,
    };
    setParams(randomParams);
    if (generator) {
      generator.updateParams(randomParams);
    }
  };

  const handleGenerate = () => {
    if (generator) {
      generator.resetFlower();
    }
  };

  const handleSave = () => {
    if (generator) {
      generator.saveImage();
    }
  };

  const toggleMinimize = () => {
    setMinimized(!minimized);
  };

  const renderSlider = (id: string, title: string, min: number, max: number, step: number, description?: string) => (
    <div key={id} style={{ marginBottom: 15 }}>
      <label style={{ display: "block", marginBottom: 5, fontSize: 12 }}>{title}</label>
      {description && <p style={{ fontSize: 10, color: "#aaa", margin: "0 0 5px 0" }}>{description}</p>}
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={params[id] as number}
        onChange={(e) => handleParamChange(id, parseFloat(e.target.value))}
        style={{ width: "100%" }}
      />
      <span style={{ fontSize: 12 }}>{params[id]}</span>
    </div>
  );

  const renderToggle = (id: string, title: string, description?: string) => (
    <div key={id} style={{ marginBottom: 15 }}>
      <label style={{ display: "flex", alignItems: "center", fontSize: 12 }}>
        <input
          type="checkbox"
          checked={params[id] as boolean}
          onChange={(e) => handleParamChange(id, e.target.checked)}
          style={{ marginRight: 8 }}
        />
        {title}
      </label>
      {description && <p style={{ fontSize: 10, color: "#aaa", margin: "0 0 5px 0" }}>{description}</p>}
    </div>
  );

  return (
    <>
      <div
        ref={mountRef}
        style={{
          width: "100vw",
          height: "100vh",
          background: "#000",
          overflow: "hidden",
        }}
      />
      {/* Control panel */}
      <div
        className="variaboard-panel"
        style={{
          position: "fixed",
          top: "20px",
          right: "20px",
          zIndex: 1000,
          background: "rgba(0, 0, 0, 0.8)",
          color: "white",
          padding: minimized ? "10px" : "20px",
          borderRadius: "8px",
          fontFamily: "'Source Code Pro', monospace",
          opacity: 1,
          transform: "translateY(0)",
          visibility: "visible",
          maxWidth: "300px",
          maxHeight: minimized ? "40px" : "80vh",
          overflowY: minimized ? "hidden" : "auto",
          transition: "all 0.3s ease",
          cursor: minimized ? "pointer" : "default",
        }}
        onClick={minimized ? toggleMinimize : undefined}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: minimized ? 0 : 15 }}>
          <h3 style={{ margin: 0 }}>Art Generator</h3>
          <button
            onClick={toggleMinimize}
            style={{
              padding: "4px 8px",
              background: "transparent",
              color: "white",
              border: "1px solid #666",
              borderRadius: "4px",
              cursor: "pointer",
              fontSize: 12,
            }}
          >
            {minimized ? "▲" : "▼"}
          </button>
        </div>
        {!minimized && (
          <>
            {renderSlider("lines", "Lines", 1, 6, 1, "Amount of lines per stem")}
            {renderSlider("stems", "Stems", 1, 10, 1, "Amount of stems (reflections of lines)")}
            {renderSlider("angle-range", "Angle Range", 0.002, 0.018, 0.001, "Amount that the angle can change per noise step")}
            {renderSlider("depth", "Depth", 0, 10, 0.1, "Depth of the flower in Z space")}
            {renderSlider("noise-speed", "Noise Speed", 0.000001, 0.0005, 0.000001, "How fast the noise values change over time")}
            {renderSlider("iterations", "Iterations", 500, 8000, 1, "Amount of growth iterations per stem")}
            {renderSlider("hue", "Hue", 0, 360, 1, "Base hue of the flower")}
            {renderSlider("hue-range", "Hue Range", 0, 90, 1, "Hue variance from the base hue per line")}
            {renderSlider("lightness", "Lightness", 0, 100, 1, "Overall lightness of lines")}
            {renderToggle("invert", "Invert", "Flip the background color")}
            <div style={{ marginTop: 20 }}>
              <button
                onClick={handleRandomize}
                style={{
                  marginRight: "10px",
                  padding: "8px 12px",
                  background: "#333",
                  color: "white",
                  border: "none",
                  borderRadius: "4px",
                  cursor: "pointer",
                }}
              >
                Randomize
              </button>
              <button
                onClick={handleGenerate}
                style={{
                  marginRight: "10px",
                  padding: "8px 12px",
                  background: "#333",
                  color: "white",
                  border: "none",
                  borderRadius: "4px",
                  cursor: "pointer",
                }}
              >
                Generate
              </button>
              <button
                onClick={handleSave}
                style={{
                  padding: "8px 12px",
                  background: "#333",
                  color: "white",
                  border: "none",
                  borderRadius: "4px",
                  cursor: "pointer",
                }}
              >
                Save Image
              </button>
            </div>
          </>
        )}
      </div>

      <style jsx global>{`
        @keyframes slide-in {
          100% {
            opacity: 1;
            transform: translateY(0);
            visibility: visible;
          }
        }
        canvas {
          cursor: grab;
        }
        canvas:active {
          cursor: grabbing;
        }
      `}</style>
    </>
  );
}
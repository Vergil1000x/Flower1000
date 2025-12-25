declare module 'three.meshline' {
  import { BufferGeometry, ShaderMaterial } from 'three';
  export class MeshLine {
    geometry: BufferGeometry;
    setGeometry(geometry: BufferGeometry, widthCallback: (p: number) => number): void;
  }
  export class MeshLineMaterial extends ShaderMaterial {
    uniforms: {
      opacity: { value: number };
      visibility: { value: number };
      [key: string]: any;
    };
  }
}
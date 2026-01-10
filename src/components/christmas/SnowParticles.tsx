import { useFrame, useThree } from '@react-three/fiber';
import { type RefObject, useMemo, useRef } from 'react';
import * as THREE from 'three';

/**
 * 性能优化的全屏雪花着色器
 * 基于 https://www.shadertoy.com/view/ldsGDn 的效果
 * 使用分层方法创建自然的雪花效果，支持动态调整迭代次数以优化性能
 */

// 分辨率上限，防止在 4K+ 显示器上计算量过大
const MAX_RESOLUTION_WIDTH = 1920;
const MAX_RESOLUTION_HEIGHT = 1080;

const SnowShaderMaterial = {
  vertexShader: `
    varying vec2 vUv;
    void main() {
      vUv = uv;
      gl_Position = vec4(position, 1.0);
    }
  `,
  fragmentShader: `
    uniform float uTime;
    uniform vec2 uResolution;
    uniform float uSpeed;
    uniform float uIntensity;
    uniform vec2 uMouse;
    uniform int uLayerStart;
    uniform int uLayerEnd;
    uniform int uMaxLayers;      // 最大层数 (桌面: 3, 移动: 2)
    uniform int uMaxIterations;  // 每层最大迭代次数 (桌面: 4, 移动: 3)
    uniform float uSinTime;      // 预计算的 sin(time * 2.5)
    uniform float uCosTime;      // 预计算的 cos(time * 2.5)

    varying vec2 vUv;

    void main() {
      vec2 fragCoord = vUv * uResolution;
      float snow = 0.0;
      float time = uTime * uSpeed;

      // 动态层数和迭代次数，通过 uniform 控制以优化性能
      for(int k = 0; k < 6; k++) {
        if(k >= uMaxLayers) break;  // 早期退出优化
        if(k < uLayerStart || k > uLayerEnd) continue;

        for(int i = 0; i < 12; i++) {
          if(i >= uMaxIterations) break;  // 早期退出优化

          // cellSize 控制雪花大小：基础值 + 迭代增量
          // 原始值是 2.0 + i*3.0，改成 2.0 + i*2.0 让雪花整体更小
          float cellSize = 2.0 + (float(i) * 2.0);
          float downSpeed = 0.3 + (sin(time * 0.4 + float(k + i * 20)) + 1.0) * 0.00008;

          // 视差偏移：不同层使用不同强度
          float parallaxFactor = 0.5 + float(k) * 0.1;
          vec2 mouseOffset = uMouse * parallaxFactor;

          vec2 uv = (fragCoord.xy / uResolution.x) + mouseOffset + vec2(
            // X 方向：关闭横向漂移，只保留纯垂直下落
            0.0,
            // Y 方向下落
            downSpeed * (time + float(k * 1352)) * (1.0 / float(i))
          );

          vec2 uvStep = (ceil((uv) * cellSize - vec2(0.5, 0.5)) / cellSize);
          float x = fract(sin(dot(uvStep.xy, vec2(12.9898 + float(k) * 12.0, 78.233 + float(k) * 315.156))) * 43758.5453 + float(k) * 12.0) - 0.5;
          float y = fract(sin(dot(uvStep.xy, vec2(62.2364 + float(k) * 23.0, 94.674 + float(k) * 95.0))) * 62159.8432 + float(k) * 12.0) - 0.5;

          // 雪花微小晃动效果（减小幅度避免往上飘感）
          float randomMagnitude1 = uSinTime * 0.4 / cellSize;
          float randomMagnitude2 = uCosTime * 0.4 / cellSize;

          float d = 5.0 * distance((uvStep.xy + vec2(x * sin(y), y) * randomMagnitude1 + vec2(y, x) * randomMagnitude2), uv.xy);

          float omiVal = fract(sin(dot(uvStep.xy, vec2(32.4691, 94.615))) * 31572.1684);
          if(omiVal < 0.08) {
            float newd = (x + 1.0) * 0.4 * clamp(1.9 - d * (15.0 + (x * 6.3)) * (cellSize / 1.4), 0.0, 1.0);
            snow += newd;
          }
        }
      }

      // 补偿因子：原来 72 次迭代，现在减少到 maxLayers * maxIterations
      // 需要放大 snow 值来补偿减少的迭代次数
      float compensationFactor = 72.0 / float(uMaxLayers * uMaxIterations);
      float alpha = snow * uIntensity * compensationFactor;
      gl_FragColor = vec4(1.0, 1.0, 1.0, alpha);
    }
  `,
};

interface SnowParticlesProps {
  speed?: number;
  intensity?: number;
  /** 视差位置 ref，由父组件通过 Motion spring 更新 */
  parallaxRef?: RefObject<{ x: number; y: number }>;
  /** 渲染的层范围 [start, end]，默认 [0, 5] 全部渲染 */
  layerRange?: [number, number];
  /** 最大层数，用于性能优化 (桌面: 3, 移动: 2) */
  maxLayers?: number;
  /** 每层最大迭代次数，用于性能优化 (桌面: 4, 移动: 3) */
  maxIterations?: number;
}

export function SnowParticles({
  speed = 1,
  intensity = 0.6,
  parallaxRef,
  layerRange = [0, 5],
  maxLayers = 3,
  maxIterations = 4,
}: SnowParticlesProps) {
  const shaderMaterial = useRef<THREE.ShaderMaterial>(null);
  const prevSize = useRef({ width: 0, height: 0 });
  const { size } = useThree();

  const [layerStart, layerEnd] = layerRange;

  const uniforms = useMemo(
    () => ({
      uTime: { value: 0 },
      uResolution: { value: new THREE.Vector2(1, 1) },
      uSpeed: { value: speed },
      uIntensity: { value: intensity },
      uMouse: { value: new THREE.Vector2(0, 0) },
      uLayerStart: { value: layerStart },
      uLayerEnd: { value: layerEnd },
      uMaxLayers: { value: maxLayers },
      uMaxIterations: { value: maxIterations },
      uSinTime: { value: 0 },
      uCosTime: { value: 0 },
    }),
    [speed, intensity, layerStart, layerEnd, maxLayers, maxIterations],
  );

  // 更新时间、分辨率、三角函数和鼠标视差
  useFrame((state) => {
    if (shaderMaterial.current) {
      const time = state.clock.getElapsedTime();
      shaderMaterial.current.uniforms.uTime.value = time;

      // 预计算三角函数值，减少 GPU 端每像素的计算
      shaderMaterial.current.uniforms.uSinTime.value = Math.sin(time * 2.5);
      shaderMaterial.current.uniforms.uCosTime.value = Math.cos(time * 2.5);

      // 仅在尺寸变化时更新分辨率，并应用分辨率上限
      if (prevSize.current.width !== size.width || prevSize.current.height !== size.height) {
        const cappedWidth = Math.min(size.width, MAX_RESOLUTION_WIDTH);
        const cappedHeight = Math.min(size.height, MAX_RESOLUTION_HEIGHT);
        shaderMaterial.current.uniforms.uResolution.value.set(cappedWidth, cappedHeight);
        prevSize.current = { width: size.width, height: size.height };
      }

      // 更新鼠标视差
      if (parallaxRef) {
        shaderMaterial.current.uniforms.uMouse.value.set(parallaxRef.current.x, parallaxRef.current.y);
      }
    }
  });

  return (
    <mesh>
      {/* 全屏四边形，覆盖整个视口 */}
      <planeGeometry args={[2, 2]} />
      <shaderMaterial
        ref={shaderMaterial}
        transparent
        depthWrite={false}
        blending={THREE.AdditiveBlending}
        uniforms={uniforms}
        vertexShader={SnowShaderMaterial.vertexShader}
        fragmentShader={SnowShaderMaterial.fragmentShader}
      />
    </mesh>
  );
}

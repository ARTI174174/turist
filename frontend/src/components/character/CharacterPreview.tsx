'use client';

import { useEffect, useRef } from 'react';
import * as THREE from 'three';

interface CharacterPreviewProps {
  archetype: 'male' | 'female';
  className?: string;
}

/**
 * MVP-плейсхолдер персонажа: простая низкополигональная фигура из примитивов
 * (капсула + сфера + акценты цвета архетипа), с вращением по drag.
 * В проде заменяется на загрузку реальной glTF/GLB-модели с риггом и анимациями
 * (см. SRS FR-CHAR-01..07): базовая экипировка футболка/шорты/кроссовки/рюкзак.
 */
export function CharacterPreview({ archetype, className }: CharacterPreviewProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const width = container.clientWidth || 280;
    const height = container.clientHeight || 320;

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(35, width / height, 0.1, 100);
    camera.position.set(0, 1.2, 4.2);

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    container.appendChild(renderer.domElement);

    const hemi = new THREE.HemisphereLight(0xEFE8D8, 0x1F4235, 1.1);
    scene.add(hemi);
    const dir = new THREE.DirectionalLight(0xffffff, 0.8);
    dir.position.set(2, 4, 3);
    scene.add(dir);

    const group = new THREE.Group();

    const accentColor = archetype === 'male' ? 0x2e5b47 : 0xc68a3a;
    const bodyMat = new THREE.MeshStandardMaterial({ color: 0xEFE8D8, roughness: 0.6 });
    const accentMat = new THREE.MeshStandardMaterial({ color: accentColor, roughness: 0.5 });

    const torso = new THREE.Mesh(new THREE.CapsuleGeometry(0.45, 0.9, 6, 12), accentMat);
    torso.position.y = 1.05;
    group.add(torso);

    const head = new THREE.Mesh(new THREE.SphereGeometry(0.32, 20, 20), bodyMat);
    head.position.y = 1.85;
    group.add(head);

    const backpack = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.6, 0.28), accentMat);
    backpack.position.set(0, 1.05, -0.42);
    group.add(backpack);

    const legL = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.14, 0.85, 10), bodyMat);
    legL.position.set(-0.2, 0.15, 0);
    const legR = legL.clone();
    legR.position.x = 0.2;
    group.add(legL, legR);

    scene.add(group);

    let isDragging = false;
    let lastX = 0;
    let rotationY = 0.4;
    group.rotation.y = rotationY;

    const onPointerDown = (e: PointerEvent) => {
      isDragging = true;
      lastX = e.clientX;
    };
    const onPointerMove = (e: PointerEvent) => {
      if (!isDragging) return;
      const delta = e.clientX - lastX;
      rotationY += delta * 0.01;
      lastX = e.clientX;
    };
    const onPointerUp = () => {
      isDragging = false;
    };

    renderer.domElement.addEventListener('pointerdown', onPointerDown);
    window.addEventListener('pointermove', onPointerMove);
    window.addEventListener('pointerup', onPointerUp);

    let raf = 0;
    const animate = () => {
      if (!isDragging) rotationY += 0.0025; // лёгкое ambient-вращение, когда не крутят руками
      group.rotation.y = rotationY;
      renderer.render(scene, camera);
      raf = requestAnimationFrame(animate);
    };
    animate();

    return () => {
      cancelAnimationFrame(raf);
      renderer.domElement.removeEventListener('pointerdown', onPointerDown);
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerup', onPointerUp);
      renderer.dispose();
      container.removeChild(renderer.domElement);
    };
  }, [archetype]);

  return <div ref={containerRef} className={className} />;
}

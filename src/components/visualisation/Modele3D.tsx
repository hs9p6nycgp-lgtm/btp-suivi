"use client";

import * as THREE from "three";
import { useEffect, useRef, useState } from "react";

type SectionData = {
  id: string;
  nom: string;
  pk_debut: number | null;
  pk_fin: number | null;
  niveau: string | null;
  lot: string | null;
  type_ouvrage: string | null;
};

type ChantierData = {
  id: string;
  nom: string;
  type: string;
  longueur: number;
  largeur: number;
  hauteur: number;
};

export default function Modele3D({
  chantier,
  sections,
}: {
  chantier: ChantierData | null;
  sections: SectionData[];
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    if (!containerRef.current || !chantier) return;

    const longueur = chantier.longueur || 20;
    const largeur = chantier.largeur || 10;
    const hauteur = chantier.hauteur || 5;

    // Configuration de la scène
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0xf0f4f8);
    scene.fog = new THREE.Fog(0xf0f4f8, 10, 50);

    // Caméra
    const camera = new THREE.PerspectiveCamera(45, containerRef.current.clientWidth / containerRef.current.clientHeight, 0.1, 100);
    camera.position.set(15, 15, 15);
    camera.lookAt(0, 0, 0);

    // Rendu
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(containerRef.current.clientWidth, containerRef.current.clientHeight);
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    const containerEl = containerRef.current!;
    containerEl.appendChild(renderer.domElement);

    // Lumières
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
    scene.add(ambientLight);

    const dirLight = new THREE.DirectionalLight(0xffffff, 1);
    dirLight.position.set(5, 10, 7);
    dirLight.castShadow = true;
    dirLight.shadow.mapSize.width = 1024;
    dirLight.shadow.mapSize.height = 1024;
    scene.add(dirLight);

    const pointLight = new THREE.PointLight(0xffaa00, 0.5);
    pointLight.position.set(-5, 5, 5);
    scene.add(pointLight);

    // Grille au sol
    const gridHelper = new THREE.GridHelper(40, 40, 0xcccccc, 0x888888);
    gridHelper.position.y = 0;
    scene.add(gridHelper);

    // Aides
    const axesHelper = new THREE.AxesHelper(5);
    scene.add(axesHelper);

    // Fonction pour créer un élément 3D
    function creerElement3D(
      type: string,
      position: THREE.Vector3,
      dimensions: { x: number; y: number; z: number },
      color: string
    ) {
      let geometry: THREE.BoxGeometry | THREE.CylinderGeometry | THREE.SphereGeometry;
      let material: THREE.MeshStandardMaterial;

      switch (type) {
        case "mur":
          geometry = new THREE.BoxGeometry(dimensions.x, dimensions.y, dimensions.z);
          material = new THREE.MeshStandardMaterial({ color: color, roughness: 0.7 });
          break;
        case "pilier":
          geometry = new THREE.CylinderGeometry(dimensions.x / 2, dimensions.x / 2, dimensions.y, 8);
          material = new THREE.MeshStandardMaterial({ color: color, roughness: 0.6 });
          break;
        case "dalle":
          geometry = new THREE.BoxGeometry(dimensions.x, 0.2, dimensions.z);
          material = new THREE.MeshStandardMaterial({ color: color, roughness: 0.8 });
          break;
        default:
          geometry = new THREE.BoxGeometry(dimensions.x, dimensions.y, dimensions.z);
          material = new THREE.MeshStandardMaterial({ color: color, roughness: 0.7 });
      }

      const mesh = new THREE.Mesh(geometry, material);
      mesh.position.copy(position);
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      mesh.userData = { type, nom: type };
      scene.add(mesh);
      return mesh;
    }

    // Créer le bâtiment basé sur les données du chantier
    const epaisseurMur = 0.3;

    // Mur avant
    creerElement3D(
      "mur",
      new THREE.Vector3(0, hauteur / 2, largeur / 2),
      { x: longueur, y: hauteur, z: epaisseurMur },
      "#8b7355"
    );

    // Mur arrière
    creerElement3D(
      "mur",
      new THREE.Vector3(0, hauteur / 2, -largeur / 2),
      { x: longueur, y: hauteur, z: epaisseurMur },
      "#8b7355"
    );

    // Mur gauche
    creerElement3D(
      "mur",
      new THREE.Vector3(-longueur / 2, hauteur / 2, 0),
      { x: epaisseurMur, y: hauteur, z: largeur },
      "#8b7355"
    );

    // Mur droit
    creerElement3D(
      "mur",
      new THREE.Vector3(longueur / 2, hauteur / 2, 0),
      { x: epaisseurMur, y: hauteur, z: largeur },
      "#8b7355"
    );

    // Dalle / Toit
    creerElement3D(
      "dalle",
      new THREE.Vector3(0, hauteur + 0.1, 0),
      { x: longueur + 0.6, y: 0.2, z: largeur + 0.6 },
      "#6b5b45"
    );

    // Piliers aux coins
    const rayonPilier = 0.4;
    const hauteurPilier = hauteur;
    const positionsPiliers = [
      [-longueur / 2 + rayonPilier, hauteurPilier / 2, -largeur / 2 + rayonPilier],
      [longueur / 2 - rayonPilier, hauteurPilier / 2, -largeur / 2 + rayonPilier],
      [-longueur / 2 + rayonPilier, hauteurPilier / 2, largeur / 2 - rayonPilier],
      [longueur / 2 - rayonPilier, hauteurPilier / 2, largeur / 2 - rayonPilier],
    ];

    positionsPiliers.forEach((pos) => {
      creerElement3D(
        "pilier",
        new THREE.Vector3(pos[0], pos[1], pos[2]),
        { x: rayonPilier * 2, y: hauteurPilier, z: rayonPilier * 2 },
        "#4a4a4a"
      );
    });

    // Créer les sections comme des éléments distincts
    sections.forEach((section, index) => {
      const couleurSection = index % 2 === 0 ? "#4a90e2" : "#50c878";
      creerElement3D(
        "section",
        new THREE.Vector3(
          section.pk_debut !== null ? section.pk_debut - longueur / 2 + 5 : index * 5 - longueur / 2 + 5,
          2,
          0
        ),
        { x: section.pk_fin !== null && section.pk_debut !== null ? section.pk_fin - section.pk_debut : 3,
          y: 3,
          z: 2 },
        couleurSection
      );
    });

    // Contrôles de caméra simples (orbite manuelle)
    let isDragging = false;
    let previousMousePosition = { x: 0, y: 0 };

    const onMouseDown = (event: MouseEvent) => {
      isDragging = true;
      previousMousePosition = { x: event.clientX, y: event.clientY };
    };

    const onMouseMove = (event: MouseEvent) => {
      if (!isDragging) return;
      const deltaMove = {
        x: event.clientX - previousMousePosition.x,
        y: event.clientY - previousMousePosition.y,
      };

      const rotateSpeed = 0.005;
      camera.position.x -= deltaMove.x * rotateSpeed * 5;
      camera.position.z -= deltaMove.y * rotateSpeed * 5;
      camera.lookAt(0, hauteur / 2, 0);

      previousMousePosition = { x: event.clientX, y: event.clientY };
    };

    const onMouseUp = () => {
      isDragging = false;
    };

    const onMouseWheel = (event: WheelEvent) => {
      const zoomSpeed = 0.1;
      camera.position.addScaledVector(camera.position.clone().normalize(), -event.deltaY * zoomSpeed * 0.001);
      camera.lookAt(0, hauteur / 2, 0);
    };

    if (containerEl) {
      containerEl.addEventListener("mousedown", onMouseDown);
      containerEl.addEventListener("mousemove", onMouseMove);
    }
    window.addEventListener("mouseup", onMouseUp);
    if (containerEl) {
      containerEl.addEventListener("wheel", onMouseWheel);
    }

    // Animation
    const animer = () => {
      requestAnimationFrame(animer);
      renderer.render(scene, camera);
    };
    animer();

    // Gestion du redimensionnement
    const onResize = () => {
      if (containerEl) {
        camera.aspect = containerEl.clientWidth / containerEl.clientHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(containerEl.clientWidth, containerEl.clientHeight);
      }
    };
    window.addEventListener("resize", onResize);

    setIsLoaded(true);

    return () => {
      if (containerEl) {
        containerEl.removeEventListener("mousedown", onMouseDown);
        containerEl.removeEventListener("mousemove", onMouseMove);
        containerEl.removeEventListener("wheel", onMouseWheel);
      }
      window.removeEventListener("mouseup", onMouseUp);
      window.removeEventListener("resize", onResize);
      renderer.dispose();
    };
  }, [chantier, sections]);

  if (!chantier) {
    return (
      <div className="flex h-full items-center justify-center bg-slate-100 rounded-xl border border-slate-200">
        <p className="text-slate-500 text-sm">Aucune donnée de chantier pour la visualisation 3D</p>
      </div>
    );
  }

  return (
    <div className="relative h-[600px] w-full rounded-xl border border-slate-200 bg-slate-50 overflow-hidden">
      <div ref={containerRef} className="h-full w-full" />
      {!isLoaded && (
        <div className="absolute inset-0 flex items-center justify-center bg-white/90 backdrop-blur-sm">
          <div className="animate-pulse rounded-full h-8 w-8 bg-orange-600"></div>
        </div>
      )}
      <div className="absolute bottom-4 left-4 right-4 flex justify-between text-xs text-slate-500 pointer-events-none">
        <span>🏗️ Modèle 3D - {chantier.nom}</span>
        <span>Cliquer + glisser : rotation | Molette : zoom</span>
      </div>
    </div>
  );
}
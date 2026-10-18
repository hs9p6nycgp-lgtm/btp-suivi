"use client";

// Affichage 3D générique d'un modèle décrit par `modele3dDevis`
// (src/lib/devis/model3d.ts) : boîtes et cylindres, en mètres.
//
// Différences avec `Modele3D.tsx` (visualisation de chantier) :
// - prend en entrée un objet `Modele3D` prêt (aucun calcul de géométrie ici) ;
// - cadre la caméra sur la boîte englobante (`centre` + `dimensions`) ;
// - garde la grille au sol à Y = 0 (certains éléments sont sous le sol :
//   pieux, conduites, regards) ;
// - libère proprement la mémoire (géométries, matériaux, canvas) à chaque
//   mise à jour, car le modèle change à chaque saisie.
//
// Conventions lues depuis `modele3d.ts` : X = longueur, Y = hauteur, Z = largeur ;
// `position` = centre de l'élément ; `rotation` en degrés (un seul axe à la fois).

import { Box } from "lucide-react";
import * as THREE from "three";
import { useEffect, useRef, useState } from "react";
import { gsap } from "gsap";
import type { Modele3D } from "@/lib/devis/model3d";

type Props = {
  /** Modèle à afficher (null → message d'attente). */
  modele: Modele3D | null;
  /** Classe Tailwind de hauteur du cadre 3D (défaut : h-[420px]). */
  hauteur?: string;
  /** Petite étiquette en bas à gauche (défaut : nom du modèle). */
  legende?: string;
};

const AZIMUT_DEFAUT = Math.PI / 4;
const ELEVATION_DEFAUT = Math.PI / 3.2; // vue en légère plongée

export default function Modele3DGenerique({ modele, hauteur = "h-[420px]", legende }: Props) {
  const conteneurRef = useRef<HTMLDivElement>(null);
  const infoRef = useRef<HTMLDivElement>(null);
  const [pret, setPret] = useState(false);
  const premierRendu = useRef(true);
  const dernierTemplate = useRef<string | null>(null);

  useEffect(() => {
    const conteneur = conteneurRef.current;
    if (!conteneur || !modele) return;

    const maxDim = Math.max(...modele.dimensions, 1);
    const cible = new THREE.Vector3(...modele.centre);
    const rayonDefaut = 1.8 * maxDim;
    const rayonMin = Math.max(maxDim * 0.15, 0.5);
    const rayonMax = 6 * maxDim;

    // Point de vue orbital : azimut + élévation + distance autour du centre.
    const vue = { theta: AZIMUT_DEFAUT, phi: ELEVATION_DEFAUT, rayon: rayonDefaut };

    const calculerPosition = () =>
      new THREE.Vector3(
        cible.x + vue.rayon * Math.sin(vue.phi) * Math.sin(vue.theta),
        cible.y + vue.rayon * Math.cos(vue.phi),
        cible.z + vue.rayon * Math.sin(vue.phi) * Math.cos(vue.theta),
      );

    // --------------------------------------------------------------
    // Scène
    // --------------------------------------------------------------
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0xeef2f7);
    scene.fog = new THREE.Fog(0xeef2f7, 2.5 * maxDim, 10 * maxDim);

    const largeurPx = Math.max(conteneur.clientWidth, 1);
    const hauteurPx = Math.max(conteneur.clientHeight, 1);
    const camera = new THREE.PerspectiveCamera(45, largeurPx / hauteurPx, maxDim / 500, maxDim * 50);
    camera.position.copy(calculerPosition());
    camera.lookAt(cible);

    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(largeurPx, hauteurPx);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.domElement.style.display = "block";
    conteneur.appendChild(renderer.domElement);

    // Lumières (mêmes réglages généraux que Modele3D.tsx)
    scene.add(new THREE.AmbientLight(0xffffff, 0.6));
    const dirLight = new THREE.DirectionalLight(0xffffff, 1);
    dirLight.position.set(maxDim * 1.5, maxDim * 2.5, maxDim * 1.8);
    dirLight.castShadow = true;
    dirLight.shadow.mapSize.set(1024, 1024);
    const d = maxDim * 1.6;
    dirLight.shadow.camera.left = -d;
    dirLight.shadow.camera.right = d;
    dirLight.shadow.camera.top = d;
    dirLight.shadow.camera.bottom = -d;
    dirLight.shadow.camera.far = maxDim * 12;
    dirLight.shadow.camera.updateProjectionMatrix();
    scene.add(dirLight);

    // Sol : grille fixée à Y = 0 (des éléments sont sous le sol)
    const tailleGrille = Math.max(2, maxDim * 3);
    const grille = new THREE.GridHelper(tailleGrille, 20, 0x94a3b8, 0xcdd7e3);
    (grille.material as THREE.Material).transparent = true;
    (grille.material as THREE.Material).opacity = 0.9;
    scene.add(grille);

    // --------------------------------------------------------------
    // Éléments du modèle
    // --------------------------------------------------------------
    const DEG = THREE.MathUtils.degToRad;
    const meshes: THREE.Mesh[] = [];

    for (const element of modele.elements) {
      const geometrie =
        element.forme === "cylindre"
          ? new THREE.CylinderGeometry(element.taille[0] / 2, element.taille[0] / 2, element.taille[1], 24)
          : new THREE.BoxGeometry(element.taille[0], element.taille[1], element.taille[2]);
      const materiau = new THREE.MeshStandardMaterial({
        color: element.couleur,
        roughness: 0.68,
        metalness: 0.05,
      });
      const mesh = new THREE.Mesh(geometrie, materiau);
      mesh.position.set(...element.position);
      if (element.rotation) {
        mesh.rotation.set(DEG(element.rotation[0]), DEG(element.rotation[1]), DEG(element.rotation[2]));
      }
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      mesh.userData.libelle = element.libelle; // affiché au survol
      scene.add(mesh);
      meshes.push(mesh);
    }

    // --------------------------------------------------------------
    // Animation d'apparition
    // - complète au premier affichage ou au changement de projet ;
    // - simple fondu quand seule une saisie a changé (évite le clignotement).
    // --------------------------------------------------------------
    const estNouveauProjet = modele.templateId !== dernierTemplate.current;
    const animerEntree = premierRendu.current || estNouveauProjet;
    premierRendu.current = false;
    dernierTemplate.current = modele.templateId;

    const ctx = gsap.context(() => {
      if (animerEntree) {
        // La caméra part de plus loin puis se pose sur la vue finale
        const arrivee = calculerPosition();
        camera.position.copy(cible.clone().add(arrivee.clone().sub(cible).multiplyScalar(2.2)));
        camera.lookAt(cible);
        gsap.to(camera.position, {
          x: arrivee.x,
          y: arrivee.y,
          z: arrivee.z,
          duration: 1.2,
          ease: "power3.out",
          onUpdate: () => camera.lookAt(cible),
        });

        meshes.forEach((mesh, index) => {
          const materiau = mesh.material as THREE.MeshStandardMaterial;
          materiau.transparent = true;
          materiau.opacity = 0;
          mesh.scale.setScalar(0.01);
          const retard = 0.25 + index * 0.04;
          gsap.to(mesh.scale, { x: 1, y: 1, z: 1, duration: 0.55, delay: retard, ease: "back.out(1.6)" });
          gsap.to(materiau, { opacity: 1, duration: 0.4, delay: retard, ease: "power2.out" });
        });
      } else {
        meshes.forEach((mesh) => {
          const materiau = mesh.material as THREE.MeshStandardMaterial;
          materiau.transparent = true;
          materiau.opacity = 0;
          gsap.to(materiau, { opacity: 1, duration: 0.25, ease: "power1.out" });
        });
      }
    }, conteneur);

    // --------------------------------------------------------------
    // Interactions : glisser = rotation, molette = zoom, double-clic = recentrer
    // --------------------------------------------------------------
    const raycaster = new THREE.Raycaster();
    const pointEcran = new THREE.Vector2();
    let enRotation = false;
    let dernierX = 0;
    let dernierY = 0;
    const info = () => infoRef.current;
    const cacherInfobulle = () => {
      const bulle = info();
      if (bulle) bulle.style.display = "none";
    };

    const onPointerDown = (e: PointerEvent) => {
      if (e.button !== 0) return;
      enRotation = true;
      dernierX = e.clientX;
      dernierY = e.clientY;
      conteneur.setPointerCapture(e.pointerId);
      conteneur.style.cursor = "grabbing";
      cacherInfobulle();
    };

    const onPointerMove = (e: PointerEvent) => {
      const rectangle = conteneur.getBoundingClientRect();

      if (enRotation) {
        const dx = e.clientX - dernierX;
        const dy = e.clientY - dernierY;
        dernierX = e.clientX;
        dernierY = e.clientY;
        vue.theta -= dx * 0.008;
        vue.phi = Math.min(Math.PI - 0.2, Math.max(0.2, vue.phi - dy * 0.008));
        camera.position.copy(calculerPosition());
        camera.lookAt(cible);
        return;
      }

      // Survol : afficher le libellé de l'élément sous le curseur
      pointEcran.set(
        ((e.clientX - rectangle.left) / rectangle.width) * 2 - 1,
        -((e.clientY - rectangle.top) / rectangle.height) * 2 + 1,
      );
      raycaster.setFromCamera(pointEcran, camera);
      const touche = raycaster.intersectObjects(meshes, false)[0];
      const bulle = info();
      if (!bulle) return;
      if (touche) {
        bulle.textContent = String(touche.object.userData.libelle ?? "");
        bulle.style.display = "block";
        bulle.style.left = `${e.clientX - rectangle.left + 12}px`;
        bulle.style.top = `${e.clientY - rectangle.top + 12}px`;
      } else {
        bulle.style.display = "none";
      }
    };

    const onPointerUp = (e: PointerEvent) => {
      if (!enRotation) return;
      enRotation = false;
      if (conteneur.hasPointerCapture(e.pointerId)) conteneur.releasePointerCapture(e.pointerId);
      conteneur.style.cursor = "grab";
    };

    const onPointerLeave = () => cacherInfobulle();

    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      vue.rayon = Math.min(rayonMax, Math.max(rayonMin, vue.rayon * (1 + e.deltaY * 0.0012)));
      camera.position.copy(calculerPosition());
      camera.lookAt(cible);
    };

    const onDoubleClick = () => {
      vue.theta = AZIMUT_DEFAUT;
      vue.phi = ELEVATION_DEFAUT;
      vue.rayon = rayonDefaut;
      const arrivee = calculerPosition();
      gsap.to(camera.position, {
        x: arrivee.x,
        y: arrivee.y,
        z: arrivee.z,
        duration: 0.6,
        ease: "power2.inOut",
        onUpdate: () => camera.lookAt(cible),
      });
    };

    conteneur.style.cursor = "grab";
    conteneur.style.touchAction = "none"; // glisser au doigt sans faire défiler la page
    conteneur.addEventListener("pointerdown", onPointerDown);
    conteneur.addEventListener("pointermove", onPointerMove);
    conteneur.addEventListener("pointerup", onPointerUp);
    conteneur.addEventListener("pointercancel", onPointerUp);
    conteneur.addEventListener("pointerleave", onPointerLeave);
    conteneur.addEventListener("wheel", onWheel, { passive: false });
    conteneur.addEventListener("dblclick", onDoubleClick);

    // --------------------------------------------------------------
    // Boucle de rendu + adaptation à la taille du cadre
    // --------------------------------------------------------------
    let rafId = 0;
    const animer = () => {
      rafId = requestAnimationFrame(animer);
      renderer.render(scene, camera);
    };
    rafId = requestAnimationFrame(animer);

    const observateur = new ResizeObserver(() => {
      const l = Math.max(conteneur.clientWidth, 1);
      const h = Math.max(conteneur.clientHeight, 1);
      camera.aspect = l / h;
      camera.updateProjectionMatrix();
      renderer.setSize(l, h);
    });
    observateur.observe(conteneur);

    setPret(true);

    return () => {
      cancelAnimationFrame(rafId);
      observateur.disconnect();
      ctx.revert();
      conteneur.removeEventListener("pointerdown", onPointerDown);
      conteneur.removeEventListener("pointermove", onPointerMove);
      conteneur.removeEventListener("pointerup", onPointerUp);
      conteneur.removeEventListener("pointercancel", onPointerUp);
      conteneur.removeEventListener("pointerleave", onPointerLeave);
      conteneur.removeEventListener("wheel", onWheel);
      conteneur.removeEventListener("dblclick", onDoubleClick);
      // Libération mémoire : géométries et matériaux
      meshes.forEach((mesh) => {
        mesh.geometry.dispose();
        (mesh.material as THREE.Material).dispose();
      });
      grille.geometry.dispose();
      (grille.material as THREE.Material).dispose();
      renderer.dispose();
      if (renderer.domElement.parentElement === conteneur) {
        conteneur.removeChild(renderer.domElement);
      }
    };
  }, [modele]);

  if (!modele) {
    return (
      <div className={`flex items-center justify-center rounded-2xl border border-border/80 bg-surface-2 ${hauteur}`}>
        <p className="text-sm text-muted">Aucun modèle 3D pour ce projet.</p>
      </div>
    );
  }

  return (
    <div>
      <div className={`relative w-full overflow-hidden rounded-2xl border border-border/80 shadow-soft ${hauteur}`}>
        <div ref={conteneurRef} className="h-full w-full" />

        {!pret && (
          <div className="absolute inset-0 flex items-center justify-center bg-slate-100/90">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-slate-300 border-t-slate-500" />
          </div>
        )}

        {/* Info-bulle au survol d'un élément (positionnée en JavaScript) */}
        <div
          ref={infoRef}
          style={{ display: "none" }}
          className="pointer-events-none absolute z-10 max-w-[240px] rounded-lg bg-slate-900/90 px-2.5 py-1.5 text-[11px] font-medium text-white shadow-lg"
        />

        {/* Légende et aide (couleurs fixes : le fond 3D est toujours clair) */}
        <div className="pointer-events-none absolute bottom-3 left-4 right-4 flex flex-wrap items-center justify-between gap-2 text-[11px]">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-white/85 px-2.5 py-1 font-semibold text-slate-600 backdrop-blur">
            <Box className="h-3.5 w-3.5" />
            {legende ?? modele.nom}
          </span>
          <span className="rounded-full border border-slate-200 bg-white/85 px-2.5 py-1 text-slate-500 backdrop-blur">
            Glisser : rotation · Molette : zoom · Double-clic : recentrer
          </span>
        </div>
      </div>

      <p className="mt-2 text-xs text-muted">{modele.resume}</p>
    </div>
  );
}

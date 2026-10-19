"use client";

import { Box, Maximize2 } from "lucide-react";
import * as THREE from "three";
import { gsap } from "gsap";
import { useEffect, useMemo, useRef, useState } from "react";

import {
  COULEURS_AVANCEMENT,
  construireSceneChantier,
  pasGrille,
  type ChantierScene,
  type SectionScene,
} from "@/lib/chantiers/scene3d";
import { formaterMetres, formaterPK } from "@/lib/chantiers/complet";

// Rendu 3D du chantier : la geometrie et les positions viennent du moteur pur
// `src/lib/chantiers/scene3d.ts` (echelle reelle en metres). Ce composant ne fait que :
// - fabriquer les volumes Three.js, la grille et les etiquettes ;
// - cadrer la camera automatiquement selon la taille du modele ;
// - gerer rotation / zoom / recentrage et l'habillage d'information.

function nombreFormat(valeur: number): string {
  return valeur.toLocaleString("fr-FR", { maximumFractionDigits: 1 });
}

export default function Modele3D({
  chantier,
  sections,
  hauteur = 600,
}: {
  chantier: ChantierScene | null;
  sections: SectionScene[];
  /** Hauteur du cadre en pixels (l'aperçu de création est plus compact). */
  hauteur?: number;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const resetRef = useRef<(() => void) | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);

  // La cle JSON evite de reconstruire la scene quand le parent rend un objet identique.
  const cleDonnees = JSON.stringify({ chantier, sections });
  const scene = useMemo(
    () => construireSceneChantier(chantier, sections ?? []),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [cleDonnees],
  );

  useEffect(() => {
    const conteneur = containerRef.current;
    if (!conteneur || !scene) return;

    setIsLoaded(false);
    const largeurEcran = conteneur.clientWidth || 800;
    const hauteurEcran = conteneur.clientHeight || 600;
    const rayon = scene.rayon;
    const ombresActives = rayon < 250;

    // --- Scene, camera et rendu ---
    const threeScene = new THREE.Scene();
    const couleurFond = new THREE.Color(0xeef2f6);
    threeScene.background = couleurFond;
    threeScene.fog = new THREE.Fog(couleurFond, rayon * 3.2, rayon * 14);

    const camera = new THREE.PerspectiveCamera(
      45,
      largeurEcran / hauteurEcran,
      Math.max(0.05, rayon / 400),
      rayon * 90,
    );

    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.setSize(largeurEcran, hauteurEcran);
    renderer.shadowMap.enabled = ombresActives;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    const canvas = renderer.domElement;
    canvas.style.display = "block";
    canvas.style.touchAction = "none";
    canvas.style.cursor = "grab";
    conteneur.appendChild(canvas);

    // --- Lumieres ---
    threeScene.add(new THREE.HemisphereLight(0xffffff, 0xd9cfc0, 1.1));
    const soleil = new THREE.DirectionalLight(0xffffff, 1.9);
    soleil.position.set(rayon * 0.7, rayon * 1.6, rayon * 0.9);
    if (ombresActives) {
      soleil.castShadow = true;
      soleil.shadow.mapSize.set(2048, 2048);
      const ombre = soleil.shadow.camera;
      ombre.left = -rayon * 1.4;
      ombre.right = rayon * 1.4;
      ombre.top = rayon * 1.4;
      ombre.bottom = -rayon * 1.4;
      ombre.near = 0.1;
      ombre.far = rayon * 10;
      ombre.updateProjectionMatrix();
      soleil.shadow.bias = -0.0004;
    }
    threeScene.add(soleil);

    // --- Grille de reference (1 carreau = pas metres) ---
    const pas = pasGrille(rayon * 2);
    const tailleGrille = Math.ceil((rayon * 2.4) / pas) * pas;
    const grille = new THREE.GridHelper(
      tailleGrille,
      Math.max(2, Math.round(tailleGrille / pas)),
      0xb3bcc7,
      0xd8dee5,
    );
    grille.position.y = 0.02;
    threeScene.add(grille);

    // --- Volumes issus du moteur de scene ---
    const groupe = new THREE.Group();
    const geometrieBoite = new THREE.BoxGeometry(1, 1, 1);
    const geometrieCylindre = new THREE.CylinderGeometry(1, 1, 1, 20);
    const materiaux = new Map<string, THREE.MeshStandardMaterial>();

    const materiauDe = (couleur: string, opacite: number) => {
      const cle = `${couleur}|${opacite}`;
      let mat = materiaux.get(cle);
      if (!mat) {
        mat = new THREE.MeshStandardMaterial({
          color: new THREE.Color(couleur),
          roughness: 0.72,
          metalness: 0.05,
          transparent: opacite < 1,
          opacity: opacite,
          depthWrite: opacite >= 1,
        });
        materiaux.set(cle, mat);
      }
      return mat;
    };

    for (const el of scene.elements) {
      const opacite = el.opacite ?? 1;
      const cylindre = el.forme === "cylindre";
      const mesh = new THREE.Mesh(cylindre ? geometrieCylindre : geometrieBoite, materiauDe(el.couleur, opacite));
      mesh.position.set(el.position[0], el.position[1], el.position[2]);
      mesh.scale.set(cylindre ? el.taille[0] / 2 : el.taille[0], el.taille[1], cylindre ? el.taille[2] / 2 : el.taille[2]);
      if (el.rotation) mesh.rotation.set(el.rotation[0], el.rotation[1], el.rotation[2]);
      mesh.castShadow = ombresActives && opacite >= 0.6;
      mesh.receiveShadow = ombresActives && opacite >= 1;
      groupe.add(mesh);
    }

    // --- Etiquettes 3D (toujours lisibles, taille proportionnelle au modele) ---
    const textures: THREE.CanvasTexture[] = [];
    const materiauxSprites: THREE.SpriteMaterial[] = [];
    const hauteurEtiquette = Math.max(0.55, rayon * 0.06);

    const creerSprite = (texte: string, hauteurMonde: number) => {
      const police = '600 64px system-ui, -apple-system, "Segoe UI", sans-serif';
      const mesureur = document.createElement("canvas").getContext("2d");
      if (!mesureur) return null;
      mesureur.font = police;
      const largeurTexte = Math.ceil(mesureur.measureText(texte).width);

      const elementCanvas = document.createElement("canvas");
      const marge = 30;
      elementCanvas.width = largeurTexte + marge * 2;
      elementCanvas.height = 100;
      const ctx = elementCanvas.getContext("2d");
      if (!ctx) return null;
      ctx.font = police;
      const r = 26;
      ctx.beginPath();
      ctx.moveTo(r, 3);
      ctx.lineTo(elementCanvas.width - r, 3);
      ctx.quadraticCurveTo(elementCanvas.width - 3, 3, elementCanvas.width - 3, r);
      ctx.lineTo(elementCanvas.width - 3, elementCanvas.height - r);
      ctx.quadraticCurveTo(elementCanvas.width - 3, elementCanvas.height - 3, elementCanvas.width - r, elementCanvas.height - 3);
      ctx.lineTo(r, elementCanvas.height - 3);
      ctx.quadraticCurveTo(3, elementCanvas.height - 3, 3, elementCanvas.height - r);
      ctx.lineTo(3, r);
      ctx.quadraticCurveTo(3, 3, r, 3);
      ctx.closePath();
      ctx.fillStyle = "rgba(255, 255, 255, 0.94)";
      ctx.fill();
      ctx.lineWidth = 3;
      ctx.strokeStyle = "rgba(148, 163, 184, 0.9)";
      ctx.stroke();
      ctx.fillStyle = "#1f2937";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(texte, elementCanvas.width / 2, elementCanvas.height / 2 + 2);

      const texture = new THREE.CanvasTexture(elementCanvas);
      texture.colorSpace = THREE.SRGBColorSpace;
      texture.anisotropy = 4;
      textures.push(texture);

      const materiau = new THREE.SpriteMaterial({ map: texture, transparent: true, depthTest: false });
      materiauxSprites.push(materiau);
      const sprite = new THREE.Sprite(materiau);
      sprite.renderOrder = 10;
      sprite.scale.set((hauteurMonde * elementCanvas.width) / elementCanvas.height, hauteurMonde, 1);
      return sprite;
    };

    for (const etiquette of scene.etiquettes) {
      const sprite = creerSprite(etiquette.texte, hauteurEtiquette);
      if (sprite) {
        sprite.position.set(etiquette.position[0], etiquette.position[1], etiquette.position[2]);
        groupe.add(sprite);
      }
    }
    threeScene.add(groupe);

    // --- Vue orbitale : cadrage automatique selon la taille du modele ---
    const cible = new THREE.Vector3(0, Math.min(rayon * 0.3, 8), 0);
    const distanceDefaut = (rayon / Math.sin((camera.fov / 2) * THREE.MathUtils.DEG2RAD)) * 1.25;
    const thetaDefaut = Math.PI * 0.18;
    const phiDefaut = Math.PI * 0.35;
    let theta = thetaDefaut;
    let phi = phiDefaut;
    let distance = distanceDefaut;

    const rendu = () => renderer.render(threeScene, camera);
    const majCamera = () => {
      const sinPhi = Math.sin(phi);
      camera.position.set(
        cible.x + distance * sinPhi * Math.sin(theta),
        cible.y + distance * Math.cos(phi),
        cible.z + distance * sinPhi * Math.cos(theta),
      );
      camera.lookAt(cible);
      rendu();
    };
    const bornerDistance = () => {
      distance = Math.min(rayon * 8, Math.max(rayon * 0.3, distance));
    };

    const intro = { d: distanceDefaut * 1.9 };
    distance = intro.d;
    majCamera();
    const tweenIntro = gsap.to(intro, {
      d: distanceDefaut,
      duration: 1.6,
      ease: "power3.out",
      onUpdate: () => {
        distance = intro.d;
        majCamera();
      },
      onComplete: () => setIsLoaded(true),
    });
    const arreterIntro = () => {
      tweenIntro.kill();
      setIsLoaded(true);
    };

    // --- Commandes : glisser = tourner, molette / pincement = zoom ---
    const pointeurs = new Map<number, { x: number; y: number }>();
    let distancePince = 0;

    const ecartPince = () => {
      const [a, b] = [...pointeurs.values()];
      return Math.hypot(a.x - b.x, a.y - b.y);
    };

    const onPointerDown = (event: PointerEvent) => {
      arreterIntro();
      pointeurs.set(event.pointerId, { x: event.clientX, y: event.clientY });
      canvas.setPointerCapture(event.pointerId);
      canvas.style.cursor = "grabbing";
      if (pointeurs.size === 2) distancePince = ecartPince();
    };

    const onPointerMove = (event: PointerEvent) => {
      const precedent = pointeurs.get(event.pointerId);
      if (!precedent) return;
      if (pointeurs.size === 1) {
        theta -= (event.clientX - precedent.x) * 0.006;
        phi = Math.min(Math.PI / 2 - 0.04, Math.max(0.08, phi - (event.clientY - precedent.y) * 0.006));
      }
      pointeurs.set(event.pointerId, { x: event.clientX, y: event.clientY });
      if (pointeurs.size === 2 && distancePince > 0) {
        const nouvelEcart = ecartPince();
        distance *= distancePince / Math.max(1, nouvelEcart);
        bornerDistance();
        distancePince = nouvelEcart;
      }
      majCamera();
    };

    const onPointerUp = (event: PointerEvent) => {
      pointeurs.delete(event.pointerId);
      if (pointeurs.size === 0) canvas.style.cursor = "grab";
      if (pointeurs.size < 2) distancePince = 0;
    };

    const onWheel = (event: WheelEvent) => {
      event.preventDefault();
      arreterIntro();
      distance *= Math.exp(event.deltaY * 0.0012);
      bornerDistance();
      majCamera();
    };

    canvas.addEventListener("pointerdown", onPointerDown);
    canvas.addEventListener("pointermove", onPointerMove);
    canvas.addEventListener("pointerup", onPointerUp);
    canvas.addEventListener("pointercancel", onPointerUp);
    canvas.addEventListener("wheel", onWheel, { passive: false });

    resetRef.current = () => {
      arreterIntro();
      theta = thetaDefaut;
      phi = phiDefaut;
      distance = distanceDefaut;
      majCamera();
    };

    // --- Adaptation au conteneur ---
    const observateur = new ResizeObserver(() => {
      const l = conteneur.clientWidth || 800;
      const h = conteneur.clientHeight || 600;
      camera.aspect = l / h;
      camera.updateProjectionMatrix();
      renderer.setSize(l, h);
      rendu();
    });
    observateur.observe(conteneur);

    return () => {
      tweenIntro.kill();
      resetRef.current = null;
      observateur.disconnect();
      canvas.removeEventListener("pointerdown", onPointerDown);
      canvas.removeEventListener("pointermove", onPointerMove);
      canvas.removeEventListener("pointerup", onPointerUp);
      canvas.removeEventListener("pointercancel", onPointerUp);
      canvas.removeEventListener("wheel", onWheel);
      geometrieBoite.dispose();
      geometrieCylindre.dispose();
      materiaux.forEach((m) => m.dispose());
      materiauxSprites.forEach((m) => m.dispose());
      textures.forEach((t) => t.dispose());
      const materiauxGrille = Array.isArray(grille.material) ? grille.material : [grille.material];
      materiauxGrille.forEach((m) => m.dispose());
      grille.geometry.dispose();
      renderer.dispose();
      if (canvas.parentElement === conteneur) conteneur.removeChild(canvas);
    };
  }, [scene]);

  if (!chantier) {
    return (
      <div className="flex items-center justify-center rounded-xl border border-border bg-surface px-6 text-center" style={{ height: hauteur }}>
        <p className="text-sm text-muted">Aucune donnée de chantier pour la visualisation 3D</p>
      </div>
    );
  }

  const resume = scene?.resume;
  const puces: string[] = [];
  if (resume) {
    if (scene?.type === "route") {
      puces.push(`Longueur ${formaterMetres(resume.longueur) ?? `${nombreFormat(resume.longueur)} m`}`);
      puces.push(`Chaussée ${nombreFormat(resume.largeur)} m`);
      if (resume.pkDebut !== null && resume.pkFin !== null) {
        puces.push(`${formaterPK(resume.pkDebut)} → ${formaterPK(resume.pkFin)}`);
      }
    } else {
      puces.push(`${nombreFormat(resume.longueur)} × ${nombreFormat(resume.largeur)} m`);
      if (resume.nbNiveaux !== null) puces.push(`${resume.nbNiveaux} niveau${resume.nbNiveaux > 1 ? "x" : ""}`);
    }
    if (resume.avancement !== null) puces.push(`Avancement ${nombreFormat(resume.avancement)} %`);
    if (resume.nbOuvragesAnnexes > 0) {
      puces.push(`${resume.nbOuvragesAnnexes} ouvrage${resume.nbOuvragesAnnexes > 1 ? "s" : ""} annexe${resume.nbOuvragesAnnexes > 1 ? "s" : ""}`);
    }
  }

  const pastilles = [
    { couleur: COULEURS_AVANCEMENT.attente, libelle: "0 %" },
    { couleur: COULEURS_AVANCEMENT.enCours, libelle: "En cours" },
    { couleur: COULEURS_AVANCEMENT.termine, libelle: "Terminé" },
  ];

  return (
    <div className="relative w-full overflow-hidden rounded-xl border border-border bg-surface" style={{ height: hauteur }}>
      <div ref={containerRef} className="h-full w-full" />

      {/* Bandeau : type du chantier et dimensions reelles */}
      <div className="pointer-events-none absolute inset-x-3 top-3 flex flex-wrap items-start justify-between gap-2">
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-white/90 px-3 py-1 text-xs font-semibold text-foreground shadow-sm backdrop-blur">
            <Box className="h-3.5 w-3.5 text-action" />
            {scene?.type === "route" ? "Route" : "Bâtiment"} — {chantier.nom}
          </span>
          {puces.map((puce) => (
            <span
              key={puce}
              className="rounded-full bg-white/80 px-2.5 py-1 text-[11px] font-medium text-muted shadow-sm backdrop-blur"
            >
              {puce}
            </span>
          ))}
        </div>
        <button
          type="button"
          onClick={() => resetRef.current?.()}
          className="pointer-events-auto inline-flex items-center gap-1.5 rounded-full bg-white/90 px-3 py-1 text-xs font-medium text-muted shadow-sm backdrop-blur transition hover:text-foreground"
          title="Recentrer la vue"
        >
          <Maximize2 className="h-3.5 w-3.5" />
          Recentrer
        </button>
      </div>

      {/* Legende des avancements + echelle de la grille */}
      {resume && resume.nbSections > 0 && (
        <div className="pointer-events-none absolute bottom-3 left-3 rounded-lg bg-white/90 px-3 py-2 text-xs text-muted shadow-sm backdrop-blur">
          <div className="flex flex-wrap items-center gap-3">
            {pastilles.map((pastille) => (
              <span key={pastille.libelle} className="inline-flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: pastille.couleur }} />
                {pastille.libelle}
              </span>
            ))}
          </div>
          <div className="mt-1 text-[10px] text-muted">
            Grille : 1 carreau = {nombreFormat(pasGrille((scene?.rayon ?? 4) * 2))} m · {resume.nbSections} section
            {resume.nbSections > 1 ? "s" : ""}
          </div>
        </div>
      )}

      {/* Aide aux commandes */}
      <div className="pointer-events-none absolute bottom-3 right-3 hidden rounded-lg bg-white/80 px-3 py-1.5 text-[10px] text-muted shadow-sm backdrop-blur sm:block">
        Glisser : tourner · Molette : zoomer
      </div>

      {!isLoaded && (
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center bg-background/80 backdrop-blur-sm">
          <div className="flex items-center gap-2 text-sm text-muted">
            <span className="h-4 w-4 animate-spin rounded-full border-2 border-action border-t-transparent" />
            Construction du modèle 3D…
          </div>
        </div>
      )}
    </div>
  );
}

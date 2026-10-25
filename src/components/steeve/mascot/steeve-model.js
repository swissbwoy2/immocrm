import * as THREE from 'three';

// Adapté du kit « steeve-cursor-kit 3 » (Three.js 0.186) pour la version de Three.js du projet (0.133) :
// une seule version de Three.js dans l'application. Les couleurs sont données en sRGB, comme dans le kit,
// puis converties en linéaire (rendu sRGB) ; les noms de propriétés suivent l'API 0.133.
const COLOR_KEYS = { color: 'color', attenuationColor: 'attenuationTint', specularColor: 'specularTint' };

export function srgb(value) {
  return new THREE.Color(value).convertSRGBToLinear();
}

/**
 * Steeve — pearl glass terminal, floating chrome face, tailored white suit.
 * Original parametric geometry; no textures, fonts, bitmap or external assets.
 * Y up, front +Z. Left/right mean the viewer's left/right. Height about 3.6.
 * Lighting, animation and renderer lifecycle are intentionally owned by the host.
 * Dispose each entry in materials/geometries once when the model is removed.
 */
export function createSteeveModel() {
  const ownedGeometries = new Set();
  const ownedMaterials = new Set();
  const keepGeometry = (geometry) => (ownedGeometries.add(geometry), geometry);

  function material(name, parameters) {
    const adapted = {};
    for (const [key, entry] of Object.entries(parameters)) {
      if (key in COLOR_KEYS) adapted[COLOR_KEYS[key]] = srgb(entry);
      else adapted[key] = entry;
    }
    const value = new THREE.MeshPhysicalMaterial(adapted);
    value.name = name;
    ownedMaterials.add(value);
    return value;
  }

  const glass = material('Steeve / pearl frostglass', {
    color: '#f6f8fa', roughness: 0.17, metalness: 0,
    transmission: 0.52, thickness: 0.55, ior: 1.45,
    clearcoat: 1, clearcoatRoughness: 0.08,
    attenuationColor: '#ffffff', attenuationDistance: 3,
    specularIntensity: 1, specularColor: '#ffffff',
  });
  const chrome = material('Steeve / floating anthracite face', {
    color: '#24282b', roughness: 0.20, metalness: 0.65,
    clearcoat: 1, clearcoatRoughness: 0.12,
    specularColor: '#ffffff',
  });
  // Traits du visage (« cheveux » en haut, « barbe » en bas, et les + des coins) : anthracite comme les yeux,
  // pour rester lisibles à la taille du widget (l'argent du kit disparaissait sur la coque blanche).
  const silver = material('Steeve / anthracite terminal strokes (hair and beard)', {
    color: '#2a2f33', roughness: 0.32, metalness: 0.35,
    clearcoat: 0.6, clearcoatRoughness: 0.15,
  });
  const jacket = material('Steeve / tailored ivory jacket', {
    color: '#e9eae6', roughness: 0.29, metalness: 0.015,
    transmission: 0.06, thickness: 0.16, ior: 1.4,
    clearcoat: 0.55, clearcoatRoughness: 0.22,
    attenuationColor: '#ffffff', attenuationDistance: 2,
  });
  const lapelMaterial = material('Steeve / satin lapels', {
    color: '#d9ddda', roughness: 0.24, metalness: 0.05,
    clearcoat: 0.65, clearcoatRoughness: 0.18,
  });
  const shirt = material('Steeve / white shirt and cuffs', {
    color: '#ffffff', roughness: 0.43, metalness: 0,
    clearcoat: 0.12,
  });
  const trousers = material('Steeve / ivory tailored trousers', {
    color: '#d9dcda', roughness: 0.39, metalness: 0,
    clearcoat: 0.16,
  });
  const darkFabric = material('Steeve / charcoal silk tie', {
    color: '#303438', roughness: 0.34, metalness: 0.06,
    clearcoat: 0.3,
  });
  const leather = material('Steeve / anthracite leather shoes', {
    color: '#171a1c', roughness: 0.28, metalness: 0.08,
    clearcoat: 0.55, clearcoatRoughness: 0.2,
  });
  const hands = material('Steeve / pearl hands', {
    color: '#f3f5f5', roughness: 0.22, metalness: 0,
    transmission: 0.15, thickness: 0.18, ior: 1.4,
    clearcoat: 0.8, clearcoatRoughness: 0.14,
    attenuationColor: '#ffffff', attenuationDistance: 2,
  });

  function group(name, parent, position = [0, 0, 0]) {
    const value = new THREE.Group();
    value.name = name;
    value.position.set(...position);
    parent?.add(value);
    return value;
  }

  function polygon(points) {
    const shape = new THREE.Shape();
    shape.moveTo(...points[0]);
    for (const point of points.slice(1)) shape.lineTo(...point);
    shape.closePath();
    return shape;
  }

  function roundedRectangle(width, height, radius) {
    const x = -width / 2;
    const y = -height / 2;
    const r = Math.min(radius, width / 2, height / 2);
    const shape = new THREE.Shape();
    shape.moveTo(x + r, y);
    shape.lineTo(x + width - r, y);
    shape.quadraticCurveTo(x + width, y, x + width, y + r);
    shape.lineTo(x + width, y + height - r);
    shape.quadraticCurveTo(x + width, y + height, x + width - r, y + height);
    shape.lineTo(x + r, y + height);
    shape.quadraticCurveTo(x, y + height, x, y + height - r);
    shape.lineTo(x, y + r);
    shape.quadraticCurveTo(x, y, x + r, y);
    shape.closePath();
    return shape;
  }

  function extrude(shape, depth, bevel = 0.025) {
    const geometry = new THREE.ExtrudeGeometry(shape, {
      depth, steps: 1, curveSegments: 7,
      bevelEnabled: bevel > 0, bevelSegments: 3,
      bevelThickness: bevel, bevelSize: bevel,
    });
    geometry.translate(0, 0, -depth / 2);
    return keepGeometry(geometry);
  }

  const rounded = (w, h, d, r, bevel = 0.025) => extrude(roundedRectangle(w, h, r), d, bevel);

  function mesh(name, geometry, surface, parent, position = [0, 0, 0]) {
    const value = new THREE.Mesh(geometry, surface);
    value.name = name;
    value.position.set(...position);
    value.castShadow = true;
    value.receiveShadow = true;
    parent.add(value);
    return value;
  }

  function tube(name, points, radius, surface, parent) {
    const curve = new THREE.QuadraticBezierCurve3(...points.map((point) => new THREE.Vector3(...point)));
    return mesh(name, keepGeometry(new THREE.TubeGeometry(curve, 24, radius, 8, false)), surface, parent);
  }

  const root = group('Steeve');
  root.userData.modelVersion = 'steeve-v3-pearl-tailored-1';
  root.userData.frontAxis = '+Z';

  // A generous rounded terminal with real curvature, never a flat screen.
  const headRadii = new THREE.Vector3(0.8, 0.72, 0.43);
  const cushionPower = 0.60;
  const headGeometry = new THREE.SphereGeometry(1, 48, 32);
  const positions = headGeometry.attributes.position;
  const signedPower = (n) => Math.sign(n) * Math.pow(Math.abs(n), cushionPower);
  for (let index = 0; index < positions.count; index += 1) {
    positions.setXYZ(index,
      signedPower(positions.getX(index)) * headRadii.x,
      signedPower(positions.getY(index)) * headRadii.y,
      signedPower(positions.getZ(index)) * headRadii.z);
  }
  headGeometry.computeVertexNormals();
  headGeometry.computeBoundingSphere();
  const head = group('head', root, [0, 2.86, 0]);
  mesh('pearl-glass-terminal-shell', keepGeometry(headGeometry), glass, head);

  function headFrontZ(x, y) {
    const exponent = 2 / cushionPower;
    const remainder = 1 - Math.pow(Math.abs(x) / headRadii.x, exponent)
      - Math.pow(Math.abs(y) / headRadii.y, exponent);
    return headRadii.z * Math.pow(Math.max(0, remainder), cushionPower / 2);
  }

  function terminalMark(name, shape, x, y) {
    const geometry = extrude(shape, 0.014, 0.004);
    const vertices = geometry.attributes.position;
    for (let index = 0; index < vertices.count; index += 1) {
      const z = headFrontZ(vertices.getX(index) + x, vertices.getY(index) + y);
      vertices.setZ(index, vertices.getZ(index) + z + 0.012);
    }
    geometry.computeVertexNormals();
    geometry.computeBoundingSphere();
    mesh(name, geometry, silver, head, [x, y, 0]);
  }

  // Traits épaissis (×1,7) pour la lecture à 78–170 px ; mêmes positions que la version validée.
  const outer = 0.068;
  const inner = 0.017;
  const plus = polygon([
    [-inner, -outer], [inner, -outer], [inner, -inner], [outer, -inner],
    [outer, inner], [inner, inner], [inner, outer], [-inner, outer],
    [-inner, inner], [-outer, inner], [-outer, -inner], [-inner, -inner],
  ]);
  for (const x of [-0.6, 0.6]) {
    for (const y of [-0.51, 0.51]) terminalMark(`terminal-plus-${x}-${y}`, plus, x, y);
  }
  for (const y of [-0.51, 0.51]) {
    for (let index = -3; index <= 3; index += 1) {
      terminalMark(`terminal-dash-${y}-${index}`, roundedRectangle(0.098, 0.034, 0.012), index * 0.145, y);
    }
  }

  // The backs of the chrome facial pieces sit 0.06–0.10 units off the shell.
  const face = group('face', head, [0, 0, 0.56]);
  face.userData.detachedFace = true;
  const eyeGeometry = rounded(0.13, 0.265, 0.10, 0.06, 0.022);
  const eyeLeft = group('eye-left', face, [-0.285, 0.14, 0]);
  const eyeRight = group('eye-right', face, [0.285, 0.14, 0]);
  const openEyes = [
    mesh('left-floating-chrome-eye', eyeGeometry, chrome, eyeLeft),
    mesh('right-floating-chrome-eye', eyeGeometry, chrome, eyeRight),
  ];
  const closedEyes = [eyeLeft, eyeRight].map((eye, index) => tube(`sleep-eye-${index}`,
    [[-0.065, 0.01, 0], [0, -0.045, 0], [0.065, 0.01, 0]], 0.019, chrome, eye));
  const brows = group('curious-brows', face);
  tube('curious-left-brow', [[-0.36, 0.36, 0], [-0.29, 0.39, 0], [-0.22, 0.36, 0]], 0.014, chrome, brows);
  tube('curious-right-brow', [[0.22, 0.40, 0], [0.29, 0.445, 0], [0.36, 0.42, 0]], 0.014, chrome, brows);

  const mouth = group('mouth', face, [0, -0.205, -0.01]);
  const neutralMouth = mesh('neutral-mouth', rounded(0.215, 0.037, 0.08, 0.014, 0.012), chrome, mouth);
  const smileMouth = tube('smile-mouth', [[-0.15, 0.025, 0], [0, -0.14, 0], [0.15, 0.025, 0]], 0.027, chrome, mouth);
  const thinkingMouth = group('thinking-mouth', mouth);
  const dotGeometry = keepGeometry(new THREE.SphereGeometry(0.025, 12, 8));
  for (const x of [-0.08, 0, 0.08]) mesh(`thinking-dot-${x}`, dotGeometry, chrome, thinkingMouth, [x, 0, 0]);
  const curiousMouth = mesh('curious-mouth', keepGeometry(new THREE.TorusGeometry(0.043, 0.014, 8, 24)), chrome, mouth);
  curiousMouth.scale.y = 1.2;

  // Separate tailored jacket, lapels, shirt, collar, knot, tie and pocket.
  const torso = group('torso', root, [0, 1.62, 0]);
  const jacketShape = new THREE.Shape();
  jacketShape.moveTo(-0.37, -0.49);
  jacketShape.lineTo(0.37, -0.49);
  jacketShape.quadraticCurveTo(0.43, -0.49, 0.43, -0.41);
  jacketShape.lineTo(0.49, 0.30);
  jacketShape.quadraticCurveTo(0.50, 0.44, 0.39, 0.48);
  jacketShape.lineTo(0.15, 0.48);
  jacketShape.lineTo(0, 0.32);
  jacketShape.lineTo(-0.15, 0.48);
  jacketShape.lineTo(-0.39, 0.48);
  jacketShape.quadraticCurveTo(-0.50, 0.44, -0.49, 0.30);
  jacketShape.lineTo(-0.43, -0.41);
  jacketShape.quadraticCurveTo(-0.43, -0.49, -0.37, -0.49);
  jacketShape.closePath();
  mesh('tailored-jacket-body', extrude(jacketShape, 0.36, 0.055), jacket, torso);
  mesh('white-shirt-front', extrude(polygon([[-0.18, 0.47], [0.18, 0.47], [0.20, 0.04], [0, -0.19], [-0.20, 0.04]]), 0.025, 0.008), shirt, torso, [0, 0, 0.257]);
  mesh('shirt-neck', rounded(0.265, 0.17, 0.28, 0.05, 0.018), shirt, torso, [0, 0.50, -0.025]);

  const lapelPoints = [[-0.42, 0.38], [-0.24, 0.47], [-0.12, 0.30], [-0.045, -0.20], [-0.31, 0.055], [-0.255, 0.15], [-0.36, 0.195]];
  const lapelLeft = group('lapel-left', torso, [0, 0, 0.297]);
  const lapelRight = group('lapel-right', torso, [0, 0, 0.297]);
  mesh('left-notched-lapel', extrude(polygon(lapelPoints), 0.035, 0.012), lapelMaterial, lapelLeft);
  mesh('right-notched-lapel', extrude(polygon(lapelPoints.map(([x, y]) => [-x, y]).reverse()), 0.035, 0.012), lapelMaterial, lapelRight);
  const collar = [[-0.15, 0.475], [-0.012, 0.425], [-0.08, 0.275], [-0.225, 0.38]];
  mesh('shirt-collar-left', extrude(polygon(collar), 0.035, 0.007), shirt, torso, [0, 0, 0.32]);
  mesh('shirt-collar-right', extrude(polygon(collar.map(([x, y]) => [-x, y]).reverse()), 0.035, 0.007), shirt, torso, [0, 0, 0.32]);
  const tie = group('tie', torso, [0, 0, 0.335]);
  mesh('tie-knot', extrude(polygon([[-0.055, 0.395], [0.055, 0.395], [0.043, 0.31], [-0.043, 0.31]]), 0.035, 0.009), darkFabric, tie);
  mesh('tie-blade', extrude(polygon([[-0.038, 0.31], [0.038, 0.31], [0.067, 0.015], [0, -0.07], [-0.067, 0.015]]), 0.025, 0.007), darkFabric, tie);
  const button = mesh('jacket-button', keepGeometry(new THREE.SphereGeometry(0.034, 16, 10)), chrome, torso, [0.035, -0.28, 0.254]);
  button.scale.z = 0.45;
  mesh('jacket-pocket-welt', rounded(0.155, 0.023, 0.025, 0.005, 0.004), lapelMaterial, torso, [0.30, 0.125, 0.249]);
  mesh('white-pocket-square', extrude(polygon([[-0.06, 0], [-0.025, 0.052], [0.015, 0.01], [0.045, 0.038], [0.065, 0]]), 0.012, 0.003), shirt, torso, [0.30, 0.142, 0.257]);

  const upperSleeve = rounded(0.22, 0.39, 0.27, 0.075, 0.035);
  const lowerSleeve = rounded(0.195, 0.33, 0.245, 0.065, 0.028);
  const cuffGeometry = rounded(0.18, 0.07, 0.23, 0.035, 0.014);
  const handGeometry = rounded(0.185, 0.18, 0.18, 0.065, 0.026);
  function makeArm(name, side) {
    const arm = group(name, root, [side * 0.52, 2.025, 0]);
    arm.rotation.z = side * 0.08;
    arm.userData.restRotationZ = arm.rotation.z;
    mesh(`${name}-tailored-upper-sleeve`, upperSleeve, jacket, arm, [0, -0.17, 0]);
    const forearm = group(`forearm-${side < 0 ? 'left' : 'right'}`, arm, [0, -0.355, 0]);
    mesh(`${name}-tailored-lower-sleeve`, lowerSleeve, jacket, forearm, [0, -0.148, 0]);
    mesh(`${name}-white-shirt-cuff`, cuffGeometry, shirt, forearm, [0, -0.335, 0]);
    mesh(`${name}-pearl-hand`, handGeometry, hands, forearm, [0, -0.45, 0.02]);
    return { arm, forearm };
  }
  const leftArm = makeArm('arm-left', -1);
  const rightArm = makeArm('arm-right', 1);

  // Continuous trouser legs replace disconnected sticks and ankle pieces.
  const trouserGeometry = rounded(0.285, 0.87, 0.32, 0.065, 0.027);
  const shoeGeometry = rounded(0.34, 0.20, 0.49, 0.065, 0.025);
  const soleGeometry = rounded(0.35, 0.045, 0.50, 0.05, 0.008);
  function makeLeg(name, side) {
    const leg = group(name, root, [side * 0.205, 1.16, 0]);
    mesh(`${name}-continuous-trouser`, trouserGeometry, trousers, leg, [0, -0.45, 0]);
    mesh(`${name}-leather-shoe`, shoeGeometry, leather, leg, [side * 0.025, -1.025, 0.115]);
    mesh(`${name}-sole`, soleGeometry, leather, leg, [side * 0.025, -1.125, 0.115]);
    return leg;
  }
  const legLeft = makeLeg('leg-left', -1);
  const legRight = makeLeg('leg-right', 1);

  function setExpression(state = 'neutral') {
    const requested = String(state).toLowerCase();
    let expression = 'neutral';
    if (['smile', 'happy', 'joy', 'success'].includes(requested)) expression = 'smile';
    else if (['thinking', 'loading', 'working'].includes(requested)) expression = 'thinking';
    else if (['sleep', 'sleeping', 'asleep'].includes(requested)) expression = 'sleep';
    else if (['curious', 'question', 'wonder'].includes(requested)) expression = 'curious';
    neutralMouth.visible = expression === 'neutral' || expression === 'sleep';
    smileMouth.visible = expression === 'smile';
    thinkingMouth.visible = expression === 'thinking';
    curiousMouth.visible = expression === 'curious';
    openEyes.forEach((eye) => { eye.visible = expression !== 'sleep'; });
    closedEyes.forEach((eye) => { eye.visible = expression === 'sleep'; });
    brows.visible = expression === 'curious';
    mouth.userData.expression = expression;
    // Do not change the eye group scales: the host owns the blink animation.
  }
  setExpression('neutral');

  return {
    root, head, face, eyeLeft, eyeRight, mouth,
    armLeft: leftArm.arm, armRight: rightArm.arm,
    forearmLeft: leftArm.forearm, forearmRight: rightArm.forearm,
    legLeft, legRight, torso, tie,
    materials: [...ownedMaterials], geometries: [...ownedGeometries], setExpression,
  };
}

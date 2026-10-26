/**
 * Steeve's tailored, soft limbs. Y-up, front +Z.
 * A sleeve is ONE continuous skinned surface, not two intersecting boxes.
 * Hands are smooth volumetric implicit sculptures, including their thumb.
 * All geometry/material ownership remains with the caller's model.
 */
export function buildArms(ctx) {
  const { THREE, root, body, group, mesh, geo, materials } = ctx;
  const { cloth, glove, sole, seam } = materials;
  const skeletons = [];
  const clamp = THREE.MathUtils.clamp;
  const smooth = x => { x = clamp(x, 0, 1); return x * x * (3 - 2 * x); };

  function bone(name, parent, position) {
    const object = new THREE.Bone();
    object.name = name;
    object.position.set(...position);
    parent.add(object);
    return object;
  }

  // An elliptic profile follows the real fabric silhouette: softly padded
  // shoulder, a slightly narrower elbow, and a relaxed rounded sleeve opening.
  function sleeveGeometry() {
    const profile = [
      [.175, .0002, .0002], [.164, .056, .062], [.142, .099, .110],
      [.110, .130, .143], [.067, .151, .168], [.012, .168, .184],
      [-.055, .174, .190], [-.14, .170, .186], [-.23, .161, .180],
      [-.31, .154, .174], [-.39, .149, .169], [-.46, .147, .166],
      [-.53, .148, .165], [-.61, .151, .165], [-.70, .153, .165],
      [-.79, .154, .165], [-.86, .155, .165], [-.891, .153, .163],
      [-.902, .147, .157], [-.902, .0002, .0002]
    ];
    const radial = 32, positions = [], uv = [], indices = [], skinIndex = [], skinWeight = [];
    // Insert smooth profile subdivisions without flattening the shoulder dome.
    const points = profile.map(([y, x, z]) => new THREE.Vector3(x, y, z));
    const curve = new THREE.CatmullRomCurve3(points, false, 'centripetal');
    const rings = 45;
    for (let j = 0; j <= rings; j++) {
      const p = curve.getPoint(j / rings);
      const y = p.y, rx = Math.max(.0002, p.x), rz = Math.max(.0002, p.z);
      const bendWeight = smooth((-.285 - y) / .34);
      for (let i = 0; i <= radial; i++) {
        const angle = i / radial * Math.PI * 2;
        // Small, broad elbow folds have a soft amplitude; they never read as
        // robot joint rings. UVs carry the same woven material as the jacket.
        const elbow = Math.exp(-(((y + .45) / .14) ** 2));
        const wrinkle = .0028 * elbow * Math.sin((y + .48) * 51 + Math.cos(angle) * .8);
        const shiftZ = -.008 * Math.exp(-(((y + .32) / .28) ** 2));
        positions.push(Math.cos(angle) * (rx + wrinkle), y, Math.sin(angle) * (rz + wrinkle) + shiftZ);
        uv.push(i / radial * .58, (.175 - y) * 1.5);
        skinIndex.push(0, 1, 0, 0);
        skinWeight.push(1 - bendWeight, bendWeight, 0, 0);
        if (j < rings && i < radial) {
          const a = j * (radial + 1) + i, b = a + radial + 1;
          // y runs downwards, so this winding points outside the sleeve.
          indices.push(a, a + 1, b, b, a + 1, b + 1);
        }
      }
    }
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
    geometry.setAttribute('skinIndex', new THREE.Uint16BufferAttribute(skinIndex, 4));
    geometry.setAttribute('skinWeight', new THREE.Float32BufferAttribute(skinWeight, 4));
    geometry.setIndex(indices);
    geometry.computeVertexNormals();
    // Join normals along the UV seam, preserving the textured closed volume.
    const normals = geometry.attributes.normal;
    for (let j = 0; j <= rings; j++) {
      const a = j * (radial + 1), b = a + radial;
      const n = new THREE.Vector3().fromBufferAttribute(normals, a)
        .add(new THREE.Vector3().fromBufferAttribute(normals, b)).normalize();
      normals.setXYZ(a, n.x, n.y, n.z); normals.setXYZ(b, n.x, n.y, n.z);
    }
    return geometry;
  }

  function smoothMinimum(a, b, radius) {
    const h = clamp(.5 + .5 * (b - a) / radius, 0, 1);
    return b + (a - b) * h - radius * h * (1 - h);
  }

  // Signed ellipsoid-distance approximation. The five gently blended lobes
  // form a padded palm, rounded curled fingers, and one integrated thumb.
  function handField(x, y, z) {
    function ellipsoid(cx, cy, cz, rx, ry, rz) {
      const px = x - cx, py = y - cy, pz = z - cz;
      const k0 = Math.hypot(px / rx, py / ry, pz / rz);
      const k1 = Math.hypot(px / (rx * rx), py / (ry * ry), pz / (rz * rz));
      return k1 > 1e-8 ? k0 * (k0 - 1) / k1 : -Math.min(rx, ry, rz);
    }
    const palm = ellipsoid(-.060, .016, .000, .099, .151, .114);
    const wrist = ellipsoid(-.023, .124, -.005, .101, .079, .099);
    const foldedFingers = ellipsoid(-.057, -.114, .009, .102, .107, .115);
    const fingertip = ellipsoid(.011, -.171, .020, .080, .067, .105);
    const thumbRoot = ellipsoid(.046, .100, .014, .076, .071, .100);
    const thumb = ellipsoid(.099, .034, .027, .063, .094, .093);
    let d = smoothMinimum(palm, wrist, .055);
    d = smoothMinimum(d, foldedFingers, .049);
    d = smoothMinimum(d, fingertip, .041);
    d = smoothMinimum(d, thumbRoot, .039);
    return smoothMinimum(d, thumb, .027);
  }

  // Compact indexed marching tetrahedra avoids an opaque generated model
  // dependency. Gradient normals keep the mitten smooth even at small size.
  function mittenGeometry(mirror = 1) {
    const minimum = [-.205, -.267, -.150], maximum = [.203, .230, .164];
    const counts = [15, 18, 12], strideX = counts[0] + 1, strideY = strideX * (counts[1] + 1);
    const field = [], coordinates = [], edgeVertices = new Map();
    const positions = [], normals = [], uv = [], indices = [];
    for (let k = 0; k <= counts[2]; k++) for (let j = 0; j <= counts[1]; j++) for (let i = 0; i <= counts[0]; i++) {
      const p = [i, j, k].map((n, axis) => minimum[axis] + n / counts[axis] * (maximum[axis] - minimum[axis]));
      coordinates.push(p); field.push(handField(...p));
    }
    function vertex(a, b) {
      const key = a < b ? `${a}/${b}` : `${b}/${a}`;
      if (edgeVertices.has(key)) return edgeVertices.get(key);
      const pa = coordinates[a], pb = coordinates[b], t = field[a] / (field[a] - field[b]);
      const p = pa.map((v, axis) => v + (pb[axis] - v) * t);
      const e = .00025, [x, y, z] = p;
      const n = new THREE.Vector3(
        handField(x + e, y, z) - handField(x - e, y, z),
        handField(x, y + e, z) - handField(x, y - e, z),
        handField(x, y, z + e) - handField(x, y, z - e)
      ).normalize();
      const id = positions.length / 3;
      positions.push(x * mirror, y, z); normals.push(n.x * mirror, n.y, n.z);
      uv.push((x - minimum[0]) / (maximum[0] - minimum[0]), (y - minimum[1]) / (maximum[1] - minimum[1]));
      edgeVertices.set(key, id); return id;
    }
    function triangle(a, b, c, outward) {
      const va = new THREE.Vector3().fromArray(positions, a * 3);
      const vb = new THREE.Vector3().fromArray(positions, b * 3);
      const vc = new THREE.Vector3().fromArray(positions, c * 3);
      // Orient from the tetrahedron's NEGATIVE side to its POSITIVE side.
      // The nonlinear field gradient can reverse within the little concave
      // thumb saddle; using it here creates inconsistent winding / black
      // triangles even though the indexed surface is topologically closed.
      if (vb.sub(va).cross(vc.sub(va)).dot(outward) < 0) indices.push(a, c, b);
      else indices.push(a, b, c);
    }
    const tetrahedra = [[0, 5, 1, 6], [0, 1, 2, 6], [0, 2, 3, 6], [0, 3, 7, 6], [0, 7, 4, 6], [0, 4, 5, 6]];
    for (let k = 0; k < counts[2]; k++) for (let j = 0; j < counts[1]; j++) for (let i = 0; i < counts[0]; i++) {
      const q = k * strideY + j * strideX + i;
      const cube = [q, q + 1, q + strideX + 1, q + strideX, q + strideY, q + strideY + 1, q + strideY + strideX + 1, q + strideY + strideX];
      for (const tetrahedron of tetrahedra) {
        const inside = [], outside = [];
        tetrahedron.map(id => cube[id]).forEach(id => (field[id] < 0 ? inside : outside).push(id));
        if (inside.length === 0 || inside.length === 4) continue;
        const outward = new THREE.Vector3();
        for (const id of outside) outward.addScaledVector(new THREE.Vector3(...coordinates[id]), 1 / outside.length);
        for (const id of inside) outward.addScaledVector(new THREE.Vector3(...coordinates[id]), -1 / inside.length);
        outward.x *= mirror;
        if (inside.length === 1) triangle(...outside.map(id => vertex(inside[0], id)), outward);
        else if (inside.length === 3) triangle(...inside.map(id => vertex(outside[0], id)), outward);
        else {
          const [a, b] = inside, [c, d] = outside;
          const ac = vertex(a, c), ad = vertex(a, d), bc = vertex(b, c), bd = vertex(b, d);
          triangle(ac, ad, bc, outward); triangle(ad, bd, bc, outward);
        }
      }
    }
    // Two small non-shrinking smoothing cycles relax the irregular marching
    // tetrahedron sampling while preserving the sculpted silhouette and gap.
    // Normals are rebuilt analytically afterwards, so the irregular triangles
    // do not show through as faceted area-weighted lighting.
    const neighbours = Array.from({ length: positions.length / 3 }, () => new Set());
    for (let i = 0; i < indices.length; i += 3) {
      const [a, b, c] = indices.slice(i, i + 3);
      neighbours[a].add(b).add(c); neighbours[b].add(a).add(c); neighbours[c].add(a).add(b);
    }
    for (let cycle = 0; cycle < 2; cycle++) for (const factor of [.32, -.33]) {
      const previous = positions.slice();
      for (let i = 0; i < neighbours.length; i++) {
        const adjacent = neighbours[i];
        if (!adjacent.size) continue;
        for (let axis = 0; axis < 3; axis++) {
          let mean = 0;
          adjacent.forEach(j => { mean += previous[j * 3 + axis]; });
          mean /= adjacent.size;
          positions[i * 3 + axis] = previous[i * 3 + axis] + factor * (mean - previous[i * 3 + axis]);
        }
      }
    }
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    geometry.setAttribute('normal', new THREE.Float32BufferAttribute(normals, 3));
    geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
    geometry.setIndex(indices);
    geometry.computeVertexNormals();
    const analytic = new THREE.Vector3(), geometric = new THREE.Vector3();
    const positionAttribute = geometry.attributes.position;
    const normalAttribute = geometry.attributes.normal;
    const epsilon = .0003;
    for (let i = 0; i < positionAttribute.count; i++) {
      const x = positionAttribute.getX(i) * mirror;
      const y = positionAttribute.getY(i), z = positionAttribute.getZ(i);
      analytic.set(
        (handField(x + epsilon, y, z) - handField(x - epsilon, y, z)) * mirror,
        handField(x, y + epsilon, z) - handField(x, y - epsilon, z),
        handField(x, y, z + epsilon) - handField(x, y, z - epsilon)
      ).normalize();
      geometric.fromBufferAttribute(normalAttribute, i);
      // At the narrow thumb saddle, keep the shading normal in the correctly
      // oriented surface hemisphere without using it to orient triangles.
      const alignment = analytic.dot(geometric);
      if (alignment < .15) analytic.addScaledVector(geometric, .15 - alignment).normalize();
      normalAttribute.setXYZ(i, analytic.x, analytic.y, analytic.z);
    }
    geometry.computeBoundingSphere(); geometry.computeBoundingBox();
    return geo(geometry);
  }

  function curvedLine(name, points, radius, material, parent) {
    const curve = new THREE.CatmullRomCurve3(points.map(p => new THREE.Vector3(...p)));
    return mesh(name, geo(new THREE.TubeGeometry(curve, Math.max(24, points.length), radius, 5, false)), material, parent);
  }

  function arm(side) {
    const id = side < 0 ? 'left' : 'right';
    const a = bone(`arm-${id}`, body, [side * .59, 2.18, -.005]);
    a.rotation.z = side * .19;
    const f = bone(`forearm-${id}`, a, [0, -.46, 0]);
    const h = group(`hand-${id}`, f, [0, -.553, .023]);
    // Put sleeve vertices in their actual rest pose in the body's coordinate
    // system, then bind against that same world pose. This avoids doubled
    // transforms when the animation raises the arm or rotates the body.
    a.updateMatrix();
    const geometry = sleeveGeometry(); geometry.applyMatrix4(a.matrix); geo(geometry);
    const sleeve = new THREE.SkinnedMesh(geometry, cloth);
    sleeve.name = `${id}-continuous-tailored-sleeve`;
    sleeve.castShadow = sleeve.receiveShadow = true;
    // The procedural and glTF poses may extend past the original static bounds.
    sleeve.frustumCulled = false;
    body.add(sleeve);
    root.updateMatrixWorld(true);
    const skeleton = new THREE.Skeleton([a, f]);
    sleeve.bind(skeleton, sleeve.matrixWorld);
    sleeve.normalizeSkinWeights(); skeletons.push(skeleton);
    const cuff = mesh(`${id}-dark-cuff-gap`, geo(new THREE.CylinderGeometry(.142, .140, .022, 32)), sole, f, [0, -.444, -.001]);
    cuff.scale.z = 1.09;
    // Woven turn-back and topstitch above the dark wrist line.
    const points = [];
    for (let i = 0; i <= 40; i++) {
      const theta = i / 40 * Math.PI * 2;
      points.push([Math.cos(theta) * .154, -.415, Math.sin(theta) * .164]);
    }
    curvedLine(`${id}-cuff-topstitch`, points, .0019, seam, f);
    const mitten = mesh(`${id}-sculpted-mitten`, mittenGeometry(-side), glove, h);
    mitten.userData.construction = 'Continuous smooth volumetric mitten with integrated thumb; not an extruded profile.';
    return { arm: a, forearm: f, hand: h, sleeve };
  }
  const left = arm(-1), right = arm(1);
  return {
    armLeft: left.arm, armRight: right.arm,
    forearmLeft: left.forearm, forearmRight: right.forearm,
    handLeft: left.hand, handRight: right.hand,
    sleeveLeft: left.sleeve, sleeveRight: right.sleeve,
    skeletons
  };
}

/* ==========================================================================
   BakeMe · Escena 3D del pastel
   three.js r128 (UMD). Sin dependencias extra.
   Si no hay three.js, no hay WebGL o el visitante pidió menos movimiento,
   la página se queda con la ilustración SVG y no pasa nada.
   ========================================================================== */
(function () {
  "use strict";

  var host = document.getElementById("escena-pastel");
  if (!host || !window.THREE) return;

  var THREE = window.THREE;

  // ¿Hay WebGL?
  try {
    var prueba = document.createElement("canvas");
    var ctx = prueba.getContext("webgl") || prueba.getContext("experimental-webgl");
    if (!ctx) return;
  } catch (e) { return; }

  var menosMovimiento = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var movil = window.matchMedia("(max-width: 760px)").matches;

  // Paleta oficial de BakeMe
  var C = {
    crema:   0xF7E8D9,
    beige:   0xFBEFDF,
    rosa:    0xC96A66,
    salmon:  0xDFA69D,
    durazno: 0xEAC7B8,
    blanco:  0xFFF9F3,
    vino:    0x8E4A48
  };

  var N_AZUCAR  = movil ? 2600 : 6200;   // puntos del anillo de azúcar
  var N_CONFITE = movil ? 26   : 44;     // confites que orbitan

  // ---------------------------------------------------------------- escena
  var escena = new THREE.Scene();

  var camara = new THREE.PerspectiveCamera(42, 1, 0.1, 100);
  camara.position.set(0, 2.7, 11.2);
  camara.lookAt(0, 0.2, 0);

  var render = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: "high-performance" });
  render.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  render.outputEncoding = THREE.sRGBEncoding;
  render.shadowMap.enabled = !movil;
  render.shadowMap.type = THREE.PCFSoftShadowMap;
  render.domElement.className = "lienzo-3d";
  host.appendChild(render.domElement);

  // ----------------------------------------------------------------- luces
  escena.add(new THREE.HemisphereLight(0xFFF4EA, 0xE2BCAB, 0.85));

  var clave = new THREE.DirectionalLight(0xFFFFFF, 1.05);
  clave.position.set(4.5, 7, 5.5);
  if (!movil) {
    clave.castShadow = true;
    clave.shadow.mapSize.set(1024, 1024);
    clave.shadow.camera.near = 1;
    clave.shadow.camera.far = 20;
    clave.shadow.camera.left = -5;
    clave.shadow.camera.right = 5;
    clave.shadow.camera.top = 5;
    clave.shadow.camera.bottom = -5;
    clave.shadow.bias = -0.0006;
    clave.shadow.radius = 3;
  }
  escena.add(clave);

  var relleno = new THREE.DirectionalLight(0xE7B9B2, 0.45);
  relleno.position.set(-5, 2.5, -3.5);
  escena.add(relleno);

  // -------------------------------------------------------------- el grupo
  var grupo = new THREE.Group();
  grupo.rotation.x = 0.06;
  escena.add(grupo);

  function masa(color, rug) {
    return new THREE.MeshStandardMaterial({ color: color, roughness: rug === undefined ? 0.72 : rug, metalness: 0.02 });
  }

  var matBizcocho = masa(C.crema, 0.78);
  var matRosa     = masa(C.rosa, 0.55);
  var matSalmon   = masa(C.salmon, 0.6);
  var matDurazno  = masa(C.durazno, 0.65);
  var matBlanco   = masa(C.blanco, 0.5);

  // Plato
  var plato = new THREE.Mesh(new THREE.CylinderGeometry(2.62, 2.42, 0.13, 64), matDurazno);
  plato.position.y = -1.30;
  plato.receiveShadow = true;
  grupo.add(plato);

  var pie = new THREE.Mesh(new THREE.CylinderGeometry(0.62, 0.95, 0.34, 32), matDurazno);
  pie.position.y = -1.55;
  grupo.add(pie);

  // Un piso = bizcocho + glaseado + chorreado
  function piso(radio, alto, centroY, matGlaseado, gotas) {
    var g = new THREE.Group();

    var cuerpo = new THREE.Mesh(new THREE.CylinderGeometry(radio, radio, alto, 64), matBizcocho);
    cuerpo.position.y = centroY;
    cuerpo.castShadow = true;
    cuerpo.receiveShadow = true;
    g.add(cuerpo);

    var tapaY = centroY + alto / 2;

    var glaseado = new THREE.Mesh(new THREE.CylinderGeometry(radio + 0.05, radio + 0.05, 0.17, 64), matGlaseado);
    glaseado.position.y = tapaY + 0.05;
    glaseado.castShadow = true;
    g.add(glaseado);

    // chorreado: gotas de distinto largo colgando del borde
    var geoGota = new THREE.SphereGeometry(0.085, 12, 12);
    for (var i = 0; i < gotas; i++) {
      var a = (i / gotas) * Math.PI * 2;
      var largo = 0.55 + Math.abs(Math.sin(i * 2.7)) * 1.45;
      var gota = new THREE.Mesh(geoGota, matGlaseado);
      gota.position.set(Math.cos(a) * (radio + 0.05), tapaY - 0.04, Math.sin(a) * (radio + 0.05));
      gota.scale.set(1, largo, 1);
      gota.castShadow = true;
      g.add(gota);

      var punta = new THREE.Mesh(geoGota, matGlaseado);
      punta.position.set(Math.cos(a) * (radio + 0.05), tapaY - 0.04 - largo * 0.085, Math.sin(a) * (radio + 0.05));
      punta.scale.setScalar(0.85);
      g.add(punta);
    }

    grupo.add(g);
    return tapaY + 0.13;
  }

  var tapa1 = piso(1.95, 0.98, -0.72, matRosa, 26);
  var tapa2 = piso(1.34, 0.86,  0.36, matSalmon, 18);
  var tapa3 = piso(0.80, 0.72,  1.28, matRosa, 12);

  // Rosetones del piso de arriba
  var geoRoseton = new THREE.SphereGeometry(0.115, 14, 14);
  for (var r = 0; r < 9; r++) {
    var ar = (r / 9) * Math.PI * 2;
    var ros = new THREE.Mesh(geoRoseton, matBlanco);
    ros.position.set(Math.cos(ar) * 0.58, tapa3 - 0.02, Math.sin(ar) * 0.58);
    ros.scale.set(1, 1.25, 1);
    ros.castShadow = true;
    grupo.add(ros);
  }

  // Corona (el guiño al logo)
  var corona = new THREE.Group();
  corona.position.y = tapa3 + 0.16;

  var aro = new THREE.Mesh(new THREE.TorusGeometry(0.23, 0.045, 12, 40), matRosa);
  aro.rotation.x = Math.PI / 2;
  aro.castShadow = true;
  corona.add(aro);

  for (var p = 0; p < 5; p++) {
    var ap = (p / 5) * Math.PI * 2;
    var punta2 = new THREE.Mesh(new THREE.ConeGeometry(0.062, 0.24, 14), matRosa);
    punta2.position.set(Math.cos(ap) * 0.21, 0.13, Math.sin(ap) * 0.21);
    punta2.castShadow = true;
    corona.add(punta2);

    var perla = new THREE.Mesh(new THREE.SphereGeometry(0.038, 10, 10), matBlanco);
    perla.position.set(Math.cos(ap) * 0.21, 0.27, Math.sin(ap) * 0.21);
    corona.add(perla);
  }
  grupo.add(corona);

  // Zona invisible para detectar el clic sobre el pastel (barata de calcular)
  var zonaClic = new THREE.Mesh(
    new THREE.CylinderGeometry(2.15, 2.15, 4.0, 10),
    new THREE.MeshBasicMaterial({ colorWrite: false, depthWrite: false })
  );
  zonaClic.position.y = 0.1;
  zonaClic.renderOrder = -1;
  grupo.add(zonaClic);

  // ------------------------------------------------- anillo de azúcar
  var salida = new Float32Array(N_AZUCAR * 3);   // de dónde sale (pegado al pastel)
  var destino = new Float32Array(N_AZUCAR * 3);  // dónde termina (el anillo)
  var retraso = new Float32Array(N_AZUCAR);      // barrido: unos salen antes que otros
  var posiciones = new Float32Array(N_AZUCAR * 3);
  var colores = new Float32Array(N_AZUCAR * 3);

  var tono = new THREE.Color();
  var paleta = [C.rosa, C.salmon, C.vino, C.durazno, C.blanco];
  var pesos  = [0.38, 0.28, 0.14, 0.14, 0.06];

  for (var i = 0; i < N_AZUCAR; i++) {
    var ang = Math.random() * Math.PI * 2;
    var d = Math.pow(Math.random(), 1.5);
    var radio = 2.35 + d * 1.55;
    var grosor = 0.20 - d * 0.09;
    var y = ((Math.random() + Math.random() + Math.random()) / 1.5 - 1) * grosor;

    destino[i * 3]     = Math.cos(ang) * radio;
    destino[i * 3 + 1] = y - 0.15;
    destino[i * 3 + 2] = Math.sin(ang) * radio;

    // sale desde el costado del pastel, escondido tras el bizcocho
    salida[i * 3]     = Math.cos(ang) * 1.35;
    salida[i * 3 + 1] = -0.35 + Math.random() * 0.6;
    salida[i * 3 + 2] = Math.sin(ang) * 1.35;

    posiciones[i * 3]     = salida[i * 3];
    posiciones[i * 3 + 1] = salida[i * 3 + 1];
    posiciones[i * 3 + 2] = salida[i * 3 + 2];

    // barrido en abanico, igual que la referencia
    retraso[i] = (Math.abs(((ang + Math.PI) % (Math.PI * 2)) - Math.PI) / Math.PI) * 0.55 + Math.random() * 0.12;

    var s = Math.random(), acum = 0, elegido = paleta[0];
    for (var k = 0; k < paleta.length; k++) { acum += pesos[k]; if (s <= acum) { elegido = paleta[k]; break; } }
    tono.setHex(elegido);
    var brillo = 0.72 + Math.random() * 0.28;
    colores[i * 3]     = Math.min(1, tono.r * brillo);
    colores[i * 3 + 1] = Math.min(1, tono.g * brillo);
    colores[i * 3 + 2] = Math.min(1, tono.b * brillo);
  }

  var geoAzucar = new THREE.BufferGeometry();
  geoAzucar.setAttribute("position", new THREE.BufferAttribute(posiciones, 3));
  geoAzucar.setAttribute("color", new THREE.BufferAttribute(colores, 3));

  var anillo = new THREE.Points(geoAzucar, new THREE.PointsMaterial({
    size: movil ? 0.085 : 0.072,
    vertexColors: true,
    sizeAttenuation: true,
    transparent: true,
    opacity: 0.9,
    depthWrite: false
  }));
  grupo.add(anillo);

  // ------------------------------------------------- confites que orbitan
  var geoConfite = new THREE.BoxGeometry(0.07, 0.07, 0.28);
  var matConfite = new THREE.MeshStandardMaterial({ roughness: 0.45, metalness: 0.03 });
  var confites = new THREE.InstancedMesh(geoConfite, matConfite, N_CONFITE);
  confites.castShadow = !movil;
  confites.instanceMatrix.setUsage(THREE.DynamicDrawUsage);

  var datos = [];
  var maniqui = new THREE.Object3D();
  for (var c = 0; c < N_CONFITE; c++) {
    datos.push({
      ang: Math.random() * Math.PI * 2,
      radio: 2.6 + Math.random() * 1.15,
      vaiven: 0.2 + Math.random() * 0.4,
      fase: Math.random() * Math.PI * 2,
      vFase: 0.2 + Math.random() * 0.3,
      y: (Math.random() - 0.5) * 0.55 - 0.15,
      vel: (0.12 + Math.random() * 0.22) * (Math.random() > 0.35 ? 1 : -1),
      rx: Math.random() * Math.PI, ry: Math.random() * Math.PI, rz: Math.random() * Math.PI,
      vrx: (Math.random() - 0.5) * 1.4, vry: (Math.random() - 0.5) * 1.4, vrz: (Math.random() - 0.5) * 1.4,
      escala: 0.7 + Math.random() * 0.8
    });
    tono.setHex(paleta[c % 4]);
    confites.setColorAt(c, tono);
  }
  if (confites.instanceColor) confites.instanceColor.needsUpdate = true;
  confites.visible = false;
  grupo.add(confites);

  // ------------------------------------------------------------ interacción
  var estado = "guardado";      // guardado · saliendo · fuera · volviendo
  var avance = 0;               // 0 → 1
  var escalaConfites = 0;
  var presion = 1;              // respuesta al toque
  var girando = false;
  var giroInicio = { x: 0, y: 0, rotY: 0, rotX: 0, t: 0 };
  var movido = 0;
  var hubo = false;             // ¿ya interactuó alguna vez?

  var rayo = new THREE.Raycaster();
  var puntero = new THREE.Vector2();
  var pista = host.querySelector(".pista-3d");

  function apuntaAlPastel(ev) {
    var caja = render.domElement.getBoundingClientRect();
    puntero.x = ((ev.clientX - caja.left) / caja.width) * 2 - 1;
    puntero.y = -((ev.clientY - caja.top) / caja.height) * 2 + 1;
    rayo.setFromCamera(puntero, camara);
    return rayo.intersectObject(zonaClic, false).length > 0;
  }

  function ocultarPista() {
    if (!hubo && pista) { pista.classList.add("fuera"); }
    hubo = true;
  }

  function alternar() {
    if (estado === "guardado" || estado === "volviendo") {
      estado = menosMovimiento ? "fuera" : "saliendo";
      if (menosMovimiento) avance = 1;
    } else {
      estado = menosMovimiento ? "guardado" : "volviendo";
      if (menosMovimiento) avance = 0;
    }
  }

  render.domElement.addEventListener("pointerdown", function (ev) {
    var sobre = apuntaAlPastel(ev);
    girando = true;
    movido = 0;
    giroInicio.x = ev.clientX;
    giroInicio.y = ev.clientY;
    giroInicio.rotY = grupo.rotation.y;
    giroInicio.rotX = grupo.rotation.x;
    if (sobre) presion = 0.972;
    if (render.domElement.setPointerCapture) {
      try { render.domElement.setPointerCapture(ev.pointerId); } catch (e) {}
    }
  });

  render.domElement.addEventListener("pointermove", function (ev) {
    if (girando) {
      var dx = ev.clientX - giroInicio.x;
      var dy = ev.clientY - giroInicio.y;
      movido = Math.max(movido, Math.abs(dx) + Math.abs(dy));
      grupo.rotation.y = giroInicio.rotY + dx * 0.007;
      grupo.rotation.x = Math.max(-0.22, Math.min(0.42, giroInicio.rotX + dy * 0.004));
      if (movido > 8) ocultarPista();
    } else {
      render.domElement.style.cursor = apuntaAlPastel(ev) ? "pointer" : "grab";
    }
  });

  function soltar(ev) {
    if (!girando) return;
    girando = false;
    presion = 1;
    if (movido < 8 && apuntaAlPastel(ev)) { ocultarPista(); alternar(); }
  }
  render.domElement.addEventListener("pointerup", soltar);
  render.domElement.addEventListener("pointercancel", function () { girando = false; presion = 1; });

  // Teclado: el lienzo es enfocable, Enter o espacio hacen lo mismo que el toque
  render.domElement.setAttribute("tabindex", "0");
  render.domElement.setAttribute("role", "button");
  render.domElement.setAttribute("aria-label", "Pastel de tres pisos en 3D. Actívalo para soltar una lluvia de azúcar; arrástralo para girarlo.");
  render.domElement.addEventListener("keydown", function (ev) {
    if (ev.key === "Enter" || ev.key === " " || ev.key === "Spacebar") {
      ev.preventDefault();
      ocultarPista();
      alternar();
    }
  });

  // ------------------------------------------------------------- medidas
  function medir() {
    var caja = render.domElement.getBoundingClientRect();
    var ancho = Math.round(caja.width);
    var alto = Math.round(caja.height);
    if (!ancho || !alto) return;
    render.setSize(ancho, alto, false);
    camara.aspect = ancho / alto;
    camara.updateProjectionMatrix();
  }
  medir();
  if (window.ResizeObserver) new ResizeObserver(medir).observe(host);
  else window.addEventListener("resize", medir);

  // Solo dibujamos cuando se ve: ni batería ni ventilador de más
  var aLaVista = true;
  if (window.IntersectionObserver) {
    new IntersectionObserver(function (e) { aLaVista = e[0].isIntersecting; }, { threshold: 0.02 }).observe(host);
  }
  document.addEventListener("visibilitychange", function () {
    if (!document.hidden) reloj.getDelta();   // que no acumule el tiempo de fondo
  });

  // ------------------------------------------------------------- animación
  var reloj = new THREE.Clock();
  var posAttr = geoAzucar.attributes.position;

  function suave(t) { return 1 - Math.pow(1 - t, 3); }          // easeOutCubic

  function dibujarAzucar() {
    var arr = posAttr.array;
    for (var i = 0; i < N_AZUCAR; i++) {
      var t = (avance * 1.6 - retraso[i]) / 0.55;
      t = t < 0 ? 0 : (t > 1 ? 1 : t);
      var e = suave(t);

      var dx = destino[i * 3], dy = destino[i * 3 + 1], dz = destino[i * 3 + 2];
      var sx = salida[i * 3],  sy = salida[i * 3 + 1],  sz = salida[i * 3 + 2];

      var x = sx + (dx - sx) * e;
      var y = sy + (dy - sy) * e;
      var z = sz + (dz - sz) * e;

      // remolino: entran girando y se van frenando
      var giro = (1 - e) * 3.2;
      var co = Math.cos(giro), si = Math.sin(giro);
      arr[i * 3]     = x * co - z * si;
      arr[i * 3 + 1] = y;
      arr[i * 3 + 2] = x * si + z * co;
    }
    posAttr.needsUpdate = true;
  }
  dibujarAzucar();

  var ultimoAvance = -1;

  function cuadro() {
    requestAnimationFrame(cuadro);
    var dt = Math.min(reloj.getDelta(), 0.05);
    if (!aLaVista || document.hidden) return;

    // giro suave mientras nadie arrastra
    if (!girando && !menosMovimiento) grupo.rotation.y += dt * 0.14;

    // respuesta al toque
    var escalaObjetivo = presion;
    grupo.scale.x += (escalaObjetivo - grupo.scale.x) * Math.min(1, dt * 14);
    grupo.scale.y = grupo.scale.z = grupo.scale.x;

    // salida / regreso del azúcar
    if (estado === "saliendo") {
      avance += dt / 1.35;
      if (avance >= 1) { avance = 1; estado = "fuera"; }
    } else if (estado === "volviendo") {
      avance -= dt / 0.65;                       // volver siempre es más rápido
      if (avance <= 0) { avance = 0; estado = "guardado"; }
    }
    if (avance !== ultimoAvance) { dibujarAzucar(); ultimoAvance = avance; }

    anillo.rotation.y -= dt * 0.06;

    // confites
    var objetivo = (estado === "guardado") ? 0 : 1;
    escalaConfites += (objetivo - escalaConfites) * Math.min(1, dt * (objetivo === 0 ? 5 : 1.8));
    confites.visible = escalaConfites > 0.02;
    if (confites.visible) {
      for (var c = 0; c < N_CONFITE; c++) {
        var d = datos[c];
        d.ang += d.vel * dt;
        d.fase += d.vFase * dt;
        var radio = d.radio + Math.sin(d.fase) * d.vaiven;
        if (radio < 2.35) radio = 2.35 + (2.35 - radio) * 0.8;

        d.rx += d.vrx * dt; d.ry += d.vry * dt; d.rz += d.vrz * dt;

        // nacen pegados al pastel y salen con el azúcar
        var rr = 1.5 + (radio - 1.5) * suave(Math.min(1, avance * 1.25));
        maniqui.position.set(Math.cos(d.ang) * rr, d.y, Math.sin(d.ang) * rr);
        maniqui.rotation.set(d.rx, d.ry, d.rz);
        maniqui.scale.setScalar(d.escala * (0.35 + escalaConfites * 0.65) * escalaConfites);
        maniqui.updateMatrix();
        confites.setMatrixAt(c, maniqui.matrix);
      }
      confites.instanceMatrix.needsUpdate = true;
    }

    render.render(escena, camara);
  }

  host.classList.add("con-3d");
  if (pista && !menosMovimiento) {
    setTimeout(function () { if (!hubo) pista.classList.add("dentro"); }, 2600);
  }
  cuadro();
})();

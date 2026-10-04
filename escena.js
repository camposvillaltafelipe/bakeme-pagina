/* ==========================================================================
   BakeMe · Escena 3D del pastel
   three.js r128 (UMD). Sin dependencias extra, sin modelos ni imágenes.
   Pastel de bodas de tres pisos: betún de mantequilla peinado a espátula,
   perlas en la base de cada piso, una cascada de rosas con follaje que da
   la vuelta al pastel, corona dorada (el guiño al logo), tabla de oro y
   base de porcelana, todo iluminado por un estudio de luz generado aquí.

   Rendimiento:
   - La portada muestra primero una foto de este mismo pastel. El 3D la
     reemplaza con un fundido cuando ya dibujó; si no carga, queda la foto.
   - Cuando el navegador lo permite, el 3D corre en un hilo aparte (Web
     Worker con OffscreenCanvas): armar la escena, compilar los shaders y
     dibujar no traban la página. Si no, corre en la página.
   - Pocos shaders distintos: los materiales comparten programa.
   - Solo dibuja mientras se ve. En celular va a 30 cuadros cuando nadie lo
     toca, descansa mientras la página se desplaza y, si el equipo no da
     abasto, baja la resolución y deja de girar solo.
   - En celular, deslizar hacia arriba o abajo siempre mueve la página. Para
     girar el pastel hay que arrastrar de lado empezando sobre él.
   Con movimiento reducido el pastel no gira solo.
   ========================================================================== */
(function () {
  "use strict";

  var TRES = "https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js";

  /* ------------------------------------------------------------------------
     La escena. Corre igual dentro del hilo o en la página.
     op: { ancho, alto, dpr, movil, ligero, menos, tactil, foto }
     avisar(tipo, datos): manda noticias a la página.
     ------------------------------------------------------------------------ */
  function crearEscena(THREE, lienzo, op, avisar) {
    var menosMovimiento = !!op.menos;
    var movil = !!op.movil;
    var ligero = !!op.ligero;

    // Paleta oficial de BakeMe más los tonos que pide un pastel real
    var C = {
      crema:   0xF7E8D9,
      beige:   0xFBEFDF,
      rosa:    0xC96A66,
      salmon:  0xDFA69D,
      durazno: 0xEAC7B8,
      blanco:  0xFFF9F3,
      vino:    0x8E4A48,
      betun:   0xF8ECDF,   // marfil del betún de mantequilla
      oro:     0xDDB877,
      hoja:    0x5F6D4D,   // salvia apagada: verde justo para que el follaje se lea real
      helecho: 0x74845B
    };
    // Los hex están en sRGB; el render trabaja en lineal
    function lin(hex) { return new THREE.Color(hex).convertSRGBToLinear(); }

    // Azar con semilla: el pastel sale igual en cada visita
    var semilla = 20260926;
    function azar() { semilla = (semilla * 16807) % 2147483647; return (semilla - 1) / 2147483646; }
    function entre(a, b) { return a + (b - a) * azar(); }
    function suaveEntre(a, b, x) {
      var t = (x - a) / (b - a);
      t = t < 0 ? 0 : (t > 1 ? 1 : t);
      return t * t * (3 - 2 * t);
    }

    // Detalle según el equipo: vueltas del torno, puntos por surco y resolución de pétalo
    var CAL = movil || ligero
      ? { vueltas: 72,  surco: 6, petalos: 18, petaloU: 4, petaloV: 5 }
      : { vueltas: 128, surco: 8, petalos: 26, petaloU: 5, petaloV: 7 };

    var N_AZUCAR  = ligero ? 1500 : (movil ? 2600 : 6200);   // puntos del anillo de azúcar
    var N_CONFITE = ligero ? 18 : (movil ? 26 : 44);          // confites que orbitan
    var sombras = !movil && !ligero;

    // ---------------------------------------------------------------- escena
    var escena = new THREE.Scene();

    var camara = new THREE.PerspectiveCamera(40, 1, 0.1, 100);
    camara.position.set(0, 2.7, 12);
    camara.lookAt(0, -0.3, 0);

    var render = new THREE.WebGLRenderer({ canvas: lienzo, antialias: true, alpha: true,
      powerPreference: "default", preserveDrawingBuffer: !!op.foto });
    var dpr = op.dpr || 1;
    render.setPixelRatio(dpr);
    render.outputEncoding = THREE.sRGBEncoding;
    render.toneMapping = THREE.ACESFilmicToneMapping;
    render.toneMappingExposure = 0.88;
    render.shadowMap.enabled = sombras;
    render.shadowMap.type = THREE.PCFSoftShadowMap;

    // ------------------------------------------------------- estudio de luz
    // Un domo cálido con tres cajas de luz, convertido en mapa de entorno.
    // De aquí salen los reflejos del oro y de las perlas y la luz suave que
    // envuelve el betún. Domo y cajas usan el mismo material: un shader menos.
    (function () {
      var estudio = new THREE.Scene();
      var tinta = new THREE.MeshBasicMaterial({ vertexColors: true, side: THREE.DoubleSide });
      function pintar(geo, color) {
        var p = geo.attributes.position, tonos = [];
        for (var i = 0; i < p.count; i++) {
          var c = color(p.getY(i));
          tonos.push(c.r, c.g, c.b);
        }
        geo.setAttribute("color", new THREE.Float32BufferAttribute(tonos, 3));
        return geo;
      }
      var arriba = lin(0xFFF7EF), abajo = lin(0xE6C2B1);
      estudio.add(new THREE.Mesh(pintar(new THREE.SphereGeometry(20, 32, 16), function (y) {
        return abajo.clone().lerp(arriba, suaveEntre(-0.55, 0.65, y / 20));
      }), tinta));

      function caja(ancho, alto, hex, fuerza, x, y, z) {
        var tono = lin(hex).multiplyScalar(fuerza);
        var m = new THREE.Mesh(pintar(new THREE.PlaneGeometry(ancho, alto), function () { return tono; }), tinta);
        m.position.set(x, y, z);
        m.lookAt(0, 0, 0);
        estudio.add(m);
      }
      caja(9, 6, 0xFFFFFF, 4.0, -9, 11, 6);      // clave, arriba a la izquierda
      caja(5, 8, 0xFFE6D8, 1.4, 12, 3, 4);       // relleno cálido a la derecha
      caja(14, 3, 0xFFF3EA, 2.5, 0, 12, -10);    // contraluz

      var pmrem = new THREE.PMREMGenerator(render);
      escena.environment = pmrem.fromScene(estudio, 0.04).texture;
      pmrem.dispose();
    })();

    // ----------------------------------------------------------------- luces
    // Luz de lado y desde arriba: las sombras caen hacia la derecha, donde se ven
    escena.add(new THREE.HemisphereLight(0xFFF4EA, 0xE2BCAB, 0.12));

    var clave = new THREE.DirectionalLight(0xFFF0E2, 2.1);
    clave.position.set(-5.5, 7, 3.5);
    if (sombras) {
      clave.castShadow = true;
      clave.shadow.mapSize.set(2048, 2048);
      clave.shadow.camera.near = 2;
      clave.shadow.camera.far = 22;
      clave.shadow.camera.left = -4.2;
      clave.shadow.camera.right = 4.2;
      clave.shadow.camera.top = 4.2;
      clave.shadow.camera.bottom = -4.2;
      clave.shadow.bias = -0.0004;
      clave.shadow.normalBias = 0.02;
      clave.shadow.radius = 4;
    }
    escena.add(clave);

    var contra = new THREE.DirectionalLight(0xFFE2D4, 0.8);
    contra.position.set(4.5, 3, -5);
    escena.add(contra);

    // ------------------------------------------------------------ materiales
    // Grano del betún: vetas horizontales de la espátula y poro fino.
    function texturaBetun() {
      var lado = 256;
      var lienzoTextura = typeof OffscreenCanvas !== "undefined"
        ? new OffscreenCanvas(lado, lado)
        : document.createElement("canvas");
      lienzoTextura.width = lienzoTextura.height = lado;
      var g = lienzoTextura.getContext("2d");
      g.fillStyle = "#808080";
      g.fillRect(0, 0, lado, lado);
      for (var i = 0; i < 900; i++) {
        var x = azar() * lado, y = azar() * lado, largo = 6 + azar() * 46, alto = 1 + azar() * 1.5;
        g.fillStyle = azar() > 0.5 ? "rgba(255,255,255,.10)" : "rgba(0,0,0,.10)";
        g.fillRect(x, y, largo, alto);
        if (x + largo > lado) g.fillRect(x - lado, y, largo, alto);   // que la veta cruce el borde sin costura
      }
      for (var j = 0; j < 2600; j++) {
        g.fillStyle = azar() > 0.5 ? "rgba(255,255,255,.14)" : "rgba(0,0,0,.14)";
        g.fillRect(azar() * lado, azar() * lado, 1, 1);
      }
      var t = new THREE.CanvasTexture(lienzoTextura);
      t.wrapS = t.wrapT = THREE.RepeatWrapping;
      t.repeat.set(10, 3);
      return t;
    }

    // Tres familias de material y no más, para compilar pocos shaders:
    // el betún (con relieve), lo liso de una pieza (oro, porcelana, perlitas y
    // gemas) y lo que va por instancias (pétalos, hojas, perlas y confites).
    // Las dos últimas son de doble cara: la banda de la corona y los pétalos
    // son abiertos, y así todas comparten programa.
    var matBetun = new THREE.MeshStandardMaterial({ color: lin(C.betun), roughness: 0.62, metalness: 0,
      bumpMap: texturaBetun(), bumpScale: 0.0035, envMapIntensity: 0.55 });
    function liso(ajuste) {
      ajuste.side = THREE.DoubleSide;
      return new THREE.MeshStandardMaterial(ajuste);
    }
    var matOro = liso({ color: lin(C.oro), metalness: 1, roughness: 0.28 });
    var matPerla = liso({ color: lin(0xF7F0E8), roughness: 0.2, envMapIntensity: 1.15 });
    var matPorcelana = liso({ color: lin(C.blanco), roughness: 0.24, envMapIntensity: 0.95 });
    var matGema = liso({ color: lin(C.vino), roughness: 0.1, envMapIntensity: 1.3 });
    function porInstancia(ajuste) {
      ajuste.vertexColors = true;
      ajuste.side = THREE.DoubleSide;
      return new THREE.MeshStandardMaterial(ajuste);
    }
    var matPetalo = porInstancia({ roughness: 0.58, envMapIntensity: 0.6 });
    var matHoja = porInstancia({ roughness: 0.42, envMapIntensity: 0.6 });
    var matPerlas = porInstancia({ roughness: 0.2, envMapIntensity: 1.15 });
    var matConfite = porInstancia({ roughness: 0.45, metalness: 0.03 });

    // Color blanco por vértice para las piezas por instancia que no lo traen
    function blanca(geo) {
      var n = geo.attributes.position.count, unos = new Float32Array(n * 3);
      for (var i = 0; i < unos.length; i++) unos[i] = 1;
      geo.setAttribute("color", new THREE.BufferAttribute(unos, 3));
      return geo;
    }

    // -------------------------------------------------------------- el grupo
    // "soporte" queda quieto; "grupo" es el que se gira y se presiona.
    var soporte = new THREE.Group();
    escena.add(soporte);
    var grupo = new THREE.Group();
    grupo.rotation.x = 0.06;
    soporte.add(grupo);

    // LatheGeometry duplica la primera y la última vuelta: se promedian sus
    // normales para que no quede una línea visible en la costura.
    function coserCostura(geo, nPuntos, vueltas) {
      var n = geo.attributes.normal;
      for (var j = 0; j < nPuntos; j++) {
        var a = j, b = vueltas * nPuntos + j;
        var x = n.getX(a) + n.getX(b), y = n.getY(a) + n.getY(b), z = n.getZ(a) + n.getZ(b);
        var l = Math.sqrt(x * x + y * y + z * z) || 1;
        n.setXYZ(a, x / l, y / l, z / l);
        n.setXYZ(b, x / l, y / l, z / l);
      }
    }

    function torno(perfil, vueltas, material) {
      var puntos = perfil.map(function (p) { return new THREE.Vector2(p[0], p[1]); });
      var geo = new THREE.LatheGeometry(puntos, vueltas);
      coserCostura(geo, puntos.length, vueltas);
      var m = new THREE.Mesh(geo, material);
      grupo.add(m);
      return m;
    }

    // Base de porcelana y tabla dorada
    var base = torno([
      [0.001, -1.8], [0.78, -1.8], [0.83, -1.78], [0.81, -1.74], [0.52, -1.68], [0.26, -1.6], [0.22, -1.5],
      [0.28, -1.43], [1.5, -1.39], [2.42, -1.35], [2.52, -1.335], [2.54, -1.315], [2.48, -1.3], [2.3, -1.305], [0.001, -1.305]
    ], 96, matPorcelana);
    base.receiveShadow = true;

    var tabla = torno([
      [0.001, -1.305], [2.14, -1.305], [2.18, -1.297], [2.195, -1.272], [2.18, -1.248], [2.15, -1.24], [0.001, -1.24]
    ], 128, matOro);
    tabla.receiveShadow = true;

    // Un piso: betún peinado en surcos horizontales, canto redondeado y una
    // ondulación leve para que no parezca torneado a máquina.
    function piso(radio, alto, pie) {
      var canto = 0.045, paso = 0.082, hondo = 0.016;
      var lado = alto - canto;
      var pts = [new THREE.Vector2(0.001, 0), new THREE.Vector2(radio - 0.02, 0)];
      var n = Math.round((lado / paso) * CAL.surco);
      for (var i = 0; i <= n; i++) {
        var y = (i / n) * lado;
        var cresta = Math.pow(0.5 + 0.5 * Math.cos((y / paso) * Math.PI * 2), 0.55);
        var borde = suaveEntre(0, 0.05, y) * suaveEntre(lado, lado - 0.04, y);
        pts.push(new THREE.Vector2(radio + (cresta - 0.6) * hondo * borde, y));
      }
      for (var j = 1; j <= 7; j++) {
        var a = (j / 7) * Math.PI / 2;
        pts.push(new THREE.Vector2(radio - canto + Math.cos(a) * canto, lado + Math.sin(a) * canto));
      }
      for (var k = 1; k <= 8; k++) pts.push(new THREE.Vector2(Math.max(0.001, (radio - canto) * (1 - k / 8)), alto));

      var geo = new THREE.LatheGeometry(pts, CAL.vueltas);
      var p = geo.attributes.position;
      for (var v = 0; v < p.count; v++) {
        var x = p.getX(v), yy = p.getY(v), z = p.getZ(v);
        var r = Math.sqrt(x * x + z * z);
        if (r < radio * 0.9 || yy > lado + canto * 0.5) continue;       // solo el costado
        var th = Math.atan2(z, x);
        var onda = 0.0045 * Math.sin(3 * th + yy * 3.1 + pie) +
                   0.0028 * Math.sin(7 * th - yy * 7.3 + 1.7) +
                   0.0016 * Math.sin(13 * th + yy * 11);
        var f = (r + onda) / r;
        p.setX(v, x * f);
        p.setZ(v, z * f);
      }
      geo.computeVertexNormals();
      coserCostura(geo, pts.length, CAL.vueltas);

      var m = new THREE.Mesh(geo, matBetun);
      m.position.y = pie;
      m.castShadow = true;
      m.receiveShadow = true;
      grupo.add(m);
    }

    var PISOS = [
      { radio: 1.95, alto: 1.02, pie: -1.24 },
      { radio: 1.38, alto: 0.94, pie: -0.22 },
      { radio: 0.86, alto: 0.86, pie:  0.72 }
    ];
    PISOS.forEach(function (t) { piso(t.radio, t.alto, t.pie); });
    var CIMA = 1.58;

    // Radio del costado a cierta altura
    function radioEn(y) { return y > 0.72 ? 0.86 : (y > -0.22 ? 1.38 : 1.95); }

    // ------------------------------------------------------------- perlas
    var perlas = [];
    function cordon(radio, y, tam) {
      var r = radio + tam * 0.55;
      var n = Math.floor((Math.PI * 2 * r) / (tam * 2.05));
      for (var i = 0; i < n; i++) {
        var a = (i / n) * Math.PI * 2;
        perlas.push([Math.cos(a) * r, y + tam * 0.95, Math.sin(a) * r, tam * (0.94 + azar() * 0.1)]);
      }
    }
    cordon(1.95, -1.24, 0.048);
    cordon(1.38, -0.22, 0.042);
    cordon(0.86,  0.72, 0.036);

    // Icosaedro con normales de esfera: a este tamaño se ve igual de redondo con la tercera parte de caras
    var geoPerla = new THREE.IcosahedronGeometry(1, 1);
    geoPerla.attributes.normal.copy(geoPerla.attributes.position);
    blanca(geoPerla);
    var maniqui = new THREE.Object3D();
    var mallaPerlas = new THREE.InstancedMesh(geoPerla, matPerlas, perlas.length);
    var tonoPerla = lin(0xF7F0E8);
    perlas.forEach(function (q, i) {
      maniqui.position.set(q[0], q[1], q[2]);
      maniqui.scale.setScalar(q[3]);
      maniqui.updateMatrix();
      mallaPerlas.setMatrixAt(i, maniqui.matrix);
      mallaPerlas.setColorAt(i, tonoPerla);
    });
    mallaPerlas.receiveShadow = true;
    grupo.add(mallaPerlas);

    // --------------------------------------------------------------- rosas
    // Pétalos en espiral áurea: los de adentro se enrollan en capullo, los de
    // afuera se abren, se ahuecan y doblan la punta. El color de vértice
    // oscurece la base y el centro, como la sombra dentro de una rosa real.
    function crearRosa(nPetalos, apertura, resU, resV) {
      var pos = [], col = [], ind = [];
      var fino = 24;
      for (var k = 0; k < nPetalos; k++) {
        var f = k / (nPetalos - 1);
        var alfa = k * 2.39996 + (azar() - 0.5) * 0.3;
        var largo = (0.42 + 0.58 * Math.pow(f, 0.6)) * (0.94 + azar() * 0.12);
        var ancho = largo * (0.7 + 0.5 * f);
        var pieR = 0.02 + 0.16 * Math.pow(f, 0.9);
        var pieY = 0.22 * (1 - f);
        var incl0 = -0.16 + 0.45 * apertura * f;                    // el centro se cierra hacia dentro
        var incl1 = -0.02 + 0.95 * apertura * Math.pow(f, 1.4);
        var rizo = 0.75 * apertura * Math.pow(f, 2.4);               // solo los de afuera se doblan
        var envolver = 1 - 0.7 * Math.pow(f, 0.9);
        var cuchara = 0.35 * (1 - envolver * 0.6);
        var enrollar = 0.12 * apertura * Math.pow(f, 1.5);
        var tono = (0.8 + 0.2 * f) * (0.95 + azar() * 0.1);

        // espinazo del pétalo en su plano radial
        var sr = [pieR], sy = [pieY];
        for (var s = 1; s <= fino; s++) {
          var vs = (s - 0.5) / fino;
          var th = incl0 + (incl1 - incl0) * Math.pow(vs, 1.4) + rizo * suaveEntre(0.62, 1, vs);
          sr.push(sr[s - 1] + Math.sin(th) * largo / fino);
          sy.push(sy[s - 1] + Math.cos(th) * largo / fino);
        }
        var enEspinazo = function (arr, t) {
          var x = t * fino, i = Math.min(fino - 1, Math.floor(x));
          return arr[i] + (arr[i + 1] - arr[i]) * (x - i);
        };

        var ca = Math.cos(alfa), sa = Math.sin(alfa);
        var inicio = pos.length / 3;
        for (var j = 0; j <= resV; j++) {
          for (var i = 0; i <= resU; i++) {
            var u = (i / resU) * 2 - 1;
            var v = (j / resV) * (1 - 0.2 * u * u);                // borde superior redondeado
            var r = enEspinazo(sr, v), y = enEspinazo(sy, v);
            var mitad = ancho * 0.5 * Math.pow(Math.sin(Math.PI * 0.5 * Math.min(1, v * 1.4)), 0.75) *
                        (1 - 0.25 * suaveEntre(0.8, 1, v));
            var x = u * mitad;
            var ang = x / Math.max(r, 0.04);
            var px = r * Math.cos(ang) * envolver + r * (1 - envolver);   // plano ↔ enrollado al centro
            var pz = r * Math.sin(ang) * envolver + x * (1 - envolver);
            var hueco = cuchara * u * u * mitad;                          // los bordes se cierran
            var rollo = enrollar * suaveEntre(0.55, 1, Math.abs(u)) * suaveEntre(0.35, 1, v);
            var radial = px - hueco + rollo;
            pos.push(radial * ca - pz * sa, y + hueco * 0.35, radial * sa + pz * ca);
            var luz = (0.66 + 0.34 * suaveEntre(0, 0.6, v)) * tono * (1 + 0.06 * Math.abs(u));
            col.push(luz, luz, luz);
          }
        }
        for (j = 0; j < resV; j++) {
          for (i = 0; i < resU; i++) {
            var a0 = inicio + j * (resU + 1) + i, b0 = a0 + 1, c0 = a0 + resU + 1, d0 = c0 + 1;
            ind.push(a0, c0, b0, b0, c0, d0);
          }
        }
      }
      var geo = new THREE.BufferGeometry();
      geo.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
      geo.setAttribute("color", new THREE.Float32BufferAttribute(col, 3));
      geo.setIndex(ind);
      geo.computeVertexNormals();
      return geo;
    }

    // Hoja: punta aguda, doblada en V sobre el nervio y un poco caída.
    function crearHoja(resU, resV, anchoRel, doblez, caida) {
      var pos = [], col = [], ind = [];
      for (var j = 0; j <= resV; j++) {
        var v = j / resV;
        var mitad = anchoRel * Math.pow(Math.sin(Math.PI * Math.min(1, v * 1.02)), 0.85) * (1 - 0.3 * v);
        for (var i = 0; i <= resU; i++) {
          var u = (i / resU) * 2 - 1;
          pos.push(u * mitad, v, Math.abs(u) * mitad * doblez - caida * v * v);
          var luz = (0.72 + 0.28 * v) * (1 + 0.12 * (1 - Math.abs(u)));   // nervio central más claro
          col.push(luz, luz, luz);
        }
      }
      for (j = 0; j < resV; j++) {
        for (i = 0; i < resU; i++) {
          var a0 = j * (resU + 1) + i, b0 = a0 + 1, c0 = a0 + resU + 1, d0 = c0 + 1;
          ind.push(a0, c0, b0, b0, c0, d0);
        }
      }
      var geo = new THREE.BufferGeometry();
      geo.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
      geo.setAttribute("color", new THREE.Float32BufferAttribute(col, 3));
      geo.setIndex(ind);
      geo.computeVertexNormals();
      return geo;
    }

    // ------------------------------------------------ cascada alrededor del pastel
    // Baja en espiral desde la cima hasta la tabla, así se luce desde cualquier
    // lado mientras el pastel gira. Cada ancla dice dónde está y hacia dónde mira.
    var ANCLAS = [
      { a:  0.6,  y:  CIMA, r: 0.5,  cara: 0.9 },    // sobre el piso de arriba, junto a la corona
      { a:  0.2,  y:  1.36, r: 0,    cara: 0.2 },
      { a: -0.18, y:  1.02, r: 0,    cara: 0.2 },
      { a: -0.55, y:  0.72, r: 1.1,  cara: 0.7 },    // repisa del segundo piso
      { a: -0.95, y:  0.48, r: 0,    cara: 0.2 },
      { a: -1.35, y:  0.2,  r: 0,    cara: 0.2 },
      { a: -1.75, y: -0.04, r: 0,    cara: 0.2 },
      { a: -2.15, y: -0.22, r: 1.64, cara: 0.7 },    // repisa del primer piso
      { a: -2.55, y: -0.46, r: 0,    cara: 0.15 },
      { a: -2.95, y: -0.74, r: 0,    cara: 0.15 },
      { a: -3.35, y: -1.0,  r: 0,    cara: 0.15 },
      { a: -3.8,  y: -1.24, r: 2.07, cara: 0.55 },   // sobre la tabla
      { a: -4.3,  y: -1.24, r: 2.07, cara: 0.55 }
    ];

    var abiertas = [], capullos = [], hojas = [], hojitas = [];
    var TONOS_ROSA = [C.vino, C.crema, C.vino, C.rosa, C.durazno, C.salmon];
    var cuentaTono = 0;
    var ARRIBA = new THREE.Vector3(0, 1, 0);

    function puntoEn(ancla, da, dy) {
      var a = ancla.a + da;
      var y = ancla.y + (ancla.r ? 0 : dy);
      var r = ancla.r ? ancla.r + dy * 0.6 : radioEn(y);
      var fuera = new THREE.Vector3(Math.cos(a), 0, Math.sin(a));
      var normal = fuera.clone().multiplyScalar(1 - ancla.cara).addScaledVector(ARRIBA, ancla.cara).normalize();
      var tangente = new THREE.Vector3(-Math.sin(a), 0, Math.cos(a));
      return { p: new THREE.Vector3(fuera.x * r, y, fuera.z * r), n: normal, t: tangente, fuera: fuera };
    }

    ANCLAS.forEach(function (ancla, iAncla) {
      var paso = 0.62 / Math.max(0.8, ancla.r || radioEn(ancla.y));   // separación en ángulo según el radio
      var nRosas = ancla.r ? 3 : 2;                                  // en repisas y arriba caben más
      for (var i = 0; i < nRosas; i++) {
        var sitio = puntoEn(ancla, (i - (nRosas - 1) / 2) * paso + entre(-0.04, 0.04), entre(-0.1, 0.1));
        var grande = i === 1 || nRosas === 2 && i === 0 || azar() > 0.6;
        abiertas.push({ p: sitio.p, n: sitio.n, tam: grande ? entre(0.34, 0.4) : entre(0.26, 0.3),
          color: TONOS_ROSA[cuentaTono++ % TONOS_ROSA.length], giro: azar() * Math.PI * 2 });
      }
      for (var b = 0; b < 2; b++) {
        var capullo = puntoEn(ancla, (b ? 1 : -1) * paso * entre(0.95, 1.25) * (nRosas / 2), entre(-0.16, 0.18));
        capullos.push({ p: capullo.p, n: capullo.n, tam: entre(0.15, 0.19),
          color: [C.rosa, C.salmon, C.crema, C.vino][(iAncla + b) % 4], giro: azar() * Math.PI * 2 });
      }

      // hojas asomando entre las rosas
      for (var h = 0; h < 4; h++) {
        var s = puntoEn(ancla, entre(-1.2, 1.2) * paso, entre(-0.14, 0.14));
        var lado = azar() > 0.5 ? 1 : -1;
        var dir = s.t.clone().multiplyScalar(lado).addScaledVector(ARRIBA, entre(-0.8, 0.3)).addScaledVector(s.n, 0.35).normalize();
        hojas.push({ p: s.p.clone().addScaledVector(s.n, 0.02), dir: dir, n: s.n, tam: entre(0.4, 0.52) });
      }

      // una ramita de helecho que sale siguiendo la cascada
      var r0 = puntoEn(ancla, entre(-0.1, 0.1), 0);
      var rumbo = r0.t.clone().multiplyScalar(-1).addScaledVector(ARRIBA, -0.45).addScaledVector(r0.n, 0.5).normalize();
      var largo = entre(0.55, 0.8), pasos = 11;
      for (var k = 0; k < pasos; k++) {
        var t = (k + 1) / pasos;
        var punto = r0.p.clone().addScaledVector(rumbo, largo * t).addScaledVector(r0.n, 0.12 * t * t);
        var tam = 0.26 * (1 - t * 0.65);
        [-1, 1].forEach(function (lado2) {
          var costado = new THREE.Vector3().crossVectors(rumbo, r0.n).normalize().multiplyScalar(lado2);
          var d = rumbo.clone().multiplyScalar(0.55).add(costado).normalize();
          hojitas.push({ p: punto, dir: d, n: r0.n, tam: tam });
        });
      }
    });

    // Coloca una instancia con su eje +Y hacia "arriba" (flor) o a lo largo (hoja)
    var qBase = new THREE.Quaternion(), qGiro = new THREE.Quaternion();
    function aFlor(malla, lista) {
      lista.forEach(function (f, i) {
        qBase.setFromUnitVectors(ARRIBA, f.n);
        qGiro.setFromAxisAngle(ARRIBA, f.giro);
        maniqui.quaternion.copy(qBase).multiply(qGiro);
        maniqui.position.copy(f.p).addScaledVector(f.n, -f.tam * 0.12);
        maniqui.scale.setScalar(f.tam);
        maniqui.updateMatrix();
        malla.setMatrixAt(i, maniqui.matrix);
        malla.setColorAt(i, lin(f.color));
      });
      malla.instanceMatrix.needsUpdate = true;
      if (malla.instanceColor) malla.instanceColor.needsUpdate = true;
    }
    var ejeX = new THREE.Vector3(), ejeZ = new THREE.Vector3(), base4 = new THREE.Matrix4();
    function aHoja(malla, lista, color) {
      var tono = lin(color), variante = new THREE.Color();
      lista.forEach(function (h, i) {
        ejeX.crossVectors(h.dir, h.n).normalize();
        ejeZ.crossVectors(ejeX, h.dir).normalize();
        base4.makeBasis(ejeX, h.dir, ejeZ);
        maniqui.quaternion.setFromRotationMatrix(base4);
        maniqui.position.copy(h.p);
        maniqui.scale.setScalar(h.tam);
        maniqui.updateMatrix();
        malla.setMatrixAt(i, maniqui.matrix);
        variante.copy(tono).multiplyScalar(0.86 + azar() * 0.28);
        malla.setColorAt(i, variante);
      });
      malla.instanceMatrix.needsUpdate = true;
      if (malla.instanceColor) malla.instanceColor.needsUpdate = true;
    }

    var mallaAbiertas = new THREE.InstancedMesh(crearRosa(CAL.petalos, 1, CAL.petaloU, CAL.petaloV), matPetalo, abiertas.length);
    var mallaCapullos = new THREE.InstancedMesh(crearRosa(Math.round(CAL.petalos * 0.5), 0.32, CAL.petaloU, CAL.petaloV), matPetalo, capullos.length);
    var mallaHojas = new THREE.InstancedMesh(crearHoja(4, 8, 0.36, 0.35, 0.25), matHoja, hojas.length);
    var mallaHojitas = new THREE.InstancedMesh(crearHoja(2, 5, 0.22, 0.25, 0.12), matHoja, hojitas.length);
    aFlor(mallaAbiertas, abiertas);
    aFlor(mallaCapullos, capullos);
    aHoja(mallaHojas, hojas, C.hoja);
    aHoja(mallaHojitas, hojitas, C.helecho);
    // Proyectan sombra sobre el betún, pero no la reciben: en un pétalo tan
    // delgado la sombra propia sale dentada. El color de vértice ya da la hondura.
    [mallaAbiertas, mallaCapullos, mallaHojas].forEach(function (m) { m.castShadow = true; });
    grupo.add(mallaAbiertas, mallaCapullos, mallaHojas, mallaHojitas);

    // ------------------------------------------------------ corona dorada
    // Como la del logo: banda con dos filos, puntas de hoja con perla, arcos
    // con perlita entre punta y punta, y gemas vino en la banda.
    var corona = new THREE.Group();
    (function () {
      var r = 0.24, puntas = 5, altoBanda = 0.11, incl = 0.16, largoPunta = 0.22;
      var banda = new THREE.Mesh(new THREE.CylinderGeometry(r, r * 1.05, altoBanda, 56, 1, true), matOro);
      banda.position.y = altoBanda / 2;
      corona.add(banda);
      [[r * 1.05, 0.004, 0.016], [r, altoBanda, 0.013]].forEach(function (aro) {
        var t = new THREE.Mesh(new THREE.TorusGeometry(aro[0], aro[2], 10, 64), matOro);
        t.rotation.x = Math.PI / 2;
        t.position.y = aro[1];
        corona.add(t);
      });
      var geoPunta = new THREE.ConeGeometry(0.05, largoPunta, 16);
      var geoPerlita = new THREE.SphereGeometry(0.028, 16, 12);
      var geoGema = new THREE.SphereGeometry(0.024, 16, 12);
      var cuerda = 2 * r * Math.sin(Math.PI / puntas);
      var geoArco = new THREE.TorusGeometry(cuerda / 2, 0.009, 8, 24, Math.PI);
      var puntaX = r * 1.01 + Math.sin(incl) * largoPunta / 2;
      var puntaY = altoBanda + 0.1 + Math.cos(incl) * largoPunta / 2;
      for (var i = 0; i < puntas; i++) {
        var giro = new THREE.Group();                    // en cada giro, +X apunta hacia fuera
        giro.rotation.y = -(i / puntas) * Math.PI * 2;
        corona.add(giro);

        var punta = new THREE.Mesh(geoPunta, matOro);    // punta de hoja, aplanada e inclinada
        punta.position.set(r * 1.01, altoBanda + 0.1, 0);
        punta.rotation.z = -incl;
        punta.scale.set(0.5, 1, 1);
        giro.add(punta);

        var perlita = new THREE.Mesh(geoPerlita, matPerla);
        perlita.position.set(puntaX + Math.sin(incl) * 0.02, puntaY + Math.cos(incl) * 0.02, 0);
        giro.add(perlita);

        var medio = new THREE.Group();                   // arco, perlita y gema entre dos puntas
        medio.rotation.y = -Math.PI / puntas;
        giro.add(medio);
        var xMedio = r * Math.cos(Math.PI / puntas);
        var arco = new THREE.Mesh(geoArco, matOro);
        arco.rotation.y = Math.PI / 2;
        arco.position.set(xMedio, altoBanda, 0);
        arco.scale.set(1, 0.55, 1);
        medio.add(arco);
        var perlaArco = new THREE.Mesh(geoPerlita, matPerla);
        perlaArco.scale.setScalar(0.7);
        perlaArco.position.set(xMedio, altoBanda + cuerda / 2 * 0.55 + 0.012, 0);
        medio.add(perlaArco);
        var gema = new THREE.Mesh(geoGema, matGema);
        gema.position.set(r * 1.045, altoBanda / 2, 0);
        gema.scale.set(0.55, 1.3, 1);
        medio.add(gema);
      }
      corona.position.set(-0.1, CIMA, -0.06);
      corona.scale.setScalar(1.2);
      corona.traverse(function (o) { if (o.isMesh) o.castShadow = true; });
    })();
    grupo.add(corona);

    // Zona para detectar el toque sobre el pastel. Va fuera de la escena para
    // no dibujarse ni compilar shader; antes de cada rayo se le copia la
    // posición del pastel.
    var zonaClic = new THREE.Mesh(new THREE.CylinderGeometry(2.15, 2.15, 4.0, 10));
    zonaClic.position.y = 0.1;
    zonaClic.updateMatrix();

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

      // sale desde el costado del pastel, escondido tras el betún
      salida[i * 3]     = Math.cos(ang) * 1.3;
      salida[i * 3 + 1] = -0.35 + Math.random() * 0.6;
      salida[i * 3 + 2] = Math.sin(ang) * 1.3;

      posiciones[i * 3]     = salida[i * 3];
      posiciones[i * 3 + 1] = salida[i * 3 + 1];
      posiciones[i * 3 + 2] = salida[i * 3 + 2];

      // barrido en abanico
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
    var geoConfite = blanca(new THREE.BoxGeometry(0.07, 0.07, 0.28));
    var confites = new THREE.InstancedMesh(geoConfite, matConfite, N_CONFITE);
    confites.castShadow = sombras;
    confites.instanceMatrix.setUsage(THREE.DynamicDrawUsage);

    var datos = [];
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
      confites.setColorAt(c, lin(paleta[c % 4]));
    }
    if (confites.instanceColor) confites.instanceColor.needsUpdate = true;
    grupo.add(confites);

    // ------------------------------------------------------------- medidas
    function medir(ancho, alto) {
      ancho = Math.round(ancho);
      alto = Math.round(alto);
      if (!ancho || !alto) return;
      render.setSize(ancho, alto, false);
      camara.aspect = ancho / alto;
      camara.updateProjectionMatrix();
    }
    medir(op.ancho, op.alto);

    // Compila todos los shaders de una vez, con el azúcar y los confites
    // presentes, para que el primer toque no tenga que compilar nada.
    render.compile(escena, camara);
    anillo.visible = false;
    confites.visible = false;

    // ------------------------------------------------------------ interacción
    var estado = "guardado";      // guardado · saliendo · fuera · volviendo
    var avance = 0;               // 0 → 1
    var escalaConfites = 0;
    var presion = 1;              // respuesta al toque
    var girando = false;
    var conDedo = false;          // el arrastre en curso es con el dedo
    var giroInicio = { x: 0, y: 0, rotY: 0, rotX: 0 };
    var movido = 0;
    var hubo = false;             // ¿ya interactuó alguna vez?
    var inercia = 0;              // giro que sigue tras soltar un arrastre (rad/s)
    var ultimo = { x: 0, t: 0, v: 0 };
    var INCLINACION = 0.06;

    var rayo = new THREE.Raycaster();
    var puntero = new THREE.Vector2();

    // nx, ny: posición del puntero en el lienzo, de -1 a 1
    function apuntaAlPastel(nx, ny) {
      grupo.updateMatrixWorld();
      zonaClic.matrixWorld.multiplyMatrices(grupo.matrixWorld, zonaClic.matrix);
      puntero.set(nx, ny);
      rayo.setFromCamera(puntero, camara);
      return rayo.intersectObject(zonaClic, false).length > 0;
    }

    function marcarInteraccion() {
      if (!hubo) avisar("interactuo");
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

    function alPuntero(m) {
      if (m.fase === "baja") {
        var sobre = apuntaAlPastel(m.nx, m.ny);
        // Con el dedo solo se gira empezando sobre el pastel; el resto del
        // arco es para desplazar la página.
        if (m.dedo && !sobre) return;
        girando = true;
        conDedo = !!m.dedo;
        movido = 0;
        inercia = 0;
        giroInicio.x = m.x;
        giroInicio.y = m.y;
        giroInicio.rotY = grupo.rotation.y;
        giroInicio.rotX = grupo.rotation.x;
        ultimo.x = m.x;
        ultimo.t = performance.now();
        ultimo.v = 0;
        if (sobre && !conDedo) presion = 0.972;
      } else if (m.fase === "mueve") {
        if (!girando) return;
        var dx = m.x - giroInicio.x;
        var dy = m.y - giroInicio.y;
        movido = Math.max(movido, Math.abs(dx) + Math.abs(dy));
        grupo.rotation.y = giroInicio.rotY + dx * 0.007;
        // Con el dedo el arrastre vertical es de la página: solo se gira de lado.
        if (!conDedo) {
          // pasado el tope, la inclinación cede cada vez menos en vez de chocar
          var x = giroInicio.rotX + dy * 0.004;
          if (x > 0.42) x = 0.42 + (x - 0.42) * 0.25;
          if (x < -0.22) x = -0.22 + (x + 0.22) * 0.25;
          grupo.rotation.x = x;
        }
        // velocidad reciente para la inercia al soltar
        var ahora = performance.now(), lapso = Math.max(1, ahora - ultimo.t);
        ultimo.v = ultimo.v * 0.6 + ((m.x - ultimo.x) * 0.007 / (lapso / 1000)) * 0.4;
        ultimo.x = m.x;
        ultimo.t = ahora;
        if (movido > 8) marcarInteraccion();
      } else if (m.fase === "sube") {
        if (!girando) return;
        girando = false;
        presion = 1;
        if (movido < 8 && apuntaAlPastel(m.nx, m.ny)) { marcarInteraccion(); alternar(); return; }
        // un arrastre rápido deja al pastel girando y se va frenando solo
        if (!menosMovimiento && performance.now() - ultimo.t < 90) inercia = Math.max(-6, Math.min(6, ultimo.v));
      } else {
        girando = false;
        presion = 1;
      }
    }

    // ------------------------------------------------------------- animación
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
    var visible = true, oculta = false;
    var desplazandoHasta = 0;     // en celular no se dibuja mientras la página se mueve
    var ahorro = false;           // el equipo no da abasto: sin giro solo
    var inicioGiro = 0;           // el giro solo arranca suave tras el fundido
    var dibujados = 0, ultimoDibujo = 0, previoDibujado = false;
    var medidas = [];
    var pedido = 0;
    var raf = typeof requestAnimationFrame === "function"
      ? function (f) { return requestAnimationFrame(f); }
      : function (f) { return setTimeout(function () { f(performance.now()); }, 16); };

    function pedirCuadro() {
      if (!pedido && visible && !oculta && !perdido) pedido = raf(cuadro);
    }

    // Mide el ritmo real. Si no llega a ~37 cuadros por segundo baja la
    // resolución; si ni a 1x llega a 25, deja de girar solo.
    function vigilar(intervalo) {
      if (intervalo > 250) return;
      medidas.push(intervalo);
      if (medidas.length < 40) return;
      medidas.sort(function (a, b) { return a - b; });
      var mediana = medidas[20];
      medidas.length = 0;
      if (mediana > 27 && dpr > 1.01) {
        dpr = Math.max(1, Math.round((dpr - 0.25) * 4) / 4);
        render.setPixelRatio(dpr);
        avisar("calidad", { dpr: dpr });
      } else if (mediana > 40 && !ahorro) {
        ahorro = true;
        avisar("calidad", { dpr: dpr, ahorro: true });
      }
    }

    function cuadro(t) {
      pedido = 0;
      if (!visible || oculta || perdido) return;
      var ahora = performance.now();
      var dt = Math.min((ahora - (ultimoDibujo || ahora)) / 1000, 0.05);

      var sueltoGiro = !girando && !inercia;
      var quieto = sueltoGiro && estado !== "saliendo" && estado !== "volviendo" &&
        Math.abs(grupo.scale.x - presion) < 0.0005 && Math.abs(grupo.rotation.x - INCLINACION) < 0.0005 &&
        escalaConfites < 0.02;
      var giraSolo = !menosMovimiento && !ahorro;

      // Sin nada que mover no hace falta dibujar: se queda esperando.
      if (quieto && !giraSolo && dibujados > 1) { previoDibujado = false; return; }
      if (op.tactil && quieto) {
        // Mientras la página se desplaza, el pastel espera.
        if (ahora < desplazandoHasta) { previoDibujado = false; pedirCuadro(); return; }
        // Sin toques, 30 cuadros por segundo bastan para el giro lento.
        if (dibujados > 90 && ahora - ultimoDibujo < 30) { previoDibujado = false; pedirCuadro(); return; }
      }

      if (giraSolo && sueltoGiro && inicioGiro) {
        // giro suave de vitrina; tras el fundido de la foto arranca despacio
        var arranque = Math.min(1, Math.max(0, (ahora - inicioGiro) / 1800));
        grupo.rotation.y += dt * 0.12 * arranque * arranque;
      }
      if (inercia) {
        grupo.rotation.y += inercia * dt;
        inercia *= Math.exp(-dt * 2.6);
        if (Math.abs(inercia) < 0.01) inercia = 0;
      }
      // la inclinación vuelve sola a su sitio
      if (!girando) grupo.rotation.x += (INCLINACION - grupo.rotation.x) * Math.min(1, dt * 2.2);

      // respuesta al toque
      grupo.scale.x += (presion - grupo.scale.x) * Math.min(1, dt * 14);
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
      anillo.visible = avance > 0;
      anillo.rotation.y -= dt * 0.06;

      // confites
      var objetivo = (estado === "guardado") ? 0 : 1;
      escalaConfites += (objetivo - escalaConfites) * Math.min(1, dt * (objetivo === 0 ? 5 : 1.8));
      confites.visible = escalaConfites > 0.02;
      if (confites.visible) {
        for (var c = 0; c < N_CONFITE; c++) {
          var dd = datos[c];
          dd.ang += dd.vel * dt;
          dd.fase += dd.vFase * dt;
          var radio = dd.radio + Math.sin(dd.fase) * dd.vaiven;
          if (radio < 2.35) radio = 2.35 + (2.35 - radio) * 0.8;

          dd.rx += dd.vrx * dt; dd.ry += dd.vry * dt; dd.rz += dd.vrz * dt;

          // nacen pegados al pastel y salen con el azúcar
          var rr = 1.5 + (radio - 1.5) * suave(Math.min(1, avance * 1.25));
          maniqui.position.set(Math.cos(dd.ang) * rr, dd.y, Math.sin(dd.ang) * rr);
          maniqui.rotation.set(dd.rx, dd.ry, dd.rz);
          maniqui.scale.setScalar(dd.escala * (0.35 + escalaConfites * 0.65) * escalaConfites);
          maniqui.updateMatrix();
          confites.setMatrixAt(c, maniqui.matrix);
        }
        confites.instanceMatrix.needsUpdate = true;
      }

      render.render(escena, camara);
      dibujados++;
      // Los primeros cuadros traen trabajo de arranque: no cuentan para medir.
      if (previoDibujado && dibujados > 20) vigilar(ahora - ultimoDibujo);
      previoDibujado = true;
      ultimoDibujo = ahora;
      if (dibujados === 2) {
        avisar("listo");
        inicioGiro = ahora + 500;
      }
      pedirCuadro();
    }

    // Si el navegador suelta el contexto WebGL, vuelve la foto.
    var perdido = false;
    if (lienzo.addEventListener) {
      lienzo.addEventListener("webglcontextlost", function (e) {
        e.preventDefault();
        perdido = true;
        avisar("perdido");
      });
    }

    pedirCuadro();

    return {
      recibir: function (m) {
        if (m.tipo === "puntero") alPuntero(m);
        else if (m.tipo === "tamano") medir(m.ancho, m.alto);
        else if (m.tipo === "visible") { visible = m.valor; ultimoDibujo = 0; previoDibujado = false; }
        else if (m.tipo === "oculta") { oculta = m.valor; ultimoDibujo = 0; previoDibujado = false; }
        else if (m.tipo === "desplaza") desplazandoHasta = performance.now() + 180;
        else if (m.tipo === "alternar") { marcarInteraccion(); alternar(); }
        else if (m.tipo === "sobre") { avisar("cursor", { sobre: apuntaAlPastel(m.nx, m.ny) }); return; }
        pedirCuadro();
      }
    };
  }

  /* ------------------------------------------------------------------------
     Dentro del hilo: recibe el lienzo y los avisos de la página.
     ------------------------------------------------------------------------ */
  if (typeof window === "undefined") {
    var escenaHilo = null;
    self.onmessage = function (e) {
      var m = e.data;
      if (m.tipo === "iniciar") {
        try {
          importScripts(TRES);
          escenaHilo = crearEscena(self.THREE, m.lienzo, m.op, function (tipo, datos) {
            self.postMessage({ tipo: tipo, datos: datos });
          });
        } catch (err) {
          self.postMessage({ tipo: "fallo", datos: String(err && err.message || err) });
        }
        return;
      }
      if (escenaHilo) escenaHilo.recibir(m);
    };
    return;
  }

  /* ------------------------------------------------------------------------
     En la página: decide dónde corre el 3D, le pasa los gestos y hace el
     fundido desde la foto.
     ------------------------------------------------------------------------ */
  var URL_PROPIA = document.currentScript && document.currentScript.src;

  // Tarjetas gráficas que no dan para el 3D en movimiento
  var GPU_DEBIL = /Mali-(4|T|G3|G5[12])|PowerVR (SGX|Rogue G[A-Z]?[0-9])|Adreno \(TM\) ([1-4][0-9]{2}|50[0-9]|51[0-9])|Apple A(7|8|9)\b|Intel.*(HD Graphics [2-5][0-9]{2}\b|GMA)|SwiftShader|llvmpipe|Software/i;

  // ¿Hay WebGL? ¿Se puede usar dentro de un hilo? Y, de paso, ¿qué tarjeta hay?
  function revisarEquipo() {
    var r = { hilo: false, gpu: "", webgl: false };
    function leer(gl) {
      if (!gl) return false;
      r.webgl = true;
      try {
        var info = gl.getExtension("WEBGL_debug_renderer_info");
        if (info) r.gpu = String(gl.getParameter(info.UNMASKED_RENDERER_WEBGL) || "");
        var suelta = gl.getExtension("WEBGL_lose_context");
        if (suelta) suelta.loseContext();
      } catch (e) {}
      return true;
    }
    try {
      if (window.Worker && typeof OffscreenCanvas !== "undefined" &&
          "transferControlToOffscreen" in HTMLCanvasElement.prototype) {
        r.hilo = leer(new OffscreenCanvas(1, 1).getContext("webgl"));
      }
    } catch (e) { r.hilo = false; }
    if (!r.webgl) {
      try {
        var prueba = document.createElement("canvas");
        leer(prueba.getContext("webgl") || prueba.getContext("experimental-webgl"));
      } catch (e) {}
    }
    return r;
  }

  function cargarScript(url, listo, error) {
    if (window.THREE) return listo();
    var s = document.createElement("script");
    s.src = url;
    s.crossOrigin = "anonymous";
    s.onload = listo;
    s.onerror = error;
    document.head.appendChild(s);
  }

  // ajustes: { aMano: el visitante lo pidió con el botón }
  function iniciar(host, ajustes) {
    ajustes = ajustes || {};
    if (!host || host.getAttribute("data-3d")) return;
    var raiz = document.documentElement;
    var mm = function (q) { return window.matchMedia(q).matches; };
    var boton = host.querySelector(".ver-3d");
    var pista = host.querySelector(".pista-3d");
    var equipo = revisarEquipo();

    function rendirse() {
      host.setAttribute("data-3d", "no");
      host.classList.remove("cargando-3d");
      if (boton) boton.hidden = true;
    }
    if (!equipo.webgl) return rendirse();

    // Con una tarjeta débil, el 3D solo arranca si el visitante lo pide.
    if (GPU_DEBIL.test(equipo.gpu)) {
      raiz.classList.add("ligero");
      if (!ajustes.aMano) {
        if (boton) boton.hidden = false;
        return;
      }
    }

    host.setAttribute("data-3d", "cargando");
    host.classList.add("cargando-3d");
    var ligero = raiz.classList.contains("ligero");
    var tactil = mm("(pointer: coarse)") || !mm("(hover: hover)");
    var menos = mm("(prefers-reduced-motion: reduce)");
    var movil = mm("(max-width: 760px)");

    var etiqueta = "Pastel de tres pisos en 3D con rosas y corona. Actívalo para soltar una lluvia de azúcar; arrástralo de lado para girarlo.";
    function nuevoLienzo() {
      var c = document.createElement("canvas");
      c.className = "lienzo-3d";
      c.setAttribute("tabindex", "-1");
      c.setAttribute("role", "button");
      c.setAttribute("aria-label", etiqueta);
      // Teclado: Enter o espacio hacen lo mismo que el toque
      c.addEventListener("keydown", function (ev) {
        if (ev.key === "Enter" || ev.key === " " || ev.key === "Spacebar") {
          ev.preventDefault();
          mandar({ tipo: "alternar" });
        }
      });
      host.appendChild(c);
      return c;
    }
    var lienzo = nuevoLienzo();

    // Resolución de arranque; si el equipo no da abasto, la escena la baja sola hasta 1x.
    var dprMax = ligero ? 1.25 : (tactil || movil ? 1.5 : 2);
    var op = {
      ancho: lienzo.clientWidth || 400,
      alto: lienzo.clientHeight || 444,
      dpr: Math.min(window.devicePixelRatio || 1, dprMax),
      movil: movil, ligero: ligero, menos: menos, tactil: tactil
    };

    var enviar = null, cola = [], aLaVista;
    function mandar(m) { if (enviar) enviar(m); else cola.push(m); }
    function conectar(f) {
      enviar = f;
      cola.splice(0).forEach(f);
      // Si la escena se rearmó en la página, se le cuenta cómo está todo ahora.
      if (aLaVista === false) f({ tipo: "visible", valor: false });
      if (document.hidden) f({ tipo: "oculta", valor: true });
    }

    var pistaReloj = 0, huboToque = false, hilo = null;
    function rendirse3d() {
      host.classList.remove("con-3d", "cargando-3d");
      host.setAttribute("data-3d", "no");
      if (lienzo.parentNode) lienzo.parentNode.removeChild(lienzo);
      if (boton) boton.hidden = true;
    }
    function alAviso(tipo, datos) {
      if (tipo === "listo") {
        host.setAttribute("data-3d", "listo");
        host.classList.remove("cargando-3d");
        host.classList.add("con-3d");
        lienzo.setAttribute("tabindex", "0");
        if (boton) {
          var tenia = document.activeElement === boton;
          boton.hidden = true;
          if (tenia) lienzo.focus({ preventScroll: true });
        }
        if (pista && !menos) {
          pistaReloj = setTimeout(function () { if (!huboToque) pista.classList.add("dentro"); }, ajustes.aMano ? 900 : 2400);
        }
      } else if (tipo === "interactuo") {
        huboToque = true;
        clearTimeout(pistaReloj);
        if (pista) pista.classList.add("fuera");
      } else if (tipo === "cursor") {
        host.style.cursor = datos && datos.sobre ? "pointer" : "grab";
      } else if (tipo === "fallo" && hilo && host.getAttribute("data-3d") === "cargando") {
        // El hilo no pudo (navegador a medias): se intenta una vez en la página.
        hilo.terminate();
        hilo = null;
        enviar = null;
        if (lienzo.parentNode) lienzo.parentNode.removeChild(lienzo);
        lienzo = nuevoLienzo();
        enPagina();
      } else if (tipo === "perdido" || tipo === "fallo") {
        rendirse3d();
      }
    }

    function enPagina() {
      cargarScript(TRES, function () {
        // Se arma en la siguiente pausa para no trabar lo que esté pasando.
        setTimeout(function () {
          try {
            var escena = crearEscena(window.THREE, lienzo, op, alAviso);
            conectar(function (m) { escena.recibir(m); });
          } catch (e) { rendirse3d(); }
        }, 30);
      }, rendirse3d);
    }

    if (equipo.hilo && URL_PROPIA) {
      try {
        hilo = new Worker(URL_PROPIA);
        var off = lienzo.transferControlToOffscreen();
        hilo.onmessage = function (e) { alAviso(e.data.tipo, e.data.datos); };
        hilo.onerror = function (e) { if (e && e.preventDefault) e.preventDefault(); alAviso("fallo"); };
        hilo.postMessage({ tipo: "iniciar", lienzo: off, op: op }, [off]);
        conectar(function (m) { if (hilo) hilo.postMessage(m); });
      } catch (e) {
        if (hilo) hilo.terminate();
        hilo = null;
        if (lienzo.parentNode) lienzo.parentNode.removeChild(lienzo);
        lienzo = nuevoLienzo();
        enPagina();
      }
    } else {
      enPagina();
    }

    // ---- gestos: se escuchan en el arco, no en todo el lienzo
    var caja = null, abajo = null, ultimaConsulta = 0;
    function enLienzo(e) {
      var r = caja || lienzo.getBoundingClientRect();
      return {
        nx: ((e.clientX - r.left) / r.width) * 2 - 1,
        ny: -((e.clientY - r.top) / r.height) * 2 + 1
      };
    }
    function puntero(fase, e) {
      var p = enLienzo(e);
      mandar({ tipo: "puntero", fase: fase, x: e.clientX, y: e.clientY, nx: p.nx, ny: p.ny, dedo: e.pointerType !== "mouse" });
    }
    host.addEventListener("pointerdown", function (e) {
      if (host.getAttribute("data-3d") !== "listo") return;
      if (e.pointerType === "mouse" && e.button !== 0) return;
      if (e.target.closest && e.target.closest("button")) return;
      caja = lienzo.getBoundingClientRect();
      abajo = e.pointerId;
      puntero("baja", e);
      if (e.pointerType === "mouse" && host.setPointerCapture) {
        try { host.setPointerCapture(e.pointerId); } catch (x) {}
      }
    });
    host.addEventListener("pointermove", function (e) {
      if (host.getAttribute("data-3d") !== "listo") return;
      if (abajo === e.pointerId) { puntero("mueve", e); return; }
      if (e.pointerType !== "mouse" || abajo !== null) return;
      var ahora = performance.now();
      if (ahora - ultimaConsulta < 90) return;
      ultimaConsulta = ahora;
      caja = null;
      var p = enLienzo(e);
      mandar({ tipo: "sobre", nx: p.nx, ny: p.ny });
    });
    function soltar(fase) {
      return function (e) {
        if (abajo !== e.pointerId) return;
        abajo = null;
        puntero(fase, e);
        caja = null;
      };
    }
    host.addEventListener("pointerup", soltar("sube"));
    host.addEventListener("pointercancel", soltar("cancela"));
    host.addEventListener("pointerleave", function () { if (abajo === null) host.style.cursor = ""; });

    // ---- tamaño, visibilidad y desplazamiento
    function medir() {
      mandar({ tipo: "tamano", ancho: lienzo.clientWidth, alto: lienzo.clientHeight });
    }
    if (window.ResizeObserver) new ResizeObserver(medir).observe(host);
    else window.addEventListener("resize", medir);

    var ultimoAviso = 0;
    aLaVista = true;
    function alDesplazar() {
      var ahora = performance.now();
      if (ahora - ultimoAviso < 100) return;
      ultimoAviso = ahora;
      mandar({ tipo: "desplaza" });
    }
    if (window.IntersectionObserver) {
      new IntersectionObserver(function (e) {
        var antes = aLaVista;
        aLaVista = e[0].isIntersecting;
        if (antes !== aLaVista) mandar({ tipo: "visible", valor: aLaVista });
        if (tactil) {
          if (aLaVista) window.addEventListener("scroll", alDesplazar, { passive: true });
          else window.removeEventListener("scroll", alDesplazar);
        }
      }, { threshold: 0.02 }).observe(host);
    }
    document.addEventListener("visibilitychange", function () {
      mandar({ tipo: "oculta", valor: document.hidden });
    });
  }

  window.BakeMe3D = { iniciar: iniciar, crearEscena: crearEscena };
})();

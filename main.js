import * as THREE from 'https://cdn.skypack.dev/three@0.138.0';
import { EffectComposer } from 'https://unpkg.com/three@0.139.0/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'https://unpkg.com/three@0.138.0/examples/jsm/postprocessing/RenderPass.js';
import { ShaderPass } from 'https://unpkg.com/three@0.138.0/examples/jsm/postprocessing/ShaderPass.js';
import { SMAAPass } from 'https://unpkg.com/three@0.138.0/examples/jsm/postprocessing/SMAAPass.js';
import { GammaCorrectionShader } from 'https://unpkg.com/three@0.138.0/examples/jsm/shaders/GammaCorrectionShader.js';
import { EffectShader } from "./EffectShader.js";
import { OrbitControls } from 'https://unpkg.com/three@0.138.0/examples/jsm/controls/OrbitControls.js';
import { TransformControls } from './TransformControls.js';
import { AssetManager } from './AssetManager.js';
import { Stats } from "./stats.js";
import { GUI } from 'https://unpkg.com/three@0.138.0/examples/jsm/libs/lil-gui.module.min.js';
import NoiseFunction from './NoiseFunction.js';
import { FullScreenQuad } from 'https://unpkg.com/three@0.138.0/examples/jsm/postprocessing/Pass.js';
async function main() {
    // Setup basic renderer, controls, and profiler
    const clientWidth = window.innerWidth * 0.99;
    const clientHeight = window.innerHeight * 0.98;
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(75, clientWidth / clientHeight, 0.1, 1000);
    camera.position.set(50, 75, 50);
    const renderer = new THREE.WebGLRenderer();
    renderer.setSize(clientWidth, clientHeight);
    document.body.appendChild(renderer.domElement);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.VSMShadowMap;
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.target.set(0, 25, 0);
    const transformControl = new TransformControls(camera, renderer.domElement);
    transformControl.addEventListener('dragging-changed', function(event) {

        controls.enabled = !event.value;

    });
    transformControl.mode = "scale";
    const fogAnchor = new THREE.Object3D();
    fogAnchor.position.set(0, 50, 0);
    scene.add(fogAnchor);
    //transformControl.scale.set(0.5, 0.5, 0.5);
    transformControl.attach(fogAnchor);
    scene.add(transformControl);
    const stats = new Stats();
    stats.showPanel(0);
    document.body.appendChild(stats.dom);
    // Setup scene
    // Skybox
    const environment = new THREE.CubeTextureLoader().load([
        "skybox/Box_Right.bmp",
        "skybox/Box_Left.bmp",
        "skybox/Box_Top.bmp",
        "skybox/Box_Bottom.bmp",
        "skybox/Box_Front.bmp",
        "skybox/Box_Back.bmp"
    ]);
    scene.background = environment;
    // Lighting
    const ambientLight = new THREE.AmbientLight(new THREE.Color(1.0, 1.0, 1.0), 0.25);
    scene.add(ambientLight);
    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.35);
    directionalLight.position.set(150, 200, 50);
    // Shadows
    directionalLight.castShadow = true;
    directionalLight.shadow.mapSize.width = 1024;
    directionalLight.shadow.mapSize.height = 1024;
    directionalLight.shadow.camera.left = -75;
    directionalLight.shadow.camera.right = 75;
    directionalLight.shadow.camera.top = 75;
    directionalLight.shadow.camera.bottom = -75;
    directionalLight.shadow.camera.near = 0.1;
    directionalLight.shadow.camera.far = 500;
    directionalLight.shadow.bias = -0.001;
    directionalLight.shadow.blurSamples = 8;
    directionalLight.shadow.radius = 4;
    scene.add(directionalLight);
    const directionalLight2 = new THREE.DirectionalLight(0xffffff, 0.15);
    directionalLight2.color.setRGB(1.0, 1.0, 1.0);
    directionalLight2.position.set(-50, 200, -150);
    scene.add(directionalLight2);
    // Objects
    const ground = new THREE.Mesh(new THREE.PlaneGeometry(100, 100).applyMatrix4(new THREE.Matrix4().makeRotationX(-Math.PI / 2)), new THREE.MeshStandardMaterial({ side: THREE.DoubleSide }));
    ground.castShadow = true;
    ground.receiveShadow = true;
    scene.add(ground);
    const box = new THREE.Mesh(new THREE.BoxGeometry(10, 10, 10), new THREE.MeshStandardMaterial({ side: THREE.DoubleSide, color: new THREE.Color(1.0, 0.0, 0.0) }));
    box.castShadow = true;
    box.receiveShadow = true;
    box.position.y = 5.01;
    scene.add(box);
    const sphere = new THREE.Mesh(new THREE.SphereGeometry(6.25, 32, 32), new THREE.MeshStandardMaterial({ side: THREE.DoubleSide, envMap: environment, metalness: 1.0, roughness: 0.25 }));
    sphere.position.y = 7.5;
    sphere.position.x = 25;
    sphere.position.z = 25;
    sphere.castShadow = true;
    sphere.receiveShadow = true;
    scene.add(sphere);
    const torusKnot = new THREE.Mesh(new THREE.TorusKnotGeometry(5, 1.5, 200, 32), new THREE.MeshStandardMaterial({ side: THREE.DoubleSide, envMap: environment, metalness: 0.5, roughness: 0.5, color: new THREE.Color(0.0, 1.0, 0.0) }));
    torusKnot.position.y = 10;
    torusKnot.position.x = -25;
    torusKnot.position.z = -25;
    torusKnot.castShadow = true;
    torusKnot.receiveShadow = true;
    scene.add(torusKnot);
    // Build postprocessing stack
    // Render Targets
    const defaultTexture = new THREE.WebGLRenderTarget(clientWidth, clientWidth, {
        minFilter: THREE.LinearFilter,
        magFilter: THREE.NearestFilter
    });
    defaultTexture.depthTexture = new THREE.DepthTexture(clientWidth, clientWidth, THREE.FloatType);
    // Post Effects
    const composer = new EffectComposer(renderer);
    const smaaPass = new SMAAPass(clientWidth, clientHeight);
    const effectPass = new ShaderPass(EffectShader);
    composer.addPass(effectPass);
    composer.addPass(smaaPass);
    // Create Texture For Noise
    const boxCenter = new THREE.Vector3(0, 50, 0);
    const boxSize = new THREE.Vector3(0, 0, 0);
    //fogAnchor.position.copy(boxCenter.clone().multiplyScalar(2.0));
    // Setup GUI
    const effectController = {
        scale: 1,
        bias: 0,
        octaves: 5,
        persistence: 0.5,
        lacunarity: 2,
        xSize: 100,
        ySize: 100,
        zSize: 100,
        lightDirX: 0,
        lightDirY: 1,
        lightDirZ: 0,
        xSpeed: 1,
        ySpeed: 0,
        zSpeed: 1,
        wSpeed: 1,
        fogColor: [1, 1, 1],
        samples: 100,
        resolution: 1,
        thickness: 5,
        lightAbsorption: 5,
        Mode: 'Translate'
    };
    const gui = new GUI();
    gui.add(effectController, "samples", 1, 200, 1).name("Samples");
    gui.add(effectController, "resolution", 0.1, 1, 0.001).name("Resolution");
    gui.add(effectController, "thickness", 0.0, 10.0, 0.001).name("Thickness");
    gui.add(effectController, "lightAbsorption", 0.0, 10.0, 0.001).name("Light Absorption");
    gui.add(effectController, "scale", 0, 5, 0.001).name("Scale");
    gui.add(effectController, "octaves", 1, 5, 1).name("Octaves");
    gui.add(effectController, "persistence", 0, 1, 0.001).name("Persistence");
    gui.add(effectController, "lacunarity", 0, 4, 0.001).name("Lacunarity");
    gui.add(effectController, "bias", -1, 1, 0.001).name("Bias");
    gui.addColor(effectController, "fogColor").name("Fog Color");
    gui.add(effectController, "xSpeed", -2, 2, 0.001).name("Fog X Speed");
    gui.add(effectController, "ySpeed", -2, 2, 0.001).name("Fog Y Speed");
    gui.add(effectController, "zSpeed", -2, 2, 0.001).name("Fog Z Speed");
    gui.add(effectController, "wSpeed", -2, 2, 0.001).name("Fog W Speed");
    gui.add(effectController, "lightDirX", -1, 1, 0.001).name("Light X Direction");
    gui.add(effectController, "lightDirY", -1, 1, 0.001).name("Light Y Direction");
    gui.add(effectController, "lightDirZ", -1, 1, 0.001).name("Light Z Direction");
    const transformModes = gui.addFolder('Transform Modes');
    transformModes.add(effectController, "Mode").options(["Translate", "Scale"]);
    transformModes.open();
    //gui.add(effectController, 'lightStrength', 0, 1, 0.001).name("Light Strength");
    let noiseTarget = new THREE.WebGL3DRenderTarget(100, 100, 100);
    noiseTarget.texture.minFilter = THREE.LinearFilter;
    noiseTarget.texture.magFilter = THREE.LinearFilter;
    const ns = new THREE.ShaderMaterial({
        uniforms: {
            depth: { value: 0 },
            scale: { value: 0 },
            octaves: { value: 0 },
            lacunarity: { value: 0 },
            persistence: { value: 0 },
            time: { value: 0 },
            xSpeed: { value: 0 },
            ySpeed: { value: 0 },
            zSpeed: { value: 0 },
            wSpeed: { value: 0 },
            mindex: { value: 0 },
            resolution: { value: 1 },
            boxSize: { value: new THREE.Vector3() },
            boxCenter: { value: new THREE.Vector3() }
        },
        vertexShader: /* glsl */ `
		varying vec2 vUv;
		void main() {
			vUv = uv;
			gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );
		}`,
        fragmentShader: /*glsl*/ `
        varying vec2 vUv;
        uniform float depth;
        uniform float scale;
        uniform float octaves;
        uniform float lacunarity;
        uniform float persistence;
        uniform float time;
        uniform float xSpeed;
        uniform float ySpeed;
        uniform float zSpeed;
        uniform float wSpeed;
        uniform float mindex;
        uniform float resolution;
        uniform vec3 boxSize; 
        uniform vec3 boxCenter;
        ${NoiseFunction}
        void main() {
            vec3 boxCoord;
            if (mindex == 0.0) {
                boxCoord = vec3(depth * (1.0 / resolution), vUv.y * boxSize.y, vUv.x * boxSize.z);
            } else if (mindex == 1.0) {
                boxCoord = vec3(vUv.x * boxSize.x, depth * (1.0 / resolution), vUv.y * boxSize.z);
            } if (mindex == 2.0) {
                boxCoord = vec3(vUv * boxSize.xy, depth * (1.0 / resolution));
            }
            boxCoord -= boxSize / 2.0;
            boxCoord += boxCenter;
            float magnitude = 0.5;
            float frequency = 40.0 / scale;
            float result = 0.0;
            for (float i = 0.0; i < octaves; i++) {
                result += magnitude * (cnoise(/*[(threadX + time * xSpeed) / frequency, (threadY + time * ySpeed) / frequency, (threadZ + time * zSpeed) / frequency, (time * wSpeed) / frequency]*/
                vec4((boxCoord.x + time * xSpeed) / frequency, 
                (boxCoord.y + time * ySpeed) / frequency,
                (boxCoord.z + time * zSpeed) / frequency,
                (time * wSpeed) / frequency)));
                frequency *= (1.0 / lacunarity);
                magnitude *= persistence;
            }
            gl_FragColor = vec4(vec3(result * 0.5 + 0.5), 0.0);
        }
        `
    });
    const fsQuad = new FullScreenQuad(ns);
    let lastBoxSize = boxSize.clone();
    let lastResolution = effectController.resolution;

    function animate() {
        renderer.setRenderTarget(defaultTexture);
        renderer.clear();
        renderer.render(scene, camera);
        transformControl.mode = effectController.Mode.toLowerCase();
        effectController.xSize = Math.max(Math.min(Math.floor(100 * fogAnchor.scale.x), 300), 0);
        effectController.ySize = Math.max(Math.min(Math.floor(100 * fogAnchor.scale.y), 300), 0);
        effectController.zSize = Math.max(Math.min(Math.floor(100 * fogAnchor.scale.z), 300), 0);
        boxCenter.copy(fogAnchor.position);
        boxSize.x = effectController.xSize;
        boxSize.y = effectController.ySize;
        boxSize.z = effectController.zSize;
        const mindex = [boxSize.x, boxSize.y, boxSize.z].indexOf(Math.min(boxSize.x, boxSize.y, boxSize.z));
        if (!(boxSize.x === lastBoxSize.x && boxSize.y === lastBoxSize.y && boxSize.z === lastBoxSize.z) || effectController.resolution !== lastResolution) {
            console.log(mindex);
            if (mindex === 0) {
                noiseTarget = new THREE.WebGL3DRenderTarget(Math.floor(boxSize.z * effectController.resolution), Math.floor(boxSize.y * effectController.resolution), Math.floor(boxSize.x * effectController.resolution));
            } else if (mindex === 1) {
                noiseTarget = new THREE.WebGL3DRenderTarget(Math.floor(boxSize.x * effectController.resolution), Math.floor(boxSize.z * effectController.resolution), Math.floor(boxSize.y * effectController.resolution));
            } else if (mindex === 2) {
                noiseTarget = new THREE.WebGL3DRenderTarget(Math.floor(boxSize.x * effectController.resolution), Math.floor(boxSize.y * effectController.resolution), Math.floor(boxSize.z * effectController.resolution));
            }
            noiseTarget.texture.minFilter = THREE.LinearFilter;
            noiseTarget.texture.magFilter = THREE.LinearFilter;
        }
        lastBoxSize = boxSize.clone();
        lastResolution = effectController.resolution;
        fsQuad.material.uniforms.scale.value = effectController.scale;
        fsQuad.material.uniforms.octaves.value = effectController.octaves;
        fsQuad.material.uniforms.lacunarity.value = effectController.lacunarity;
        fsQuad.material.uniforms.persistence.value = effectController.persistence;
        fsQuad.material.uniforms.time.value = performance.now() / 100;
        fsQuad.material.uniforms.xSpeed.value = effectController.xSpeed;
        fsQuad.material.uniforms.ySpeed.value = effectController.ySpeed;
        fsQuad.material.uniforms.zSpeed.value = effectController.zSpeed;
        fsQuad.material.uniforms.wSpeed.value = effectController.wSpeed;
        fsQuad.material.uniforms.boxSize.value = boxSize;
        fsQuad.material.uniforms.boxCenter.value = boxCenter;
        fsQuad.material.uniforms.mindex.value = mindex;
        fsQuad.material.uniforms.resolution.value = effectController.resolution;
        for (let i = 0; i < Math.floor([boxSize.x, boxSize.y, boxSize.z][mindex]); i++) {
            renderer.setRenderTarget(noiseTarget, i);
            fsQuad.material.uniforms.depth.value = i;
            fsQuad.render(renderer);
        }
        // Uniforms
        effectPass.uniforms["sceneDiffuse"].value = defaultTexture.texture;
        effectPass.uniforms["sceneDepth"].value = defaultTexture.depthTexture;
        effectPass.uniforms["volumeTexture"].value = noiseTarget.texture;
        effectPass.uniforms["boxCenter"].value = boxCenter;
        effectPass.uniforms["boxSize"].value = boxSize;
        camera.updateMatrixWorld();
        effectPass.uniforms["projectionMatrixInv"].value = camera.projectionMatrixInverse;
        effectPass.uniforms["viewMatrixInv"].value = camera.matrixWorld;
        effectPass.uniforms["cameraPos"].value = camera.position;
        effectPass.uniforms['resolution'].value = new THREE.Vector2(clientWidth, clientHeight);
        effectPass.uniforms['time'].value = performance.now() / 1000;
        effectPass.uniforms['bias'].value = effectController.bias;
        effectPass.uniforms['samples'].value = effectController.samples;
        effectPass.uniforms['fogColor'].value = new THREE.Vector3(...effectController.fogColor);
        effectPass.uniforms['mindex'].value = mindex;
        effectPass.uniforms['thickness'].value = effectController.thickness;
        effectPass.uniforms['lightAbsorption'].value = effectController.lightAbsorption;
        effectPass.uniforms['lightDir'].value = new THREE.Vector3(effectController.lightDirX, effectController.lightDirY, effectController.lightDirZ);
        composer.render();
        controls.update();
        stats.update();
        requestAnimationFrame(animate);
    }
    requestAnimationFrame(animate);
}
main();
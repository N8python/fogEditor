import * as THREE from 'https://cdn.skypack.dev/pin/three@v0.137.0-X5O2PK3x44y1WRry67Kr/mode=imports/optimized/three.js';
import { EffectComposer } from 'https://unpkg.com/three@0.137.0/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'https://unpkg.com/three@0.137.0/examples/jsm/postprocessing/RenderPass.js';
import { ShaderPass } from 'https://unpkg.com/three@0.137.0/examples/jsm/postprocessing/ShaderPass.js';
import { SMAAPass } from 'https://unpkg.com/three@0.137.0/examples/jsm/postprocessing/SMAAPass.js';
import { GammaCorrectionShader } from 'https://unpkg.com/three@0.137.0/examples/jsm/shaders/GammaCorrectionShader.js';
import { EffectShader } from "./EffectShader.js";
import { OrbitControls } from 'https://unpkg.com/three@0.137.0/examples/jsm/controls/OrbitControls.js';
import { TransformControls } from './TransformControls.js';
import { AssetManager } from './AssetManager.js';
import { Stats } from "./stats.js";
import { GUI } from 'https://unpkg.com/three@0.137.0/examples/jsm/libs/lil-gui.module.min.js';
import NoiseFunction from './NoiseFunction.js';
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
    const gpu = new GPU();
    const noiseShader = gpu.createKernel(function(time, scale, octaves, persistence, lacunarity, xAmt, yAmt, zAmt, xSpeed, ySpeed, zSpeed, wSpeed) {
        let magnitude = 0.5;
        let frequency = 40 / scale;
        let threadZ = Math.floor(this.thread.x / (xAmt * yAmt));
        let threadY = Math.floor((this.thread.x - threadZ * (xAmt * yAmt)) / (xAmt));
        let threadX = (this.thread.x - threadY * (xAmt) - threadZ * (xAmt * yAmt));
        let result = 0;
        for (let i = 0; i < octaves; i++) {
            result += magnitude * cnoise([(threadX + time * xSpeed) / frequency, (threadY + time * ySpeed) / frequency, (threadZ + time * zSpeed) / frequency, (time * wSpeed) / frequency]);
            frequency *= (1 / lacunarity);
            magnitude *= persistence;
        }
        return result;
    });
    noiseShader.dynamicOutput = true;
    noiseShader.addNativeFunction('cnoise', NoiseFunction);
    let texture;
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
        xSpeed: 1,
        ySpeed: 0,
        zSpeed: 1,
        wSpeed: 1,
        fogColor: [1, 1, 1],
        samples: 100,
        Mode: 'Translate'
    };
    const gui = new GUI();
    gui.add(effectController, "samples", 1, 200, 1).name("Samples");
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
    const transformModes = gui.addFolder('Transform Modes');
    transformModes.add(effectController, "Mode").options(["Translate", "Scale"]);
    transformModes.open();
    //gui.add(effectController, 'lightStrength', 0, 1, 0.001).name("Light Strength");
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
        noiseShader.setOutput([boxSize.x * boxSize.y * boxSize.z]);
        const noiseDataCompute = noiseShader(performance.now() / 100, effectController.scale, effectController.octaves, effectController.persistence, effectController.lacunarity, boxSize.x, boxSize.y, boxSize.z, effectController.xSpeed, effectController.ySpeed, effectController.zSpeed, effectController.wSpeed);
        const data = new Uint8Array(boxSize.x * boxSize.y * boxSize.z);
        for (let x = 0; x < boxSize.z; x++) {
            for (let y = 0; y < boxSize.y; y++) {
                for (let z = 0; z < boxSize.x; z++) {
                    data[x * (boxSize.y * boxSize.x) + y * (boxSize.x) + z] = 128 + 128 * noiseDataCompute[x * (boxSize.y * boxSize.x) + y * (boxSize.x) + z];
                }
            }
        }
        texture = new THREE.DataTexture3D(data, boxSize.x, boxSize.y, boxSize.z);
        texture.format = THREE.RedFormat;
        texture.minFilter = THREE.LinearFilter;
        texture.magFilter = THREE.LinearFilter;
        texture.unpackAlignment = 1;
        texture.needsUpdate = true;
        // Uniforms
        effectPass.uniforms["sceneDiffuse"].value = defaultTexture.texture;
        effectPass.uniforms["sceneDepth"].value = defaultTexture.depthTexture;
        effectPass.uniforms["volumeTexture"].value = texture;
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
        composer.render();
        controls.update();
        stats.update();
        requestAnimationFrame(animate);
    }
    requestAnimationFrame(animate);
}
main();
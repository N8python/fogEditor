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
    noiseShader.addNativeFunction('cnoise', /*glsl*/ `
    float cnoise(vec4 P){
        vec4 Pi0 = floor(P); // Integer part for indexing
        vec4 Pi1 = Pi0 + 1.0; // Integer part + 1
        Pi0 = mod(Pi0, 289.0);
        Pi1 = mod(Pi1, 289.0);
        vec4 Pf0 = fract(P); // Fractional part for interpolation
        vec4 Pf1 = Pf0 - 1.0; // Fractional part - 1.0
        vec4 ix = vec4(Pi0.x, Pi1.x, Pi0.x, Pi1.x);
        vec4 iy = vec4(Pi0.yy, Pi1.yy);
        vec4 iz0 = vec4(Pi0.zzzz);
        vec4 iz1 = vec4(Pi1.zzzz);
        vec4 iw0 = vec4(Pi0.wwww);
        vec4 iw1 = vec4(Pi1.wwww);
      
       // vec4 ixy = permute(permute(ix) + iy);
        vec4 ixy = ix;
        ixy = mod(((ixy*34.0)+1.0)*ixy, 289.0); 
        ixy += iy;
        ixy = mod(((ixy*34.0)+1.0)*ixy, 289.0); 
        vec4 ixy0 = ixy + iz0;
        ixy0 = mod(((ixy0*34.0)+1.0)*ixy0, 289.0); 
        vec4 ixy1 = ixy + iz1;
        ixy1 = mod(((ixy1*34.0)+1.0)*ixy1, 289.0); 
        vec4 ixy00 = ixy0 + iw0;
        ixy00 = mod(((ixy00*34.0)+1.0)*ixy00, 289.0); 
        vec4 ixy01 = ixy0 + iw1;
        ixy01 = mod(((ixy01*34.0)+1.0)*ixy01, 289.0); 
        vec4 ixy10 = ixy1 + iw0;
        ixy10 = mod(((ixy10*34.0)+1.0)*ixy10, 289.0); 
        vec4 ixy11 = ixy1 + iw1;
        ixy11 = mod(((ixy11*34.0)+1.0)*ixy11, 289.0); 
        vec4 gx00 = ixy00 / 7.0;
        vec4 gy00 = floor(gx00) / 7.0;
        vec4 gz00 = floor(gy00) / 6.0;
        gx00 = fract(gx00) - 0.5;
        gy00 = fract(gy00) - 0.5;
        gz00 = fract(gz00) - 0.5;
        vec4 gw00 = vec4(0.75) - abs(gx00) - abs(gy00) - abs(gz00);
        vec4 sw00 = step(gw00, vec4(0.0));
        gx00 -= sw00 * (step(0.0, gx00) - 0.5);
        gy00 -= sw00 * (step(0.0, gy00) - 0.5);
      
        vec4 gx01 = ixy01 / 7.0;
        vec4 gy01 = floor(gx01) / 7.0;
        vec4 gz01 = floor(gy01) / 6.0;
        gx01 = fract(gx01) - 0.5;
        gy01 = fract(gy01) - 0.5;
        gz01 = fract(gz01) - 0.5;
        vec4 gw01 = vec4(0.75) - abs(gx01) - abs(gy01) - abs(gz01);
        vec4 sw01 = step(gw01, vec4(0.0));
        gx01 -= sw01 * (step(0.0, gx01) - 0.5);
        gy01 -= sw01 * (step(0.0, gy01) - 0.5);
      
        vec4 gx10 = ixy10 / 7.0;
        vec4 gy10 = floor(gx10) / 7.0;
        vec4 gz10 = floor(gy10) / 6.0;
        gx10 = fract(gx10) - 0.5;
        gy10 = fract(gy10) - 0.5;
        gz10 = fract(gz10) - 0.5;
        vec4 gw10 = vec4(0.75) - abs(gx10) - abs(gy10) - abs(gz10);
        vec4 sw10 = step(gw10, vec4(0.0));
        gx10 -= sw10 * (step(0.0, gx10) - 0.5);
        gy10 -= sw10 * (step(0.0, gy10) - 0.5);
      
        vec4 gx11 = ixy11 / 7.0;
        vec4 gy11 = floor(gx11) / 7.0;
        vec4 gz11 = floor(gy11) / 6.0;
        gx11 = fract(gx11) - 0.5;
        gy11 = fract(gy11) - 0.5;
        gz11 = fract(gz11) - 0.5;
        vec4 gw11 = vec4(0.75) - abs(gx11) - abs(gy11) - abs(gz11);
        vec4 sw11 = step(gw11, vec4(0.0));
        gx11 -= sw11 * (step(0.0, gx11) - 0.5);
        gy11 -= sw11 * (step(0.0, gy11) - 0.5);
      
        vec4 g0000 = vec4(gx00.x,gy00.x,gz00.x,gw00.x);
        vec4 g1000 = vec4(gx00.y,gy00.y,gz00.y,gw00.y);
        vec4 g0100 = vec4(gx00.z,gy00.z,gz00.z,gw00.z);
        vec4 g1100 = vec4(gx00.w,gy00.w,gz00.w,gw00.w);
        vec4 g0010 = vec4(gx10.x,gy10.x,gz10.x,gw10.x);
        vec4 g1010 = vec4(gx10.y,gy10.y,gz10.y,gw10.y);
        vec4 g0110 = vec4(gx10.z,gy10.z,gz10.z,gw10.z);
        vec4 g1110 = vec4(gx10.w,gy10.w,gz10.w,gw10.w);
        vec4 g0001 = vec4(gx01.x,gy01.x,gz01.x,gw01.x);
        vec4 g1001 = vec4(gx01.y,gy01.y,gz01.y,gw01.y);
        vec4 g0101 = vec4(gx01.z,gy01.z,gz01.z,gw01.z);
        vec4 g1101 = vec4(gx01.w,gy01.w,gz01.w,gw01.w);
        vec4 g0011 = vec4(gx11.x,gy11.x,gz11.x,gw11.x);
        vec4 g1011 = vec4(gx11.y,gy11.y,gz11.y,gw11.y);
        vec4 g0111 = vec4(gx11.z,gy11.z,gz11.z,gw11.z);
        vec4 g1111 = vec4(gx11.w,gy11.w,gz11.w,gw11.w);
      
        vec4 norm00 = vec4(dot(g0000, g0000), dot(g0100, g0100), dot(g1000, g1000), dot(g1100, g1100));
        norm00 = 1.79284291400159 - 0.85373472095314 * norm00;
        g0000 *= norm00.x;
        g0100 *= norm00.y;
        g1000 *= norm00.z;
        g1100 *= norm00.w;
      
        vec4 norm01 = vec4(dot(g0001, g0001), dot(g0101, g0101), dot(g1001, g1001), dot(g1101, g1101));
        norm01= 1.79284291400159 - 0.85373472095314 * norm01;
        g0001 *= norm01.x;
        g0101 *= norm01.y;
        g1001 *= norm01.z;
        g1101 *= norm01.w;
      
        vec4 norm10 = vec4(dot(g0010, g0010), dot(g0110, g0110), dot(g1010, g1010), dot(g1110, g1110));
        norm10= 1.79284291400159 - 0.85373472095314 * norm10;
        g0010 *= norm10.x;
        g0110 *= norm10.y;
        g1010 *= norm10.z;
        g1110 *= norm10.w;
      
        vec4 norm11 = vec4(dot(g0011, g0011), dot(g0111, g0111), dot(g1011, g1011), dot(g1111, g1111));
        norm11= 1.79284291400159 - 0.85373472095314 * norm11;
        g0011 *= norm11.x;
        g0111 *= norm11.y;
        g1011 *= norm11.z;
        g1111 *= norm11.w;
      
        float n0000 = dot(g0000, Pf0);
        float n1000 = dot(g1000, vec4(Pf1.x, Pf0.yzw));
        float n0100 = dot(g0100, vec4(Pf0.x, Pf1.y, Pf0.zw));
        float n1100 = dot(g1100, vec4(Pf1.xy, Pf0.zw));
        float n0010 = dot(g0010, vec4(Pf0.xy, Pf1.z, Pf0.w));
        float n1010 = dot(g1010, vec4(Pf1.x, Pf0.y, Pf1.z, Pf0.w));
        float n0110 = dot(g0110, vec4(Pf0.x, Pf1.yz, Pf0.w));
        float n1110 = dot(g1110, vec4(Pf1.xyz, Pf0.w));
        float n0001 = dot(g0001, vec4(Pf0.xyz, Pf1.w));
        float n1001 = dot(g1001, vec4(Pf1.x, Pf0.yz, Pf1.w));
        float n0101 = dot(g0101, vec4(Pf0.x, Pf1.y, Pf0.z, Pf1.w));
        float n1101 = dot(g1101, vec4(Pf1.xy, Pf0.z, Pf1.w));
        float n0011 = dot(g0011, vec4(Pf0.xy, Pf1.zw));
        float n1011 = dot(g1011, vec4(Pf1.x, Pf0.y, Pf1.zw));
        float n0111 = dot(g0111, vec4(Pf0.x, Pf1.yzw));
        float n1111 = dot(g1111, Pf1);
      
        vec4 fade_xyzw = Pf0;
        fade_xyzw = fade_xyzw*fade_xyzw*fade_xyzw*(fade_xyzw*(fade_xyzw*6.0-15.0)+10.0);
        vec4 n_0w = mix(vec4(n0000, n1000, n0100, n1100), vec4(n0001, n1001, n0101, n1101), fade_xyzw.w);
        vec4 n_1w = mix(vec4(n0010, n1010, n0110, n1110), vec4(n0011, n1011, n0111, n1111), fade_xyzw.w);
        vec4 n_zw = mix(n_0w, n_1w, fade_xyzw.z);
        vec2 n_yzw = mix(n_zw.xy, n_zw.zw, fade_xyzw.y);
        float n_xyzw = mix(n_yzw.x, n_yzw.y, fade_xyzw.x);
        return 2.2 * n_xyzw;
      }
    `);
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
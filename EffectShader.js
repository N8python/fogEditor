import * as THREE from 'https://cdn.skypack.dev/three@0.138.0';
const EffectShader = {

    uniforms: {

        'sceneDiffuse': { value: null },
        'sceneDepth': { value: null },
        'volumeTexture': { value: null },
        'projectionMatrixInv': { value: new THREE.Matrix4() },
        'viewMatrixInv': { value: new THREE.Matrix4() },
        'cameraPos': { value: new THREE.Vector3() },
        'resolution': { value: new THREE.Vector2() },
        'time': { value: 0.0 },
        'boxCenter': { value: new THREE.Vector3() },
        'boxSize': { value: new THREE.Vector3() },
        'bias': { value: 0.0 },
        'samples': { value: 0.0 },
        'mindex': { value: 0.0 },
        'lightAbsorption': { value: 5.0 },
        'thickness': { value: 5.0 },
        'fogColor': { value: new THREE.Vector3() },
        'lightDir': { value: new THREE.Vector3(0, 1, 0) }
    },

    vertexShader: /* glsl */ `
		varying vec2 vUv;
		void main() {
			vUv = uv;
			gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );
		}`,

    fragmentShader: /* glsl */ `
		uniform sampler2D sceneDiffuse;
        uniform sampler2D sceneDepth;
        precision highp sampler3D;
        uniform sampler3D volumeTexture;
        uniform mat4 projectionMatrixInv;
        uniform mat4 viewMatrixInv;
        uniform vec3 cameraPos;
        uniform vec2 resolution;
        uniform float time;
        uniform float bias;
        uniform float samples;
        uniform float mindex;
        uniform vec3 boxCenter;
        uniform vec3 boxSize;
        uniform vec3 fogColor;
        uniform float thickness;
        uniform float lightAbsorption;
        uniform vec3 lightDir;
        varying vec2 vUv;
        float linearize_depth(float d,float zNear,float zFar)
        {
            return zNear * zFar / (zFar + d * (zNear - zFar));
        }
        vec3 getWorldPos(float depth, vec2 coord) {
            float z = depth * 2.0 - 1.0;
            vec4 clipSpacePosition = vec4(coord * 2.0 - 1.0, z, 1.0);
            vec4 viewSpacePosition = projectionMatrixInv * clipSpacePosition;
            // Perspective division
            viewSpacePosition /= viewSpacePosition.w;
            vec4 worldSpacePosition = viewMatrixInv * viewSpacePosition;
            return worldSpacePosition.xyz;
        }
        vec3 computeNormal(vec3 worldPos, vec2 vUv) {
			vec2 downUv = vUv + vec2(0.0, 1.0 / (resolution.y * 1.0));
			vec3 downPos = getWorldPos( texture2D(sceneDepth, downUv).x, downUv);
			vec2 rightUv = vUv + vec2(1.0 / (resolution.x * 1.0), 0.0);;
			vec3 rightPos = getWorldPos(texture2D(sceneDepth, rightUv).x, rightUv);
			vec2 upUv = vUv - vec2(0.0, 1.0 / (resolution.y * 0.01));
			vec3 upPos = getWorldPos(texture2D(sceneDepth, upUv).x, upUv);
			vec2 leftUv = vUv - vec2(1.0 / (resolution.x * 1.0), 0.0);;
			vec3 leftPos = getWorldPos(texture2D(sceneDepth, leftUv).x, leftUv);
			int hChoice;
			int vChoice;
			if (length(leftPos - worldPos) < length(rightPos - worldPos)) {
			  hChoice = 0;
			} else {
			  hChoice = 1;
			}
			if (length(upPos - worldPos) < length(downPos - worldPos)) {
			  vChoice = 0;
			} else {
			  vChoice = 1;
			}
			vec3 hVec;
			vec3 vVec;
			if (hChoice == 0 && vChoice == 0) {
			  hVec = leftPos - worldPos;
			  vVec = upPos - worldPos;
			} else if (hChoice == 0 && vChoice == 1) {
			  hVec = leftPos - worldPos;
			  vVec = worldPos - downPos;
			} else if (hChoice == 1 && vChoice == 1) {
			  hVec = rightPos - worldPos;
			  vVec = downPos - worldPos;
			} else if (hChoice == 1 && vChoice == 0) {
			  hVec = rightPos - worldPos;
			  vVec = worldPos - upPos;
			}
			return normalize(cross(hVec, vVec));
		  }
        vec2 rayBoxDist(vec3 boundsMin, vec3 boundsMax, vec3 rayOrigin, vec3 rayDir) {
            vec3 t0 = (boundsMin - rayOrigin) / rayDir;
            vec3 t1 = (boundsMax - rayOrigin) / rayDir;
            vec3 tmin = min(t0, t1);
            vec3 tmax = max(t0, t1);

            float distA = max(max(tmin.x, tmin.y), tmin.z);
            float distB = min(tmax.x, min(tmax.y, tmax.z));

            float distToBox = max(0.0, distA);
            float distInsideBox = max(0.0, distB - distToBox);
            return vec2(distToBox, distInsideBox);
        }
        vec4 permute(vec4 x){return mod(((x*34.0)+1.0)*x, 289.0);}
float permute(float x){return floor(mod(((x*34.0)+1.0)*x, 289.0));}
vec4 taylorInvSqrt(vec4 r){return 1.79284291400159 - 0.85373472095314 * r;}
float taylorInvSqrt(float r){return 1.79284291400159 - 0.85373472095314 * r;}

vec4 grad4(float j, vec4 ip){
  const vec4 ones = vec4(1.0, 1.0, 1.0, -1.0);
  vec4 p,s;

  p.xyz = floor( fract (vec3(j) * ip.xyz) * 7.0) * ip.z - 1.0;
  p.w = 1.5 - dot(abs(p.xyz), ones.xyz);
  s = vec4(lessThan(p, vec4(0.0)));
  p.xyz = p.xyz + (s.xyz*2.0 - 1.0) * s.www; 

  return p;
}

float snoise(vec4 v){
  const vec2  C = vec2( 0.138196601125010504,  // (5 - sqrt(5))/20  G4
                        0.309016994374947451); // (sqrt(5) - 1)/4   F4
// First corner
  vec4 i  = floor(v + dot(v, C.yyyy) );
  vec4 x0 = v -   i + dot(i, C.xxxx);

// Other corners

// Rank sorting originally contributed by Bill Licea-Kane, AMD (formerly ATI)
  vec4 i0;

  vec3 isX = step( x0.yzw, x0.xxx );
  vec3 isYZ = step( x0.zww, x0.yyz );
//  i0.x = dot( isX, vec3( 1.0 ) );
  i0.x = isX.x + isX.y + isX.z;
  i0.yzw = 1.0 - isX;

//  i0.y += dot( isYZ.xy, vec2( 1.0 ) );
  i0.y += isYZ.x + isYZ.y;
  i0.zw += 1.0 - isYZ.xy;

  i0.z += isYZ.z;
  i0.w += 1.0 - isYZ.z;

  // i0 now contains the unique values 0,1,2,3 in each channel
  vec4 i3 = clamp( i0, 0.0, 1.0 );
  vec4 i2 = clamp( i0-1.0, 0.0, 1.0 );
  vec4 i1 = clamp( i0-2.0, 0.0, 1.0 );

  //  x0 = x0 - 0.0 + 0.0 * C 
  vec4 x1 = x0 - i1 + 1.0 * C.xxxx;
  vec4 x2 = x0 - i2 + 2.0 * C.xxxx;
  vec4 x3 = x0 - i3 + 3.0 * C.xxxx;
  vec4 x4 = x0 - 1.0 + 4.0 * C.xxxx;

// Permutations
  i = mod(i, 289.0); 
  float j0 = permute( permute( permute( permute(i.w) + i.z) + i.y) + i.x);
  vec4 j1 = permute( permute( permute( permute (
             i.w + vec4(i1.w, i2.w, i3.w, 1.0 ))
           + i.z + vec4(i1.z, i2.z, i3.z, 1.0 ))
           + i.y + vec4(i1.y, i2.y, i3.y, 1.0 ))
           + i.x + vec4(i1.x, i2.x, i3.x, 1.0 ));
// Gradients
// ( 7*7*6 points uniformly over a cube, mapped onto a 4-octahedron.)
// 7*7*6 = 294, which is close to the ring size 17*17 = 289.

  vec4 ip = vec4(1.0/294.0, 1.0/49.0, 1.0/7.0, 0.0) ;

  vec4 p0 = grad4(j0,   ip);
  vec4 p1 = grad4(j1.x, ip);
  vec4 p2 = grad4(j1.y, ip);
  vec4 p3 = grad4(j1.z, ip);
  vec4 p4 = grad4(j1.w, ip);

// Normalise gradients
  vec4 norm = taylorInvSqrt(vec4(dot(p0,p0), dot(p1,p1), dot(p2, p2), dot(p3,p3)));
  p0 *= norm.x;
  p1 *= norm.y;
  p2 *= norm.z;
  p3 *= norm.w;
  p4 *= taylorInvSqrt(dot(p4,p4));

// Mix contributions from the five corners
  vec3 m0 = max(0.6 - vec3(dot(x0,x0), dot(x1,x1), dot(x2,x2)), 0.0);
  vec2 m1 = max(0.6 - vec2(dot(x3,x3), dot(x4,x4)            ), 0.0);
  m0 = m0 * m0;
  m1 = m1 * m1;
  return 49.0 * ( dot(m0*m0, vec3( dot( p0, x0 ), dot( p1, x1 ), dot( p2, x2 )))
               + dot(m1*m1, vec2( dot( p3, x3 ), dot( p4, x4 ) ) ) ) ;

}
float sdBox( vec3 p, vec3 c, vec3 b )
{
  p = p - c;
  vec3 q = abs(p) - b;
  return length(max(q,0.0)) + min(max(q.x,max(q.y,q.z)),0.0);
}
vec4 textureMindex(sampler3D tex, vec3 coord) {
  if (mindex == 0.0) {
    return texture(tex, vec3(coord.z, coord.y, coord.x));
  } else if (mindex == 1.0) {
    return texture(tex, vec3(coord.x, coord.z, coord.y));
  } else if (mindex == 2.0) {
    return texture(tex, vec3(coord.x, coord.y, coord.z));
  }
}
        float sampleDensity(vec3 pos) {
            //float density = max(snoise(vec4(0.025 * pos  + vec3(time * 0.1, 0.0, time * 0.1), time * 0.1)) * 0.5 + 0.5 - 0.5, 0.0);
            float density = max(textureMindex(volumeTexture, vec3((pos.x + (boxSize.x / 2.0) - boxCenter.x) / boxSize.x, (pos.y + (boxSize.y / 2.0) - boxCenter.y) / boxSize.y, (pos.z + (boxSize.z / 2.0) - boxCenter.z) / boxSize.z )).r - 0.5 + bias, 0.0);
            float falloff = sdBox(pos, boxCenter, boxSize / 2.0);
            return density * clamp(1.0 - exp(0.05 * falloff), 0.0, 1.0);
        }
		void main() {
            vec4 diffuse = texture2D(sceneDiffuse, vUv);
            float depth = texture2D(sceneDepth, vUv).x;
            vec3 worldPos = getWorldPos(depth, vUv);
            float linDepth = length(cameraPos - worldPos);
            vec3 normal = computeNormal(worldPos, vUv);
            vec3 rayDir = normalize(worldPos - cameraPos);
            vec2 boxIntersectionInfo = rayBoxDist(boxCenter - boxSize / 2.0,boxCenter + boxSize / 2.0, cameraPos, rayDir);
            float distToBox = boxIntersectionInfo.x;
            float distInsideBox = boxIntersectionInfo.y;
            bool intersectsBox =  distInsideBox > 0.0 && distToBox < linDepth - 0.1;
            gl_FragColor = vec4(diffuse.rgb, 1.0);
            float incidentLight = 1.0;
            if (intersectsBox) {
                vec3 startPos = cameraPos + distToBox * rayDir;
                vec3 endPos = cameraPos + (distToBox + min(linDepth - distToBox, distInsideBox)) * rayDir;
                vec3 currPos = startPos;
                float steps = samples;
                float density = 0.0;
                float stepWeight = 1.0 / steps;
                float sampleNorm = 100.0 / samples;
                vec3 normLightDir = lightDir;
                for(float i = 0.0; i <= steps; i++) {
                    currPos = mix(startPos, endPos, i / steps);
                    float currView = (1.0 - 10.0 * density / (i + 1.0));
                    float d = sampleDensity(currPos);
                    density += d * stepWeight;
                    incidentLight -= sampleNorm * lightAbsorption * exp(-100.0 * density) * d * sampleDensity(currPos + thickness * normLightDir);
                    if (length(currPos - cameraPos) > linDepth - 1.0) {
                        break;
                    }
                }
                //density /= steps;
                gl_FragColor.rgb = mix(gl_FragColor.rgb, fogColor * clamp(incidentLight, 0.0, 1.0), clamp(1.0 - exp(-100.0 * density), 0.0, 1.0));
            }
            //gl_FragColor.rgb = vec3(texture(volumeTexture, vec3(vUv.x, time * 0.1, vUv.y)).r);
		}`

};

export { EffectShader };
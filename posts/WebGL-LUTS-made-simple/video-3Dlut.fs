precision mediump float;

varying vec2 tex;
uniform sampler2D video;
uniform sampler2D lut;

/* 3D Texture Lookup from
   https://github.com/WebGLSamples/WebGLSamples.github.io/blob/master/color-adjust/color-adjust.html
   via
   https://webglfundamentals.org/webgl/lessons/webgl-qna-how-to-simulate-a-3d-texture-in-webgl.html */
vec3 sampleAs3DTexture(sampler2D tex, vec3 texCoord, float size) {
    float sliceSize = 1.0 / size;                         // Space of 1 slice
    float slicePixelSize = sliceSize / size;              // Space of 1 pixel
    float sliceInnerSize = slicePixelSize * (size - 1.0); // Space of size pixels
    float zSlice0 = min(floor(texCoord.z * size), size - 1.0);
    float zSlice1 = min(zSlice0 + 1.0, size - 1.0);
    float xOffset = slicePixelSize * 0.5 + texCoord.x * sliceInnerSize;
    float s0 = xOffset + (zSlice0 * sliceSize);
    float s1 = xOffset + (zSlice1 * sliceSize);
    vec3 slice0Color = texture2D(tex, vec2(s0, texCoord.y)).rgb;
    vec3 slice1Color = texture2D(tex, vec2(s1, texCoord.y)).rgb;
    float zOffset = mod(texCoord.z * size, 1.0);
    return mix(slice0Color, slice1Color, zOffset);
}

void main(void) {
    vec3 videoColor = texture2D(video, tex).rgb;
    vec4 correctedColor = vec4(sampleAs3DTexture(lut, videoColor, 32.0), 1.0);
    
    gl_FragColor = correctedColor;
}
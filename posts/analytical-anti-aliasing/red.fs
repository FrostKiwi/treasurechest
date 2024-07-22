#extension GL_OES_standard_derivatives : enable
precision mediump float;
varying vec2 uv;

uniform float aspect_ratio;
uniform float thickness;

void main() {
    // Adjust thickness based on aspect ratio
    float adjustedThicknessX = thickness * aspect_ratio;
    float adjustedThicknessY = thickness;

    // Calculate distance to the box edges
    float distX = abs(uv.x) - 1.0 + adjustedThicknessX;
    float distY = abs(uv.y) - 1.0 + adjustedThicknessY;

    // Render the rectangular line with adjusted thickness
    if (distX > -adjustedThicknessX || distY > -adjustedThicknessY) {
        gl_FragColor = vec4(1.0, 0.0, 0.0, 1.0); // Red color
    } else {
        discard;
    }
}
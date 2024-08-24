precision mediump float;
varying vec2 uv;

uniform float aspect_ratio;
uniform float thickness;
uniform float pixelsize;

float smoothstep2(float edge0, float edge1, float x){
	float t = clamp((x - edge0) / (edge1 - edge0), 0.0, 1.0);
    return t * t * (3.0 - 2.0 * t);
}

float linearstep(float edge0, float edge1, float x) {
    return clamp((x - edge0) / (edge1 - edge0), 0.0, 1.0);
}

float linearstepNoclamp(float edge0, float edge1, float x) {
    return (x - edge0) / (edge1 - edge0);
}

float sdBox( in vec2 p, in vec2 b )
{
    vec2 d = abs(p)-b;
    return length(max(d,0.0)) + min(max(d.x,d.y),0.0);
}

void main() {
    //float dist = sdBox(uv, vec2(1.0 + (thickness * 0.5 * aspect_ratio), 1.0));
    float dist = sdBox(uv, vec2(1.0, 1.0));
    float alpha2 = linearstep(pixelsize, 0.0, -dist);
	dist = sdBox(uv, vec2(1.0 + (thickness * 0.5 * aspect_ratio), 1.0));
    float alpha = alpha2 - -linearstep(thickness, thickness + pixelsize, -dist);

    gl_FragColor = vec4(1.0, 0.25, 0.3, 1.0- alpha);	
}

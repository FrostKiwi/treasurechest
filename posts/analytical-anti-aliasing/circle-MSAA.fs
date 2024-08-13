#version 300 es
precision mediump float;

/* The coordinates that are interpolated from the vertex shader */
in vec2 uv;
in vec3 color;

/* Output color */
out vec4 fragColor;

void main(void)
{
    float dist = length(uv) - 1.0;
    // Fade out near the edge of the circle
    //float alpha = smoothstep(1.0, 1.0 - 0.01, dist);
    //float alpha = dist / length(vec2(dFdx(dist), dFdy(dist))) + 1.0;
	/* Plus one to shrink by a pixel */
    float alpha = dist / fwidth(dist) + 1.5;
	//float alpha = step(1.0, dist);
    
	/* Clamped and scaled uv.y added to color simply to make the bottom of the
	   circle white, so the contrast is high and you can see strong aliasing */
    fragColor = vec4(color + clamp( - uv.y * 0.4, 0.0, 1.0), 1.0 - alpha);
}

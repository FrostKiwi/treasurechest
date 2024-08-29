#version 300 es
precision highp float;

/* Our Vertex data for the Quad */
in vec2 vtx;
in vec3 col;
/* The coordinates that will be used for our drawing operations */
out vec2 uv;
out vec3 color;

/* Aspect ratio */
uniform float aspect_ratio;
/* Position offset for the animation */
uniform vec2 offset;

void main()
{
    /* Assign the vertices to be used as the distance field for drawing. This
       will be linearly interpolated before going to the fragment shader */
    uv = vtx;
    color = col;

    /* Make Circle smaller and correct aspect ratio */
    vec2 vertex = vtx;
    vertex.x *= aspect_ratio;
    vertex *= 0.7;

    /* Make the circle move in a circle */
    vertex += offset;

    gl_Position = vec4(vertex, 0.0, 1.0);
}

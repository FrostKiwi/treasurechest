import argparse
import numpy as np
import matplotlib.pyplot as plt
import colour
from colour.io import write_LUT_IridasCube


def generate_and_export_lut(colormap_name, lut_size, file_name):
    grayscale_values = np.linspace(0, 1, lut_size)

    colormap = plt.get_cmap(colormap_name)
    colors = colormap(grayscale_values)[:, :3]

    lut = colour.LUT3x1D(
        table=colors, name=f"Grayscale to {colormap_name.capitalize()}"
    )
    write_LUT_IridasCube(lut, file_name)

    print(f"LUT file for {colormap_name} saved to {file_name}")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(
        description="Output a .cube LUT for video editing software"
    )
    parser.add_argument("--colormap", type=str, help="Name of the colormap to use.")
    parser.add_argument(
        "--lutsize", type=int, default=256, help="Size of the LUT. Default is 256."
    )

    args = parser.parse_args()

    if args.colormap:
        file_name = f"{args.colormap}.cube"
        generate_and_export_lut(args.colormap, args.lutsize, file_name)
    else:
        """Print usage and list of available colormaps"""
        print("Usage: script.py --colormap <COLORMAP_NAME> [--lutsize <LUT_SIZE>]\n")
        print("Available colormap names:")
        for name in plt.colormaps():
            print(name)
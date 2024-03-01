import argparse
import numpy as np
import matplotlib.pyplot as plt
from colour import LUT3x1D
from colour.io import write_LUT_IridasCube


def generate_and_export_lut(colormap_name, lut_size, file_name):
	grayscale_values = np.linspace(0, 1, lut_size)
	colormap = plt.get_cmap(colormap_name)
	colors = colormap(grayscale_values)[:, :3]

	lut = LUT3x1D(table=colors, name=f"Colormap {colormap_name}")
	write_LUT_IridasCube(lut, file_name)

	print(f"LUT file for {colormap_name} saved to {file_name}")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Output a colormap as 1D .cube LUT")
    parser.add_argument("--colormap", type=str, help="Name of the colormap to use.")
    parser.add_argument(
		"--lutsize", type=int, default=256, help="Size of the LUT. Default is 256"
	)
    parser.add_argument(
		"--list-all", action="store_true", help="Print a list of all available colormaps"
	)
    args = parser.parse_args()

    if args.list_all:
        print("Available colormap names:")
        for name in plt.colormaps():
            print(name)
    elif args.colormap:
        file_name = f"{args.colormap}.cube"
        generate_and_export_lut(args.colormap, args.lutsize, file_name)
    else:
        print(parser.format_help())
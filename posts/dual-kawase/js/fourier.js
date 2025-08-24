/******************\
|   Fourier Image  |
| @author Anthony  |
| @version 1.1.2   |
| @date 2014/06/14 |
| @edit 2017/01/23 |
\******************/

var Fourier = (function () {
	/******************
	 * work functions */
	function filter(data, dims, lowPass, highPass, feather) {
		var lowPassSq = Math.pow(lowPass, 2);
		var highPassSq = Math.pow(highPass, 2);
		var N = dims[1];
		var M = dims[0];
		var centerX = M / 2;
		var centerY = N / 2;
		feather = feather || 0;
		
		for (var k = 0; k < N; k++) {
			for (var l = 0; l < M; l++) {
				var idx = k * M + l;
				var distance = Math.sqrt(Math.pow(l - centerX, 2) + Math.pow(k - centerY, 2));
				var multiplier = 1;
				
				if (!isNaN(lowPass)) {
					if (feather > 0) {
						var inner = lowPass - feather;
						var outer = lowPass + feather;
						if (distance <= inner) {
							multiplier = 1;
						} else if (distance >= outer) {
							multiplier = 0;
						} else {
							multiplier = Math.cos((distance - inner) / (2 * feather) * Math.PI) * 0.5 + 0.5;
						}
					} else {
						multiplier = distance <= lowPass ? 1 : 0;
					}
				}
				
				if (!isNaN(highPass)) {
					var highMultiplier = 1;
					if (feather > 0) {
						var inner = highPass - feather;
						var outer = highPass + feather;
						if (distance <= inner) {
							highMultiplier = 0;
						} else if (distance >= outer) {
							highMultiplier = 1;
						} else {
							highMultiplier = Math.cos((outer - distance) / (2 * feather) * Math.PI) * 0.5 + 0.5;
						}
					} else {
						highMultiplier = distance >= highPass ? 1 : 0;
					}
					
					if (!isNaN(lowPass)) {
						multiplier *= highMultiplier;
					} else {
						multiplier = highMultiplier;
					}
				}
				
				data[idx] = data[idx].times(multiplier);
			}
		}
	}

	function FFT(sig, out) {
		if (sig.length === 0) {
			var e = new Error("Cannot transform an image with size of zero.");
			e.name = RangeError;
			e.givenLength = sig.length;
			throw e;
		}
		if (sig.length & (sig.length - 1)) {
			var e = new Error("Unimplemented: Only FFT of signals of length power of 2 supported by this implementation. Given: " + sig.length);
			e.name = RangeError;
			e.givenLength = sig.length;
			throw e;
		}
		rec_FFT_radix2(out, 0, sig, 0, sig.length, 1, 2);
	}

	function rec_FFT_radix2(out, start, sig, offset, N, s) {
		if (N === 1) {
			out[start] = new Complex(sig[offset], 0); // array
		} else {
			rec_FFT_radix2(out, start, sig, offset, N / 2, 2 * s);
			rec_FFT_radix2(out, start + N / 2, sig, offset + s, N / 2, 2 * s);
			for (var k = 0; k < N / 2; k++) {
				var twiddle = cisExp(-2 * Math.PI * k / N);
				var t = out[start + k];
				out[start + k] = t.plus(twiddle.times(out[start + k + N / 2]));
				out[start + k + N / 2] = t.minus(
					twiddle.times(out[start + k + N / 2])
				);
			}
		}
	}

	function invFFT(transform, sig) {
		if (transform.length === 0) {
			var e = new Error("Cannot transform an image with size of zero.");
			e.name = RangeError;
			e.givenLength = transform.length;
			throw e;
		}
		if (transform.length & (transform.length - 1)) {
			var e = new Error("Unimplemented: Only FFT of signals of length power of 2 supported by this implementation. Given: " + transform.length);
			e.name = RangeError;
			e.givenLength = transform.length;
			throw e;
		}
		rec_invFFT_radix2(sig, 0, transform, 0, transform.length, 1);
		for (var ai = 0; ai < sig.length; ai++) {
			sig[ai] = sig[ai].real / sig.length;
		}
	}

	function rec_invFFT_radix2(sig, start, transform, offset, N, s) {
		if (N === 1) {
			sig[start] = transform[offset];
		} else {
			rec_invFFT_radix2(sig, start, transform, offset, N / 2, 2 * s);
			rec_invFFT_radix2(sig, start + N / 2, transform, offset + s, N / 2, 2 * s);
			for (var k = 0; k < N / 2; k++) {
				var twiddle = cisExp(2 * Math.PI * k / N);
				var t = sig[start + k];
				sig[start + k] = t.plus(twiddle.times(sig[start + k + N / 2]));
				sig[start + k + N / 2] = t.minus(
					twiddle.times(sig[start + k + N / 2])
				);
			}
		}
	}

	function shiftFFT(transform, dims) {
		var ret = [];
		var N = dims[1]; // height
		var M = dims[0]; // width
		var halfN = Math.floor(N / 2);
		var halfM = Math.floor(M / 2);
		
		// Standard 2D fftshift: swap quadrants, accounting for transpose
		for (var n = 0; n < N; n++) {
			for (var m = 0; m < M; m++) {
				var srcN = (n + halfN) % N;
				var srcM = (m + halfM) % M;
				// Swap n and m to account for transpose
				var srcIdx = srcM * N + srcN;
				ret.push(transform[srcIdx]);
			}
		}
		
		return ret;
	}

	function unshiftFFT(transform, dims) {
		var ret = [];
		var N = dims[1]; // height
		var M = dims[0]; // width
		var halfN = Math.floor(N / 2);
		var halfM = Math.floor(M / 2);
		
		// Inverse of fftshift: swap quadrants back, accounting for transpose
		for (var n = 0; n < N; n++) {
			for (var m = 0; m < M; m++) {
				var srcN = (n + halfN) % N;
				var srcM = (m + halfM) % M;
				// Swap n and m to account for transpose
				var srcIdx = srcM * N + srcN;
				ret.push(transform[srcIdx]);
			}
		}
		
		return ret;
	}

	function halfShiftFFT(transform, dims) {
		var ret = [];
		var N = dims[1];
		var M = dims[0];
		for (var n = 0, vOff = N / 2; n < N; n++) {
			for (var m = 0; m < M / 2; m++) {
				var idx = vOff * dims[0] + m;
				ret.push(transform[idx]);
			}
			vOff += vOff >= N / 2 ? -N / 2 : (N / 2) + 1;
		}
		for (var n = 0, vOff = N / 2; n < N; n++) {
			for (var m = M / 2; m < M; m++) {
				var idx = vOff * dims[0] + m;
				ret.push(transform[idx]);
			}
			vOff += vOff >= N / 2 ? -N / 2 : (N / 2) + 1;
		}
		return ret;
	}

	function flipRightHalf(transform, dims) {
		var ret = [];

		// flip the right half of the image across the x axis
		var N = dims[1];
		var M = dims[0];
		for (var n = 0; n < N; n++) {
			for (var m = 0; m < M; m++) {
				var $n = m < M / 2 ? n : (N - 1) - n;
				var idx = $n * dims[0] + m;
				ret.push(transform[idx]);
			}
		}

		return ret;
	}

	/********************
	 * helper functions */
	function cisExp(x) { // e^ix = cos x + i*sin x
		return new Complex(Math.cos(x), Math.sin(x));
	}

	/***********
	 * objects */
	function Complex(re, im) {
		this.real = re;
		this.imag = im;
	}
	Complex.prototype.magnitude2 = function () {
		return this.real * this.real + this.imag * this.imag;
	};
	Complex.prototype.magnitude = function () {
		return Math.sqrt(this.magnitude2());
	};
	Complex.prototype.plus = function (z) {
		return new Complex(this.real + z.real, this.imag + z.imag);
	};
	Complex.prototype.minus = function (z) {
		return new Complex(this.real - z.real, this.imag - z.imag);
	};
	Complex.prototype.times = function (z) {
		if (typeof z === 'object') { // complex multiplication
			var rePart = this.real * z.real - this.imag * z.imag;
			var imPart = this.real * z.imag + this.imag * z.real;
			return new Complex(rePart, imPart);
		} else { // scalar multiplication
			return new Complex(z * this.real, z * this.imag);
		}
	};

	return {
		Complex: Complex,
		transform: FFT,
		invert: invFFT,
		shift: shiftFFT,
		unshift: unshiftFFT,
		filter: filter
	};
})();
// PARTICLE
void main() {
	while (1) {
		// gravity, time, count
		setparticle(1, 4, 2000);
		// time, dir, dir1, speed
		setemitter(50, 200, 250, 12);

		for (int i = 0; i < 60; i++) {
			// x, y, color
			drawparticle(60 + i, 60, i);
			delayredraw();
		}
	}
}
//240x240
//char field[4096];
//char buf_field[4096];
char field[14400];
char buf_field[14400];
int x, y, n, i, p, r;

void redraw() {
	i = 0;
	int nx, ny;
	ny = 0;

	for (y = 0; y < 120; y++) {
		nx = 0;
		ny += 2;

		for (x = 0; x < 120; x++) {
			field[i] = buf_field[i];
			setcolor(field[i]);
			putpixel(nx, ny);
			/*
			putpixel(nx + 1, ny);
			putpixel(nx, ny + 1);
			putpixel(nx + 1, ny + 1);
			*/
			i++;
			nx += 2;
		}
	}
}

void init() {
	for (i = 0; i < 14000; i++) {
		if (random(5) == 1)
			field[i] = 1;
		else
			field[i] = 0;
	}
}

void step() {
	i = 0;

	for (x = 0; x < 120; x++) {
		for(y = 0; y < 120; y++) {
			i++;
			n = 0;

			if (y > 0) {
				n += field[i - 120];

				if (x > 0)
					n += field[i - 121];

				if(x < 120)
					n += field[i - 119];
			}

			if (y < 120) {
				n += field[i + 120];

				if (x > 0)
					n += field[i + 121];

				if(x < 120)
					n += field[i + 119];
			}

			if (x > 0)
				n += field[i - 1];

			if (x < 120)
				n += field[i + 1];

			if (field[i] == 1) {
				if (n == 2 || n == 3) {
					buf_field[i] = 1;
				} else {
					buf_field[i] = 0;
				}
			} else {
				if (n == 3) {
					buf_field[i] = 1;
				} else {
					buf_field[i] = 0;
				}
			}
		}
	}
}

void main() {
	init();

	while(1) {
		step();
		redraw();

		if (getkey())
			init();
	}
}
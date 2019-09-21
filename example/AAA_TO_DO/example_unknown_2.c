// UNKNOWN 2
int x = 0;
int y = 0;
int x1 = 128;
int y1 = 128;
int ang = 0;

void main() {
	while (1) {
		setcolor(0);
		line(x, y, x1, y1);

		if (ang == 0) {
			y++;
			y1--;

			if (y1 == 0)
				ang = 1;
		}

		if (ang == 1) {
			x++;
			x1--;

			if (x1 == 0) {
				ang = 0;
				x = 0;
				y = 0;
				x1 = 128;
				y1 = 128;
			}
		}

		setcolor(1);
		line(x, y, x1, y1);
	}
}


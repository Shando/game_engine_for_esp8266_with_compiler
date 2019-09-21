// SPEED
int a;
int b;

void main() {
	while (1) {
		gotoxy(1, 1);
		printf("press key");

		while (getkey() == 0) { 
		};

		clearscreen();
		a = 0;
		b = 0;
		settimer(1, 1000);

		while (gettimer(1) > 0) {
			a++;

			if (a > 61) {
				a = 0;
				b++;
			}
		}

		gotoxy(1, 2);
		printf("speed %d kGz", b);
	}
}


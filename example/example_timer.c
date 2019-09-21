// TIMER
int i, time;

void main() {
	while (1) {
		gotoxy(4, 7);
		puts("press any key");

		while (getkey() == 0) { 
		};

		settimer(0, 30000);

		for (i = 1; i < 10000; i++) {
			setcolor(random(15));
			line(random(127), random(160), random(127), random(160));
		}

		time = 30000 - gettimer(0);
		clearscreen();
		gotoxy(7, 8);
		putn(time);
		puts("ms");
	}
}


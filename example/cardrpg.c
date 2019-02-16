char card[] = {0xdd,0xdd,0xdd,0xdd,0xdd,0xdd,0xdd,0xdd,0xd1,0x11,0x11,0x1d,0xd1,0x11,0x11,0x1d,0xd1,0x11,0x11,0x1d,0xd1,0x11,0x11,0x1d,0xd1,0x11,0x11,0x1d,0xd1,0x11,0x11,0x1d,0xd1,0x11,0x11,0x1d,0xd1,0x11,0x11,0x1d,0xd1,0x11,0x11,0x1d,0xd1,0x11,0x11,0x1d,0xd1,0x11,0x11,0x1d,0xd1,0x11,0x11,0x1d,0xdd,0xdd,0xdd,0xdd,0xdd,0xdd,0xdd,0xdd,0x00};

char health[] = {0x0,0xa,0xa0,0x0,0x0,0x38,0x83,0x0,0x0,0x3,0x30,0x0,0x0,0x3,0x30,0x0,0x0,0x3,0x30,0x0,0x0,0x3,0x30,0x0,0x0,0xc3,0x13,0x0,0xc,0x33,0x13,0x30,0xc2,0x2f,0x21,0x23,0xc2,0x22,0x12,0x23,0xc,0x22,0x22,0x30,0x0,0xc3,0x33,0x0,0x00};

char hero[] = {0x2,0x0,0x0,0x0,0x0,0x0,0xf,0x0,0x6,0x60,0x0,0x0,0xf,0x0,0x66,0x66,0x0,0x0,0xf,0x6,0x66,0x66,0x60,0x0,0xf,0x0,0xe1,0xe1,0x0,0x0,0xf,0x0,0x1c,0xcc,0xcc,0xc0,0xcc,0xc0,0x1c,0xbb,0xbb,0xc0,0xc,0x66,0x6c,0xb2,0x2b,0xc0,0x6,0x66,0x6c,0xbb,0x2b,0xc0,0x0,0x6,0x6c,0xbb,0xbb,0xc0,0x0,0x8,0x88,0xcb,0xbc,0x0,0x0,0x6,0x66,0x6c,0xc0,0x0,0x0,0x6,0x66,0x66,0x0,0x0,0x0,0xbb,0xb0,0xbb,0xb0,0x0,0x00};
char rat[] = {0x0,0x90,0x0,0x40,0x0,0x9,0x99,0x0,0x0,0x2,0x92,0x0,0x0,0x99,0x44,0x40,0x9,0xbb,0x4,0x40,0x9b,0xb0,0x4,0x4b,0xcb,0xc0,0x44,0x4b,0xc0,0xc4,0xbb,0x4b,0x0,0x6,0xb6,0x4b,0xa,0x0,0x4,0xbb,0xa0,0x0,0x4b,0xbb,0xa,0xa6,0xb6,0xba,0x00};
char zombie[] = {0x0,0x5,0x55,0x50,0x0,0x52,0x52,0x50,0x0,0x55,0x55,0x50,0x0,0xc,0x11,0x5c,0xc5,0xa5,0x55,0x55,0x50,0xd,0xdd,0xcc,0x0,0xdd,0x5c,0xca,0x0,0xd0,0x55,0x55,0x0,0x0,0xd0,0x50,0x0,0x0,0xd0,0xc0,0x0,0x0,0xd0,0xa0,0x0,0xad,0x55,0x50,0x00};

int addhealth[4];


char position = 0;
char x = 60;
char y = 2;
char i, key;
int life = 10;
int maxLife = 10;
char score = 0;

void drawScore(){
	setimagesize(1);
	setcolor(1);
	gotoxy(0,1);
	printf("score");
	gotoxy(0,2);
	printf("%d", score);
	gotoxy(0,3);
	printf("health");
	gotoxy(0,4);
	printf("%d/%d ", life, maxLife);
}

void newCard(char x, char y, char position){
	setimagesize(2);
	setcolor(2);
	if(random(4) == 0){
		putimage(health,x,y,8,12);
		addhealth[position] = 3 + random(7);
		setcolor(5);
	}
	else{
		if(random(3) == 0){
			putimage(zombie,x,y,8,12);
			addhealth[position] = -2 - random(maxLife / 3);
		}
		else{
			putimage(rat,x,y,8,12);
			addhealth[position] = -1 - random(maxLife / 4);
		}
	} 
	setimagesize(1);
	gotoxy(x / 6 + 1, y / 8 + 4);
	printf("%d", addhealth[position]);
	score++;
}

void moveRight(){
	for(i=60;i<=92;i=i+4){
		setimagesize(4);
		putimage(card,i,y,8,16);
		setimagesize(2);
		putimage(hero,i + 5,y + 9,11,14);
		delayredraw();
	}
	setimagesize(4);
	putimage(card,60,y,8,16);
	newCard(x + 8,y + 9,position);
	x = 92;
	position++;
	life += addhealth[position];
}

void moveLeft(){
	for(i=92;i>=60;i=i-4){
		setimagesize(4);
		putimage(card,i,y,8,16);
		setimagesize(2);
		putimage(hero,i + 5,y + 9,11,14);
		delayredraw();
	}
	setimagesize(4);
	putimage(card,92,y,8,16);
	newCard(x + 8,y + 9,position);
	x = 60;
	position--;
	life += addhealth[position];
}

void moveDown(){
	for(i=2;i<=60;i=i+4){
		setimagesize(4);
		putimage(card,x,i,8,16);
		setimagesize(2);
		putimage(hero,x + 5,i + 9,11,14);
		delayredraw();
	}
	setimagesize(4);
	putimage(card,x,2,8,16);
	newCard(x + 8,y + 9,position);
	y = 60;
	position+=2;
	life += addhealth[position];
}

void moveUp(){
	for(i=60;i>=2;i=i-4){
		setimagesize(4);
		putimage(card,x,i,8,16);
		setimagesize(2);
		putimage(hero,x + 5,i + 9,11,14);
		delayredraw();
	}
	setimagesize(4);
	putimage(card,x,60,8,16);
	newCard(x + 8,y + 9,position);
	y = 2;
	position-=2;
	life += addhealth[position];
}

void move(){
	key = getkey();
	if((key == KEY_LEFT) && ((position == 1) || (position == 3))){
		moveLeft();
	}
	else if((key == KEY_RIGHT) && ((position == 0) || (position == 2))){
		moveRight();
	}
	else if((key == KEY_DOWN) && (position < 2)){
		moveDown();
	}
	else if((key == KEY_UP) && (position > 1)){
		moveUp();
	}
}

void main(){
	setimagesize(4);
	putimage(card,60,2,8,16);
	putimage(card,92,2,8,16);
	putimage(card,60,60,8,16);
	putimage(card,92,60,8,16);
	while(1){
		drawScore();
		move();
		delayredraw();
	}
}			
					
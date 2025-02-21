#define BALL_SPEED 10

//12x8
char brick[] = {0xc,0xcc,0xcc,0xcc,0xcc,0xc0,0xeb,0x66,0x66,0x6c,0x6c,0xfc,0xeb,0x66,0x66,0xe6,0xe6,0x9c,0xeb,0x66,0x6e,0x6e,0x69,0xfc,0xeb,0x66,0xe6,0xe6,0x96,0xfc,0xeb,0x6e,0x6e,0x69,0x66,0xfc,0xeb,0xe6,0xe6,0x96,0x66,0xfc,0xe,0xee,0xee,0xee,0xee,0xe0};
//8x9
char ball[] = {0x0,0xb2,0x2b,0x0,0x4,0x22,0x22,0x40,0xb2,0x2a,0xa2,0x2b,0x22,0xa2,0x22,0x22,0x22,0xa2,0x22,0x22,0xb2,0x22,0x22,0x2b,0x4,0x22,0x22,0x40,0x0,0xb2,0x2b,0x0};
//26x8
char deck[] = {0xa,0xaa,0xaa,0xaa,0xaa,0xaa,0xaa,0xaa,0xaa,0xaa,0xaa,0xa0,0x55,0x55,0x55,0x55,0x55,0x55,0x55,0x55,0x55,0x55,0x55,0x55,0x55,0x55,0x55,0x55,0x55,0x55,0x55,0x55,0x55,0x55,0x55,0x55,0x55,0x55,0x55,0x55,0x55,0x55,0x55,0x55,0x55,0x55,0x55,0x55,0x55,0x55,0x55,0x55,0x55,0x55,0x55,0x55,0x55,0x55,0x55,0x55,0x55,0x55,0x55,0x55,0x55,0x55,0x55,0x55,0x55,0x55,0x55,0x55,0x55,0x55,0x55,0x55,0x55,0x55,0x55,0x55,0x55,0x55,0x55,0x55,0xf,0xff,0xff,0xff,0xff,0xff,0xff,0xff,0xff,0xff,0xff,0xf0};

int x = 112;
char game, count, key;

void balloncollision(int n) {
    if (spritegetvalue(31, S_COLLISION) == 30) {
        spritesetvalue(31, S_SPEEDX, (spritegetvalue(31, S_X) - 8 - x) / 2);
        drawparticle(spritegetvalue(31, S_X) + 4, spritegetvalue(31, S_Y), 2);

        if (spritegetvalue(31, S_Y) < 220)
            spritesetvalue(31, S_SPEEDY, 0 - spritegetvalue(31, S_SPEEDY));
    } else {
        spritesetvalue(31, S_SPEEDX, 0 - spritegetvalue(31, S_SPEEDX));
        spritesetvalue(31, S_SPEEDY, 0 - spritegetvalue(31, S_SPEEDY));
        drawparticle(spritegetvalue(31, S_X) + 4, spritegetvalue(31, S_Y), 3);
    }
}

void brickoncollision(int n) {
    if (n < 24) {
        spritesetvalue(n, S_LIVES, 0);
        count--;
    }
}

void init() {
    clearscreen();
    game = 1;
    count = 24;
    setparticle(2, 10, 500);
    setemitter(100, 1, 259,6);

    for (char i = 0; i < 24; i++) {
        getsprite(i, brick);
        spritesetvalue(i, S_WIDTH, 12);
        spritesetvalue(i, S_SPEEDX, 0);
        spritesetvalue(i, S_SPEEDY, 0);
        spritesetvalue(i, S_ON_COLLISION, brickoncollision);
        putsprite(i, 24 + (i / 3) * 24, 8 + (i % 3) * 18));
    }

    getsprite(31, ball);
    spritesetvalue(31, S_SPEEDX, -BALL_SPEED + random(BALL_SPEED * 2));
    spritesetvalue(31, S_SPEEDY, -BALL_SPEED);
    spritesetvalue(31, S_ON_COLLISION, balloncollision);
    putsprite(31, x, 216);
    getsprite(30, deck);
    spritesetvalue(30, S_WIDTH, 24);
    spritesetvalue(30, S_SPEEDX, 0);
    spritesetvalue(30, S_SPEEDY, 0);
    putsprite(30, x, 222);
}

void gameover() {
    gotoxy(14, 10);

    if (count == 0)
        puts("you win!!");
    else
        puts("game over");

    while (getkey() != 0) {
    }

    while (getkey() == 0) {
    }

    init();
}

void onexit() {
    if (spritegetvalue(31, S_Y) > 232)
        gameover();
    else if (spritegetvalue(31, S_Y) < 0)
        spritesetvalue(31, S_SPEEDY, BALL_SPEED);

    if (spritegetvalue(31, S_X) > 232)
        spritesetvalue(31, S_SPEEDX, -BALL_SPEED);
    else if (spritegetvalue(31, S_X) < 0)
        spritesetvalue(31, S_SPEEDX, BALL_SPEED);
}

void main() {
    while (1) {
        init();

        while (game) {
            key = getkey();

            if (key == KEY_LEFT && x > 0)
                x -= 3;
            else if (key == KEY_RIGHT && x < 208)
                x += 3;
            else
                spritesetvalue(30, S_SPEEDX, 0);

            putsprite(30, x, 222);
            onexit();

            if (count == 0)
                gameover();

            delayredraw();
        }
    }
}
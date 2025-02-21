char earth[] = {0x8,0x88,0x82,0x85,0x6,0x55,0x82,0x58,0x2,0x55,0x82,0x5d,0x4,0xdd,0x2,0x55,0x22,0xdd,0x83,0xd4,0x45,0x6,0xdd,0x83,0x54,0x4d,0x6,0xdd,0x83,0xd5,0x5d,0x13,0xdd,0x82,0x5d,0x7,0xdd,0x82,0x55,0x6,0xdd,0x83,0xd5,0x85,0x2,0x55,0x4,0xdd,0x82,0x55,0x2,0x88,0x5,0x55,0x81,0x58,0x00};
char gun[] = {0x0,0x1,0x11,0x11,0x10,0x0,0x0,0x0,0x0,0x16,0x6f,0xf6,0x61,0x0,0x0,0x0,0x1,0x66,0xfc,0xcc,0x66,0x10,0x0,0x0,0x16,0x66,0xcc,0xcb,0x66,0x61,0x0,0x0,0x16,0x66,0x6b,0xb6,0x66,0x66,0x0,0x0,0x16,0x66,0x66,0x66,0x66,0x66,0xf,0xf6,0x16,0x6f,0xff,0xff,0xff,0xff,0xfc,0xc6,0x16,0xcc,0xcc,0xcc,0xcc,0xcc,0xcc,0xc6,0xb6,0x99,0x99,0x99,0x99,0x99,0x99,0x96,0xb6,0x6b,0xbb,0xbb,0xbb,0xbb,0xbb,0xb6,0xb6,0x66,0x66,0x66,0x66,0x6b,0xb,0xb6,0xb6,0x66,0x66,0x66,0x66,0x6b,0x0,0x0,0xb6,0x66,0x66,0x66,0x66,0x6b,0x0,0x0,0xb,0x66,0x66,0x66,0x66,0xb0,0x0,0x0,0x0,0xb6,0x66,0x66,0x6b,0x0,0x0,0x0,0x0,0xb,0xbb,0xbb,0xb0,0x0,0x0,0x0,0x00};
char bullet[] = {0x6,0x60,0x6b,0xb6,0x6b,0xb6,0x6b,0xb6,0x6b,0xb6,0x66,0x66,0x00};

int angle = 0;
char key = 0;

void main() {
    //gravity, count, time
    setparticle(0, 4, 1000);
    setimagesize(8);
    putimagerle(earth, 56, 56, 16, 16);
    getsprite(0, gun);
    putsprite(0, 112, 112);
    spritesetvalue(0, S_WIDTH, 16);
    spritesetvalue(0, S_HEIGHT, 16);
    getsprite(1, bullet);
    spritesetvalue(1, S_WIDTH, 4);
    spritesetvalue(1, S_HEIGHT, 6);

    while (1) {
        key = getkey();

        if (key & KEY_LEFT) {
            angle -= 10;

            if (angle < 0) {
                angle = 359;
            }
        } else if (key & KEY_RIGHT) {
            angle += 10;

            if (angle > 359) {
                angle = 0;
            }
        } else if (key & KEY_B) {
            //putsprite(1, 56, 56);
            //time, dir, dir1, speed
            setemitter(50, angle - 10, angle + 10, 9);
            drawparticle(64, 64, 6);
        }

        spritesetvalue(0, S_ANGLE, angle);
        delayredraw();
    }
}
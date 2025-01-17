char road0[] = {0x83,0x0,0xc,0x4,0xcc,0x82,0xc0,0x2,0x0,0x6,0xbb,0x83,0x0,0xb,0x6,0xbb,0x82,0xb0,0x8,0xcc,0x00};
char road1[] = {0x83,0x0,0xc,0x4,0xcc,0x82,0xc0,0x2,0x0,0x6,0xcc,0x83,0x0,0xb,0x6,0xbb,0x82,0xb0,0x8,0xbb,0x00};
char road2[] = {0x83,0x0,0xb,0x4,0xbb,0x82,0xb0,0x2,0x0,0x6,0xcc,0x83,0x0,0xc,0x6,0xcc,0x82,0xc0,0x8,0xbb,0x00};
char road3[] = {0x83,0x0,0xb,0x4,0xbb,0x82,0xb0,0x2,0x0,0x6,0xbb,0x83,0x0,0xc,0x6,0xcc,0x82,0xc0,0x8,0xcc,0x00};
char sky[] = {0x0,0x0,0x0,0x0,0x0,0x0,0x0,0x0,0x0,0x11,0x10,0x0,0x1,0x11,0x11,0x0,0x11,0x11,0x11,0x10,0x1,0x1,0x11,0x11,0x0,0x0,0x11,0x0,0x0,0x0,0x0,0x1,0x00};
char car[] = {0x0,0x0,0x0,0x0,0x0,0x22,0x22,0x0,0x2,0x11,0x11,0x20,0x2,0x11,0x11,0x20,0x22,0x22,0x22,0x22,0x27,0x22,0x22,0x72,0x22,0x22,0x22,0x22,0xb,0x0,0x0,0xb0,0x00};
char car1[] = {0x0,0x0,0x0,0x0,0x0,0x66,0x66,0x0,0x6,0x11,0x11,0x60,0x6,0x11,0x11,0x60,0x66,0x66,0x66,0x66,0x67,0x66,0x66,0x76,0x66,0x66,0x66,0x66,0x6,0x0,0x0,0x60,0x00};

int roads[4];
roads[0] = road0;
roads[1] = road1;
roads[2] = road2;
roads[3] = road3;

char skyx = 0;
char skyy = 5;
char c = 0;
char i, key;
char carx = 120;
char car1x = 120;
char car1y = 128;
char car1size = 0.5;

void animate() {
    c++;
    skyx++;

    if (c > 3) {
        c = 0;
    }

    if (skyx > 240) {
        skyx = 0;
        skyy = random(30);
    }
}

void main() {
    getsprite(0, sky);
    getsprite(31, car);
    setcolor(14);

    for (i = 0; i < 128; i++)
        line(0, i, 239, i);

    setcolor(13);

    for (i = 128; i < 236; i++)
        line(0, i, 239, i);

    while (1) {
        setimagesize(13);
        putimagerle(roads[c], 16, 184, 16, 4);
        setimagesize(8);
        putimagerle(roads[c], 56, 152, 16, 4);
        setimagesize(4);
        putimagerle(roads[c], 88, 136, 16, 4);
        setimagesize(2);
        putimagerle(roads[c], 104, 128, 16, 4);
        animate();
        key = getkey();

        if ((key == 4) & (carx > 70)) {
            carx--;}

        if ((key == 8) & (carx < 218)) {
            carx++;}

        car1size = 1 + (car1y - 128) / 13;
        setimagesize(car1size);
        putimage(car1, car1x - car1size * 2, car1y, 8, 8);
        setimagesize(3);
        putimage(car, carx, 210, 8, 8);
        putsprite(0, skyx, skyy);
        car1y++;

        if (car1y > 210) {
            car1y = 128;
        }

        delayredraw();
    }
}
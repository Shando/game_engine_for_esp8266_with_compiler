// UNKNOWN
int A[2000];

void main(){
	int i;
	int j;
	int x;
	int k;
	int q;
	int nines = 0;
	int predigit = 0;
	int N = 30;
	int len;

	len = (10 * N / 3) + 1;

	for (i = 0; i < len; ++i) {
		A[i] = 2;
	}

	for (j = 1; j < N + 1; ++j) {
		q = 0;

		if (j == 3)
			printf(",");

		for (i = len; i > 0; i--) {
			x  = 10 * A[i-1] + q * i;
			A[i-1] = x % (2 * i - 1);
			q = x / (2 * i - 1);
		}

		A[0] = q % 10;
		q = q / 10;

		if (10 == q) {
			printf("%d", predigit + 1);

			for (k = 0; k < nines; k++) {
				printf("%d", 0);
			}

			predigit = 0;
			nines = 0;
		} else {
			printf("%d", predigit);
			predigit = q;

			if (0 != nines) {
				for (k = 0; k < nines; k++) 
					printf("%d", 9);

				nines = 0;
			}
		}
	}

	printf("%d", predigit);
}

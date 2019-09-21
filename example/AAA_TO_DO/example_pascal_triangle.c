// PASCAL TRIANGLE
void pascaltriangle(int n) {
	int c, i, j, k;
 
	for (i = 0; i < n; i++) {
		c = 1;

		for (j = 0; j <= 2 * (n - i); j = j + 2) {
			printf(" ");
		}

		for (k = 0; k <= i; k++) {
			printf("%d ", c);
			c = c * (i - k) / (k + 1);
		}

		printf("\n");
	}
}

int main() {
	pascaltriangle(8);
	return 0;
}


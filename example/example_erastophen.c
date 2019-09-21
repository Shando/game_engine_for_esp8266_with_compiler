// ERASTOPHEN
#define N 470

int prime[1000];
int i;
int j;
int n = N;

void main() {
	for(i = 0; i < N; i++){
		prime[i] = i;
	}

	prime[0] = 0;
	prime[1] = 0;

	for (i = 2; i * i <= n; i++) {
		if (prime[i])
			for (j = i + i; j <= n; j += i)
				prime[j] = 0;
	}

	for (i = 0; i < N; i++) {
		if (prime[i])
			printf("%d ", prime[i]);
	}
}

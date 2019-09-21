// IS PRIME?
int is_prime(int n) {
	if (n <= 1)
		return 0;
	if (n == 2)
		return 1;
	if (n % 2 == 0)
		return 0;
	for (int j = 3; j * j <= n; j = j + 2)
		 if (n % j == 0) 
			 return 0;

	return 1;
}

void main(){
	printf("%d", (is_prime(107));
}


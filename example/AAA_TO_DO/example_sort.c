// SORT
int array[] = {10, 5, 1, 77, 12, 34, 55, 67};
int i, j, min_i, temp; 
int size = 8;

void main() {
	for (i = 0; i < size; i++) 
		printf("%d ", array[i]);

	putchar(10);

	for (i = 0; i < size - 1; i++) {
	// set the initial value of the minimum index
			min_i = i;

		// find the index of the minimum element
		for (j = i + 1; j < size; j++) {
			if (array[j] < array[min_i]) {
				min_i = j;
			}
		}

		// swap values
		temp = array[i];
		array[i] = array[min_i];
		array[min_i] = temp;
	}

	for (i = 0; i < size; i++) 
		printf("%d ", array[i]);
}

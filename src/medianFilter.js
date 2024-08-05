import { BACKGROUND_COLOR, SLEEP_TIME, listStep2Selector, step2Selector } from "./CONSTANTS.js";
import { sleep, addLoadingStep, addFinishedStep, logCommand, flattenToDimensional, dimensionalToFlatten, generateImage } from "./helper.js";

export default class MedianFilter {
    constructor(newUnit8ClampedArr, SLIDING_SIZE, resizedDimensions, colorsData) {
        this.newUnit8ClampedArr = newUnit8ClampedArr;
        this.SLIDING_SIZE = SLIDING_SIZE;
        this.resizedDimensions = resizedDimensions;
        this.colorsData = colorsData;
    }

    async medianFilter(dimensionalArr) {
        const height = dimensionalArr.length;
        const width = dimensionalArr[0].length;
        const half = Math.floor(this.SLIDING_SIZE / 2);

        for (let i = 0; i < height; i++) {
            for (let j = 0; j < width; j++) {
                // Generate a NxN grid for every pixel by grouping surrounding pixels
                const window = [];

                for (let wi = i - half; wi <= i + half; wi++) {
                    for (let wj = j - half; wj <= j + half; wj++) {
                        if (wi < 0 || wi >= height || wj < 0 || wj >= width) {
                            window.push(BACKGROUND_COLOR);
                        } else {
                            window.push(dimensionalArr[wi][wj]);
                        }
                    }
                }

                // Sort NxN grid based on the distance of color's coordinates to origin
                window.sort(
                    (a, b) =>
                        Math.pow(a[0], 2) +
                        Math.pow(a[1], 2) +
                        Math.pow(a[2], 2) -
                        (Math.pow(b[0], 2) + Math.pow(b[1], 2) + Math.pow(b[2], 2))
                );

                // Assign median value to current color
                const median = window[Math.floor(window.length / 2)];

                dimensionalArr[i][j] = median;
            }

            await sleep(SLEEP_TIME);
        }
    }

    // Apply median filter to the image
    async apply() {
        addLoadingStep(listStep2Selector);
        logCommand("[2]: Starting Noise reduction", "black", "bold");
        const dimensionalArr = flattenToDimensional(this.newUnit8ClampedArr, this.resizedDimensions[0], this.resizedDimensions[1]);
        await this.medianFilter(dimensionalArr);
        const newUnit8ClampedArr = Uint8ClampedArray.from(dimensionalToFlatten(dimensionalArr));
        const imgUrl = generateImage(newUnit8ClampedArr, this.colorsData.width, this.colorsData.height, step2Selector);
        addFinishedStep(listStep2Selector);
        logCommand("[2]: Noise reduction completed", "#22c55e", "bold");
    
        return dimensionalArr;
    }
}
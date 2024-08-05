import { SLEEP_TIME, listStep5Selector, step5Selector } from "./CONSTANTS.js";
import { isEqualArr, sleep, logCommand, dimensionalToFlatten, addLoadingStep, addFinishedStep, removeLoadingStep, placePOI, generateImage } from "./helper.js";

export default class EdgeDetection {
    constructor(dimensionalArr, colorsData, regionCoordinates, ALTERNATIVE_LABEL_ON) {
        this.dimensionalArr = dimensionalArr;
        this.colorsData = colorsData;
        this.regionCoordinates = regionCoordinates;
        this.ALTERNATIVE_LABEL_ON = ALTERNATIVE_LABEL_ON;
    }

    async edgeDetection() {
        const height = this.dimensionalArr.length;
        const width = this.dimensionalArr[0].length;
        const edgeIdx = [];
    
        for (let i = 1; i < height; i++) {
            for (let j = 1; j < width; j++) {
                const prevX = this.dimensionalArr[i][j - 1],
                    currX = this.dimensionalArr[i][j],
                    prevY = this.dimensionalArr[i - 1][j],
                    currY = this.dimensionalArr[i][j];
    
                // "1" stands for edge, "0" stands for non-edge
                if (!isEqualArr(prevX, currX) || !isEqualArr(prevY, currY)) {
                    edgeIdx.push([j, i, 1]);
                } else {
                    edgeIdx.push([j, i, 0]);
                }
            }
    
            await sleep(SLEEP_TIME);
        }

        return edgeIdx;
    }

    async edgeAssignment(removeColor) {
        const edgedDimensionalArr = Array(this.dimensionalArr.length).fill(null).map(() => Array(this.dimensionalArr[0].length).fill(null));
        const height = edgedDimensionalArr.length;
        const width = edgedDimensionalArr[0].length;
        const edgeIdx = await this.edgeDetection();
    
        logCommand("[5]: Edge detection done!");
    
        // Assign edge with black color and non-edge with white color
        for (const idx of edgeIdx) {
            const x = idx[0],
                y = idx[1],
                isEdge = idx[2];
    
            if (isEdge == 1) {
                edgedDimensionalArr[y][x] = [0, 0, 0, 255];
            } else {
                if (removeColor) {
                    edgedDimensionalArr[y][x] = [255, 255, 255, 255];
                } else {
                    edgedDimensionalArr[y][x] = this.dimensionalArr[y][x];
                }
            }
        }
    
        logCommand("[5]: Edge assigned!");
        await sleep(SLEEP_TIME);
    
        // Assign black border to the entire image
        for (let i = 0; i < height; i++) {
            edgedDimensionalArr[i][0] = [0, 0, 0, 255];
            edgedDimensionalArr[i][width - 1] = [0, 0, 0, 255];
        }
    
        for (let j = 0; j < width; j++) {
            edgedDimensionalArr[0][j] = [0, 0, 0, 255];
            edgedDimensionalArr[height - 1][j] = [0, 0, 0, 255];
        }
    
        logCommand("[5]: Border assigned!");
        await sleep(SLEEP_TIME);

        return edgedDimensionalArr;
    }

    // Apply edge detection to the image
    async apply() {
        addLoadingStep(listStep5Selector);
        logCommand("[5]: Starting Edge detection", "black", "bold");
        const edgedDimensionalArr = await this.edgeAssignment(true);
        const newUnit8ClampedArr = Uint8ClampedArray.from(
            dimensionalToFlatten(edgedDimensionalArr)
        );
        const imgUrl = generateImage(
            newUnit8ClampedArr,
            this.colorsData.width,
            this.colorsData.height,
            step5Selector,
            true
        );
    
        logCommand("[5]: Placing labels on the image");
        for (const region of this.regionCoordinates) {
            placePOI(step5Selector, region, "#000000", this.ALTERNATIVE_LABEL_ON);
        }
        addFinishedStep(listStep5Selector);
        logCommand("[5]: Edge detection completed", "#22c55e", "bold");

        removeLoadingStep(listStep5Selector);
    }
}
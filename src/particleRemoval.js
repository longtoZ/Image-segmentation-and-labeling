import { MAX_REMOVALS, SLEEP_TIME, listStep3Selector, step3Selector } from "./CONSTANTS.js";
import { isEqualArr, logCommand, sleep, addLoadingStep, addFinishedStep, dimensionalToFlatten, generateImage } from "./helper.js";

class ParticleWrapper {
    constructor(dimensionalArr, SIZE_LIMIT) {
        this.dimensionalArr = dimensionalArr;
        this.SIZE_LIMIT = SIZE_LIMIT;
        this.visitedIdx = new Set();
        this.neighboursIdx = new Set();
        this.excludedIdx = new Set();
    }

    reset() {
        this.visitedIdx.clear();
        this.neighboursIdx.clear();
        this.excludedIdx.clear();
    }

    isVisited(idx) {
        return this.visitedIdx.has(idx);
    }

    addVisited(idx) {
        this.visitedIdx.add(idx);
    }

    addExcluded(idx) {
        this.excludedIdx.add(idx);
    }

    addNeighbour() {

        for (const n of this.visitedIdx) {
            const neighbour = JSON.parse(n);
            const x = neighbour[0],
                y = neighbour[1];
            const left = x - 1 >= 0 ? JSON.stringify([x - 1, y]) : null;
            const right =
                x + 1 < this.dimensionalArr[0].length
                    ? JSON.stringify([x + 1, y])
                    : null;
            const top = y - 1 >= 0 ? JSON.stringify([x, y - 1]) : null;
            const bottom =
                y + 1 < this.dimensionalArr.length ? JSON.stringify([x, y + 1]) : null;

            if (
                left != null &&
                !this.neighboursIdx.has(left) &&
                !this.visitedIdx.has(left) &&
                !this.excludedIdx.has(left)
            ) {
                this.neighboursIdx.add(left);
            }

            if (
                right != null &&
                !this.neighboursIdx.has(right) &&
                !this.visitedIdx.has(right) &&
                !this.excludedIdx.has(right)
            ) {
                this.neighboursIdx.add(right);
            }

            if (
                top != null &&
                !this.neighboursIdx.has(top) &&
                !this.visitedIdx.has(top) &&
                !this.excludedIdx.has(top)
            ) {
                this.neighboursIdx.add(top);
            }

            if (
                bottom != null &&
                !this.neighboursIdx.has(bottom) &&
                !this.visitedIdx.has(bottom) &&
                !this.excludedIdx.has(bottom)
            ) {
                this.neighboursIdx.add(bottom);
            }
        }

    }

    groupPixelsByRow() {
        const pixelsArr = Array.from(this.visitedIdx).map((i) => JSON.parse(i));

        // Sort the pixels based on their y-coordinate
        pixelsArr.sort((a, b) => a[1] - b[1]);
        pixelsArr.push([-1, -1]);

        // console.log(pixelsArr);

        const groupedPixels = [];
        let group = [pixelsArr[0]];

        for (let i = 1; i < pixelsArr.length; i++) {
            if (pixelsArr[i][1] == pixelsArr[i - 1][1]) {
                group.push(pixelsArr[i]);
            } else {
                // Sort the pixels based on their x-coordinate
                group.sort((a, b) => a[0] - b[0]);
                groupedPixels.push(group);

                group = [pixelsArr[i]];
            }
        }

        pixelsArr.pop();

        return groupedPixels;
    }

    getMajorNeighbour() {
        const majorNeighbour = {
            neighbour: [],
            count: 0,
            large: true,
        };

        // Convert Set to array and sort the neighbours
        const neighboursArr = Array.from(this.neighboursIdx).map((i) =>
            JSON.parse(i)
        );

        neighboursArr.sort((c, d) => {
            const a = this.dimensionalArr[c[1]][c[0]],
                b = this.dimensionalArr[d[1]][d[0]];
            return (
                Math.pow(a[0], 2) +
                Math.pow(a[1], 2) +
                Math.pow(a[2], 2) -
                (Math.pow(b[0], 2) + Math.pow(b[1], 2) + Math.pow(b[2], 2))
            );
        });

        neighboursArr.push([-1, -1]);

        // Find the most frequent neighbour
        let count = 1,
            maxCount = 0,
            maxIdx = 0;

        for (let i = 1; i < neighboursArr.length; i++) {
            const currX = neighboursArr[i][0],
                currY = neighboursArr[i][1],
                prevX = neighboursArr[i - 1][0],
                prevY = neighboursArr[i - 1][1];

            if (
                currX != -1 &&
                currY != -1 &&
                isEqualArr(
                    this.dimensionalArr[currY][currX],
                    this.dimensionalArr[prevY][prevX]
                )
            ) {
                count++;
            } else {
                if (count > maxCount) {
                    maxCount = count;
                    maxIdx = i - 1;
                }
                count = 1;
            }
        }

        neighboursArr.pop();

        majorNeighbour.neighbour = neighboursArr[maxIdx];
        majorNeighbour.count = maxCount;
        majorNeighbour.large = false;

        if (this.visitedIdx.size > this.SIZE_LIMIT) {
            majorNeighbour.large = true;
        }

        return majorNeighbour;
    }
}

export default class ParticleRemoval {
    constructor(dimensionalArr, SIZE_LIMIT, colorsData) {
        this.dimensionalArr = dimensionalArr;
        this.SIZE_LIMIT = SIZE_LIMIT;
        this.colorsData = colorsData;
    }

    // Get major neighbours of giving points
    getMajorNeighbour(neighboursIdx) {
        // Convert Set to array and sort the neighbours
        const neighboursArr = Array.from(neighboursIdx).map((i) => JSON.parse(i));
    
        neighboursArr.sort((c, d) => {
            const a = this.dimensionalArr[c[1]][c[0]],
                b = this.dimensionalArr[d[1]][d[0]];
            return (
                Math.pow(a[0], 2) +
                Math.pow(a[1], 2) +
                Math.pow(a[2], 2) -
                (Math.pow(b[0], 2) + Math.pow(b[1], 2) + Math.pow(b[2], 2))
            );
        });
    
        neighboursArr.push([-1, -1]);
    
        // Find the most frequent neighbour
        let count = 1,
            maxCount = 0,
            maxIdx = 0;
    
        for (let i = 1; i < neighboursArr.length; i++) {
            const currX = neighboursArr[i][0],
                currY = neighboursArr[i][1],
                prevX = neighboursArr[i - 1][0],
                prevY = neighboursArr[i - 1][1];
    
            if (
                currX != -1 &&
                currY != -1 &&
                isEqualArr(this.dimensionalArr[currY][currX], this.dimensionalArr[prevY][prevX])
            ) {
                count++;
            } else {
                if (count > maxCount) {
                    maxCount = count;
                    maxIdx = i - 1;
                }
                count = 1;
            }
        }
    
        neighboursArr.pop();
    
        const majorNeighbour = {
            neighbour: neighboursArr[maxIdx],
            count: maxCount,
        };
    
        return majorNeighbour;
    }

    // Recursively detect particle in 4 directions: Right -> Bottom -> Left -> Top
    detectParticle(particleWrapper, initX, initY, x, y, targetColor) {
        // Stop if the coordinate went out of the matrix
        if (
            x < 0 ||
            x >= particleWrapper.dimensionalArr[0].length ||
            y < 0 ||
            y >= particleWrapper.dimensionalArr.length
        ) {
            return;
        }
    
        const currIdx = JSON.stringify([x, y]);
    
        // Stop if the pixel goes out of the particle's region
        if (!isEqualArr(particleWrapper.dimensionalArr[y][x], targetColor)) {
            return;
        }
    
        // Stop if the particle's size is too large
        if (particleWrapper.visitedIdx.size > this.SIZE_LIMIT) {
            return;
        }
    
        // Stop if pixel is visited
        if (particleWrapper.isVisited(currIdx)) {
            return;
        }
    
        // Add current pixel to visited list
        particleWrapper.addVisited(currIdx);
    
        // Recursively detect particle
        this.detectParticle(particleWrapper, initX, initY, x + 1, y, targetColor);
        this.detectParticle(particleWrapper, initX, initY, x, y + 1, targetColor);
        this.detectParticle(particleWrapper, initX, initY, x - 1, y, targetColor);
        this.detectParticle(particleWrapper, initX, initY, x, y - 1, targetColor);
    }

    // Merge the narrow parts of the particle
    mergeNarrowPart(rowParticleWrapper, groupedPixelsByRow, modified) {
        const width = this.dimensionalArr[0].length;
    
        for (let k = 0; k < groupedPixelsByRow.length; k++) {
            const group = groupedPixelsByRow[k];
    
            // Gather contiguous pixels then replace them with the most frequent neighbour
            if (group.length > 1) {
                const y = group[0][1];
                let prevX = group[0][0],
                    currX = group.length > 1 ? group[1][0] : -1;
    
                let contiguousIdx = [prevX];
    
                for (let i = 1; i < group.length; i++) {
                    if (currX - prevX == 1) {
                        contiguousIdx.push(currX);
                    }
    
                    // Track contiguous pixels groups
                    if (currX - prevX > 1 || i == group.length - 1) {
                        if (contiguousIdx.length < Math.round(Math.sqrt(this.SIZE_LIMIT))) {
                            const leftColor =
                                contiguousIdx[0] - 1 >= 0
                                    ? this.dimensionalArr[y][contiguousIdx[0] - 1]
                                    : undefined;
                            const rightColor =
                                contiguousIdx[contiguousIdx.length - 1] + 1 < width
                                    ? this.dimensionalArr[y][contiguousIdx[contiguousIdx.length - 1] + 1]
                                    : undefined;
                            const startColor = this.dimensionalArr[y][contiguousIdx[0]];
                            const endColor =
                                this.dimensionalArr[y][contiguousIdx[contiguousIdx.length - 1]];
    
                            // Only replace the contiguous pixels if the left and right pixels are different colors (this will ensure that the particle's part is actually narrow)
                            if (
                                leftColor != undefined &&
                                !isEqualArr(leftColor, startColor) &&
                                rightColor != undefined &&
                                !isEqualArr(rightColor, endColor)
                            ) {
                                // Find neighbours for each row and replace them
                                contiguousIdx.forEach((x) =>
                                    rowParticleWrapper.addVisited(JSON.stringify([x, y]))
                                );
    
                                // Add top and bottom group to the excluded list
                                if (k - 1 >= 0) {
                                    const topRow = groupedPixelsByRow[k - 1];
                                    topRow.forEach((p) =>
                                        rowParticleWrapper.addExcluded(JSON.stringify(p))
                                    );
                                }
    
                                if (k + 1 < groupedPixelsByRow.length) {
                                    const bottomRow = groupedPixelsByRow[k + 1];
                                    bottomRow.forEach((p) =>
                                        rowParticleWrapper.addExcluded(JSON.stringify(p))
                                    );
                                }
    
                                rowParticleWrapper.addNeighbour();
    
                                const majorNeighbourWrapper =
                                    rowParticleWrapper.getMajorNeighbour();
                                let majorNeighbour = majorNeighbourWrapper.neighbour;
        
                                if (
                                    majorNeighbourWrapper.count > 0 &&
                                    !isEqualArr(
                                        this.dimensionalArr[majorNeighbour[1]][majorNeighbour[0]],
                                        this.dimensionalArr[y][contiguousIdx[0]]
                                    )
                                ) {
                                    contiguousIdx.forEach(
                                        (x) =>
                                        (this.dimensionalArr[y][x] =
                                            this.dimensionalArr[majorNeighbour[1]][majorNeighbour[0]])
                                    );
    
                                    modified[0] = true;
                                }
    
                                rowParticleWrapper.reset();
                            }
                        }
    
                        contiguousIdx = [currX];
                    }
    
                    prevX = currX;
                    currX = i < group.length - 1 ? group[i + 1][0] : -1;
                }
            } else {
                // In case the group has only one pixel
                rowParticleWrapper.addVisited(JSON.stringify(group[0]));
    
                rowParticleWrapper.addNeighbour();
    
                const majorNeighbourWrapper = rowParticleWrapper.getMajorNeighbour();
                let majorNeighbour = majorNeighbourWrapper.neighbour;
    
                if (
                    majorNeighbourWrapper.count > 0 &&
                    !isEqualArr(
                        this.dimensionalArr[majorNeighbour[1]][majorNeighbour[0]],
                        this.dimensionalArr[group[0][1]][group[0][0]]
                    )
                ) {
                    group.forEach(
                        (p) =>
                        (this.dimensionalArr[p[1]][p[0]] =
                            this.dimensionalArr[majorNeighbour[1]][majorNeighbour[0]])
                    );
    
                    modified[0] = true;
                }
    
                rowParticleWrapper.reset();
            }
        }
    }

    // [Note] - This function should be improved later
    removeExceedingRow(targetIdx) {
        const height = this.dimensionalArr.length;
        const width = this.dimensionalArr[0].length;
        const x = targetIdx[0],
            y = targetIdx[1];
        const neighboursIdx = new Set();

        if (
            (y - 1 >= 0 &&
                y + 1 < height &&
                !isEqualArr(this.dimensionalArr[y - 1][x], this.dimensionalArr[y][x]) &&
                !isEqualArr(this.dimensionalArr[y + 1][x], this.dimensionalArr[y][x])) ||
            (x - 1 >= 0 &&
                x + 1 < width &&
                !isEqualArr(this.dimensionalArr[y][x - 1], this.dimensionalArr[y][x]) &&
                !isEqualArr(this.dimensionalArr[y][x + 1], this.dimensionalArr[y][x]))
        ) {
            if (
                y - 1 >= 0 &&
                !isEqualArr(this.dimensionalArr[y - 1][x], this.dimensionalArr[y][x])
            ) {
                neighboursIdx.add(JSON.stringify([x, y - 1]));
            }

            if (
                y + 1 < height &&
                !isEqualArr(this.dimensionalArr[y + 1][x], this.dimensionalArr[y][x])
            ) {
                neighboursIdx.add(JSON.stringify([x, y + 1]));
            }

            if (
                x - 1 >= 0 &&
                !isEqualArr(this.dimensionalArr[y][x - 1], this.dimensionalArr[y][x])
            ) {
                neighboursIdx.add(JSON.stringify([x - 1, y]));
            }

            if (
                x + 1 < width &&
                !isEqualArr(this.dimensionalArr[y][x + 1], this.dimensionalArr[y][x])
            ) {
                neighboursIdx.add(JSON.stringify([x + 1, y]));
            }

            const majorNeighbour = this.getMajorNeighbour(neighboursIdx);

            if (majorNeighbour.count > 0) {
                if (
                    !isEqualArr(
                        this.dimensionalArr[majorNeighbour.neighbour[1]][
                        majorNeighbour.neighbour[0]
                        ],
                        this.dimensionalArr[y][x]
                    )
                ) {
                    this.dimensionalArr[y][x] =
                        this.dimensionalArr[majorNeighbour.neighbour[1]][
                        majorNeighbour.neighbour[0]
                        ];
                }
            }
        }
    }

    // Remove large particles from dimensional array
    async removalProcess(mode) {
        const height = this.dimensionalArr.length;
        const width = this.dimensionalArr[0].length;
        const particleWrapper = new ParticleWrapper(this.dimensionalArr);
        const rowParticleWrapper = new ParticleWrapper(this.dimensionalArr, this.SIZE_LIMIT);

        for (let i = 0; i < height; i++) {
            for (let j = 0; j < width; j++) {

                if (mode == 0) {
                    const modified = [false];
                    let count = 0;

                    while (true) {
                        modified[0] = false;

                        // Spread the pixel to its surrounding neighbours and check if it is a particle
                        this.detectParticle(particleWrapper, j, i, j, i, this.dimensionalArr[i][j], mode);

                        // If the particle is small, simply replace it with the major neighbour
                        if (particleWrapper.visitedIdx.size < this.SIZE_LIMIT) {
                            particleWrapper.addNeighbour();

                            const majorNeighbourWrapper = particleWrapper.getMajorNeighbour();
                            let majorNeighbour = majorNeighbourWrapper.neighbour;

                            if (majorNeighbourWrapper.count > 0 && !isEqualArr(this.dimensionalArr[majorNeighbour[1]][majorNeighbour[0]], this.dimensionalArr[i][j])) {
                                for (const c of particleWrapper.visitedIdx) {
                                    const color = JSON.parse(c);
                                    this.dimensionalArr[color[1]][color[0]] =
                                        this.dimensionalArr[majorNeighbour[1]][majorNeighbour[0]];
                                }

                                modified[0] = true;
                            }
                        } else {
                            // If the particle is large, merge the narrow regions with their major neighbours

                            const groupedPixelsByRow = particleWrapper.groupPixelsByRow();
                            this.mergeNarrowPart(rowParticleWrapper, groupedPixelsByRow, modified);
                        }

                        count++;

                        if (count > MAX_REMOVALS) {
                            if (mode == 0) {
                                // console.log(`%c [3]: Attempt exceeded ${MAX_REMOVALS}`, "color: #eab308;");
                                logCommand(`[3]: Attempt exceeded ${MAX_REMOVALS}`, "#eab308");
                            }

                            await sleep(SLEEP_TIME);
                            break;
                        }

                        particleWrapper.reset();

                        if (!modified[0]) {
                            break;
                        }
                    }

                } else {
                    this.removeExceedingRow([j, i]);
                }
            }

            if (mode == 0) {
                // console.log(`[3]: Row ${i} done!`);
                logCommand(`[3]: Row ${i} done!`);
            }

            await sleep(SLEEP_TIME);
        }
    }

    // Apply particle removal process
    async apply() {
        addLoadingStep(listStep3Selector);
        logCommand("[3]: Starting Particle removal", "black", "bold");
        await this.removalProcess(0);
        logCommand("[3.5]: Removing exceeding rows", "black", "bold");
        await this.removalProcess(1);
        const newUnit8ClampedArr = Uint8ClampedArray.from(dimensionalToFlatten(this.dimensionalArr));
        const imgUrl = generateImage(newUnit8ClampedArr, this.colorsData.width, this.colorsData.height, step3Selector);
        addFinishedStep(listStep3Selector);
        logCommand("[3]: Particle removal completed", "#22c55e", "bold");
    }
}
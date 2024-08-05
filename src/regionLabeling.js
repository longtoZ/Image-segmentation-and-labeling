import { proportionBarSelector, colorListSelector, SLEEP_TIME, BACKGROUND_COLOR, listStep4Selector, step4Selector, step4p5Selector, ONE, ZERO, layerContainerSelector } from "./CONSTANTS.js";
import { isEqualArr, sleep, logCommand, addLoadingStep, addFinishedStep, dimensionalToFlatten, placePOI, generateImage } from "./helper.js";
import EdgeDetection from "./edgeDetection.js";
import polylabel from "./polylabel.js";

export default class RegionLabeling extends EdgeDetection {
    constructor(dimensionalArr, colorsData, ISOLATE_REGIONS_ON, LABEL_COLOR, ALTERNATIVE_LABEL_ON) {
        super(dimensionalArr);
        this.dimensionalArr = dimensionalArr;
        this.colorsData = colorsData;
        this.ISOLATE_REGIONS_ON = ISOLATE_REGIONS_ON;
        this.LABEL_COLOR = LABEL_COLOR;
        this.ALTERNATIVE_LABEL_ON = ALTERNATIVE_LABEL_ON;
        this.BACKGROUND_COLOR = BACKGROUND_COLOR;
    }

    groupPixelsByRow(pixelsArr) {
        // Sort the pixels based on their y-coordinate
        pixelsArr.sort((a, b) => a[1] - b[1]);
        pixelsArr.push([-1, -1]);
    
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

    // Convert group of coordinates to binary image (MxN) and fill the gaps with zeros
    fillBinaryEmptyPixels(groupedPixels, [orgMinX, orgMaxX, orgMinY, orgMaxY], reverse = false) {
        // Create a copy of min and max values
        let minX = orgMinX,
            maxX = orgMaxX,
            minY = orgMinY,
            maxY = orgMaxY;
    
        // In case we don't need to fill the entire image, we find the min and max of the provided region
        if (minX == -1 && maxX == -1 && minY == -1 && maxY == -1) {
            minX = groupedPixels[0][0][0];
            maxX = groupedPixels[0][0][0];
            minY = groupedPixels[0][0][1];
            maxY = groupedPixels[groupedPixels.length - 1][0][1];
    
            for (const group of groupedPixels) {
                const left = group[0][0],
                    right = group[group.length - 1][0];
    
                if (left < minX) minX = left;
                if (right > maxX) maxX = right;
            }
        }
    
        // Create a new 2D empty array to prepare for filling
        const newGroupedPixels = new Array(maxY - minY + 1)
            .fill()
            .map(() => new Array(maxX - minX + 1).fill(0));
    
        let idxY = 0;
        for (let i = 0; i <= maxY - minY; i++) {
            // If the current row has pixels
            if (idxY < groupedPixels.length && i + minY == groupedPixels[idxY][0][1]) {
                const group = groupedPixels[idxY];
    
                // Fill the empty pixels between existing pixels (on same row)
                let idxX = 0;
                for (let j = 0; j <= maxX - minX; j++) {
                    if (idxX < group.length && j + minX == group[idxX][0]) {
                        if (reverse) {
                            newGroupedPixels[i][j] = ZERO;
                        } else {
                            newGroupedPixels[i][j] = ONE;
                        }
                        idxX++;
                    } else {
                        // Detect temporary inner holes by filling the pixels between both ends.
                        // validInnerBoundary() will be used later to determine if the hole is actually an inner boundary or not
                        if (
                            reverse &&
                            j + minX > group[0][0] &&
                            j + minX < group[group.length - 1][0]
                        ) {
                            newGroupedPixels[i][j] = ONE;
                        } else {
                            newGroupedPixels[i][j] = ZERO;
                        }
                    }
                }
    
                idxY++;
            } else {
                // Otherwise, fill the entire row with empty pixels
            }
        }
    
        return {
            minX: minX,
            minY: minY,
            groupedPixels: newGroupedPixels,
        };
    }

    // Label connected components using 2-pass algorithm
    connectedComponentLabeling(groupedPixelsByRow, [minX, maxX, minY, maxY], inner) {
        const wrapper = this.fillBinaryEmptyPixels(groupedPixelsByRow, [minX, maxX, minY, maxY], inner);
        const filledGroup = wrapper.groupedPixels;
    
        const rows = filledGroup.length;
        const cols = filledGroup[0].length;
    
        // Create an array to store the labels
        const labels = Array.from({ length: rows }, () => Array(cols).fill(0));
    
        // Union-Find structure to manage connected components
        const parent = [];
    
        // Helper function to find the root of a label
        function find(x) {
            if (parent[x] === x) {
                return x;
            }
            parent[x] = find(parent[x]);
            return parent[x];
        }
    
        // Helper function to union two labels
        function union(x, y) {
            let rootX = find(x);
            let rootY = find(y);
            if (rootX !== rootY) {
                parent[rootY] = rootX;
            }
        }
    
        let currentLabel = 1;
    
        // First pass: label the components tentatively and record equivalences
        for (let i = 0; i < rows; i++) {
            for (let j = 0; j < cols; j++) {
                if (filledGroup[i][j] === 1) {
                    let neighbors = [];
    
                    // Check the neighbors (left and above)
                    if (i > 0 && filledGroup[i - 1][j] === 1) {
                        neighbors.push(labels[i - 1][j]);
                    }
                    if (j > 0 && filledGroup[i][j - 1] === 1) {
                        neighbors.push(labels[i][j - 1]);
                    }
    
                    if (neighbors.length === 0) {
                        // No neighbors, create a new label
                        labels[i][j] = currentLabel;
                        parent[currentLabel] = currentLabel;
                        currentLabel++;
                    } else {
                        // Assign the smallest label to the current pixel
                        let smallestLabel = Math.min(...neighbors);
                        labels[i][j] = smallestLabel;
    
                        // Record the equivalence of all neighboring labels
                        for (let neighbor of neighbors) {
                            union(neighbor, smallestLabel);
                        }
                    }
                }
            }
        }
    
        // Second pass: flatten the equivalence classes
        const componentCoordinates = {};
        const finalLabels = {};
        let newLabel = 1;
    
        for (let i = 0; i < rows; i++) {
            for (let j = 0; j < cols; j++) {
                if (labels[i][j] !== 0) {
                    let root = find(labels[i][j]);
                    if (!finalLabels[root]) {
                        finalLabels[root] = newLabel;
                        newLabel++;
                    }
    
                    labels[i][j] = finalLabels[root];
    
                    if (!componentCoordinates[labels[i][j]]) {
                        componentCoordinates[labels[i][j]] = [];
                    }
    
                    componentCoordinates[labels[i][j]].push([
                        j + wrapper.minX,
                        i + wrapper.minY,
                    ]);
                }
            }
        }
    
        return componentCoordinates;
    }

    // Boundary tracing using Moore-neighbourhood algorithm
    traceBoundary(image, boundary) {
        // Define the directions for the Moore neighborhood, start from bottom left (clockwise order)
        const directions = [
            [-1, 1],
            [-1, 0],
            [-1, -1],
            [0, -1],
            [1, -1],
            [1, 0],
            [1, 1],
            [0, 1],
        ];

        // Function to find the starting pixel
        function findStartPixel(image) {
            for (let y = 0; y < image.length; y++) {
                for (let x = 0; x < image[y].length; x++) {
                    if (image[y][x] === 1) {
                        return [x, y];
                    }
                }
            }

            return null;
        }

        // Function to check for black pixel in the Moore neighborhood
        function isBlack(x, y, image) {
            return (
                x >= 0 &&
                x < image[0].length &&
                y >= 0 &&
                y < image.length &&
                image[y][x] === 1
            );
        }

        // Find the starting pixel
        const startPixel = findStartPixel(image);
        if (!startPixel) return [];

        // Initialize the current pixel and direction
        const startX = startPixel[0],
            startY = startPixel[1];
        const currentPixel = [startX, startY];
        const backtrackPixel = [startX - 1, startY];
        boundary.add(JSON.stringify(currentPixel));

        while (true) {
            let foundNext = false;

            // Find starting direction
            let startDirection = -1;
            for (let i = 0; i < directions.length; i++) {
                const direction = directions[i];
                const neighborX = currentPixel[0] + direction[0];
                const neighborY = currentPixel[1] + direction[1];

                if (isEqualArr([neighborX, neighborY], backtrackPixel)) {
                    startDirection = i;
                    break;
                }
            }

            if (startDirection === -1) {
                console.log("Error: Start direction not found");
                break;
            }

            // Traverse the Moore neighborhood from the next pixel of the starting pixel to starting pixel in clockwise order
            for (
                let i = startDirection + 1;
                i < startDirection + directions.length + 1;
                i++
            ) {
                const direction = directions[i % directions.length];
                const neighborX = currentPixel[0] + direction[0];
                const neighborY = currentPixel[1] + direction[1];

                if (isBlack(neighborX, neighborY, image)) {
                    boundary.add(JSON.stringify([neighborX, neighborY]));

                    // Update the current pixel and backtrack pixel
                    backtrackPixel[0] = currentPixel[0];
                    backtrackPixel[1] = currentPixel[1];
                    currentPixel[0] = neighborX;
                    currentPixel[1] = neighborY;

                    foundNext = true;
                    break;
                }
            }

            // If no black pixel is found, break the loop
            if (!foundNext) break;

            // If the current pixel is the starting pixel, break the loop
            if (isEqualArr(currentPixel, startPixel)) break;
        }
    }

    // Extract the outer boundary and order in clockwise direction
    extractOuterBoundary(groupedPixelsByRow, [minX, maxX, minY, maxY]) {
        const wrapper = this.fillBinaryEmptyPixels(
            groupedPixelsByRow,
            [minX, maxX, minY, maxY],
            false
        );
        const filledGroup = wrapper.groupedPixels;
        let boundary = new Set();
    
        this.traceBoundary(filledGroup, boundary);
    
        return Array.from(boundary).map((i) => {
            const idx = JSON.parse(i);
            return [idx[0] + wrapper.minX, idx[1] + wrapper.minY];
        });
    }

    // Extract the inner boundary and order in clockwise direction
    extractInnerBoundary(groupedPixelsByRow, [minX, maxX, minY, maxY]) {
        const innerComponents = this.connectedComponentLabeling(
            groupedPixelsByRow,
            [minX, maxX, minY, maxY],
            true
        );
        const boundaries = [];
    
        for (const [label, coordinates] of Object.entries(innerComponents)) {
            const groupedPixelsByRow2 = this.groupPixelsByRow(coordinates);
            const boundary = this.extractOuterBoundary(groupedPixelsByRow2, [
                minX,
                maxX,
                minY,
                maxY,
            ]);
            boundaries.push(boundary);
        }
    
        return boundaries;
    }

    // Mask the image based on the color region
    maskImage() {
        const height = this.dimensionalArr.length;
        const width = this.dimensionalArr[0].length;
        const colorRegionCoordinates = {};
    
        for (let i = 0; i < height; i++) {
            for (let j = 0; j < width; j++) {
                const color = JSON.stringify(this.dimensionalArr[i][j]);
    
                if (!colorRegionCoordinates[color]) {
                    colorRegionCoordinates[color] = [[j, i]];
                } else {
                    colorRegionCoordinates[color].push([j, i]);
                }
            }
        }
    
        // Check if any color is matched with the background color
        for (let v = 0; v < 255; v ++) {
            const color = JSON.stringify([v, v, v, 255]);
            
            if (!colorRegionCoordinates[color]) {
                logCommand(`[4]: Using background color: ${color}`, "#eab308");
                this.BACKGROUND_COLOR = [v, v, v, 255];
                break;
            }
        }
    
        return colorRegionCoordinates;
    }

    // Create color proportion bar and list
    async createColorProportion(colorRegionCoordinates) {
        const totalPixels = Object.values(colorRegionCoordinates).reduce(
            (acc, curr) => acc + curr.length,
            0
        );
        const proportionBar = document.querySelector(proportionBarSelector);
        const colorList = document.querySelector(colorListSelector);
    
        for (const [color, coordinates] of Object.entries(colorRegionCoordinates)) {
            const proportionItem = document.createElement("div");
            const rgba = JSON.parse(color).slice(0, 3);
    
            proportionItem.classList.add("proportion-item");
            proportionItem.style.backgroundColor = `rgba(${rgba.join(", ")})`;
            proportionItem.style.width = `${Math.round((coordinates.length / totalPixels) * 100 * 100) / 100
                }%`;
    
            proportionBar.appendChild(proportionItem);
    
            const colorItem = document.createElement("div");
            const display = document.createElement("div");
            const info = document.createElement("div");
            const p1 = document.createElement("p");
            const p2 = document.createElement("p");
    
            colorItem.classList.add("color-item");
            display.classList.add("display");
            display.style.backgroundColor = `rgba(${rgba.join(", ")})`;
            info.classList.add("info");
            p1.textContent = JSON.stringify(rgba);
            p2.textContent = `${Math.round((coordinates.length / totalPixels) * 100 * 100) / 100
                }%`;
    
            info.appendChild(p1);
            info.appendChild(p2);
    
            colorItem.appendChild(display);
            colorItem.appendChild(info);
    
            colorList.appendChild(colorItem);
    
            await sleep(SLEEP_TIME);
        }
    }

    // Helper function to check for valid inner hole
    validInnerBoundary(innerBoundary, binaryDimensionalArr) {
        const boundaries = [];
        const directions = [
            [-1, 1],
            [-1, 0],
            [-1, -1],
            [0, -1],
            [1, -1],
            [1, 0],
            [1, 1],
            [0, 1],
        ];

        for (const boundary of innerBoundary) {
            let valid = true;

            for (const [x, y] of boundary) {
                let countColorNeighbors = 0;

                for (const dir of directions) {
                    const neighborX = x + dir[0];
                    const neighborY = y + dir[1];

                    if (
                        neighborX >= 0 &&
                        neighborX < binaryDimensionalArr[0].length &&
                        neighborY >= 0 &&
                        neighborY < binaryDimensionalArr.length
                    ) {
                        if (binaryDimensionalArr[neighborY][neighborX] === 1) {
                            countColorNeighbors++;
                        }
                    }
                }

                if (countColorNeighbors == 0) {
                    valid = false;
                    break;
                }
            }

            if (valid) {
                boundaries.push(boundary);
            }
        }

        return boundaries;
    }

    // Put the Point of Inaccessibility (POI) inside the region
    async labelRegion(colorRegionCoordinates) {
        let idx = 0;
        const minX = 0,
            minY = 0,
            maxX = this.dimensionalArr[0].length - 1,
            maxY = this.dimensionalArr.length - 1;
        const regions = [];
    
        for (const [color, colorCoordinates] of Object.entries(
            colorRegionCoordinates
        )) {
            const labelWrapper = { color: color, idx: idx, coordinates: [] };
            const groupedPixelsByRow = this.groupPixelsByRow(colorCoordinates);
    
            const components = this.connectedComponentLabeling(
                groupedPixelsByRow,
                [minX, maxX, minY, maxY],
                false
            );
            let count = 0;
            let emptyDimensionalArr = null;

            // Create an image with only the current color and black background
            if (this.ISOLATE_REGIONS_ON) {
                emptyDimensionalArr = new Array(this.dimensionalArr.length)
                    .fill(null)
                    .map(() => new Array(this.dimensionalArr[0].length).fill(this.BACKGROUND_COLOR));
        
                for (const coordinate of colorCoordinates) {
                    const x = coordinate[0],
                        y = coordinate[1];
                    emptyDimensionalArr[y][x] = this.dimensionalArr[y][x];
                }
            }

            // Create a binary image with only the current color
            const binaryDimensionalArr = new Array(this.dimensionalArr.length)
                .fill(null)
                .map(() => new Array(this.dimensionalArr[0].length).fill(0));
    
            for (const coordinate of colorCoordinates) {
                const x = coordinate[0],
                    y = coordinate[1];
                binaryDimensionalArr[y][x] = 1;
            }
    
            logCommand(`[4]: Extracting boundaries of ${color}`);
    
            // Extract the outer and inner boundaries. Then, find the POI and place it inside the region
            for (const [label, componentCoordinates] of Object.entries(components)) {
                const groupedPixelsByRow2 = this.groupPixelsByRow(componentCoordinates);
                const outerBoundary = this.extractOuterBoundary(
                    groupedPixelsByRow2,
                    [-1, -1, -1, -1]
                );
                const tmpInnerBoundary = this.extractInnerBoundary(
                    groupedPixelsByRow2,
                    [-1, -1, -1, -1]
                );
                const innerBoundary = this.validInnerBoundary(
                    tmpInnerBoundary,
                    binaryDimensionalArr
                );
    
                const rings = [outerBoundary, ...innerBoundary];
    
                const POI = polylabel(rings, 0.1);
    
                POI.count = count;
                POI.inside = false;
                if (this.isInsidePolygon(POI, groupedPixelsByRow2)) {
                    POI.inside = true;
                }
    
                labelWrapper.coordinates.push({
                    POI: POI,
                    size: componentCoordinates.length,
                });
                count++;
    
                await sleep(SLEEP_TIME);
            }

            // Create an image with only the current color and black background
            if (this.ISOLATE_REGIONS_ON) {
                logCommand(`[4.5]: Creating region ${idx}`);

                const regionElement = document.createElement("div");
                regionElement.classList.add("poi-container", "region");
                regionElement.setAttribute("data-layer", idx);
                regionElement.style.display = "none";
                document.querySelector(step4p5Selector).appendChild(regionElement);

                const regionSelector = `.region[data-layer="${idx}"]`;

                const newUnit8ClampedArr = Uint8ClampedArray.from(dimensionalToFlatten(emptyDimensionalArr));
                const imgUrl = generateImage(newUnit8ClampedArr, this.colorsData.width, this.colorsData.height, regionSelector, true);

                placePOI(regionSelector, labelWrapper, this.LABEL_COLOR, this.ALTERNATIVE_LABEL_ON);

                // Add layer item
                const layerContainer = document.querySelector(layerContainerSelector);
                const layerItem = document.createElement('div');
                layerItem.classList.add('layer-item');
                layerItem.setAttribute('data-layer', idx);
                layerItem.textContent = `${idx}`;
                layerContainer.appendChild(layerItem);
            }
    
            regions.push(labelWrapper);
    
            idx++;
        }
    
        return regions;
    }

    // Helper function to check if a point is inside a polygon
    isInsidePolygon(point, groupedPixelsByRow) {
        const x = Math.round(point.x),
            y = Math.round(point.y);
    
        // Check if the point is outside the bounding box
        if (
            y < groupedPixelsByRow[0][0][1] ||
            y > groupedPixelsByRow[groupedPixelsByRow.length - 1][0][1]
        ) {
            return false;
        }
    
        for (const group of groupedPixelsByRow) {
            for (const pixel of group) {
                if (pixel[0] == x && pixel[1] == y) {
                    return true;
                }
            }
        }
    
        return false;
    }

    // Apply region labeling to the image
    async apply() {
        addLoadingStep(listStep4Selector);
        logCommand("[4]: Starting Region labeling", "black", "bold");
        const colorRegionCoordinates = this.maskImage();
        logCommand("[4]: Creating color proportion");
        await this.createColorProportion(colorRegionCoordinates);
        logCommand("[4]: Region separation completed", "#22c55e", "bold");
        const regionCoordinates = await this.labelRegion(colorRegionCoordinates);

        const edgedDimensionalArr = await this.edgeAssignment(false);
        const newUnit8ClampedArr = Uint8ClampedArray.from(dimensionalToFlatten(edgedDimensionalArr));
        const imgUrl = generateImage(newUnit8ClampedArr, this.colorsData.width, this.colorsData.height, step4Selector, true);
        
        logCommand("[4]: Placing labels on the image");
        for (const region of regionCoordinates) {
            placePOI(step4Selector, region, this.LABEL_COLOR, this.ALTERNATIVE_LABEL_ON);
        }
        addFinishedStep(listStep4Selector);
        logCommand("[4]: Region labeling completed");

        return regionCoordinates;
    }
}
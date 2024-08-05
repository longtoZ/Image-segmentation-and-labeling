import { SLEEP_TIME, listStep1Selector, step1Selector, imgSelector } from "./CONSTANTS.js";
import { getDistance, logCommand, sleep, resizeDimensions, addLoadingStep, addFinishedStep, generateImage } from "./helper.js";

export default class KMeans {
    constructor(MAX_ITERATIONS, MAX_PIXELS, K_COLORS, RANDOM_SEED) {
        this.MAX_ITERATIONS = MAX_ITERATIONS;
        this.MAX_PIXELS = MAX_PIXELS;
        this.K_COLORS = K_COLORS;
        this.RANDOM_SEED = RANDOM_SEED;
        this.rng = new Math.seedrandom(this.RANDOM_SEED);
    }

    // Generate random integer between min and max
    randomInt(min, max, SEED) {
        if (SEED === "") {
            return Math.floor(Math.random() * (max - min + 1)) + min;
        } else {
            return Math.floor(this.rng() * (max - min + 1)) + min;
        }
    }

    // Compare coordinates of two centroids
    compareCentroids(c1, c2) {
        for (let i = 0; i < c1.length; i++) {
            if (c1[i] != c2[i]) {
                return false;
            }
        }

        return true;
    }

    // Stop the execution of calculating centroids
    shouldStop(centroids, oldCentroids, iteration) {
        if (iteration > this.MAX_ITERATIONS) {
            return true;
        }

        if (oldCentroids.length == 0) {
            return false;
        }

        for (let i = 0; i < centroids.length; i++) {
            if (!this.compareCentroids(centroids[i], oldCentroids[i])) {
                return false;
            }
        }

        return true;
    }

    // Choose random k points in dataset to be centroids
    getRandomCentroids(dataset) {
        const length = dataset.length;
        const centroidsIndex = [];

        for (let i = 0; i < this.K_COLORS; i++) {
            let idx = this.randomInt(0, length - 1, this.RANDOM_SEED);

            while (centroidsIndex.indexOf(idx) != -1) {
                idx = this.randomInt(0, length - 1, this.RANDOM_SEED);
            }

            centroidsIndex.push(idx);
        }

        const centroids = [];

        for (const i of centroidsIndex) {
            centroids.push(dataset[i]);
        }

        return centroids;
    }

    // Assign points to their closet centroid
    pointsCluster(dataset, centroids) {
        const clusters = [];

        for (let i = 0; i < centroids.length; i++) {
            clusters.push({
                pointIndexes: [],
                centroid: centroids[i],
            });
        }

        // For each points, choose its closet centroid from initialized centroids
        for (let i = 0; i < dataset.length; i++) {
            let minDist = 0,
                currDist = 0,
                centroidIdx = 0;

            // Compare length with each centroid
            for (let j = 0; j < centroids.length; j++) {
                currDist = getDistance(dataset[i], centroids[j]);

                if (j == 0) {
                    minDist = currDist;
                    centroidIdx = j;
                } else {
                    if (currDist < minDist) {
                        minDist = currDist;
                        centroidIdx = j;
                    }
                }
            }

            // Assign the point to its closet centroid
            clusters[centroidIdx].pointIndexes.push(i);
        }

        return clusters;
    }

    // Calculate centroid (mean) of given points list
    getPointMean(dataset, pointIndexes) {
        const mean = Array(dataset[pointIndexes[0]].length).fill(0);

        for (let i = 0; i < dataset[pointIndexes[0]].length; i++) {
            let total = 0;

            for (let j = 0; j < pointIndexes.length; j++) {
                total += dataset[pointIndexes[j]][i];
            }

            mean[i] = total / pointIndexes.length;
        }

        return mean;
    }

    // Recalculate centroids of each cluster
    recalculateCentroids(dataset, clusters) {
        const newCentroids = [];

        for (let i = 0; i < clusters.length; i++) {
            let newCentroid = [];

            // If there is no centroid for a points list, randomly re-initialized it.
            if (clusters[i].pointIndexes.length > 0) {
                newCentroid = this.getPointMean(dataset, clusters[i].pointIndexes);
            } else {
                newCentroid = this.getRandomCentroids(dataset, 1)[0];
            }

            newCentroids.push(newCentroid);
        }

        return newCentroids;
    }

    // Main implementation of k-means
    async kmeans(dataset) {
        let result = {
            clusters: [],
            iteration: 0,
        };

        if (dataset.length > 0 && dataset[0].length > 0 && dataset.length > this.K_COLORS) {
            let iteration = 0;
            let centroids = [],
                oldCentroids = [];
            let clusters = [];

            centroids = this.getRandomCentroids(dataset, this.K_COLORS);

            // Repeatedly calculate centroids and update their surrounding points
            while (!this.shouldStop(centroids, oldCentroids, iteration)) {
                oldCentroids = centroids;
                clusters = this.pointsCluster(dataset, centroids);
                centroids = this.recalculateCentroids(dataset, clusters);
                iteration++;

                logCommand(`[1]: Clustered ${iteration} times`);
                await sleep(SLEEP_TIME);
            }

            result.clusters = clusters;
            result.iteration = iteration;
        }

        return result;
    }

    // Convert image to canvas and get data of every pixel
    async getColorData() {
        const img = document.querySelector(imgSelector);

        // Resize the original image to fit MAX_PIXELS
        const resizedImg = document.createElement("img");
        resizedImg.src = img.src;
        const resizedDimensions = resizeDimensions(img, this.MAX_PIXELS);
        resizedImg.width = resizedDimensions[0];
        resizedImg.height = resizedDimensions[1];
        resizedImg.crossOrigin = "anonymous";

        // Create canvas element
        const canvas = document.createElement("canvas");
        const context = canvas.getContext("2d");

        canvas.width = resizedImg.width;
        canvas.height = resizedImg.height;

        // Draw the image on canvas with resized dimensions
        context.drawImage(resizedImg, 0, 0, resizedImg.width, resizedImg.height);

        const myData = context.getImageData(
            0,
            0,
            resizedImg.width,
            resizedImg.height
        );

        logCommand(`[1]: Resized image to ${resizedImg.width}x${resizedImg.height}`, "#eab308");
        await sleep(SLEEP_TIME);

        return myData;
    }

    // Group each 4 elements into a pixel color data
    groupColorPoints(unit8ClampedArr) {
        const points = [];

        for (let i = 0; i < unit8ClampedArr.length - 3; i += 4) {
            const red = unit8ClampedArr[i],
                green = unit8ClampedArr[i + 1],
                blue = unit8ClampedArr[i + 2];
            // const opacity = unit8ClampedArr[i+3];

            points.push([red, green, blue]);
        }

        return points;
    }

    // Convert dataset into array of pixel color data by passing the centroids' color to their surrounding points
    segmentImage(unit8ClampedArrLength, clusteredDataset) {
        const segmentedArr = new Array(unit8ClampedArrLength / 4);

        for (let i = 0; i < clusteredDataset.clusters.length; i++) {
            const pointIndexes = clusteredDataset.clusters[i].pointIndexes;
            const centroid = clusteredDataset.clusters[i].centroid;

            for (let j = 0; j < pointIndexes.length; j++) {
                segmentedArr[pointIndexes[j]] = [
                    ...centroid.map((num) => Math.round(num)),
                    255,
                ];
            }
        }

        // Flatten the array
        const newUnit8ClampedArr = new Uint8ClampedArray(unit8ClampedArrLength);
        let idx = 0;

        for (let i = 0; i < segmentedArr.length; i++) {
            for (let j = 0; j < segmentedArr[i].length; j++) {
                newUnit8ClampedArr[idx++] = segmentedArr[i][j];
            }
        }

        return newUnit8ClampedArr;
    }

    // Apply K-Means algorithm to the image
    async apply() {
        addLoadingStep(listStep1Selector);
        logCommand("[1]: Starting K-means clustering", "black", "bold");
        const colorsData = await this.getColorData(this.imgSelector);
        const groupedPoints = this.groupColorPoints(colorsData.data);
        const clusteredDataset = await this.kmeans(groupedPoints);
        const newUnit8ClampedArr = this.segmentImage(colorsData.data.length, clusteredDataset);
        const imgUrl = generateImage(newUnit8ClampedArr, colorsData.width, colorsData.height, step1Selector);
        addFinishedStep(listStep1Selector);
        logCommand("[1]: K-means clustering completed", "#22c55e", "bold");

        return {
            newUnit8ClampedArr,
            colorsData,
        }
    }
}

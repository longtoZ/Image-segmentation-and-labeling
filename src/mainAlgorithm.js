import { imgSelector } from "./CONSTANTS.js";
import { resizeDimensions, logCommand } from "./helper.js";

import KMeans from "./kmeans.js";
import MedianFilter from "./medianFilter.js";
import ParticleRemoval from "./particleRemoval.js";
import RegionLabeling from "./regionLabeling.js";
import EdgeDetection from "./edgeDetection.js";

export default async function main(MAX_PIXELS, MAX_ITERATIONS, K_COLORS, RANDOM_SEED, SLIDING_SIZE, SIZE_LIMIT, ISOLATE_REGIONS_ON, ALTERNATIVE_LABEL_ON, LABEL_COLOR) {
    try {
        const img = document.querySelector(imgSelector);
        const resizedDimensions = resizeDimensions(img, MAX_PIXELS);
    
        // Step 1: K-means clustering
        const kmeans = new KMeans(MAX_ITERATIONS, MAX_PIXELS, K_COLORS, RANDOM_SEED);
        const kmeansData = await kmeans.apply();
        const newUnit8ClampedArr = kmeansData.newUnit8ClampedArr;
        const colorsData = kmeansData.colorsData;
    
        // Step 2: Median filter
        const medianFilter = new MedianFilter(newUnit8ClampedArr, SLIDING_SIZE, resizedDimensions, colorsData);
        const twoDimArr = await medianFilter.apply();
    
        // Step 3: Particle removal
        const particleRemoval = new ParticleRemoval(twoDimArr, SIZE_LIMIT, colorsData);
        await particleRemoval.apply();
    
        // Step 4: Region labeling
        const regionLabeling = new RegionLabeling(twoDimArr, colorsData, ISOLATE_REGIONS_ON, LABEL_COLOR, ALTERNATIVE_LABEL_ON);
        const regionCoordinates = await regionLabeling.apply();
    
        // Step 5: Edge detection
        const edgeDetection = new EdgeDetection(twoDimArr, colorsData, regionCoordinates, ALTERNATIVE_LABEL_ON);
        await edgeDetection.apply();

    } catch (error) {
        console.error(error);
        logCommand(`[!]: ${error.message}`, "red");
    }
}
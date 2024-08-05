import { logScreenSelector, poiContainerSelector, showLabelSelector } from "./CONSTANTS.js";

export function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

export function logCommand(command, color = "#27272a", weight = "normal") {
    const commandPanel = document.querySelector(logScreenSelector);
    const commandElement = document.createElement("p");
    commandElement.innerHTML = command;
    commandElement.style.color = color;
    commandElement.style.fontWeight = weight;
    commandElement.style.fontSize = "12px";

    commandPanel.appendChild(commandElement);
    commandPanel.scrollTop = commandPanel.scrollHeight;
}

export function addLoadingStep(listStepSelector) {
    document.querySelectorAll(".steps-list > div").forEach((step) => {
        step.querySelector(".border").classList.remove("loading");
    })

    const listStep = document.querySelector(listStepSelector);
    const border = listStep.querySelector(".border");
    border.classList.add("loading");
}

export function removeLoadingStep() {
    document.querySelectorAll(".steps-list > div").forEach((step) => {
        step.querySelector(".border").classList.remove("loading");
    })
}

export function addFinishedStep(listStepSelector) {
    const listStep = document.querySelector(listStepSelector);
    const text = listStep.querySelector("p");
    text.classList.add("finished");

    document.querySelectorAll(".step-arrow").forEach((arrow) => {
        arrow.classList.remove("active");
    })

    document.querySelectorAll(".step-content").forEach((content) => {
        content.classList.remove("active");
    })

    const stepArrow = document.querySelector(`.step-arrow[data-step="${listStep.getAttribute("data-step")}"]`);
    const stepContent = document.querySelector(`.step-content[data-step="${listStep.getAttribute("data-step")}"]`);
    stepArrow.classList.add("active");
    stepContent.classList.add("active");
}

export function deepCloneArr(arr) {
    return JSON.parse(JSON.stringify(arr));
}

export function indexOfArr(arr, target) {
    for (let i = 0; i < arr.length; i++) {
        if (arr[i][0] == target[0] && arr[i][1] == target[1]) {
            return i;
        }
    }

    return -1;
}

export function isEqualArr(a1, a2) {
    for (let i = 0; i < a1.length; i++) {
        if (a1[i] != a2[i]) {
            return false;
        }
    }

    return true;
}

export function resizeDimensions(img, MAX_PIXELS) {
    const width = img.naturalWidth, height = img.naturalHeight;
    const pixels = width * height;

    if (pixels <= MAX_PIXELS) {
        return [width, height];
    }

    const aspectRatio = width / height;
    const resizedHeight = Math.round(Math.sqrt(MAX_PIXELS / aspectRatio));
    const resizedWidth = Math.round(aspectRatio * resizedHeight);

    return [resizedWidth, resizedHeight];
}

// Calculate Euclidean distance
export function getDistance(p1, p2) {
    let dist = 0;

    for (let i = 0; i < p1.length; i++) {
        dist += Math.pow(p1[i] - p2[i], 2);
    }

    return dist;
}

// Create <img> based on color's data array
export function generateImage(newUnit8ClampedArr, width, height, parentSelector, originalSize = false) {
    const parent = document.querySelector(parentSelector);
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;

    const ctx = canvas.getContext("2d");
    const imageData = new ImageData(newUnit8ClampedArr, width, height);
    ctx.putImageData(imageData, 0, 0);
    const url = canvas.toDataURL();

    const img = document.createElement("img");
    img.src = url;

    if (originalSize) {
        img.style.width = `${width}px`;
        img.style.height = `${height}px`;
        document.querySelectorAll(poiContainerSelector).forEach((p) => {
            p.style.overflow = "auto";
        });
    } else {
        img.style.width = "100%";
        img.style.objectFit = "contain";
    }

    img.style.display = "block";
    parent.appendChild(img);

    return url;
}

// Convert flattened array of pixel data to dimensional array
export function flattenToDimensional(flattenedArr, width, height) {
    const dimensionalArr = [];
    let idx = 0;

    for (let i = 0; i < height; i++) {
        const row = [];

        for (let j = 0; j < width; j++) {
            const color = [
                flattenedArr[idx],
                flattenedArr[idx + 1],
                flattenedArr[idx + 2],
                flattenedArr[idx + 3],
            ];

            row.push(color);
            idx += 4;
        }

        dimensionalArr.push(row);
    }

    return dimensionalArr;
}

// Convert dimensional array to flattened array
export function dimensionalToFlatten(dimensionalArr) {
    const flattenedArr = [];
    let idx = 0;

    for (let i = 0; i < dimensionalArr.length; i++) {
        for (let j = 0; j < dimensionalArr[i].length; j++) {
            for (let k = 0; k < dimensionalArr[i][j].length; k++) {
                flattenedArr[idx++] = dimensionalArr[i][j][k];
            }
        }
    }

    return flattenedArr;
}

// Place the POI inside the region
export function placePOI(parentSelector, labelWrapper, labelColor, alternativeLabel) {
    const parent = document.querySelector(parentSelector);
    const showLabel = document.querySelector(showLabelSelector);

    for (const data of labelWrapper.coordinates) {
        const coordinates = data.POI;
        const size = data.size;

        const POI = document.createElement("em");
        POI.textContent = labelWrapper.idx.toString();

        if (alternativeLabel) {
            const tmpSize = Math.round(size * 0.05);
            let fontSize = 0;

            if (tmpSize >= 12) {
                fontSize = 12;
            } else if (tmpSize >= 8) {
                fontSize = tmpSize;
            } else {
                fontSize = 8;
            }

            POI.style.fontSize = `${fontSize}px`;
        } else {
            POI.style.fontSize = "8px";
        }

        if (coordinates.inside) {
            POI.style.color = labelColor;
        } 
        // else {
        //     POI.style.color = "red";
        // }
        POI.style.position = "absolute";

        POI.style.left = `${Math.round(coordinates.x - 2)}px`;
        POI.style.top = `${Math.round(coordinates.y - 4)}px`;


        if (showLabel.checked) {
            POI.style.display = "block";
        } else {
            POI.style.display = "none";
        }

        parent.appendChild(POI);
    }
}
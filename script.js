import { imgSelector } from "./src/CONSTANTS.js";
import main from "./src/mainAlgorithm.js";

document.addEventListener('DOMContentLoaded', () => {
    document.querySelector("#show-label").addEventListener("change", () => {
        const checkbox = document.querySelector("#show-label");
        if (checkbox.checked) {
            document.querySelectorAll("em").forEach((em) => {
                em.style.display = "inline";
            })
        } else {
            document.querySelectorAll("em").forEach((em) => {
                em.style.display = "none";
            })
        }
    })
    
    const dropArea = document.querySelector('.drop-area');
    const fileElem = dropArea.querySelector('.file-elem');
    const gallery = dropArea.querySelector('.gallery');
    const imageContainer = gallery.querySelector('.image-container');
    const dropText = dropArea.querySelector('p');
    const uploadedImage = imageContainer.querySelector('.uploaded-image');
    const removeButton = document.querySelector('.remove-button');
    
    dropArea.addEventListener('click', () => {
        fileElem.click();
    });
    
    dropArea.addEventListener('dragover', (event) => {
        event.preventDefault();
        dropArea.classList.add('hover');
    });
    
    dropArea.addEventListener('dragleave', () => {
        dropArea.classList.remove('hover');
    });
    
    dropArea.addEventListener('drop', (event) => {
        event.preventDefault();
        dropArea.classList.remove('hover');
        handleFiles(event.dataTransfer.files);
    });
    
    fileElem.addEventListener('change', () => {
        handleFiles(fileElem.files);
    });
    
    removeButton.addEventListener('click', () => {
        uploadedImage.style.display = 'none';
        removeButton.style.display = 'none';
        dropText.style.display = 'block';
    });
    
    function handleFiles(files) {
        for (const file of files) {
            if (file.type.startsWith('image/')) {
                const reader = new FileReader();
                reader.onload = (e) => {
                    uploadedImage.src = e.target.result;
                    uploadedImage.style.display = 'block';
                    removeButton.style.display = 'block';
                    dropText.style.display = 'none';
                };
                reader.readAsDataURL(file);
            } else {
                alert('Please upload only image files.');
            }
        }
    }
    
    const stepArrows = document.querySelectorAll('.step-arrow');
    const stepContents = document.querySelectorAll('.step-content');
    const layer = document.querySelector('.layer');
    
    stepArrows.forEach((arrow) => {
        arrow.addEventListener("click", () => {
            stepArrows.forEach((arrow) => {
                arrow.classList.remove('active');
            });
            arrow.classList.add('active');
    
            stepContents.forEach((content) => {
                content.classList.remove('active');
            });
    
            const stepNumber = arrow.getAttribute('data-step');
            const content = document.querySelector(`.step-content[data-step="${stepNumber}"]`);
            content.classList.add('active');
    
            if (stepNumber === '4.5') {
                layer.style.display = 'flex';
            } else {
                layer.style.display = 'none';
            }
        })
    })
    
    const numberOfColors = document.querySelector('#number-of-colors');
    const maximumPixels = document.querySelector('#maximum-pixels');
    const maximumIterations = document.querySelector('#maximum-iterations');
    const randomSeed = document.querySelector('#random-seed');
    const slidingSize = document.querySelector('#sliding-size');
    const sizeLimit = document.querySelector('#maximum-particle-size');
    const labelColor = document.querySelector('#label-color');
    const isolateRegionsOn = document.querySelector('#isolate-regions-on');
    const alternativeLabelOn = document.querySelector('#alternative-label-on');
    
    const resetButton = document.querySelector('.reset-button');
    const processButton = document.querySelector('.process-button');
    
    // Reset all the input fields
    resetButton.addEventListener('click', () => {
        numberOfColors.value = '16';
        maximumPixels.value = '1000000';
        maximumIterations.value = '50';
        randomSeed.value = '';
        slidingSize.value = '3';
        sizeLimit.value = '25';
        labelColor.value = '0,0,0';
        document.querySelector('#isolate-regions-off').click();
        document.querySelector('#alternative-label-off').click();
    })
    
    // Delete all the content in the previous process
    function cleanProcess() {
        const stepsList = document.querySelectorAll('.steps-list p');
        const logScreen = document.querySelector('.log-screen');
        const layerContainer = document.querySelector('.layer-container');
        const proportionBar = document.querySelector('.proportion-bar');
        const colorListContainer = document.querySelector('.color-list-container');
    
        stepArrows.forEach((arrow) => {
            arrow.classList.remove('active');
        })
    
        stepContents.forEach((content) => {
            content.classList.remove('active');
    
            if (content.getAttribute('data-step') === '4' || content.getAttribute('data-step') === '5') {
                const poiContainer = content.querySelector('.poi-container');
                poiContainer.innerHTML = '';
                poiContainer.removeAttribute('style');
            } else {
                content.innerHTML = '';
            }
        })
    
        stepsList.forEach((step) => {
            step.classList.remove('finished');
        })
    
        logScreen.innerHTML = '';
        layerContainer.innerHTML = '';
        proportionBar.innerHTML = '';
        colorListContainer.innerHTML = '';
    }
    
    // Execute the main algorithm of image segmentation
    processButton.addEventListener('click', async () => {
        const img = document.querySelector(imgSelector);
    
        if (img.getAttribute("src") === "") {
            alert('Please upload an image.');
            return;
        }
    
        if (numberOfColors.value === "" || maximumPixels.value === "" || maximumIterations.value === "" || slidingSize.value === "" || sizeLimit.value === "" || labelColor.value === "") {
            alert('Please fill in all the fields.');
            return;
        }
    
        cleanProcess();
    
        await main(
            parseInt(maximumPixels.value),
            parseInt(maximumIterations.value),
            parseInt(numberOfColors.value),
            randomSeed.value,
            parseInt(slidingSize.value),
            parseInt(sizeLimit.value),
            isolateRegionsOn.checked,
            alternativeLabelOn.checked,
            `rgb(${labelColor.value})`
        );
    
        // Update layer items after processing
        if (isolateRegionsOn.checked) {
            const layerItems = document.querySelectorAll('.layer-item');
            const regions = document.querySelectorAll(".poi-container.region");
            layerItems[0].classList.add('active');
            regions[0].style.display = 'block';
        
            layerItems.forEach((item) => {
                item.addEventListener('click', () => {
                    layerItems.forEach((item) => {
                        item.classList.remove('active');
                    });
                    item.classList.add('active');
            
                    regions.forEach((region) => {
                        region.style.display = 'none';
                    })
                    
                    const layerNumber = item.getAttribute('data-layer');
                    const region = document.querySelector(`.poi-container.region[data-layer="${layerNumber}"]`);
                    region.style.display = 'block';
                });
            });
        }
    })
    
    document.querySelector('.option-field').addEventListener('click', () => {
        const isolateRegionsOn = document.querySelector('#isolate-regions-on').checked;
        const regionSeperation = document.querySelector('.step-arrow[data-step="4.5"]');
    
        if (isolateRegionsOn) {
            regionSeperation.style.display = 'block';
        } else {
            regionSeperation.style.display = 'none';
        }
    })
    
    const downloadButton = document.querySelector('.download-button');
    const dropdownContent = document.querySelector('.dropdown-content');
    const downloadColoredButton = document.querySelector('.download-colored');
    const downloadUnfilledButton = document.querySelector('.download-unfilled');
    
    downloadButton.addEventListener('click', (e) => {
        e.stopPropagation();
        dropdownContent.classList.toggle('show');
    })
    
    downloadColoredButton.addEventListener('click', (e) => {
        e.stopPropagation();
        const selector = '.step-content[data-step="4"] .poi-container';
        const element = document.querySelector(selector);
        const arrow = document.querySelector('.step-arrow[data-step="4"]');
    
        if (element.innerHTML === '') {
            alert('Please process the image first.');
            return;
        }
    
        arrow.click();
    
        elementToImage(selector, 'colored');
        closeDropdown();
    })
    
    downloadUnfilledButton.addEventListener('click', (e) => {
        e.stopPropagation();
        const selector = '.step-content[data-step="5"] .poi-container';
        const element = document.querySelector(selector);
        const arrow = document.querySelector('.step-arrow[data-step="5"]');
    
        if (element.innerHTML === '') {
            alert('Please process the image first.');
            return;
        }
    
        arrow.click();
    
        elementToImage(selector, 'unfilled');
        closeDropdown();
    })
    
    function closeDropdown() {
        dropdownContent.classList.remove('show');
    }
    
    function elementToImage(selector, type) {
        const element = document.querySelector(selector);
        const img = element.querySelector('img');
    
        element.style.overflow = 'visible';
        element.style.width = img.style.width;
        element.style.height = img.style.height;
    
        html2canvas(element).then((canvas) => {
            const image = canvas.toDataURL('image/png');
            const link = document.createElement('a');
            link.href = image;
            link.download = `${type}.png`;
            link.click();
        });
    
        element.removeAttribute('style');
        element.style.overflow = 'auto';
    }
})


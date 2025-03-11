// Get slider elements by their parent container
const sliderCalories = document.getElementById('slider-calories').parentElement;
const sliderMets = document.getElementById('slider-mets').parentElement;
const sliderHR = document.getElementById('slider-hr').parentElement;
const sliderGlucoseContainer = document.getElementById('slider-glucose-container');
const sliderGlucoseMinInput = document.getElementById('slider-glucose-min');
const sliderGlucoseMaxInput = document.getElementById('slider-glucose-max');
const sliderBMI = document.getElementById('slider-bmi').parentElement;
const sliderGroup = document.getElementById('slider-group').parentElement;

// Map the pages to the slider items you want visible
const sliderConfig = {
  'page-2': [sliderCalories],
  'page-3': [sliderGroup],
  'page-4': [sliderBMI],
  'page-5': [sliderGlucoseContainer],
  'page-6': [sliderHR]
};

// Function to hide all slider items
function hideAllSliders() {
  [sliderCalories, sliderMets, sliderHR, sliderGlucoseContainer, sliderBMI, sliderGroup].forEach(el => {
    el.style.display = 'none';
  });
}

// Function to update slider display based on the active page
function updateSliderForPage(pageId) {
  hideAllSliders();
  if (sliderConfig[pageId]) {
    sliderConfig[pageId].forEach(el => el.style.display = 'block');
  }
}

// Select all sections (pages)
const sections = document.querySelectorAll("section");

// Set up the Intersection Observer to track each section's visibility
const observerOptions = {
  root: null,    // use the viewport as the container
  threshold: 0.5 // trigger when at least 50% of the section is visible
};

const observer = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      const pageId = entry.target.id;
      // If the page is configured for sliders, show them; otherwise, hide them
      if (sliderConfig[pageId]) {
        updateSliderForPage(pageId);
      } else {
        hideAllSliders();
      }
    }
  });
}, observerOptions);

// Observe each section
sections.forEach(section => {
  observer.observe(section);
});

// Initialize by hiding all sliders
hideAllSliders();

// Define the glucose range limits.
const glucoseMinLimit = 40;
const glucoseMaxLimit = 410;

// Set initial values.
let currentGlucoseMin = 100;
let currentGlucoseMax = 200;

// Get slider elements.
const rangeSlider = document.querySelector('.range-slider');
const thumbMin = document.getElementById('thumb-min');
const thumbMax = document.getElementById('thumb-max');
const rangeTrack = document.querySelector('.range-track');

// Function to update thumb and track positions and label displays.
function updateGlucoseSlider() {
  const containerWidth = rangeSlider.clientWidth;
  const thumbWidth = thumbMin.offsetWidth; // assuming both thumbs have the same width
  // Compute offset percent based on half the thumb’s width.
  const offsetPercent = (thumbWidth / 2) / containerWidth * 100;
  
  // Compute raw percentages for both thumbs.
  let minPerc = (currentGlucoseMin - glucoseMinLimit) / (glucoseMaxLimit - glucoseMinLimit) * 100;
  let maxPerc = (currentGlucoseMax - glucoseMinLimit) / (glucoseMaxLimit - glucoseMinLimit) * 100;
  
  // Adjust for boundaries:
  if (minPerc <= 0) {
    minPerc = offsetPercent;
  }
  if (maxPerc >= 100) {
    maxPerc = 100 - offsetPercent;
  }
  
  // Apply positions.
  thumbMin.style.left = minPerc + '%';
  thumbMax.style.left = maxPerc + '%';
  rangeTrack.style.left = minPerc + '%';
  rangeTrack.style.width = (maxPerc - minPerc) + '%';
  
  // Update displayed values.
  document.getElementById('slider-glucose-min-value').textContent = currentGlucoseMin.toFixed(2);
  document.getElementById('slider-glucose-max-value').textContent = currentGlucoseMax.toFixed(2);
}

updateGlucoseSlider();

// Variables to track dragging.
let activeThumb = null;

// Helper to calculate new value based on mouse position.
function calculateValue(clientX) {
  const sliderRect = rangeSlider.getBoundingClientRect();
  let percent = (clientX - sliderRect.left) / sliderRect.width;
  percent = Math.max(0, Math.min(1, percent));
  return glucoseMinLimit + percent * (glucoseMaxLimit - glucoseMinLimit);
}

// Add mouse event listeners to thumbs.
thumbMin.addEventListener('mousedown', (e) => {
  activeThumb = 'min';
});
thumbMax.addEventListener('mousedown', (e) => {
  activeThumb = 'max';
});

document.addEventListener('mousemove', (e) => {
  if (!activeThumb) return;
  let newValue = calculateValue(e.clientX);
  newValue = parseFloat(newValue.toFixed(2));
  
  if (activeThumb === 'min') {
    if (newValue > currentGlucoseMax) newValue = currentGlucoseMax;
    currentGlucoseMin = newValue;
  } else if (activeThumb === 'max') {
    if (newValue < currentGlucoseMin) newValue = currentGlucoseMin;
    currentGlucoseMax = newValue;
  }
  updateGlucoseSlider();

  // Update the plot with the new slider values.
  if (typeof window.updateUserGlucoseRange === "function") {
    window.updateUserGlucoseRange();
  }
});

document.addEventListener('mouseup', () => {
  activeThumb = null;
  if (typeof window.updateUserGlucoseRange === "function") {
    window.updateUserGlucoseRange();
  }
});

// Optionally, add touch event listeners for mobile support.
thumbMin.addEventListener('touchstart', (e) => {
  activeThumb = 'min';
});
thumbMax.addEventListener('touchstart', (e) => {
  activeThumb = 'max';
});
document.addEventListener('touchmove', (e) => {
  if (!activeThumb) return;
  let newValue = calculateValue(e.touches[0].clientX);
  newValue = parseFloat(newValue.toFixed(2));
  
  if (activeThumb === 'min') {
    if (newValue > currentGlucoseMax) newValue = currentGlucoseMax;
    currentGlucoseMin = newValue;
  } else if (activeThumb === 'max') {
    if (newValue < currentGlucoseMin) newValue = currentGlucoseMin;
    currentGlucoseMax = newValue;
  }
  updateGlucoseSlider();
  if (typeof updateUserGlucoseRange === "function") {
    updateUserGlucoseRange();
  }
});
document.addEventListener('touchend', () => {
  activeThumb = null;
  if (typeof updateUserGlucoseRange === "function") {
    updateUserGlucoseRange();
  }
});

// Optionally, expose the current values for use in global.js:
window.userGlucoseMin = () => currentGlucoseMin;
window.userGlucoseMax = () => currentGlucoseMax;

// Function to update thumb position
function updateThumbPosition(thumb, value, min, max, container) {
  const containerWidth = container.clientWidth;
  const thumbWidth = thumb.offsetWidth; // should be 20px per CSS (or adjust accordingly)
  // Compute value as percentage (0 to 100)
  let percent = (value - min) / (max - min) * 100;
  // Compute offset percent based on half the thumb width
  const offsetPercent = (thumbWidth / 2) / containerWidth * 100;
  
  // Ensure that at 0% or 100% the thumb stays inside the container.
  if (percent >= 100) {
    percent = 100 - offsetPercent;
  } else if (percent <= 0) {
    percent = offsetPercent;
  }
  
  thumb.style.left = percent + "%";
}

const minGlucose = 40;  // example minimum
const maxGlucose = 410; // example maximum

// Update thumb when input changes
sliderGlucoseMaxInput.addEventListener('input', () => {
  const value = parseFloat(sliderGlucoseMaxInput.value);
  updateThumbPosition(thumbMax, value, minGlucose, maxGlucose, rangeSlider);
  // For an input change, update the current value and refresh the slider.
  currentGlucoseMax = value;
  updateGlucoseSlider();
});
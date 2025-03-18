let data = [];
let subjectData = {};
const subjectToDiabetesGroup = {};
  // Create a scale to map total Calories to a dot radius (adjust range as needed)
  const sizeScale = d3.scalePow()
  .exponent(2)
  .domain([10111, 34251])
  .range([20, 55]);

  const infoTextMapping = {
    calories: "Information about calories: This represents the total energy intake of the food.",
    fat: "Information about Total Fat: This is the total amount of fat in the food, important for energy.",
    carbs: "Information about Total Carbohydrate: This includes sugars, starches, and fibers that provide energy.",
    protein: "Information about Protein: Proteins are vital for muscle repair and growth.",
    fiber: "Information about Dietary Fiber: Fiber aids digestion and helps regulate blood sugar levels."
  };
  


// Define a color scale for the Diabetes values
const color = d3.scaleOrdinal()
  .domain(["Healthy", "Pre-Diabetes", "Type 2 Diabetes"])
  .range(["#2C7BB6", "#FDB863", "#D7191C"]);

async function loadData() {
  // Load the merged CSV data
  data = await d3.csv("merged.csv");

  // Group data by subject (each row should have a 'subject' field)
  data.forEach(d => {
    const subject = d.subject;
    subjectToDiabetesGroup[+d.subject] = d.Diabetes;
    if (!subjectData[subject]) {
      subjectData[subject] = [];
    }
    subjectData[subject].push(d);
  });

  // Load each subject’s CSV to compute total Calories, avg METs, avg HR, minGL and maxGL
  const subjectNumbers = Array.from({ length: 49 }, (_, i) => i + 1);
  const subjectsResults = await loadAllSubjects(subjectNumbers);
  window.subjectMetricsResults = subjectsResults;

  // Build a mapping from subject number to metrics (including minGL and maxGL)
  const subjectMetricsMap = {};
  subjectsResults.forEach(({ subject, totalCalories, avgMETs, avgHR, minGL, maxGL }) => {
    subjectMetricsMap[subject] = { totalCalories, avgMETs, avgHR, minGL, maxGL };
  });

  // Determine the min and max total Calories for scaling dot sizes
  const totalCaloriesValues = subjectsResults.map(d => d.totalCalories);
  const minCalories = d3.min(totalCaloriesValues);
  const maxCalories = d3.max(totalCaloriesValues);
  
  // Update each dot in the merged data and attach new metrics:
  data.forEach(d => {
    const subj = +d.subject; // ensure subject is numeric
    if (subjectMetricsMap[subj] !== undefined) {
      d.totalCalories = subjectMetricsMap[subj].totalCalories;
      // d.avgMETs = subjectMetricsMap[subj].avgMETs;
      d.avgHR = subjectMetricsMap[subj].avgHR;
      d.minGL = subjectMetricsMap[subj].minGL;
      d.maxGL = subjectMetricsMap[subj].maxGL;
      d.size = sizeScale(d.totalCalories);
    } else {
      d.totalCalories = 0;
      // d.avgMETs = undefined;
      d.avgHR = undefined;
      d.minGL = undefined;
      d.maxGL = undefined;
      d.size = 10; // fallback size
    }
  });

  plotData();
  // plotBMIDots();
}

const sliderValues = {
  totalCalories: 20000.00,
  // avgMETs: 0.00,
  avgHR: 40.00,
  avgGlucose: 0.00,
  // bmi: 0.00
};


// Add event listeners to update both the display and our global values


// document.getElementById('slider-mets').addEventListener('input', function() {
//   sliderValues.avgMETs = parseFloat(this.value);
//   this.parentElement.querySelector('.slider-value').textContent = sliderValues.avgMETs.toFixed(2);
// });

document.getElementById('slider-hr').addEventListener('input', function() {
  sliderValues.avgHR = parseFloat(this.value);
  this.parentElement.querySelector('.slider-value').textContent = sliderValues.avgHR.toFixed(2);
 
  const constrainedHR = Math.max(window.hrMinHR, Math.min(window.hrMaxHR, sliderValues.avgHR));

  // Update the positions of all slider dots.
  d3.selectAll(".hr-slider-dot")
    .attr("cx", window.hrXScale(constrainedHR))
    .attr("cy", function(d) {
      // 'd' here is one of the group names from the groups array.
      return window.hrYScale(d) + window.hrYScale.bandwidth()/2;
    });

    const predictionHrEl = document.getElementById('prediction-hr');
  if (predictionHrEl) {
    predictionHrEl.innerHTML = `Your Average Heart Rate: <strong>${sliderValues.avgHR.toFixed(2)}</strong> BPM`;
  }
});

// document.getElementById('slider-glucose').addEventListener('input', function() {
//   sliderValues.avgGlucose = parseFloat(this.value);
//   this.parentElement.querySelector('.slider-value').textContent = sliderValues.avgGlucose.toFixed(2);
// });

document.getElementById('slider-bmi').addEventListener('input', function() {
  sliderValues.bmi = parseFloat(this.value);
  this.parentElement.querySelector('.slider-value').textContent = sliderValues.bmi.toFixed(2);
});

// When the diabetes group selector changes:
document.getElementById('slider-group').addEventListener('change', function() {
  window.selectedDiabetesGroup = this.value;
  const dot = d3.select("#hr-slider-dot");
  if (dot.size() > 0 && window.hrYScale) {
    dot.attr("cy", window.hrYScale(window.selectedDiabetesGroup) + window.hrYScale.bandwidth()/2);
  }
});

document.addEventListener("DOMContentLoaded", async () => {
  await loadData();

  // Get all sections (each page)
  const sections = document.querySelectorAll('section');
  const indicatorContainer = document.getElementById('page-indicator');
  
  // Create one dot per section and add a click event with a hand cursor.
  sections.forEach((section) => {
    const dot = document.createElement('div');
    dot.classList.add('indicator-dot');
    dot.style.cursor = 'pointer'; // add hand cursor
    dot.addEventListener('click', () => {
      section.scrollIntoView({ behavior: 'smooth' });
    });
    indicatorContainer.appendChild(dot);
  });
  
  // Callback for IntersectionObserver: update active dot based on which section is in view
  const observerOptions = {
    threshold: 0.5 // adjust as needed
  };
  
  const observerCallback = (entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        const index = Array.from(sections).indexOf(entry.target);
        document.querySelectorAll('.indicator-dot').forEach((dot, idx) => {
          dot.classList.toggle('active', idx === index);
        });
      }
    });
  };
  
  const observer = new IntersectionObserver(observerCallback, observerOptions);
  sections.forEach(section => observer.observe(section));
  

  const labelPage = document.getElementById("label-page");
  if (labelPage) {
      const labelContainer = labelPage.querySelector(".label-container");
      const nutritionData = {
          servingSize: "1 cup (240ml)",
          servingsPerContainer: 2,
          calories: 150,
          totalFat: 5,
          dailyFat: 8,
          saturatedFat: 1,
          dailySaturatedFat: 5,
          transFat: 0,
          cholesterol: 30,
          dailyCholesterol: 10,
          sodium: 300,
          dailySodium: 13,
          totalCarbs: 20,
          dailyCarbs: 7,
          dietaryFiber: 3,
          dailyFiber: 12,
          sugars: 10,
          protein: 5
      };
      labelContainer.appendChild(createNutritionFactsLabel(nutritionData));
  }
  
  // After loadData, if on Page 5, plot the GL range.
  if (document.getElementById("page-5")) {
    plotGLRange();
  }

  if (document.getElementById("page-6")) {
    plotAvgHRBoxPlot();
  }

  if (document.getElementById("subjectcs2")) {
    plotSubject30();
  }
 
  if (document.getElementById("page-3")) {
    const macroAverages = computeMacroAverages(window.subjectMetricsResults);
    console.log("Grouped Macro Averages:", macroAverages);
  
    // Append Pie Chart to Page 3
    const page3 = document.getElementById("page-3");
    page3.innerHTML = `
    <h2 class="page-title">Macronutrient Consumption Varies Most in Diabetics</h2>
    <div id="macroPieChartContainer"></div>
    <p>People in the Type 2 Diabetes group consumed significantly less fiber than
    the other groups while having higher intakes of carbohydrates and protein. The lower fiber intake 
    and altered macronutrient distribution may stem from dietary limitations imposed to manage blood
    sugar levels in diabetic individuals.
    </p>
  `
    renderMacroPieChart(macroAverages);
    plotCS1Dot();
  }

  updatePredictedGroup();

// Helper function to lighten colors for tooltips
function lightenColor2(col, factor = 0.7) {
  let c = d3.rgb(col);
  c.r = Math.round(c.r + (255 - c.r) * factor);
  c.g = Math.round(c.g + (255 - c.g) * factor);
  c.b = Math.round(c.b + (255 - c.b) * factor);
  return c.toString();
}

/*prediction stuff*/
function predictFromCalorie() {
  const groups = ["Healthy", "Pre-Diabetes", "Type 2 Diabetes"];
  let bestGroup = groups[0];
  let bestDiff = Infinity;
  const userCal = sliderValues.totalCalories / 10;
  groups.forEach(group => {
    const groupData = data.filter(d => d.Diabetes === group);
    const avgCal = d3.mean(groupData, d => (+d.totalCalories) / 10) || 0;
    const diff = Math.abs(avgCal - userCal);
    if (diff < bestDiff) {
      bestDiff = diff;
      bestGroup = group;
    }
  });
  if (bestGroup === "Healthy") return 0;
  else if (bestGroup === "Pre-Diabetes") return 1;
  else return 2;
}

function predictFromHR() {
  const groups = ["Healthy", "Pre-Diabetes", "Type 2 Diabetes"];
  let bestGroup = groups[0];
  let bestDiff = Infinity;
  const userHR = sliderValues.avgHR;
  groups.forEach(group => {
    const groupData = data.filter(d => d.Diabetes === group);
    const avgHR = d3.mean(groupData, d => +d.avgHR) || 0;
    const diff = Math.abs(avgHR - userHR);
    if (diff < bestDiff) {
      bestDiff = diff;
      bestGroup = group;
    }
  });
  if (bestGroup === "Healthy") return 0;
  else if (bestGroup === "Pre-Diabetes") return 1;
  else return 2;
}

function predictFromGlucose() {
  const groups = ["Healthy", "Pre-Diabetes", "Type 2 Diabetes"];
  const sortedSubjects = data.slice().sort((a, b) => {
    if (a.Diabetes !== b.Diabetes) {
      return groups.indexOf(a.Diabetes) - groups.indexOf(b.Diabetes);
    }
    return +a.subject - +b.subject;
  });
  const groupAverageGL = groups.map(group => {
    const groupData = sortedSubjects.filter(d => d.Diabetes === group);
    const avgMin = d3.mean(groupData, d => +d.minGL) || 0;
    const avgMax = d3.mean(groupData, d => +d.maxGL) || 0;
    return { group, avgMin, avgMax };
  });
  const userMin = parseFloat(document.getElementById('slider-glucose-min-value').textContent) || 40;
  const userMax = parseFloat(document.getElementById('slider-glucose-max-value').textContent) || 410;
  
  let bestGroupObj = groupAverageGL[0];
  let bestDiff = Infinity;
  groupAverageGL.forEach(g => {
    const diff = Math.abs(g.avgMin - userMin) + Math.abs(g.avgMax - userMax);
    if (diff < bestDiff) {
      bestDiff = diff;
      bestGroupObj = g;
    }
  });
  if (bestGroupObj.group === "Healthy") return 0;
  else if (bestGroupObj.group === "Pre-Diabetes") return 1;
  else return 2;
}

function predictMajority() {
  const calPred = predictFromCalorie();
  const hrPred = predictFromHR();
  const glucosePred = predictFromGlucose();
  const votes = [calPred, hrPred, glucosePred];
  const counts = {0: 0, 1: 0, 2: 0};
  votes.forEach(vote => counts[vote]++);
  let majorityLabel = 1; // default to Pre-Diabetes
  let maxCount = 0;
  for (let key in counts) {
    if (counts[key] > maxCount) {
      maxCount = counts[key];
      majorityLabel = parseInt(key);
    }
  }
  return majorityLabel;
}

function updatePredictedGroup() {
  const majority = predictMajority();
  let groupName, groupColor, extraMessage;
  if (majority === 0) {
    groupName = "Healthy";
    groupColor = "#2C7BB6"; // blue
    extraMessage = "You likely have normal glucose levels and show little to no signs of insulin resistance or diabetes. Keep up the healthy habits!";
  } else if (majority === 1) {
    groupName = "Pre-Diabetes";
    groupColor = "#FDB863"; // gold/yellow
    extraMessage = "Your glucose levels are likely still higher than normal, but not high enough to be classified as diabetic. Healthy choices can help prevent diabetic development!";
  } else if (majority === 2) {
    groupName = "Type 2 Diabetes";
    groupColor = "#D7191C"; // red
    extraMessage = "Your glucose levels are likely very high. If this is the case, medical intervention and management is needed to prevent issues from arising. Making healthy choices can help minimize negative effects.";
  }

  // Update the list item: colored box appears first, then the group label.
  const predEl = document.getElementById('prediction-group');
  if (predEl) {
    predEl.innerHTML = `Your <strong>Predicted</strong> Metabolic Health Group: <span class="color-box" style="display:inline-block;width:15px;height:15px;background:${groupColor};margin-right:5px;"></span><strong>${groupName}</strong>`;
  }

  // Update the extra paragraph similarly, with the box first.
  const extraEl = document.getElementById('prediction-summary');
  if (extraEl) {
    extraEl.innerHTML = `Your predicted metabolic health group is <span class="color-box" style="display:inline-block;width:15px;height:15px;background:${groupColor};margin-right:5px;"></span><strong>${groupName}</strong>! ${extraMessage}`;
  }
}

// Attach/update your slider event listeners (calorie and HR) to call updatePredictedGroup() as needed.
document.getElementById('slider-calories').addEventListener('input', function() {
  sliderValues.totalCalories = parseFloat(this.value);
  const dailyCalories = sliderValues.totalCalories / 10;
  const valueDisplay = this.parentElement.querySelector('.slider-value');
  valueDisplay.textContent = dailyCalories.toFixed(2);
  d3.select("#calorie-slider-line")
    .attr("y1", window.page2YScale(sliderValues.totalCalories))
    .attr("y2", window.page2YScale(sliderValues.totalCalories))
    .raise();
  d3.select("#calorie-slider-label")
    .attr("x", window.page2ChartWidth + 30)
    .attr("y", window.page2YScale(sliderValues.totalCalories))
    .attr("dy", "0.35em")
    .style("text-anchor", "start")
    .text(`Your Avg Daily Calories: ${dailyCalories.toFixed(2)}`)
    .raise();
  
  // Update predicted group after calorie slider update.
  updatePredictedGroup();
});

document.getElementById('slider-hr').addEventListener('input', function() {
  sliderValues.avgHR = parseFloat(this.value);
  this.parentElement.querySelector('.slider-value').textContent = sliderValues.avgHR.toFixed(2);
  const constrainedHR = Math.max(window.hrMinHR, Math.min(window.hrMaxHR, sliderValues.avgHR));
  d3.selectAll(".hr-slider-dot")
    .attr("cx", window.hrXScale(constrainedHR))
    .attr("cy", function(d) {
      return window.hrYScale(d) + window.hrYScale.bandwidth() / 2;
    });
  
  // Update predicted group after HR slider update.
  updatePredictedGroup();
});

function drawPage2Axes() {
  d3.select("#axes-container").select("svg").remove();

  const margin = { top: 60, right: 200, bottom: 50, left: 100 };
  const width = 850 - margin.left - margin.right;
  window.page2ChartWidth = width; // Save for later use in positioning the label
  const height = 450 - margin.top - margin.bottom;
  const svg = d3.select("#axes-container")
.append("svg")
.attr("width", width + margin.left + margin.right)
.attr("height", height + margin.top + margin.bottom)
.attr("overflow", "visible")  // Allow content outside the drawing area to be visible
.append("g")
.attr("transform", `translate(${margin.left},${margin.top})`);


  const groups = ["Healthy", "Pre-Diabetes", "Type 2 Diabetes"];

  const xScale = d3.scaleBand()
    .domain(groups)
    .range([0, width])
    .padding(0.2);
    
  window.page2YScale = d3.scaleLinear()
    .domain([0, 36000]) 
    .range([height, 0]);

  svg.append("g")
    .attr("transform", `translate(0, ${height})`)
    .call(d3.axisBottom(xScale))
    .selectAll("text")
    .style("font-weight", "bold");
  
    svg.append("text")
    .attr("text-anchor", "middle")
    .attr("x", width / 2)
    .attr("y", height + 40)  // Adjust to position below the axis
    .style("font-size", "16px")
    .style("font-weight", "bold")
    .text("Metabolic Health Group");

    svg.append("g")
    .call(d3.axisLeft(window.page2YScale).tickFormat(d => d / 10))
    .selectAll("text")
    .style("font-weight", "bold");

  // Append Y-axis label
svg.append("text")
.attr("text-anchor", "middle")
.attr("transform", `translate(-50, ${height / 2}) rotate(-90)`)
.style("font-size", "16px")
.style("font-weight", "bold")
.text("Average Daily Calorie Intake");


  const color = d3.scaleOrdinal()
    .domain(groups)
    .range(["#2C7BB6", "#FDB863", "#D7191C"]);

    const greenLine = svg.append("line")
    .attr("id", "calorie-slider-line")
    .attr("x1", 0)
    .attr("x2", width)
    .attr("y1", window.page2YScale(sliderValues.totalCalories))
    .attr("y2", window.page2YScale(sliderValues.totalCalories))
    .attr("stroke", "green")
    .attr("stroke-width", 3)
    .attr("pointer-events", "none");

    const calorieLabel = svg.append("text")
    .attr("id", "calorie-slider-label")
    .attr("x", width + 30) // 🔥 Extra space so it NEVER cuts off
    .attr("y", window.page2YScale(sliderValues.totalCalories) + 5)
    .attr("fill", "black")
    .attr("font-size", "14px")
    .attr("font-weight", "bold")
    .style("white-space", "nowrap") // ✅ Ensures text doesn't get cut off
    .text(`Your Avg Daily Calories: ${sliderValues.totalCalories/10}`);



function drawGroupedBars() {
  const avgData = groups.map(g => {
      const groupData = data.filter(d => d.Diabetes === g);
      const avg = d3.mean(groupData, d => +d.totalCalories) || 0;
      return { group: g, avgTotalCalories: avg };
  });

  svg.selectAll(".bar").remove();

  svg.selectAll(".bar")
      .data(avgData)
      .enter()
      .append("rect")
      .attr("class", "bar")
      .attr("x", d => xScale(d.group))
      .attr("width", xScale.bandwidth())
      .attr("y", d => window.page2YScale(d.avgTotalCalories))
      .attr("height", d => height - window.page2YScale(d.avgTotalCalories))
      .attr("fill", d => color(d.group))
      .style("opacity", 0)
      .on("mouseover", function(event, d) {
          let tooltip = d3.select("#page2-tooltip");
          if (tooltip.empty()) {
              tooltip = d3.select("body")
                  .append("div")
                  .attr("id", "page2-tooltip")
                  .style("position", "absolute")
                  .style("background", "rgba(255, 255, 255, 0.9)")
                  .style("padding", "8px")
                  .style("border-radius", "4px")
                  .style("box-shadow", "0px 0px 6px rgba(0, 0, 0, 0.2)")
                  .style("pointer-events", "none")
                  .style("display", "none");
          }
          const barColor = color(d.group);
          const lightColor = lightenColor2(barColor, 0.5);
          tooltip
              .style("background", lightColor)
              .style("display", "block")
              .html(`<strong>${d.group}</strong><br/>Avg Daily Calories: ${(d.avgTotalCalories/10).toFixed(2)}`)
              .style("left", (event.pageX + 10) + "px")
              .style("top", (event.pageY - 28) + "px");
      })
      .on("mousemove", function(event) {
          d3.select("#page2-tooltip")
              .style("left", (event.pageX + 10) + "px")
              .style("top", (event.pageY - 28) + "px");
      })
      .on("mouseout", function() {
          d3.select("#page2-tooltip").style("display", "none");
      })
      .transition()
      .duration(800)
      .style("opacity", 1);

      // Ensure the calorie slider line and label are always on top
d3.select("#calorie-slider-line").raise();
d3.select("#calorie-slider-label").raise();

}



function drawSwarmPlot() {
  // Filter the nodes to use in the swarm simulation
  const individuals = data.filter(d => groups.includes(d.Diabetes));

  // Create a deep copy of the nodes for the simulation
  // This prevents the simulation from modifying the original d.x and d.y.
  const swarmNodes = individuals.map(d => Object.assign({}, d));

  // Run the force simulation on the cloned nodes
  const swarmsim = d3.forceSimulation(swarmNodes)
      .force("x", d3.forceX(d => xScale(d.Diabetes) + xScale.bandwidth() / 2).strength(1))
      .force("y", d3.forceY(d => window.page2YScale(+d.totalCalories)).strength(0.3))
      .force("collide", d3.forceCollide(8)) // Prevent overlap
      .stop();

  // Run the simulation for a fixed number of ticks
  for (let i = 0; i < 150; i++) swarmsim.tick();

  // Now copy the computed positions into new properties x2 and y2 on the original nodes
  swarmNodes.forEach((node, i) => {
    individuals[i].x2 = node.x;
    individuals[i].y2 = node.y;
  });

  // Remove any existing swarm dots
  svg.selectAll(".swarm-dot").remove();

  // Draw the swarm dots using the new x2 and y2 properties
  svg.selectAll(".swarm-dot")
      .data(individuals)
      .enter()
      .append("circle")
      .attr("class", "swarm-dot")
      .attr("r", 6)
      .attr("fill", d => color(d.Diabetes))
      .attr("cx", d => d.x2)  // Use the computed x2 value
      .attr("cy", d => d.y2)  // Use the computed y2 value
      .style("opacity", 0)
      .on("mouseover", function(event, d) {
          let tooltip = d3.select("#page2-tooltip");
          if (tooltip.empty()) {
              tooltip = d3.select("body")
                  .append("div")
                  .attr("id", "page2-tooltip")
                  .style("position", "absolute")
                  .style("background", "rgba(255, 255, 255, 0.9)")
                  .style("padding", "8px")
                  .style("border-radius", "4px")
                  .style("box-shadow", "0px 0px 6px rgba(0, 0, 0, 0.2)")
                  .style("pointer-events", "none")
                  .style("display", "none");
          }
          const dotColor = color(d.Diabetes);
          const lightColor = lightenColor2(dotColor, 0.5);
          tooltip
              .style("background", lightColor)
              .style("display", "block")
              .html(`<strong>Subject ${d.subject}</strong><br/>Avg Daily Calories: ${(d.totalCalories/10)}`)
              .style("left", (event.pageX + 10) + "px")
              .style("top", (event.pageY - 28) + "px");
      })
      .on("mousemove", function(event) {
          d3.select("#page2-tooltip")
              .style("left", (event.pageX + 10) + "px")
              .style("top", (event.pageY - 28) + "px");
      })
      .on("mouseout", function() {
          d3.select("#page2-tooltip").style("display", "none");
      })
      .transition()
      .duration(800)
      .style("opacity", 1);

  // Ensure the calorie slider line and label are always on top
  d3.select("#calorie-slider-line").raise();
  d3.select("#calorie-slider-label").raise();
}



const currentView = document.querySelector('input[name="view"]:checked').value;
if (currentView === "grouped") {
drawGroupedBars();
} else if (currentView === "swarm") {
drawSwarmPlot();
d3.select("#calorie-slider-line").raise();
d3.select("#calorie-slider-label").raise();
}
d3.selectAll('input[name="view"]').on("change", function () {
  if (this.value === "grouped") {
      svg.selectAll(".swarm-dot").remove();  // Clear swarm dots
      drawGroupedBars();  // Re-draw grouped bars
  } else if (this.value === "swarm") {
      svg.selectAll(".bar").remove();  // Clear bars
      drawSwarmPlot();  // Re-draw swarm plot
      // Raise the slider elements so they remain on top:
      d3.select("#calorie-slider-line").raise();
      d3.select("#calorie-slider-label").raise();
  }
});

}

if (document.getElementById("page-2")) {
drawPage2Axes();
}

document.getElementById('slider-calories').addEventListener('input', function() {
  // Store the raw slider value (0 to 36000)
  sliderValues.totalCalories = parseFloat(this.value);

  const dailyCalories = sliderValues.totalCalories / 10;
  
  // Update the display number next to the slider (divide by 10)
  const valueDisplay = this.parentElement.querySelector('.slider-value');
  valueDisplay.textContent = (sliderValues.totalCalories / 10).toFixed(2);
  
  // Update the green line's vertical position based on the raw value
  d3.select("#calorie-slider-line")
    .attr("y1", window.page2YScale(sliderValues.totalCalories))
    .attr("y2", window.page2YScale(sliderValues.totalCalories))
    .raise();
  
  // Update the label next to the green line, showing the value divided by 10
  d3.select("#calorie-slider-label")
    .attr("x", window.page2ChartWidth + 30)
    .attr("y", window.page2YScale(sliderValues.totalCalories))
    .attr("dy", "0.35em")
    .style("text-anchor", "start")
    .text(`Your Avg Daily Calories: ${(sliderValues.totalCalories / 10).toFixed(2)}`)
    .raise();

    const predictionEl = document.getElementById('prediction-calories');
if (predictionEl) {
  predictionEl.innerHTML = `Your Average Daily Calorie Intake: <strong>${dailyCalories.toFixed(2)}</strong> Calories`;
}

});

// if (document.getElementById("subjectcs2-svg-container") &&
//     !document.getElementById("subject-details-container-click")) {
//   plotSubject30Page();
// }

});


document.querySelectorAll('#slider-container input[type="range"]').forEach(slider => {
slider.addEventListener('input', function() {
  const valueDisplay = this.parentElement.querySelector('.slider-value');
  valueDisplay.textContent = parseFloat(this.value).toFixed(2);
});
});

function plotStarterNutritionLabel() {
  // Select the container where the starter dot used to be.
  // This container is #starter-svg-container (as defined in index_pics.html).
  const container = d3.select("#starter-svg-container");
  
  // Clear any existing content (remove the dot/SVG).
  container.html("");

  // Define sample nutrition data (adjust with real values if needed).
  const nutritionData = {
    subject: 26,
    calories: 200,    // Example value for calories
    fat: 5,
    dailyFat: 8,
    carbs: 20,
    dailyCarbs: 7,
    protein: 5,
    dailyProtein: 10,
    fiber: 3,
    dailyFiber: 12
  };

  // Create the nutrition label element using the helper function.
  const nutritionLabelEl = createNutritionFactsLabel(nutritionData);
  
  // Append the nutrition label to the container.
  container.node().appendChild(nutritionLabelEl);

  // Attach click event listeners to all clickable labels in this nutrition label.
  d3.selectAll(".clickable-label")
    .on("click", function() {
      // Get the key for the clicked label from its data-key attribute.
      const key = d3.select(this).attr("data-key");
      // Look up the new text from our mapping.
      const newText = infoTextMapping[key] || "";
      // Update the content of the info text container.
      d3.select("#info-text").text(newText);
    });
}



// function plotStarterDot() {
//   // Select the starter page section within snap-container.
//   const svgContainer = d3.select("#starter-svg-container");

//   // Set dimensions for the SVG element.
//   const width = 500;
//   const height = 500;

//   // Create and append an SVG element to the starter page.
//   const svg = svgContainer.append("svg")
//                 .attr("id", "starter-svg")
//                 .attr("width", width)
//                 .attr("height", height);

//   // Hard-code subject 26's data (example values)
//   const subject26 = {
//     subject: 26,
//     Diabetes: "Pre-Diabetes",
//     totalCalories: 18649,   // Example calorie value.
//     // avgMETs:"N/A",          // Example METs.
//     avgHR: 81.99,             // Example heart rate.
//     minGL: 90,             // Example minimum glucose.
//     maxGL: 233,            // Example maximum glucose.
//     // Position the dot in the center of the SVG.
//     x: width / 2,
//     y: height / 2,
//     // Compute circle size based on calories (scaling factor can be adjusted)
//     size: sizeScale(18649)       // For example, 1500 calories yields a radius of 10.
//   };

//   // Hard-code the prediabetic color.
//   const prediabeticColor = "#FDB863";

//   // Ensure the tooltip exists.
//   if (d3.select("#tooltip").empty()) {
//     d3.select("body")
//       .append("div")
//       .attr("id", "tooltip")
//       .style("position", "absolute")
//       .style("opacity", 0)
//       .style("pointer-events", "none");
//   }

//   // Append a circle for subject 26 with the same interactive behavior.
//   svg.append("circle")
//     .datum(subject26)
//     .attr("cx", subject26.x)
//     .attr("cy", subject26.y)
//     .attr("r", subject26.size)
//     .attr("fill", prediabeticColor)
//     .on("mouseover", function(event, d) {
//       d3.select("#tooltip")
//         .style("display", "block")
//         .transition()
//           .duration(200)
//           .style("opacity", 0.9);
//       d3.select("#tooltip")
//         .html(`
//           <div style="text-align: center; font-weight: bold;">Subject: ${d.subject}</div>
//           <div style="text-align: left;">Diabetes: ${d.Diabetes}</div>
//           <div style="text-align: left;">Total Calories: ${d.totalCalories}</div>
//           <div style="text-align: left;">Average METs: ${d.avgMETs}</div>
//           <div style="text-align: left;">Average HR: ${d.avgHR}</div>
//           <div style="text-align: left;">Glucose range: ${d.minGL}-${d.maxGL}</div>
//         `)
//         .style("left", (event.pageX + 5) + "px")
//         .style("top", (event.pageY - 28) + "px");
//     })
//     .on("mouseout", function() {
//       d3.select("#tooltip")
//         .transition()
//         .duration(500)
//         .style("opacity", 0)
//         .on("end", function() {
//           d3.select(this).style("display", "none");
//         });
//     })
//     .on("click", handleDotClick); // Assumes handleDotClick is defined globally.
// }

// Call the function to render the starter dot.
//plotStarterNutritionLabel();

function plotCS1Dot() {
  // (Assuming subjectMetricsResults is already loaded)
  const subject4 = window.subjectMetricsResults.find(d => +d.subject === 4);
  if (!subject4) {
    console.error("Subject 4 data not found.");
    return;
  }

  // Local variables for CSV data, daily averages, and recommended values.
  let subject4CSV, dailyData, recommendedValues;

  // Create a flex container inside #subjectcs1-svg-container.
  const svgContainer = d3.select("#subjectcs1-svg-container").style("width", "100%");
  const flexContainer = svgContainer.append("div")
    .attr("id", "cs1-flex-container")
    .style("display", "flex")
    .style("flex-direction", "row")
    .style("justify-content", "space-between")
    .style("align-items", "flex-start")
    .style("width", "100%");

  // Left container: for the slider and nutrition label.
  const leftContainer = flexContainer.append("div")
    .attr("id", "cs1-left-container")
    .style("flex", "3")
    .style("padding", "10px");

  // Right container: for the subject dot.
  const rightContainer = flexContainer.append("div")
    .attr("id", "cs1-right-container")
    .style("flex", "1")
    .style("padding", "10px");

  // -------------------------------------------------------------
  // RIGHT CONTAINER: Render the subject dot.
  const dotWidth = 500, dotHeight = 500;
  const dotSvg = rightContainer.append("svg")
    .attr("id", "subjectcs1-svg")
    .attr("width", dotWidth)
    .attr("height", dotHeight);

  // Position the dot in the center of the SVG.
  subject4.x = dotWidth / 2;
  subject4.y = dotHeight / 2;
  subject4.size = sizeScale(+subject4.totalCalories);
  const subjectColor = color(subject4.Diabetes);

  // Ensure the tooltip exists.
  if (d3.select("#tooltip").empty()) {
    d3.select("body")
      .append("div")
      .attr("id", "tooltip")
      .style("position", "absolute")
      .style("opacity", 0)
      .style("pointer-events", "none");
  }

  // Append the subject dot.
  dotSvg.append("circle")
    .datum(subject4)
    .attr("cx", subject4.x)
    .attr("cy", subject4.y)
    .attr("r", subject4.size)
    .attr("fill", subjectColor)
    .on("mouseover", function(event, d) {
      const tooltip = d3.select("#tooltip")
        .style("display", "block")
        .html(`
          <div style="text-align: center; font-weight: bold;">Subject: ${d.subject}</div>
          <div style="text-align: left;">Diabetes: ${d.Diabetes}</div>
          <div style="text-align: left;">Total Calories: ${d.totalCalories}</div>
        `)
        .style("left", (event.pageX + 5) + "px")
        .style("top", (event.pageY - 28) + "px");
    
      tooltip.transition()
        .duration(200)
        .style("opacity", 0.9);
    })

    .on("mouseout", function () {
      d3.select("#tooltip")
        .transition().duration(500)
        .style("opacity", 0)
        .on("end", function () {
          d3.select(this).style("display", "none");
        });
    })
    .on("click", handleDotClick);

  // -------------------------------------------------------------
  // Load subject X CSV & process data for the nutrition label.
  d3.csv("data/CGMacros-032/CGMacros-032.csv").then(function (csvData) {
    const parseTime = d3.timeParse("%Y-%m-%d %H:%M:%S");
    const formatDay = d3.timeFormat("%Y-%m-%d");

    // Filter out rows with missing "Meal Type".
    subject4CSV = csvData.filter(d => d["Meal Type"] && d["Meal Type"].trim() !== "");

    // Convert date and numeric values.
    subject4CSV.forEach(function (d) {
      d.timestamp = parseTime(d.Timestamp);
      d.day = formatDay(d.timestamp);
      d.Calories = +d.Calories;
      d.Carbs = +d.Carbs;
      d.Protein = +d.Protein;
      d.Fat = +d.Fat;
      d.Fiber = +d.Fiber;
      d["Libre GL"] = +d["Libre GL"];
    });

    // Compute dailyData: group by day (we assume there are 10 days).
    dailyData = Array.from(d3.group(subject4CSV, d => d.day), ([day, values]) => ({
      day, // e.g., "2025-03-01"
      totalCalories: d3.sum(values, d => d.Calories),
      totalCarbs: d3.sum(values, d => d.Carbs),
      totalProtein: d3.sum(values, d => d.Protein),
      totalFat: d3.sum(values, d => d.Fat),
      totalFiber: d3.sum(values, d => d.Fiber)
    }));
    dailyData.sort((a, b) => new Date(a.day) - new Date(b.day));

    // Define recommended nutritional values.
    recommendedValues = {
      avgCarbs: 300,
      avgProtein: 50,
      avgFat: 70,
      avgFiber: 30
    };

    // Initialize the nutrition facts label (with slider) in the left container.
    initializeDailyNutritionLabel(leftContainer, dailyData, recommendedValues);
  }).catch(function (error) {
    console.error("Error loading subject X CSV:", error);
  });
}

function initializeDailyNutritionLabel(leftContainer, dailyData, recommendedValues) {
  // Create slider
  const daySlider = document.createElement('input');
  daySlider.setAttribute('type', 'range');
  daySlider.id = 'day-slider';
  daySlider.min = 1;
  daySlider.max = dailyData.length;
  daySlider.value = 1;
  daySlider.style.width = '100%';
  daySlider.style.marginBottom = '10px';
  
  leftContainer.node().insertBefore(daySlider, leftContainer.node().firstChild);
  
  // Create nutrition label container with forced debug styling
  const labelDiv = document.createElement('div');
  labelDiv.id = 'nutrition-label-container';
  labelDiv.style.border = '2px dashed red';      // Debug border
  labelDiv.style.backgroundColor = 'rgba(255,255,0,0.2)';  // Semi-transparent yellow
  labelDiv.style.minHeight = '150px';              // Ensure it has a minimum height
  labelDiv.style.display = 'block';                // Force display block
  leftContainer.node().appendChild(labelDiv);
  
  // Define function to update the label.
  function updateNutritionLabel(dayIndex) {
    console.log("updateNutritionLabel running for day:", dayIndex);
    const dayData = dailyData[dayIndex - 1];
    console.log("Day data:", dayData);
    const nfData = {
      day: dayIndex,
      calories: +dayData.totalCalories.toFixed(1),
      fat: +dayData.totalFat.toFixed(1),
      dailyFat: ((+dayData.totalFat / recommendedValues.avgFat) * 100).toFixed(1),
      carbs: +dayData.totalCarbs.toFixed(1),
      dailyCarbs: ((+dayData.totalCarbs / recommendedValues.avgCarbs) * 100).toFixed(1),
      protein: +dayData.totalProtein.toFixed(1),
      dailyProtein: ((+dayData.totalProtein / recommendedValues.avgProtein) * 100).toFixed(1),
      fiber: +dayData.totalFiber.toFixed(1),
      dailyFiber: ((+dayData.totalFiber / recommendedValues.avgFiber) * 100).toFixed(1)
    };
    console.log("Computed nfData:", nfData);
    
    // Clear any previous content and append the new label.
    labelDiv.innerHTML = '';
    const labelElement = createNutritionFactsLabel(nfData);
    console.log("Returned labelElement:", labelElement);
    if (!labelElement) {
      console.error("DEBUG: createNutritionFactsLabel returned null or undefined.");
    }
    labelDiv.appendChild(labelElement);
  }
  
  // Listen for slider changes.
  daySlider.addEventListener('input', function() {
    const val = parseInt(this.value);
    console.log("Slider value changed to:", val);
    updateNutritionLabel(val);
  });
  
  // Initial update for day 1.
  updateNutritionLabel(1);
}

// function plotSubject30Page() {
//   // Make sure subject metrics have been loaded
//   if (!window.subjectMetricsResults) {
//     console.error("Subject metrics not loaded yet.");
//     return;
//   }

//   // Find subject with id 30
//   const subject30 = window.subjectMetricsResults.find(d => +d.subject === 30);
//   if (!subject30) {
//     console.error("Subject 30 data not found.");
//     return;
//   }

//   // Select a container in your new page (make sure this div exists in your HTML)
//   const svgContainer = d3.select("#subjectcs2-svg-container");
//   if (svgContainer.empty()) {
//     console.error("Container #subjectcs2-svg-container not found.");
//     return;
//   }

//   // Set dimensions for the SVG element (adjust these as needed)
//   const width = 500;
//   const height = 500;

//   // Create and append an SVG element to the container
//   const svg = svgContainer.append("svg")
//                 .attr("id", "subject30-svg")
//                 .attr("width", width)
//                 .attr("height", height);

//   // Position the dot in the center (you can adjust if needed)
//   subject30.x = width / 2 - 100;
//   subject30.y = height / 2 - 50;

//   // Compute the dot size based on totalCalories using your defined sizeScale
//   subject30.size = sizeScale(+subject30.totalCalories) * 2.5;

//   // Use the global color scale to set the dot's color based on its Diabetes group
//   const subjectColor = color(subject30.Diabetes);

//   // Append the circle for subject 30
//   svg.append("circle")
//     .datum(subject30)
//     .attr("cx", subject30.x)
//     .attr("cy", subject30.y)
//     .attr("r", subject30.size)
//     .attr("fill", subjectColor)
//     .on("mouseover", function(event, d) {
//       // Optionally, add tooltip behavior similar to your other dot functions
//       d3.select("#tooltip")
//         .style("display", "block")
//         .transition()
//           .duration(200)
//           .style("opacity", 0.9);
//       d3.select("#tooltip")
//         .html(`
//           <div style="text-align: center; font-weight: bold;">Subject: ${d.subject}</div>
//           <div style="text-align: left;">Diabetes: ${d.Diabetes}</div>
//           <div style="text-align: left;">Total Calories: ${d.totalCalories}</div>
//           <div style="text-align: left;">Average HR: ${d.avgHR}</div>
//           <div style="text-align: left;">Glucose range: ${d.minGL} - ${d.maxGL}</div>
//         `)
//         .style("left", (event.pageX + 5) + "px")
//         .style("top", (event.pageY - 28) + "px");
//     })
//     .on("mouseout", function() {
//       d3.select("#tooltip")
//         .transition()
//         .duration(500)
//         .style("opacity", 0)
//         .on("end", function() {
//           d3.select(this).style("display", "none");
//         });
//     })
//     .on("click", handleDotClick); // Uses your existing click handler
// }

function plotSubject30() {
  console.log("plotSubject30 function called");

  // Ensure subject metrics have been loaded.
  if (!window.subjectMetricsResults) {
    console.error("Subject metrics not loaded yet.");
    return;
  }

  // Retrieve subject 30's metrics.
  const subject30 = window.subjectMetricsResults.find(d => +d.subject === 30);
  if (!subject30) {
    console.error("Subject 30 data not found.");
    return;
  }

  console.log("Subject 30 data:", subject30);

  // Delegate header, slider, and nutrition label creation to plotSubjectLabel.
  plotSubjectLabel(30, subject30.Diabetes, "#subjectcs2-svg-container");

  // Optionally update the timeline.
  loadAndRenderTimeline(30);

  // Render subject 30's dot.
  const svgContainer = d3.select("#subjectcs2-svg-container");
  if (svgContainer.empty()) {
    console.error("Container #subjectcs2-svg-container not found.");
    return;
  }

  const width = 500;
  const height = 500;

  // Append an SVG element to the container.
  const svg = svgContainer.append("svg")
    .attr("id", "subject30-svg")
    .attr("width", width)
    .attr("height", height);

  // Position the dot in the center; adjust coordinates as needed.
  subject30.x = width / 2;
  subject30.y = height / 2;
  // Use your global sizeScale; multiply if desired for emphasis.
  subject30.size = window.sizeScale(+subject30.totalCalories) * 2.5;
  const subjectColor = window.color(subject30.Diabetes);

  svg.append("circle")
    .datum(subject30)
    .attr("cx", subject30.x)
    .attr("cy", subject30.y)
    .attr("r", subject30.size)
    .attr("fill", subjectColor)
    .on("mouseover", function(event, d) {
      d3.select("#tooltip")
        .style("display", "block")
        .html(`
          <div style="text-align: center; font-weight: bold;">Subject: ${d.subject}</div>
          <div style="text-align: left;">Diabetes: ${d.Diabetes}</div>
          <div style="text-align: left;">Total Calories: ${d.totalCalories}</div>
          <div style="text-align: left;">Average HR: ${d.avgHR}</div>
          <div style="text-align: left;">Glucose range: ${d.minGL} - ${d.maxGL}</div>
        `)
        .style("left", (event.pageX + 5) + "px")
        .style("top", (event.pageY - 28) + "px");
    })
    .on("mouseout", function() {
      d3.select("#tooltip")
        .transition()
        .duration(500)
        .style("opacity", 0)
        .on("end", function() {
          d3.select(this).style("display", "none");
        });
    })
    .on("click", handleDotClick);
}

// function plotSubject30Page() {
//   // Ensure subject metrics have been loaded.
//   if (!window.subjectMetricsResults) {
//     console.error("Subject metrics not loaded yet.");
//     return;
//   }
//   function plotSubject30Page() {
//     if (!window.subjectMetricsResults) {
//       console.error("Subject metrics not loaded yet.");
//       return;
//     }
//     const subject30 = window.subjectMetricsResults.find(d => +d.subject === 30);
//     if (!subject30) {
//       console.error("Subject 30 data not found.");
//       return;
//     }
  
//     // Use appropriate container for subject 30 by passing its selector.
//     plotSubjectLabel(30, subject30.Diabetes, "#subjectcs2-svg-container");
    
//     // Optionally update the timeline.
//     loadAndRenderTimeline(30);
  
//     // Render subject 30's dot.
//     const svgContainer = d3.select("#subjectcs2-svg-container");
//     if (svgContainer.empty()) {
//       console.error("Container #subjectcs2-svg-container not found.");
//       return;
//     }
//     const width = 500, height = 500;
//     const svg = svgContainer.append("svg")
//       .attr("id", "subject30-svg")
//       .attr("width", width)
//       .attr("height", height);
  
//     subject30.x = width / 2;
//     subject30.y = height / 2;
//     subject30.size = window.sizeScale(+subject30.totalCalories) * 2.5;
//     const subjectColor = window.color(subject30.Diabetes);
  
//     svg.append("circle")
//       .datum(subject30)
//       .attr("cx", subject30.x)
//       .attr("cy", subject30.y)
//       .attr("r", subject30.size)
//       .attr("fill", subjectColor)
//       .on("mouseover", function(event, d) {
//         d3.select("#tooltip")
//           .style("display", "block")
//           .html(`
//             <div style="text-align: center; font-weight: bold;">Subject: ${d.subject}</div>
//             <div>Diabetes: ${d.Diabetes}</div>
//             <div>Total Calories: ${d.totalCalories}</div>
//             <div>Average HR: ${d.avgHR}</div>
//             <div>Glucose range: ${d.minGL} - ${d.maxGL}</div>
//           `)
//           .style("left", (event.pageX + 5) + "px")
//           .style("top", (event.pageY - 28) + "px");
//       })
//       .on("mouseout", function() {
//         d3.select("#tooltip")
//           .transition()
//           .duration(500)
//           .style("opacity", 0)
//           .on("end", function() {
//             d3.select(this).style("display", "none");
//           });
//       })
//       .on("click", handleDotClick);
//   }

//   // Retrieve subject 30's metrics.
//   const subject30 = window.subjectMetricsResults.find(d => +d.subject === 30);
//   if (!subject30) {
//     console.error("Subject 30 data not found.");
//     return;
//   }

//   // Delegate header, slider, and nutrition label creation to plotSubjectLabel.
//   plotSubjectLabel(30, subject30.Diabetes);

//   // Optionally update the timeline.
//   loadAndRenderTimeline(30);

//   // Render subject 30's dot.
//   const svgContainer = d3.select("#subjectcs2-svg-container");
//   if (svgContainer.empty()) {
//     console.error("Container #subjectcs2-svg-container not found.");
//     return;
//   }

//   const width = 500;
//   const height = 500;

//   // Append an SVG element to the container.
//   const svg = svgContainer.append("svg")
//     .attr("id", "subject30-svg")
//     .attr("width", width)
//     .attr("height", height);

//   // Position the dot in the center; adjust coordinates as needed.
//   subject30.x = width / 2;
//   subject30.y = height / 2;
//   // Use your global sizeScale; multiply if desired for emphasis.
//   subject30.size = window.sizeScale(+subject30.totalCalories) * 2.5;
//   const subjectColor = window.color(subject30.Diabetes);

//   svg.append("circle")
//     .datum(subject30)
//     .attr("cx", subject30.x)
//     .attr("cy", subject30.y)
//     .attr("r", subject30.size)
//     .attr("fill", subjectColor)
//     .on("mouseover", function(event, d) {
//       d3.select("#tooltip")
//         .style("display", "block")
//         .html(`
//           <div style="text-align: center; font-weight: bold;">Subject: ${d.subject}</div>
//           <div style="text-align: left;">Diabetes: ${d.Diabetes}</div>
//           <div style="text-align: left;">Total Calories: ${d.totalCalories}</div>
//           <div style="text-align: left;">Average HR: ${d.avgHR}</div>
//           <div style="text-align: left;">Glucose range: ${d.minGL} - ${d.maxGL}</div>
//         `)
//         .style("left", (event.pageX + 5) + "px")
//         .style("top", (event.pageY - 28) + "px");
//     })
//     .on("mouseout", function() {
//       d3.select("#tooltip")
//         .transition()
//         .duration(500)
//         .style("opacity", 0)
//         .on("end", function() {
//           d3.select(this).style("display", "none");
//         });
//     })
//     .on("click", handleDotClick);
// }

function computeDailyAverages(data) {
  // Create a time parser to parse the full timestamp.
  const parseTime = d3.timeParse("%Y-%m-%d %H:%M:%S");
  // Create a formatter to extract just the day.
  const formatDay = d3.timeFormat("%Y-%m-%d");

  // Parse each record’s timestamp and add a day property.
  data.forEach(d => {
    // Adjust the property name if your timestamp field is named differently.
    d.timestamp = parseTime(d.timestamp);
    d.day = formatDay(d.timestamp);
  });

  // Group the data by day.
  const dataByDay = d3.group(data, d => d.day);

  // Compute averages for each macro per day.
  const dailyAverages = Array.from(dataByDay, ([day, values]) => ({
    day,
    avgCarbs: d3.mean(values, d => +d.avgCarbs),
    avgProtein: d3.mean(values, d => +d.avgProtein),
    avgFat: d3.mean(values, d => +d.avgFat),
    avgFiber: d3.mean(values, d => +d.avgFiber)
  }));

  // Sort days in chronological order.
  dailyAverages.sort((a, b) => new Date(a.day) - new Date(b.day));
  return dailyAverages;
}

// 2. Define your recommended daily nutritional values.
const recommendedValues = {
  avgCarbs: 300,   // e.g., 300 grams of carbohydrates
  avgProtein: 50,  // e.g., 50 grams of protein
  avgFat: 70,      // e.g., 70 grams of fat
  avgFiber: 30     // e.g., 30 grams of fiber
};


  
function lightenColor(col, factor = 0.5) {
  let c = d3.rgb(col);
  c.r = Math.round(c.r + (255 - c.r) * factor);
  c.g = Math.round(c.g + (255 - c.g) * factor);
  c.b = Math.round(c.b + (255 - c.b) * factor);
  return c.toString();
}

// function handleDotClick(event, d) {
//   event.preventDefault();

//   // Disable page scrolling.
//   // document.body.style.overflow = 'hidden';

//   // (Optional) Prevent wheel and touch events from propagating.
//   // function blockScroll(e) {
//   //   e.preventDefault();
//   // }
//   // document.addEventListener('wheel', blockScroll, { passive: false });
//   // document.addEventListener('touchmove', blockScroll, { passive: false });

//   d3.select("#visualization").style("position", "relative");
//   d3.select("#scroll-down-arrow").remove();

//   const container = d3.select("#visualization")
//     .append("div")
//     .attr("id", "subject-details-container")
//     .style("position", "absolute")
//     .style("top", "0")
//     .style("left", "0")
//     .style("width", "100%")
//     .style("height", "100%")
//     .style("box-sizing", "border-box")
//     .style("padding", "20px")
//     .style("background", "rgba(255, 255, 255, 1)");

//   // Create a header container with relative positioning.
//   const headerContainer = container.append("div")
//     .attr("id", "header-container")
//     .style("position", "relative") // relative to position the button absolutely
//     .style("margin-bottom", "20px");

//   // Append the centered h1.
//   headerContainer.append("h1")
//     .text(`Subject ${d.subject} - ${d.Diabetes}`)
//     .style("margin", "0")
//     .style("text-align", "center");

//   // Absolutely position the close ("X") button within the header.
//   headerContainer.append("button")
//     .attr("id", "close-button")
//     .text("X")
//     .style("position", "absolute")
//     .style("right", "0")
//     .style("top", "50%")
//     .style("transform", "translateY(-50%)")
//     .style("font-size", "20px")
//     .style("font-weight", "bold")
//     .style("background", "grey")
//     .style("color", "#000")
//     .style("border", "none")
//     .style("border-radius", "5px")
//     .style("padding", "5px 10px")
//     .style("cursor", "pointer")
//     .on("click", () => container.remove());

//   // Create the top bar below the header (for additional controls).
//   const topBar = container.append("div")
//     .attr("id", "top-bar")
//     .style("display", "flex")
//     .style("justify-content", "space-between")
//     .style("align-items", "center")
//     .style("background", "#f0f0f0")
//     .style("padding", "10px")
//     .style("border", "1px solid #ccc")
//     .style("margin-bottom", "10px");

//   // (Optional) Append controls to the top bar here.
//   // topBar.append("input")...

//   // Continue loading subject details and timeline.
//   plotSubjectLabel(d.subject);
//   loadAndRenderTimeline(d.subject);
// }

// function handleDotClick(event, d) {
//   event.preventDefault();

//   // Disable page scrolling.
//   // document.body.style.overflow = 'hidden';

//   // (Optional) Prevent wheel and touch events from propagating.
//   // function blockScroll(e) {
//   //   e.preventDefault();
//   // }
//   // document.addEventListener('wheel', blockScroll, { passive: false });
//   // document.addEventListener('touchmove', blockScroll, { passive: false });

//   d3.select("#visualization").style("position", "relative");
//   d3.select("#scroll-down-arrow").remove();

//   const container = d3.select("#visualization")
//     .append("div")
//     .attr("id", "subject-details-container")
//     .style("position", "absolute")
//     .style("top", "0")
//     .style("left", "0")
//     .style("width", "100%")
//     .style("height", "100%")
//     .style("box-sizing", "border-box")
//     .style("padding", "20px")
//     .style("background", "rgba(255, 255, 255, 1)");

//   // Create a header container with relative positioning.
//   const headerContainer = container.append("div")
//     .attr("id", "header-container")
//     .style("position", "relative") // relative to position the button absolutely
//     .style("margin-bottom", "20px");

//   // Retrieve the current day filter from the slider (defaulting to 1 if not set).
//   const dayFilter = document.getElementById('day-slider')?.value || 1;

//   // Append the centered h1 including the day filter.
//   headerContainer.append("h1")
//     .text(`Subject ${d.subject} - ${d.Diabetes} | Day ${dayFilter}`)
//     .style("margin", "0")
//     .style("text-align", "center");

//   // Absolutely position the close ("X") button within the header.
//   headerContainer.append("button")
//     .attr("id", "close-button")
//     .text("X")
//     .style("position", "absolute")
//     .style("right", "0")
//     .style("top", "50%")
//     .style("transform", "translateY(-50%)")
//     .style("font-size", "20px")
//     .style("font-weight", "bold")
//     .style("background", "grey")
//     .style("color", "#000")
//     .style("border", "none")
//     .style("border-radius", "5px")
//     .style("padding", "5px 10px")
//     .style("cursor", "pointer")
//     .on("click", () => container.remove());

//   // Continue loading subject details and timeline.
//   plotSubjectLabel(d.subject);
//   loadAndRenderTimeline(d.subject);
// }

// function handleDotClick(event, d) {
//   event.preventDefault();

//   d3.select("#visualization").style("position", "relative");
//   d3.select("#scroll-down-arrow").remove();

//   const container = d3.select("#visualization")
//     .append("div")
//     .attr("id", "subject-details-container")
//     .style("position", "absolute")
//     .style("top", "0")
//     .style("left", "0")
//     .style("width", "100%")
//     .style("height", "100%")
//     .style("box-sizing", "border-box")
//     .style("padding", "20px")
//     .style("background", "rgba(255, 255, 255, 1)");

//   // Create a header container.
//   const headerContainer = container.append("div")
//     .attr("id", "header-container")
//     .style("position", "relative")
//     .style("margin-bottom", "20px");

//   // Get the initial day from the slider (or default to 1).
//   const dayFilter = document.getElementById('day-slider')?.value || 1;

//   // Append header h1 and store subject info as data attributes.
//   headerContainer.append("h1")
//     .text(`Subject ${d.subject} - ${d.Diabetes} | Day ${dayFilter}`)
//     .attr("data-subject", d.subject)
//     .attr("data-diabetes", d.Diabetes)
//     .style("margin", "0")
//     .style("text-align", "center");

//   // Add a close button.
//   headerContainer.append("button")
//     .attr("id", "close-button")
//     .text("X")
//     .style("position", "absolute")
//     .style("right", "0")
//     .style("top", "50%")
//     .style("transform", "translateY(-50%)")
//     .style("font-size", "20px")
//     .style("font-weight", "bold")
//     .style("background", "grey")
//     .style("color", "#000")
//     .style("border", "none")
//     .style("border-radius", "5px")
//     .style("padding", "5px 10px")
//     .style("cursor", "pointer")
//     .on("click", () => container.remove());

//   // Continue with subject details and timeline.
//   plotSubjectLabel(d.subject, d.Diabetes);
//   loadAndRenderTimeline(d.subject);
// }


// function handleDotClick(event, d) {
//   event.preventDefault();

//   d3.select("#visualization").style("position", "relative");
//   d3.select("#scroll-down-arrow").remove();

//   const container = d3.select("#visualization")
//     .append("div")
//     .attr("id", "subject-details-container")
//     .style("position", "absolute")
//     .style("top", "0")
//     .style("left", "0")
//     .style("width", "100%")
//     .style("height", "100%")
//     .style("box-sizing", "border-box")
//     .style("padding", "20px")
//     .style("background", "rgba(255, 255, 255, 1)");

//   // Do not create the header here; let plotSubjectLabel handle it.

//   // Add a close button positioned in the container's top-right corner.
//   container.append("button")
//     .attr("id", "close-button")
//     .text("X")
//     .style("position", "absolute")
//     .style("right", "20px")
//     .style("top", "20px")
//     .style("font-size", "20px")
//     .style("font-weight", "bold")
//     .style("background", "grey")
//     .style("color", "#000")
//     .style("border", "none")
//     .style("border-radius", "5px")
//     .style("padding", "5px 10px")
//     .style("cursor", "pointer")
//     .on("click", () => container.remove());

//   // Delegate header and slider creation to plotSubjectLabel.
//   // Pass both subject and diabetes group.
//   plotSubjectLabel(d.subject, d.Diabetes);

//   // Optionally update the timeline.
//   loadAndRenderTimeline(d.subject);
// }

function handleDotClick(event, d) {
  event.preventDefault();

  d3.select("#visualization").style("position", "relative");
  d3.select("#scroll-down-arrow").remove();

  // Create the details container.
  const container = d3.select("#visualization")
    .append("div")
    .attr("id", "subject-details-container")
    .style("position", "absolute")
    .style("top", "0")
    .style("left", "0")
    .style("width", "100%")
    .style("height", "100%")
    .style("box-sizing", "border-box")
    .style("padding", "20px")
    .style("background", "rgba(255, 255, 255, 1)");

  // Remove any existing header container to force re-creation.
  container.select("#header-container").remove();

  // Add a close button.
  container.append("button")
    .attr("id", "close-button")
    .text("X")
    .style("position", "absolute")
    .style("right", "20px")
    .style("top", "20px")
    .style("font-size", "20px")
    .style("font-weight", "bold")
    .style("background", "grey")
    .style("color", "#000")
    .style("border", "none")
    .style("border-radius", "5px")
    .style("padding", "5px 10px")
    .style("cursor", "pointer")
    .on("click", () => container.remove());

  // Delegate header and slider creation to plotSubjectLabel.
  plotSubjectLabel(d.subject, d.Diabetes);
  loadAndRenderTimeline(d.subject);
}

// function handleDotClick(event, d) {
//   event.preventDefault();

//   d3.select("#visualization").style("position", "relative");
//   d3.select("#scroll-down-arrow").remove();

//   const container = d3.select("#visualization")
//   .append("div")
//   .attr("id", "subject-details-container")
//   .style("position", "absolute")
//   .style("top", "0")
//   .style("left", "0")
//   .style("width", "100%")
//   .style("height", "100%")
//   .style("box-sizing", "border-box")
//   .style("padding", "20px")
//   .style("background", "rgba(255, 255, 255, 1)");

//   // Do not create the header (h1) here.
//   // The header is managed by plotSubjectLabel.

//   // Add a close button positioned in the container's top-right corner.
//   container.append("button")
//   .attr("id", "close-button")
//   .text("X")
//   .style("position", "absolute")
//   .style("right", "20px")
//   .style("top", "20px")
//   .style("font-size", "20px")
//   .style("font-weight", "bold")
//   .style("background", "grey")
//   .style("color", "#000")
//   .style("border", "none")
//   .style("border-radius", "5px")
//   .style("padding", "5px 10px")
//   .style("cursor", "pointer")
//   .on("click", () => container.remove());

//   // Delegate header and slider creation to plotSubjectLabel.
//   plotSubjectLabel(d.subject);

//   // Update the timeline if needed.
//   loadAndRenderTimeline(d.subject);
// }

// function handleDotClick(event, d) {
//   event.preventDefault();

//   // Disable vertical page scrolling.
//   // document.body.style.overflow = 'hidden';

//   // Block scroll events outside the timeline container.
//   function blockScroll(e) {
//     // Allow events from inside timeline:
//     if (e.target.closest("#timeline-container")) return;
//     e.preventDefault();
//   }
//   // document.addEventListener('wheel', blockScroll, { passive: false });
//   // document.addEventListener('touchmove', blockScroll, { passive: false });

//   d3.select("#visualization").style("position", "relative");
//   d3.select("#scroll-down-arrow").remove();

//   // Create overlay with vertical scroll disabled.
//   const container = d3.select("#visualization")
//     .append("div")
//     .attr("id", "subject-details-container")
//     .style("position", "fixed")
//     .style("top", "0")
//     .style("left", "0")
//     .style("width", "100vw")
//     .style("height", "100vh")
//     .style("box-sizing", "border-box")
//     .style("padding", "20px")
//     .style("background", "rgba(255, 255, 255, 1)")
//     // Only block vertical scrolling:
//     .style("overflow-y", "hidden")
//     .style("overflow-x", "visible");

//   // Create header container and X button (positioned absolutely).
//   const headerContainer = container.append("div")
//     .attr("id", "header-container")
//     .style("position", "relative")
//     .style("margin-bottom", "20px");

//   headerContainer.append("h1")
//     .text(`Subject ${d.subject} - ${d.Diabetes}`)
//     .style("margin", "0")
//     .style("text-align", "center");

//   headerContainer.append("button")
//     .attr("id", "close-button")
//     .text("X")
//     .style("position", "absolute")
//     .style("right", "0")
//     .style("top", "50%")
//     .style("transform", "translateY(-50%)")
//     .style("font-size", "20px")
//     .style("font-weight", "bold")
//     .style("background", "grey")
//     .style("color", "#000")
//     .style("border", "none")
//     .style("border-radius", "5px")
//     .style("padding", "5px 10px")
//     .style("cursor", "pointer")
//     .on("click", function() {
//       container.remove();
//       document.body.style.overflow = 'auto';
//       document.removeEventListener('wheel', blockScroll);
//       document.removeEventListener('touchmove', blockScroll);
//     });

//   // (Optional) Create a top bar below the header.
//   const topBar = container.append("div")
//     .attr("id", "top-bar")
//     .style("display", "flex")
//     .style("justify-content", "center")
//     .style("align-items", "center")
//     .style("background", "#f0f0f0")
//     .style("padding", "10px")
//     .style("border", "1px solid #ccc")
//     .style("margin-bottom", "10px");

//   // Create timeline container with horizontal scrolling enabled.
//   const timelineContainer = container.append("div")
//     .attr("id", "timeline-container")
//     .style("width", "100%")
//     // Allow overflow; if more than 5 images are loaded, the width will force a scrollbar.
//     .style("overflow-x", "auto")
//     .style("overflow-y", "hidden")
//     .style("white-space", "nowrap")
//     .style("margin-top", "20px")
//     .style("padding-bottom", "20px");

//   // Continue loading subject details and timeline.
//   plotSubjectLabel(d.subject);
//   loadAndRenderTimeline(d.subject);
// }

// function handleDotClick(event, d) {
//   event.preventDefault();

//   // Ensure the parent container (#visualization) has relative positioning.
//   d3.select("#visualization").style("position", "relative");

//   // Create an overlay container that covers the entire #visualization area.
//   const container = d3.select("#visualization")
//     .append("div")
//     .attr("id", "subject-details-container")
//     .style("position", "absolute")
//     .style("top", "0")
//     .style("left", "0")
//     .style("width", "100%")
//     .style("height", "100%")
//     .style("background", "rgba(255, 255, 255, 0.9)")
//     .style("z-index", "1000")
//     .style("padding", "20px");

//   // Append a header with the subject number and group.
//   container.append("h1")
//     .text(`Subject ${d.subject} - ${d.Diabetes}`)
//     .style("text-align", "center")
//     .style("margin-bottom", "20px");

//   // Call plotSubjectLabel to load subject details.
//   plotSubjectLabel(d.subject);

//   // Create a top bar for the slider.
//   let topBar = container.append("div")
//     .attr("id", "top-bar")
//     .style("display", "flex")
//     .style("justify-content", "space-between")
//     .style("align-items", "center")
//     .style("background", "#f0f0f0")
//     .style("padding", "10px")
//     .style("border", "1px solid #ccc")
//     .style("margin-bottom", "10px");

//   // The slider is added inside plotSubjectLabel, so the top bar now only hosts the slider.

//   // Instead of appending the close button to the top bar, position it absolutely in the container.
//   container.append("button")
//     .attr("id", "close-button")
//     .text("X")
//     .style("position", "absolute")
//     .style("top", "30px")
//     .style("right", "30px")
//     .style("font-size", "20px")
//     .style("font-weight", "bold")
//     .style("background", "#333")
//     .style("color", "#fff")
//     .style("border", "none")
//     .style("border-radius", "5px")
//     .style("padding", "5px 10px")
//     .style("cursor", "pointer")
//     .on("click", function() {
//       // Remove the overlay container.
//       container.remove();
//     });

//   // Load and display the timeline for the selected subject.
//   loadAndRenderTimeline(d.subject);
// }


function plotData() {
  const width = 1000;
  const height = 500;
  const centerX = width / 2;
  const centerY = height / 2;
  const svg = d3.select("#grid")
                .attr("width", width)
                .attr("height", height);


  // Arrange groups vertically by having the same x center but different y centers
  const healthyCenter = { x: centerX - 300, y: centerY };
  const preCenter     = { x: centerX,       y: centerY };
  const type2Center   = { x: centerX + 300, y: centerY };

  // For vertical rectangles, swap width and height values
  const rectWidth = 100, rectHeight = 300;
  const healthyBounds = {
    x0: healthyCenter.x - rectWidth / 2,
    x1: healthyCenter.x + rectWidth / 2,
    y0: healthyCenter.y - rectHeight / 2,
    y1: healthyCenter.y + rectHeight / 2
  };
  const preBounds = {
    x0: preCenter.x - rectWidth / 2,
    x1: preCenter.x + rectWidth / 2,
    y0: preCenter.y - rectHeight / 2,
    y1: preCenter.y + rectHeight / 2
  };
  const type2Bounds = {
    x0: type2Center.x - rectWidth / 2,
    x1: type2Center.x + rectWidth / 2,
    y0: type2Center.y - rectHeight / 2,
    y1: type2Center.y + rectHeight / 2
  };

  // Assign initial positions within the bounds
  data.forEach(d => {
    if (d.Diabetes === "Healthy") {
      d.x = healthyCenter.x + (Math.random() - 0.5) * rectWidth;
      d.y = healthyCenter.y + (Math.random() - 0.5) * rectHeight;
    } else if (d.Diabetes === "Pre-Diabetes") {
      d.x = preCenter.x + (Math.random() - 0.5) * rectWidth;
      d.y = preCenter.y + (Math.random() - 0.5) * rectHeight;
    } else if (d.Diabetes === "Type 2 Diabetes") {
      d.x = type2Center.x + (Math.random() - 0.5) * rectWidth;
      d.y = type2Center.y + (Math.random() - 0.5) * rectHeight;
    }
  });

  // Separate subjects into groups:
  const healthysubjects = data.filter(d => d.Diabetes === "Healthy");
  const presubjects     = data.filter(d => d.Diabetes === "Pre-Diabetes");
  const type2subjects   = data.filter(d => d.Diabetes === "Type 2 Diabetes");

  // Create circles for healthy subjects.
  const healthyCircles = svg.selectAll("circle.healthy")
      .data(healthysubjects)
      .join("circle")
      .attr("class", "healthy")
      .attr("cx", d => d.x)
      .attr("cy", d => d.y)
      .attr("r", d => d.size)
      .attr("fill", d => color(d.Diabetes));

  // Create circles for pre-diabetic subjects.
  const preCircles = svg.selectAll("circle.pre")
      .data(presubjects)
      .join("circle")
      .attr("class", "pre")
      .attr("cx", d => d.x)
      .attr("cy", d => d.y)
      .attr("r", d => d.size)
      .attr("fill", d => color(d.Diabetes));

  // Create circles for type2 diabetic subjects.
  const type2Circles = svg.selectAll("circle.type2")
      .data(type2subjects)
      .join("circle")
      .attr("class", "type2")
      .attr("cx", d => d.x)
      .attr("cy", d => d.y)
      .attr("r", d => d.size)
      .attr("fill", d => color(d.Diabetes));

  // Create a force simulation for healthy subjects using the bounds:
  const healthySim = d3.forceSimulation(healthysubjects)
  .force("x", d3.forceX(healthyCenter.x).strength(0.15))
  .force("y", d3.forceY(healthyCenter.y).strength(0.5))
  .force("collide", d3.forceCollide().radius(d => d.size + 2).iterations(5))
  .force("bounding", forceBoundingBox(healthyBounds))
  .on("tick", () => {
    healthyCircles.attr("cx", d => d.x)
                  .attr("cy", d => d.y);
  });

  const preSim = d3.forceSimulation(presubjects)
    .force("center", d3.forceCenter(preCenter.x, preCenter.y))
    .force("x", d3.forceX(preCenter.x).strength(0.3))
    .force("y", d3.forceY(preCenter.y).strength(0.3))
    .force("collide", d3.forceCollide().radius(d => d.size + 2).iterations(5))
    .force("bounding", forceBoundingBox(preBounds))
    .on("tick", () => {
      preCircles.attr("cx", d => d.x)
                .attr("cy", d => d.y);
    });
    
  const type2Sim = d3.forceSimulation(type2subjects)
    .force("center", d3.forceCenter(type2Center.x, type2Center.y))
    .force("x", d3.forceX(type2Center.x).strength(0.3))
    .force("y", d3.forceY(type2Center.y).strength(0.3))
    .force("collide", d3.forceCollide().radius(d => d.size + 2).iterations(5))
    .force("bounding", forceBoundingBox(type2Bounds))
    .on("tick", () => {
      type2Circles.attr("cx", d => d.x)
                  .attr("cy", d => d.y);
    });

  healthySim.alpha(1).restart();
  preSim.alpha(1).restart();
  type2Sim.alpha(1).restart();

// Append a scroll down arrow that smooth-scrolls to the info section.
if (d3.select("#scroll-down-arrow").empty()) {
  d3.select("#snap-container")
    .append("div")
    .attr("id", "scroll-down-arrow")
    .style("position", "fixed")
    .style("bottom", "20px")
    .style("left", "50%")
    .style("transform", "translateX(-50%)")
    .style("cursor", "pointer")
    .html(`<div style="font-size: 14px;">&#8595; Read more</div>`)
}

// Get references to the final page and scroll arrow.
const pages = Array.from(document.querySelectorAll('#snap-container section'));
const finalPage = document.getElementById("page-final");
const scrollArrow = document.getElementById("scroll-down-arrow");

// Create an observer to monitor when the final page enters the viewport within #snap-container.
const snapContainer = document.getElementById("snap-container");
const observer = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    scrollArrow.style.display = entry.isIntersecting ? "none" : "block";
  });
}, { 
  root: snapContainer,  // Use snap-container as the scrolling area
  threshold: 0.1 
});

// Observe the final page.
observer.observe(finalPage);

// Helper: find the current page index based on scroll position
function getCurrentPageIndex() {
  // Use snapContainer's scroll position to find the section closest to the top
  let containerScrollTop = snapContainer.scrollTop;
  let currentIndex = 0;
  pages.forEach((page, index) => {
    // Using offsetTop relative to snapContainer.
    // Adjust the threshold (here 50) if necessary.
    if (page.offsetTop <= containerScrollTop + 50) {
      currentIndex = index;
    }
  });
  return currentIndex;
}

// On arrow click, scroll to the next page (if available)
scrollArrow.addEventListener("click", function() {
  let currentIndex = getCurrentPageIndex();
  // If there's a next page, scroll to it; otherwise, do nothing (or loop back)
  let nextIndex = Math.min(currentIndex + 1, pages.length - 1);
  pages[nextIndex].scrollIntoView({ behavior: "smooth", block: "start" });
});

  // Re-create tooltip if it doesn't exist.
  if (d3.select("#tooltip").empty()) {
    d3.select("body")
      .append("div")
      .attr("id", "tooltip")
      .style("position", "absolute")
      .style("opacity", 0)
      .style("pointer-events", "none");
  }


  // Healthy circles click handler.
  // Example update for healthy circles tooltip:
// healthyCircles
// .on("mouseover", (event, d) => {
//   d3.select("#tooltip")
//     .style("display", "block")
//     .transition()
//       .duration(200)
//       .style("opacity", 0.9);
//   d3.select("#tooltip")
//     .html(
//       `<div style="text-align: center; font-weight: bold;">Subject: ${d.subject}</div>
//        <div style="text-align: left;">Diabetes: ${d.Diabetes}</div>
//        <div style="text-align: left;">Total Calories: ${d.totalCalories}</div>
//        <div style="text-align: left;">Average METs: ${d.avgMETs !== undefined ? d.avgMETs.toFixed(2) : 'N/A'}</div>
//        <div style="text-align: left;">Average HR: ${d.avgHR !== undefined ? d.avgHR.toFixed(2) : 'N/A'}</div>
//        <div style="text-align: left;">Glucose range: ${d.minGL !== undefined ? d.minGL : 'N/A'}-${d.maxGL !== undefined ? d.maxGL : 'N/A'}</div>`
//     )
//     .style("left", (event.pageX + 5) + "px")
//     .style("top", (event.pageY - 28) + "px");
// })
// .on("mouseout", () => {
//   d3.select("#tooltip")
//     .transition()
//     .duration(500)
//     .style("opacity", 0)
//     .on("end", function() {
//        d3.select(this).style("display", "none");
//     });
// })
// .on("click", handleDotClick);
healthyCircles
  .on("mouseover", (event, d) => {
    updateTooltipNutritionLabel(event, d);
  })
  .on("mouseout", () => {
    d3.select("#tooltip")
      .transition()
      .duration(500)
      .style("opacity", 0)
      .on("end", function() {
         d3.select(this).style("display", "none");
      });
  })
  .on("click", handleDotClick);

// Similarly update the tooltip code for preCircles and type2Circles:
preCircles
.on("mouseover", (event, d) => {
  updateTooltipNutritionLabel(event, d);
})
.on("mouseout", () => {
  d3.select("#tooltip")
    .transition()
    .duration(500)
    .style("opacity", 0)
    .on("end", function() {
       d3.select(this).style("display", "none");
    });
})
.on("click", handleDotClick);

type2Circles
.on("mouseover", (event, d) => {
  updateTooltipNutritionLabel(event, d);
})
.on("mouseout", () => {
  d3.select("#tooltip")
    .transition()
    .duration(500)
    .style("opacity", 0)
    .on("end", function() {
       d3.select(this).style("display", "none");
    });
})
.on("click", handleDotClick);

const groupLabels = [
  { label: "Healthy", center: healthyCenter },
  { label: "Pre-Diabetes", center: preCenter },
  { label: "Type 2 Diabetes", center: type2Center }
];

const labelY = centerY - rectHeight / 2 - 90; // Adjust as needed
const squareSize = 14;              // Square width/height
const gap = 5;                      // Gap between square and text
const labelShift = -25;             // Shift the legend to the left by 20px (adjust as needed)

groupLabels.forEach(g => {
  const labelGroup = svg.append("g")
    // Add labelShift to shift the labels to the left.
    .attr("transform", `translate(${g.center.x + labelShift}, ${labelY})`);
    
  // Append a rectangle (square) positioned just to the left of the text.
  labelGroup.append("rect")
    .attr("x", -squareSize - gap)
    .attr("y", -squareSize / 2)
    .attr("width", squareSize)
    .attr("height", squareSize)
    .attr("fill", color(g.label));

  // Append the text label, starting at x = 0.
  labelGroup.append("text")
    .attr("x", 0)
    .attr("y", 0)
    .attr("text-anchor", "start")
    .attr("dy", ".35em")
    .style("font-size", "16px")
    .attr("fill", "black")
    .text(g.label);
});
}


// Load one subject's CSV and compute its metrics.
async function loadSubjectData(subjectNumber) {
  // Convert subject number to a three-digit string (e.g., 1 -> "001")
  const subjectStr = subjectNumber.toString().padStart(3, '0');
  const csvPath = `data/CGMacros-${subjectStr}/CGMacros-${subjectStr}.csv`;

  try {
    const csvData = await d3.csv(csvPath);
    // Convert Calories, METs, HR, and Libre Gl to numbers.
    csvData.forEach(d => {
      d.Calories = +d.Calories;
      // d.METs = +d.METs;
      d.HR = +d.HR;
      d["Libre GL"] = +d["Libre GL"];
    });
    // Compute total Calories.
    const totalCalories = d3.sum(csvData, d => d.Calories);
    const avgDailyCalories = totalCalories / 10;
    // Filter valid METs and HR values before computing averages.
    // const validMETs = csvData.filter(d => !isNaN(d.METs));
    // const avgMETs = d3.mean(validMETs, d => d.METs);
    const validHR = csvData.filter(d => !isNaN(d.HR));
    const avgHR = d3.mean(validHR, d => d.HR);
    // Compute min Libre Gl in a similar way to avgHR.
    const validLibreGl = csvData.filter(d => !isNaN(d["Libre GL"]));
    const minGL = validLibreGl.length ? d3.min(validLibreGl, d => d["Libre GL"]) : undefined;
    // Also compute max Libre Gl
    const maxGL = validLibreGl.length ? d3.max(validLibreGl, d => d["Libre GL"]) : undefined;

    // Aggregate macronutrients over the 10-day period
    const totalCarbs = d3.sum(csvData, d => d.Carbs);
    const totalProtein = d3.sum(csvData, d => d.Protein);
    const totalFat = d3.sum(csvData, d => d.Fat);
    const totalFiber = d3.sum(csvData, d => d.Fiber);

    // Calculate average daily intake
    const days = 10; // Assuming 10 days of data
    const avgCarbs = totalCarbs / days;
    const avgProtein = totalProtein / days;
    const avgFat = totalFat / days;
    const avgFiber = totalFiber / days;
    const diabetesGroup = subjectToDiabetesGroup[subjectNumber] || "Healthy";

    return { 
      subject: subjectNumber, 
      totalCalories, 
      avgDailyCalories,
      // avgMETs, 
      avgHR, 
      minGL, 
      maxGL, 
      avgCarbs, 
      avgProtein, 
      avgFat, 
      avgFiber,
      Diabetes: diabetesGroup
    };

  } catch (error) {
    console.error(`Error loading subject ${subjectNumber} from ${csvPath}:`, error);
    return null;
  }
}

// Load multiple subjects (e.g., subjects 1 to 49)
async function loadAllSubjects(subjectNumbers) {
  const missingSubjectIDs = [24, 25, 37, 40]; // Skip these subjects
  const validSubjects = subjectNumbers.filter(subject => !missingSubjectIDs.includes(subject));
  const subjectPromises = validSubjects.map(subject => loadSubjectData(subject));
  // Wait for all the promises concurrently.
  const results = await Promise.all(subjectPromises);
  // Filter null results (if any subjects fail to load)
  const filteredResults = results.filter(result => result !== null);
  console.log("Metrics per subject:", filteredResults);
  return filteredResults;
}

function forceBoundingBox(bounds, strength = 0.1) {
  let nodes;
  function force(alpha) {
    if (!nodes) return;  // Prevent iteration if nodes is not set.
    for (const node of nodes) {
      // Check left/right bounds:
      if (node.x - node.size < bounds.x0) {
        let diff = bounds.x0 - (node.x - node.size);
        node.vx += diff * strength;
      } else if (node.x + node.size > bounds.x1) {
        let diff = (node.x + node.size) - bounds.x1;
        node.vx -= diff * strength;
      }
      // Check top/bottom bounds:
      if (node.y - node.size < bounds.y0) {
        let diff = bounds.y0 - (node.y - node.size);
        node.vy += diff * strength;
      } else if (node.y + node.size > bounds.y1) {
        let diff = (node.y + node.size) - bounds.y1;
        node.vy -= diff * strength;
      }
    }
  }
  force.initialize = (n) => { nodes = n; };
  return force;
}

function resetMainView() {
  // Remove any details view and back arrow.
  d3.selectAll("#subject-details").remove();
  d3.selectAll("#go-back-arrow").remove();
  
  const snapContainer = document.getElementById("snap-container");
  if (snapContainer) {
    snapContainer.scrollTop = 0;
  }
    
  // Restore the body's background color.
  d3.select("body")
    .transition()
    .duration(500)
    .style("background-color", "#ffffff");
  
  // Re-display the main visualization elements.
  d3.select("#grid")
    .style("display", "block")
    .transition()
      .duration(500)
      .style("opacity", 1);
  d3.select("h1")
    .style("display", "block")
    .transition()
      .duration(500)
      .style("opacity", 1);
  
  // Re-display the info section (the second page).
  d3.select("#page-final").style("display", "block");
  
  // Remove and re-add the scroll arrow.
  d3.selectAll("#scroll-down-arrow").remove();
  d3.select("#snap-container")
    .append("div")
    .attr("id", "scroll-down-arrow")
    .style("position", "fixed")
    .style("bottom", "20px")
    .style("left", "50%")
    .style("transform", "translateX(-50%)")
    .style("cursor", "pointer")
    .html(`<div style="font-size: 14px;">&#8595; Read more</div>`)
  
  // Re-attach the IntersectionObserver to the new arrow so it hides on page2.
  const lastPage = document.getElementById("page-final");
  const scrollArrow = document.getElementById("scroll-down-arrow");
  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      scrollArrow.style.display = entry.isIntersecting ? "none" : "block";
    });
  }, { 
    root: snapContainer,
    threshold: 0.1
  });
  observer.observe(lastPage);
  
  // Re-enable snap scrolling after a delay.
  setTimeout(() => {
    snapContainer.removeEventListener("scroll", lockScroll);
    d3.select("#snap-container")
      .style("overflow-y", "scroll")
      .style("scroll-snap-type", "y mandatory");
  }, 1000);
}

function backScrollHandler(e) {
  // Prevent the default scrolling behavior.
  e.preventDefault();
  if (e.deltaY > 0) {
    // Remove the handler immediately.
    window.removeEventListener("wheel", backScrollHandler);

    // Immediately force the container to scroll to the top.
    const snapContainer = document.getElementById("snap-container");
    snapContainer.scrollTop = 0;

    // Fade out the details and back arrow, then call resetMainView.
    d3.select("#subject-details")
      .transition()
      .duration(500)
      .style("opacity", 0);
    d3.select("#go-back-arrow")
      .transition()
      .duration(500)
      .style("opacity", 0)
      .on("end", () => {
        resetMainView();
      });
  }
}

// Later, in your back arrow scroll event listener:
window.addEventListener("wheel", function handleScroll(e) {
  if (e.deltaY > 0) {
    window.removeEventListener("wheel", handleScroll);
    // Fade out the subject details and back arrow.
    d3.select("#subject-details")
      .transition()
      .duration(500)
      .style("opacity", 0);
    d3.select("#go-back-arrow")
      .transition()
      .duration(500)
      .style("opacity", 0)
      .on("end", () => {
        resetMainView();
      });
  }
});


function plotGLRange() {
  if (!window.subjectMetricsResults) {
    console.error("Subject metrics not loaded yet.");
    return;
  }

  // Define diabetes groups and sort subjects.
  const groups = ["Healthy", "Pre-Diabetes", "Type 2 Diabetes"];
  const sortedSubjects = window.subjectMetricsResults.slice().sort((a, b) => {
    if (a.Diabetes !== b.Diabetes) {
      return groups.indexOf(a.Diabetes) - groups.indexOf(b.Diabetes);
    }
    return +a.subject - +b.subject;
  });
  window.sortedSubjects = sortedSubjects;

  // Create a responsive SVG in the container.
  const { svg, width, height, margin } = createResponsiveSVG("#glrange-container", { top: 40, right: 30, bottom: 40, left: 100 });
  window.svg = svg;

  // Build a new domain that interleaves gap markers between groups.
  const newDomain = [];
  for (let i = 0; i < sortedSubjects.length; i++) {
    if (i === 0 || sortedSubjects[i].Diabetes !== sortedSubjects[i - 1].Diabetes) {
      newDomain.push("gap-" + sortedSubjects[i].Diabetes);
    }
    newDomain.push(sortedSubjects[i].subject);
  }
  window.newDomain = newDomain;

  // Create y and x scales.
  const yScale = d3.scaleBand()
    .domain(newDomain)
    .range([0, height])
    .padding(0.1);
  window.yScale = yScale;

  const rawMin = d3.min(sortedSubjects, d => d.minGL);
  const xMin = rawMin < 40 ? 40 : rawMin;
  const xMax = d3.max(sortedSubjects, d => d.maxGL);
  const xScale = d3.scaleLinear()
    .domain([xMin, xMax])
    .range([0, width])
    .nice();
  window.xScale = xScale;

  // Draw axes.
  svg.append("g")
    .attr("transform", `translate(0, ${height})`)
    .call(d3.axisBottom(xScale));

  svg.append("g")
    .call(d3.axisLeft(yScale)
      .tickFormat(d => d.toString().startsWith("gap-") ? "" : d));
  
  svg.append("text")
    .attr("text-anchor", "middle")
    .attr("x", width / 2)
    .attr("y", height + margin.bottom - 10) // Position below the X-axis
    .style("font-size", "14px")
    .style("font-weight", "bold")
    .text("Glucose Level (mg/dL)");

  // Add Y-axis label (Subject Number)
  svg.append("text")
    .attr("text-anchor", "middle")
    .attr("transform", `translate(-${margin.left / 1.5}, ${height / 2}) rotate(-90)`)
    .style("font-size", "14px")
    .style("font-weight", "bold")
    .text("Subject Number");


  // (Optional) Compute the predicted group and update the title.
  const groupAverageGL = groups.map(group => {
    const groupData = sortedSubjects.filter(d => d.Diabetes === group);
    return { group, avgMin: d3.mean(groupData, d => +d.minGL), avgMax: d3.mean(groupData, d => +d.maxGL) };
  });
  let bestGroup = groupAverageGL[0],
      bestDiff = Infinity;
  groupAverageGL.forEach(g => {
    const diff = Math.abs(g.avgMin - (window.userGlucoseMin ? window.userGlucoseMin() : 40)) +
                 Math.abs(g.avgMax - (window.userGlucoseMax ? window.userGlucoseMax() : 410));
    if (diff < bestDiff) {
      bestDiff = diff;
      bestGroup = g;
    }
  });
  let container = d3.select("#glrange-container");
  let titleEl = container.select("#predicted-group-title");
  if (titleEl.empty()) {
    titleEl = container.append("div")
      .attr("id", "predicted-group-title")
      .style("position", "absolute")
      .style("top", "10px")
      .style("left", "50%")
      .style("transform", "translateX(-50%)")
      .style("text-align", "center")
      .style("font-size", "16px")
      .style("font-weight", "bold")
      .style("pointer-events", "none");
  }
  titleEl.text(`Your predicted group: ${bestGroup.group}`);

  // (Optional) Compute overlayY for user-input overlay (not our primary concern here).
  const groupDataForOverlay = sortedSubjects.filter(d => d.Diabetes === bestGroup.group);
  const overlayY = groupDataForOverlay.length > 0 ?
      d3.mean(groupDataForOverlay, d => yScale(d.subject) + yScale.bandwidth() / 2) :
      d3.max(sortedSubjects, d => yScale(d.subject)) + yScale.bandwidth() + 30;

  // Draw background highlight for the predicted group.
  const backgroundGroup = svg.insert("g", ":first-child").attr("class", "background");
  const color = d3.scaleOrdinal().domain(groups)
      .range(["#2C7BB6", "#FDB863", "#D7191C"]);
  function lightenColor2(col, factor = 0.7) {
    let c = d3.rgb(col);
    c.r = Math.round(c.r + (255 - c.r) * factor);
    c.g = Math.round(c.g + (255 - c.g) * factor);
    c.b = Math.round(c.b + (255 - c.b) * factor);
    return c.toString();
  }
  const bestGroupData = sortedSubjects.filter(d => d.Diabetes === bestGroup.group);
  if (bestGroupData.length > 0) {
    const yVals = bestGroupData.map(d => yScale(d.subject));
    const yMinRect = d3.min(yVals);
    const yMaxRect = d3.max(yVals) + yScale.bandwidth();
    backgroundGroup.append("rect")
      .attr("x", 0)
      .attr("y", yMinRect)
      .attr("width", width)
      .attr("height", yMaxRect - yMinRect)
      .attr("fill", lightenColor2(color(bestGroup.group), 0.3))
      .attr("opacity", 0.5);
  }

  // Create a foreground group.
  const foregroundGroup = svg.append("g").attr("class", "foreground");
  window.foregroundGroup = foregroundGroup;

  // ********************
  // Create the tooltip element (remove any previous instance).
  d3.select("#gl-tooltip").remove(); 
  const glTooltip = d3.select("body")
    .append("div")
    .attr("id", "gl-tooltip")
    .style("position", "absolute")
    .style("background", "rgba(255,255,255,0.9)")
    .style("border", "1px solid black")
    .style("padding", "8px")
    .style("border-radius", "4px")
    .style("pointer-events", "none")
    .style("display", "none")
    .style("font-size", "12px");

  // ********************
  // Draw subject glucose range lines (optional tooltip on lines).
  foregroundGroup.selectAll("line.gl-range")
    .data(sortedSubjects)
    .enter()
    .append("line")
    .attr("class", "gl-range")
    .attr("x1", d => xScale(Math.max(d.minGL, 40)))
    .attr("x2", d => xScale(d.maxGL))
    .attr("y1", d => yScale(d.subject) + yScale.bandwidth() / 2)
    .attr("y2", d => yScale(d.subject) + yScale.bandwidth() / 2)
    .attr("stroke", "gray")
    .attr("stroke-width", 2)
    .on("mouseover", function(event, d) {
      glTooltip.style("display", "block")
        .html(`<strong>Subject: ${d.subject}</strong><br>Min GL: ${d.minGL}<br>Max GL: ${d.maxGL}`);
    })
    .on("mousemove", function(event, d) {
      const bbox = this.getBoundingClientRect();
      const tooltipX = bbox.x + bbox.width / 2;
      const tooltipY = bbox.y;
      glTooltip.style("left", tooltipX + "px")
               .style("top", (tooltipY - 28) + "px");
    })
    .on("mouseout", function() {
      glTooltip.style("display", "none");
    });

  // ********************
  // Draw the min and max dots with tooltip event handlers that show the tooltip when hovered directly.
  foregroundGroup.selectAll("circle.min-gl")
    .data(sortedSubjects)
    .enter()
    .append("circle")
    .attr("class", "min-gl")
    .attr("cx", d => xScale(Math.max(d.minGL, 40)))
    .attr("cy", d => yScale(d.subject) + yScale.bandwidth() / 2)
    .attr("r", 5)
    .attr("fill", d => color(d.Diabetes))
    .on("mouseover", function(event, d) {
      glTooltip.style("display", "block")
        .html(`<strong>Subject: ${d.subject}</strong><br>Min GL: ${d.minGL}`);
    })
    .on("mousemove", function(event, d) {
      const bbox = this.getBoundingClientRect();
      const tooltipX = bbox.x + bbox.width / 2;
      const tooltipY = bbox.y;
      glTooltip.style("left", tooltipX + "px")
               .style("top", (tooltipY - 28) + "px");
    })
    .on("mouseout", function() {
      glTooltip.style("display", "none");
    });

  foregroundGroup.selectAll("circle.max-gl")
    .data(sortedSubjects)
    .enter()
    .append("circle")
    .attr("class", "max-gl")
    .attr("cx", d => xScale(d.maxGL))
    .attr("cy", d => yScale(d.subject) + yScale.bandwidth() / 2)
    .attr("r", 5)
    .attr("fill", d => color(d.Diabetes))
    .on("mouseover", function(event, d) {
      glTooltip.style("display", "block")
        .html(`<strong>Subject: ${d.subject}</strong><br>Max GL: ${d.maxGL}`);
    })
    .on("mousemove", function(event, d) {
      const bbox = this.getBoundingClientRect();
      const tooltipX = bbox.x + bbox.width / 2;
      const tooltipY = bbox.y;
      glTooltip.style("left", tooltipX + "px")
               .style("top", (tooltipY - 28) + "px");
    })
    .on("mouseout", function() {
      glTooltip.style("display", "none");
    });

  // (Optional) Draw overlay elements for user input (line, dots, label)
  const userMinGL = window.userGlucoseMin ? window.userGlucoseMin() : 40;
  const userMaxGL = window.userGlucoseMax ? window.userGlucoseMax() : 410;
  const overlayData = [{ min: userMinGL, max: userMaxGL, y: overlayY }];
  const overlayLine = foregroundGroup.selectAll("line.user-glucose-line").data(overlayData);
  overlayLine.enter()
    .append("line")
    .attr("class", "user-glucose-line")
    .merge(overlayLine)
    .transition().duration(300)
    .attr("x1", d => xScale(d.min))
    .attr("x2", d => xScale(d.max))
    .attr("y1", d => d.y)
    .attr("y2", d => d.y)
    .attr("stroke", "black")
    .attr("stroke-width", 2);
  overlayLine.exit().remove();

  const overlayDotsData = [
    { cx: userMinGL, y: overlayY },
    { cx: userMaxGL, y: overlayY }
  ];
  const overlayDots = foregroundGroup.selectAll("circle.user-glucose-dot").data(overlayDotsData);
  overlayDots.enter()
    .append("circle")
    .attr("class", "user-glucose-dot")
    .merge(overlayDots)
    .transition().duration(300)
    .attr("cx", d => xScale(d.cx))
    .attr("cy", d => d.y)
    .attr("r", 5)
    .attr("fill", "black");
  overlayDots.exit().remove();

  const overlayLabel = foregroundGroup.selectAll("text.user-input-label").data(overlayData);
  overlayLabel.enter()
    .append("text")
    .attr("class", "user-input-label")
    .merge(overlayLabel)
    .transition().duration(300)
    .attr("x", -10)
    .attr("y", d => d.y + 5)
    .attr("text-anchor", "end")
    .style("font-size", "12px")
    .style("font-weight", "bold")
    .style("fill", color(bestGroup.group))
    .text("Your input");
  overlayLabel.exit().remove();
}

function updateUserGlucoseRange() {
  // If subject metrics are not loaded, wait and try again.
  if (!window.subjectMetricsResults) {
      console.warn("Subject metrics not loaded yet, retrying...");
      setTimeout(updateUserGlucoseRange, 500);
      return;
  }
  // Ensure our responsive SVG has been created.
  if (!window.svg || !window.newDomain) {
      console.warn("SVG or newDomain not defined. Calling plotGLRange() to create them.");
      plotGLRange();
      // If still not defined, exit.
      if (!window.svg || !window.newDomain) return;
  }
  
  // Get slider values (using defaults if not defined)
  const userMinGL = window.userGlucoseMin ? window.userGlucoseMin() : 40;
  const userMaxGL = window.userGlucoseMax ? window.userGlucoseMax() : 410;
  
  // Define diabetes groups.
  const groups = ["Healthy", "Pre-Diabetes", "Type 2 Diabetes"];
  
  // Sort subjects using our global subjectMetricsResults.
  const sortedSubjects = window.subjectMetricsResults.slice().sort((a, b) => {
    if (a.Diabetes !== b.Diabetes) {
      return groups.indexOf(a.Diabetes) - groups.indexOf(b.Diabetes);
    }
    return +a.subject - +b.subject;
  });
  window.sortedSubjects = sortedSubjects;
  
  // Compute average GL per group.
  const groupAverageGL = groups.map(group => {
    const groupData = sortedSubjects.filter(d => d.Diabetes === group);
    return {
      group,
      avgMin: d3.mean(groupData, d => +d.minGL),
      avgMax: d3.mean(groupData, d => +d.maxGL)
    };
  });
  
  // Determine the predicted group based on the closest averages.
  let bestGroup = groupAverageGL[0];
  let bestDiff = Infinity;
  groupAverageGL.forEach(g => {
    const diff = Math.abs(g.avgMin - userMinGL) + Math.abs(g.avgMax - userMaxGL);
    if (diff < bestDiff) {
      bestDiff = diff;
      bestGroup = g;
    }
  });
  
  // Update predicted group title.
  let container = d3.select("#glrange-container");
  let titleEl = container.select("#predicted-group-title");
  if (titleEl.empty()) {
    titleEl = container.insert("div", ":first-child")
      .attr("id", "predicted-group-title")
      .style("text-align", "center")
      .style("font-size", "16px")
      .style("font-weight", "bold")
      .style("margin", "10px 0");
  }
  titleEl.text(`Your predicted group: ${bestGroup.group}`);
  
  // Use the globally stored newDomain (which interleaves subject IDs with gap markers)
  // and the yScale (stored as window.yScale) to position the overlay.
  const newDomain = window.newDomain;
  const yScale = window.yScale;
  let overlayY;

  // Build the gap marker string.
  const gapMarker = "gap-" + bestGroup.group;

  // Find the gap marker in newDomain.
  const gapIndex = newDomain.indexOf(gapMarker);

  // Check if gap marker was found.
  if (gapIndex !== -1) {
    overlayY = yScale(newDomain[gapIndex]) + yScale.bandwidth() / 2;
    console.log("overlayY computed from gap marker:", overlayY);
  } else {
    console.error("Gap marker not found in newDomain. Using fallback value.");
    // Fallback: set overlayY to a default value, e.g., the middle of the entire scale.
    overlayY = (yScale(newDomain[0]) + yScale(newDomain[newDomain.length - 1]) + yScale.bandwidth()) / 2;
    console.log("Fallback overlayY:", overlayY);
  }

    // -------- Background Rectangle Update --------
  // Reuse the background group if it exists or insert a new one.
  let backgroundGroup = d3.select("g.background");
  if (backgroundGroup.empty()) {
    backgroundGroup = window.svg.insert("g", ":first-child")
      .attr("class", "background")
      .style("pointer-events", "none");
  } else {
    // Remove any existing rect inside backgroundGroup so we can re-draw.
    backgroundGroup.selectAll("rect").remove();
  }
  
  // Define a color scale and a helper to lighten colors.
  const color = d3.scaleOrdinal()
      .domain(groups)
      .range(["#2C7BB6", "#FDB863", "#D7191C"]);
  function lightenColor2(col, factor = 0.7) {
    let c = d3.rgb(col);
    c.r = Math.round(c.r + (255 - c.r) * factor);
    c.g = Math.round(c.g + (255 - c.g) * factor);
    c.b = Math.round(c.b + (255 - c.b) * factor);
    return c.toString();
  }
  
  // Get the subjects for the predicted group.
  const bestGroupData = sortedSubjects.filter(d => d.Diabetes === bestGroup.group);
  if (bestGroupData.length > 0) {
    const yVals = bestGroupData.map(d => window.yScale(d.subject));
    const yMinRect = d3.min(yVals);
    const yMaxRect = d3.max(yVals) + window.yScale.bandwidth();
    
    // Compute overlay center based on group data.
    const groupDataForOverlay = sortedSubjects.filter(d => d.Diabetes === bestGroup.group);
    const baseOverlayY = groupDataForOverlay.length > 0
      ? d3.mean(groupDataForOverlay, d => window.yScale(d.subject) + window.yScale.bandwidth()/2)
      : d3.max(sortedSubjects, d => window.yScale(d.subject)) + window.yScale.bandwidth() + 30;
      
    // // Use fixed offsets: 110 for Healthy, 95 for Type 2 Diabetes, 105 for Pre-Diabetes.
    // const offset = bestGroup.group === "Healthy" ? 110
    //              : bestGroup.group === "Type 2 Diabetes" ? 95
    //              : 105;
    // const overlayY = baseOverlayY - offset;
    
    // Extend upward if overlayY minus some extension is above yMinRect.
    const extension = 5; // adjust padding as needed
    const adjustedYMinRect = Math.min(yMinRect, overlayY - extension);
    
    // Draw the background rectangle.
    backgroundGroup.append("rect")
      .attr("x", 0)
      .attr("y", adjustedYMinRect)
      .attr("width", window.xScale.range()[1])
      .attr("height", yMaxRect - adjustedYMinRect)
      .attr("fill", lightenColor2(color(bestGroup.group), 0.3))
      .attr("opacity", 0.5);
  }
  
  // Make sure the background stays behind everything.
  backgroundGroup.lower();


  // Update overlay elements using the computed overlayY.
  const fg = window.foregroundGroup;
  const t = d3.transition().duration(500).ease(d3.easeCubic);
  const overlayData = [{ min: userMinGL, max: userMaxGL, y: overlayY }];
  
  // Update (or add) the overlay line.
  const line = fg.selectAll("line.user-glucose-line").data(overlayData);
  line.enter()
    .append("line")
    .attr("class", "user-glucose-line")
    .merge(line)
    .transition(t)
    .attr("x1", d => window.xScale(d.min))
    .attr("x2", d => window.xScale(d.max))
    .attr("y1", d => d.y)
    .attr("y2", d => d.y)
    .attr("stroke", "black")
    .attr("stroke-width", 2);
  line.exit().remove();
  
  // Update overlay dots.
  const dotsData = [
    { cx: userMinGL, y: overlayY },
    { cx: userMaxGL, y: overlayY }
  ];
  const dots = fg.selectAll("circle.user-glucose-dot").data(dotsData);
  dots.enter()
    .append("circle")
    .attr("class", "user-glucose-dot")
    .merge(dots)
    .transition(t)
    .attr("cx", d => window.xScale(d.cx))
    .attr("cy", d => d.y)
    .attr("r", 5)
    .attr("fill", "black");
  dots.exit().remove();
  
  // Update overlay label.
  const label = fg.selectAll("text.user-input-label").data(overlayData);
  label.enter()
    .append("text")
    .attr("class", "user-input-label")
    .merge(label)
    .transition().duration(300)
    .attr("x", -10)
    .attr("y", d => d.y + 5)
    .attr("text-anchor", "end")
    .style("font-size", "12px")
    .style("font-weight", "bold")
    .style("fill", color(bestGroup.group)) // Use best group's color
    .text("Your input");
  label.exit().remove();
}

window.updateUserGlucoseRange = updateUserGlucoseRange;



function computeMacroAverages(data) {
  const groups = ["Healthy", "Pre-Diabetes", "Type 2 Diabetes"];
  const macros = ["avgCarbs", "avgProtein", "avgFat", "avgFiber"];

  // Initialize an object to store averages for each group
  const averages = groups.map(group => {
    const groupData = data.filter(d => d.Diabetes === group);
    const macroAverages = macros.map(macro => {
      const validValues = groupData.filter(d => !isNaN(d[macro])).map(d => +d[macro]);
      return {
        macro,
        average: validValues.length ? d3.mean(validValues) : 0
      };
    });
    return { group, macroAverages };
  });

  return averages;
}



function renderMacroPieChart(macroAverages) {
  const containerWidth = 1000; // Width of the container for all pie charts
  const chartWidth = 300; // Width of each pie chart
  const chartHeight = 300; // Height of each pie chart
  const radius = Math.min(chartWidth, chartHeight) / 2.5; // Radius of each pie chart

  // Create a shared tooltip for all charts
  const tooltip = d3.select("body")
    .append("div")
    .attr("class", "tooltip")
    .style("position", "absolute")
    .style("background", "rgba(255, 255, 255, 0.9)")
    .style("padding", "8px")
    .style("border-radius", "4px")
    .style("box-shadow", "0px 0px 6px rgba(0, 0, 0, 0.2)")
    .style("pointer-events", "none")
    .style("opacity", 0);

  // Color scale with transparency
  const color = d3.scaleOrdinal([
    "rgba(179, 158, 181, 0.7)",  // Mauve for Carbs
    "rgba(136, 176, 75, 0.7)",   // Sage Green for Protein
    "rgba(224, 122, 95, 0.7)",   // e.g., for Fat
    "rgba(152, 176, 243, 0.7)"   // e.g., for Fiber
  ]);

  // Helper to format macro names
  const formatMacroName = (macro) => macro.replace("avg", "").toLowerCase();

  // Create a container for all pie charts
  const container = d3.select("#macroPieChartContainer")
    .style("width", `${containerWidth}px`)
    .style("margin", "0 auto")
    .style("display", "flex")
    .style("height", "400px")
    .style("justify-content", "space-between"); // Arrange pie charts horizontally

  // For each group in macroAverages, create its own chart container and render a pie chart.
  macroAverages.forEach((groupData, index) => {
    const totalValue = d3.sum(groupData.macroAverages, d => d.average);
    // Create a container div for this group's pie chart.
    const chartContainer = container.append("div")
      .attr("class", "chart-container")
      .style("width", `${chartWidth}px`)
      .style("text-align", "center");

    // Add Title for this chart.
    chartContainer.append("h2")
      .attr("class", "macroPieChartTitle")
      .style("font-size", "18px")
      .style("color", "#333")
      .style("font-weight", "600")

      .text(`${groupData.group}`);

    // Create the SVG container for this chart.
    const svg = chartContainer.append("svg")
      .attr("width", chartWidth)
      .attr("height", chartHeight)
      .attr("viewBox", `0 0 ${chartWidth} ${chartHeight}`) // Set viewBox to match width and height
      .append("g")
      .attr("transform", `translate(${chartWidth / 2}, ${chartHeight / 2})`); // Center the pie chart

    // Create pie and arc generators
    const pie = d3.pie().value(d => d.average)(groupData.macroAverages);
    const arc = d3.arc().innerRadius(50).outerRadius(radius);

    // Draw the arcs
    svg.selectAll("path")
      .data(pie)
      .enter()
      .append("path")
      .attr("d", arc)
      .attr("fill", (d, i) => color(i))
      .attr("stroke", "#fff")
      .style("stroke-width", "2px")
      .style("opacity", 0.9)
      .on("mouseover", function(event, d) {
        // Increase the arc radius for a pop-out effect
        d3.select(this)
          .transition()
          .duration(200)
          .attr("d", d3.arc().innerRadius(50).outerRadius(radius + 15));
        // Show tooltip with macro values.
        tooltip.style("opacity", 1)
          .html(`
            ${d.data.macro === "avgProtein" ? "Protein 🥩" : 
              d.data.macro === "avgCarbs" ? "Carbohydrates 🍞" : 
              d.data.macro === "avgFat" ? "Fats 🥑" : 
              d.data.macro === "avgFiber" ? "Fiber 🫛" : d.data.macro}<br/>
            Average: ${d.data.average.toFixed(2)}<br/>
            Group: ${groupData.group}
          `)
          .style("left", (event.pageX + 10) + "px")
          .style("top", (event.pageY - 28) + "px");
      })
      .on("mouseout", function(event, d) {
        // Return the arc to its original size.
        d3.select(this)
          .transition()
          .duration(200)
          .attr("d", arc);
        // Hide tooltip.
        tooltip.style("opacity", 0);
      });

    // Add text labels to the arcs.
    svg.selectAll("text")
      .data(pie)
      .enter()
      .append("text")
      .attr("text-anchor", "middle")
      .attr("font-size", "12px")
      .attr("font-weight", "bold")
      .attr("fill", "white")
      .text(d => `${formatMacroName(d.data.macro)}\n${((d.data.average / totalValue) * 100).toFixed(1)}%`)
      .attr("transform", d => `translate(${arc.centroid(d)})`);
  });
}


// function renderMacroPieChart(macroAverages) {
//   const width = 450, height = 450, radius = Math.min(width, height) / 2.5;

//   // Clear previous content
//   d3.select("#macroPieChartContainer").html("");

//   // Add Title - Styled professionally
//   const title = d3.select("#macroPieChartContainer")
//     .append("h2")
//     .attr("id", "macroPieChartTitle")
//     .style("text-align", "left")
//     .style("margin-bottom", "12px")
//     .style("font-size", "22px")
//     .style("color", "#333")
//     .style("font-weight", "600")
//     .text("Comparing Macronutrient Distributions");

//   // SVG Container
//   const svg = d3.select("#macroPieChartContainer")
//     .append("svg")
//     .attr("width", width)
//     .attr("height", height)
//     .append("g")
//     .attr("transform", `translate(${width / 2}, ${height / 2})`);

//   // Color Scale with Transparency
//   const color = d3.scaleOrdinal(["rgba(179, 158, 181, 0.7)",   // Mauve for Carbs
//     "rgba(136, 176, 75, 0.7)",    // Sage Green for Protein
//     "rgba(224, 122, 95, 0.7)",    
//     "rgba(152, 176, 243, 0.7)" ]); 

//   // Tooltip
//   const tooltip = d3.select("body")
//     .append("div")
//     .attr("class", "tooltip")
//     .style("position", "absolute")
//     .style("background", "rgba(255, 255, 255, 0.9)")
//     .style("padding", "8px")
//     .style("border-radius", "4px")
//     .style("box-shadow", "0px 0px 6px rgba(0, 0, 0, 0.2)")
//     .style("pointer-events", "none")
//     .style("opacity", 0);
//     const formatMacroName = (macro) => {
//       return macro.replace("avg", "").toLowerCase();
//     };
//     function updateChart(selectedGroup) {
//       const data = macroAverages.find(d => d.group === selectedGroup)?.macroAverages || [];
//       const pie = d3.pie().value(d => d.average)(data);
//       const arc = d3.arc().innerRadius(50).outerRadius(radius);
    
//       // Bind data to path elements
//       const path = svg.selectAll("path").data(pie);
    
//       // Enter + Update paths
//       const pathEnter = path.enter().append("path")
//         .attr("d", arc) // set initial shape
//         .attr("fill", (d, i) => color(i))
//         .attr("stroke", "#fff")
//         .style("stroke-width", "2px")
//         .style("opacity", 0.9);
    
//       // Merge new and existing paths
//       const allPaths = pathEnter.merge(path);
    
//       // Bind event listeners to the DOM elements (not the transition).
//       allPaths
//         .on("mouseover", function (event, d) {
//           // Highlight the segment by increasing its size (pop-out effect)
//           d3.select(this)
//             .transition()
//             .duration(200)
//             .attr("d", d3.arc().innerRadius(50).outerRadius(radius + 15));
//           // Show tooltip with macro values.
//           tooltip.style("opacity", 1)
//           .html(`
//             ${d.data.macro === "avgProtein" ? "Protein 🥩" : 
//               d.data.macro === "avgCarbs" ? "Carbohydrates 🍞" : 
//               d.data.macro === "avgFat" ? "Fats 🥑" : 
//               d.data.macro === "avgFiber" ? "Fiber 🫛" : d.data.macro}<br/>
//               Average: ${d.data.average.toFixed(2)}<br/>
//               Group: ${selectedGroup}
//             `)
//             .style("left", (event.pageX + 10) + "px")
//             .style("top", (event.pageY - 28) + "px");
//         })
//         .on("mouseout", function (event, d) {
//           // Return the segment to its original size.
//           d3.select(this)
//             .transition()
//             .duration(200)
//             .attr("d", arc);
//           // Hide tooltip.
//           tooltip.style("opacity", 0);
//         });
    
//       // Now, apply the smooth transition to update attributes.
//       allPaths.transition().duration(700)
//         .attr("d", arc)
//         .attr("fill", (d, i) => color(i))
//         .attr("stroke", "#fff")
//         .style("stroke-width", "2px")
//         .style("opacity", 0.9);
    
//       // Remove any old elements.
//       path.exit().remove();
    
//       // Update text labels.
//       const text = svg.selectAll("text").data(pie);
    
//       // Enter + Update text labels
//       const textEnter = text.enter().append("text")
//         .attr("text-anchor", "middle")
//         .attr("font-size", "14px")
//         .attr("font-weight", "bold")
//         .attr("fill", "white");
    
//       // Merge new and existing text labels
//       textEnter.merge(text)
//         .text(d => `${formatMacroName(d.data.macro)}: (${d.data.average.toFixed(1)}g)`)
//         .transition().duration(500)
//         .attr("transform", d => `translate(${arc.centroid(d)})`);
    
//       // Remove any old text elements.
//       text.exit().remove();
    
//       // Update Title Based on Selected Group.
//       title.text(`Comparing Daily Macronutrient Distribution: ${selectedGroup}`)
//         .style("font-weight", "bold");
//     }
//     svg.append("defs")
//     .append("filter")
//     .attr("id", "shadow")
//     .append("feDropShadow")
//     .attr("dx", 2)
//     .attr("dy", 2)
//     .attr("stdDeviation", 3)
//     .attr("flood-color", "rgba(0, 0, 0, 0.5)");

//   // Listen for changes in diabetes group selector
//   document.getElementById('slider-group').addEventListener('change', function() {
//     window.selectedDiabetesGroup = this.value;
//     updateChart(window.selectedDiabetesGroup);
//   });

//   // Initialize with default selection
//   updateChart(document.getElementById('slider-group').value);
// }



function plotAvgHRBoxPlot() {
  if (!window.subjectMetricsResults) return;
  const data = window.subjectMetricsResults;

  // Set dimensions and margins for the chart.
  const margin = { top: 0, right: 30, bottom: 70, left: 100 },
        width = 560 - margin.left - margin.right,
        height = 480 - margin.top - margin.bottom;

  // Append the SVG to the container.
  const svg = d3.select("#hr-container")
    .append("svg")
      .attr("width", width + margin.left + margin.right)
      .attr("height", height + margin.top + margin.bottom)
    .append("g")
      .attr("transform", `translate(${margin.left},${margin.top})`);

  // Define the color scale.
  const color = d3.scaleOrdinal()
    .domain(["Healthy", "Pre-Diabetes", "Type 2 Diabetes"])
    .range(["#2C7BB6", "#FDB863", "#D7191C"]);

  // Compute summary statistics per group using rollup.
  const sumstatMap = d3.rollup(
    data,
    v => {
      const values = v.map(g => +g.avgHR).sort(d3.ascending);
      const q1 = d3.quantile(values, 0.25),
            median = d3.quantile(values, 0.5),
            q3 = d3.quantile(values, 0.75);
      const interQuantileRange = q3 - q1;
      const computedMin = q1 - 1.5 * interQuantileRange;
      const actualMin = d3.min(values);
      const min = Math.max(computedMin, actualMin);
      const max = q3 + 1.5 * interQuantileRange;
      return { q1, median, q3, interQuantileRange, min, max };
    },
    d => (subjectData[d.subject] && subjectData[d.subject][0].Diabetes) || "Healthy"
  );

  // Convert the Map to an array.
  const sumstat = Array.from(sumstatMap, ([key, value]) => ({ key, value }));

  // Set up the Y scale with the three metabolic groups.
  const groups = ["Healthy", "Pre-Diabetes", "Type 2 Diabetes"];
  const y = d3.scaleBand()
    .range([0, height])
    .domain(groups)
    .padding(0.4);
  svg.append("g")
    .call(d3.axisLeft(y).tickSize(0))
    .select(".domain").remove();

  // Set up the X scale for Average HR.
  const minHR = d3.min(data, d => +d.avgHR),
        maxHR = d3.max(data, d => +d.avgHR);
  // Store these globally so slider event handlers can use them.
  window.hrMinHR = minHR;
  window.hrMaxHR = maxHR;
  const x = d3.scaleLinear()
    .domain([minHR - 5, maxHR + 5])
    .range([0, width]);
  // Save the x scale and y scale globally:
  window.hrXScale = x;
  window.hrYScale = y;

  // Append a visible X axis.
  svg.append("g")
    .attr("transform", `translate(0, ${height})`)
    .call(d3.axisBottom(x).ticks(5));

  // Add X axis label.
  svg.append("text")
    .attr("text-anchor", "middle")
    .attr("x", width / 2)
    .attr("y", height + margin.top + 30)
    .text("Average HR");

  // Draw vertical lines (whiskers) for each group.
  svg.selectAll("vertLines")
    .data(sumstat)
    .enter()
    .append("line")
      .attr("x1", d => x(d.value.min))
      .attr("x2", d => x(d.value.max))
      .attr("y1", d => y(d.key) + y.bandwidth() / 2)
      .attr("y2", d => y(d.key) + y.bandwidth() / 2)
      .attr("stroke", "black");

  // Draw the main boxes for each group.
  svg.selectAll("boxes")
    .data(sumstat)
    .enter()
    .append("rect")
      .attr("x", d => x(d.value.q1))
      .attr("width", d => x(d.value.q3) - x(d.value.q1))
      .attr("y", d => y(d.key))
      .attr("height", y.bandwidth())
      .attr("stroke", "black")
      .style("fill", d => color(d.key))
      .style("opacity", 0.3)
      .on("mouseover", function(event, d) {
          tooltip.transition().duration(200).style("opacity", 1);
          tooltip.html(
            `<strong>${d.key}</strong><br>
             Q1: ${d.value.q1.toFixed(1)}<br>
             Median: ${d.value.median.toFixed(1)}<br>
             Q3: ${d.value.q3.toFixed(1)}<br>
             IQR: ${d.value.interQuantileRange.toFixed(1)}<br>
             Min: ${d.value.min.toFixed(1)}<br>
             Max: ${d.value.max.toFixed(1)}`
          )
          .style("left", (event.pageX + 10) + "px")
          .style("top", (event.pageY + 10) + "px");
      })
      .on("mouseleave", function() {
          tooltip.transition().duration(200).style("opacity", 0);
      });

  // Draw median lines.
  svg.selectAll("medianLines")
    .data(sumstat)
    .enter()
    .append("line")
      .attr("x1", d => x(d.value.median))
      .attr("x2", d => x(d.value.median))
      .attr("y1", d => y(d.key))
      .attr("y2", d => y(d.key) + y.bandwidth())
      .attr("stroke", "black");

  // Create a tooltip for the points.
  let tooltip = d3.select("#hr-container").select(".tooltip");
  if (tooltip.empty()) {
    tooltip = d3.select("#hr-container")
      .append("div")
      .attr("class", "tooltip")
      .style("opacity", 0)
      .style("position", "absolute")
      .style("background", "lightgrey")
      .style("border-radius", "4px")
      .style("padding", "8px")
      .style("pointer-events", "none")
      .style("font-size", "16px");
  }

  // -- Add individual points with jitter for each subject's avgHR.
  const jitterWidth = 50;
  svg.selectAll("indPoints")
    .data(data)
    .enter()
    .append("circle")
      .attr("cx", d => x(d.avgHR))
      .attr("cy", d => {
         const group = (subjectData[d.subject] && subjectData[d.subject][0].Diabetes) || "Healthy";
         return y(group) + y.bandwidth() / 2 - jitterWidth/2 + Math.random() * jitterWidth;
      })
      .attr("r", 4)
      .attr("fill", d => {
         const group = (subjectData[d.subject] && subjectData[d.subject][0].Diabetes) || "Healthy";
         return color(group);
      })
      .attr("stroke", "black")
      .on("mouseover", function(event, d) {
          tooltip.transition().duration(200).style("opacity", 1);
          tooltip.html("<span style='color:grey'>Average HR: </span>" + d.avgHR)
                 .style("left", (event.pageX + 30) + "px")
                 .style("top", (event.pageY + 30) + "px");
      })
      .on("mouseleave", function() {
          tooltip.transition().duration(200).style("opacity", 0);
      });
    // Set default selected group if none.
    if (!window.selectedDiabetesGroup) {
      window.selectedDiabetesGroup = "Healthy";
    }

    // Append a dot for each group.
  const sliderDots = svg.selectAll(".hr-slider-dot")
  .data(groups)
  .enter()
  .append("circle")
  .attr("class", "hr-slider-dot")
  .attr("cx", window.hrXScale(sliderValues.avgHR))  // x position based on slider value.
  .attr("cy", d => window.hrYScale(d) + window.hrYScale.bandwidth() / 2)  // y position based on the group.
  .attr("r", 4)
  .attr("fill", "black")
  .attr("stroke", "black")
  .attr("stroke-width", 2);
}

document.getElementById('slider-hr').setAttribute('min', 40);
document.getElementById('slider-hr').setAttribute('max', window.hrMaxHR);


function createResponsiveSVG(containerSelector, margin = { top: 40, right: 30, bottom: 40, left: 100 }) {
  const container = document.querySelector(containerSelector);
  if (!container) {
    console.error("Container not found: " + containerSelector);
    return;
  }
  const containerWidth = container.clientWidth;
  const containerHeight = container.clientHeight;
  const width = containerWidth - margin.left - margin.right;
  const height = containerHeight - margin.top - margin.bottom;

  // Remove any existing SVG
  d3.select(container).select("svg").remove();

  const svg = d3.select(container)
    .append("svg")
    .attr("width", containerWidth)
    .attr("height", containerHeight)
    .attr("viewBox", `0 0 ${containerWidth} ${containerHeight}`)
    .attr("preserveAspectRatio", "xMidYMid meet")
    .append("g")
    .attr("transform", `translate(${margin.left},${margin.top})`);

  return { svg, width, height, margin };
}

window.addEventListener("resize", () => {
  // Clear the old chart (or re-run all plots)
  plotGLRange();
  // Repeat for other plots…
});

// This function updates the glucose prediction text.
function updateGlucosePrediction() {
  const minGlucose = document.getElementById('slider-glucose-min-value').textContent;
  const maxGlucose = document.getElementById('slider-glucose-max-value').textContent;
  const predictionGlucoseEl = document.getElementById('prediction-glucose');
  if (predictionGlucoseEl) {
    predictionGlucoseEl.innerHTML = `Your Glucose Range: <strong>${minGlucose}</strong> - <strong>${maxGlucose}</strong> mg/dL`;
  }
}

function setupGlucoseSlider() {
  const slider = document.querySelector('.range-slider');
  const minValue = 40;    // Define your minimum glucose value.
  const maxValue = 410;   // Define your maximum glucose value.
  
  // --- For the minimum slider thumb ---
  const thumbMin = document.getElementById('thumb-min');
  let isDraggingMin = false;
  
  thumbMin.addEventListener('mousedown', function(e) {
    isDraggingMin = true;
    document.addEventListener('mousemove', onMouseMoveMin);
    document.addEventListener('mouseup', onMouseUpMin);
  });
  
  function onMouseMoveMin(e) {
    if (!isDraggingMin) return;
    const sliderRect = slider.getBoundingClientRect();
    let pos = e.clientX - sliderRect.left;
    
    // Use getComputedStyle to reliably get thumbMax's position.
    const thumbMaxPos = parseFloat(window.getComputedStyle(thumbMax).left) || sliderRect.width;
    pos = Math.min(pos, thumbMaxPos);
    pos = Math.max(pos, 0);
    
    const newMinValue = minValue + (pos / sliderRect.width) * (maxValue - minValue);
    document.getElementById('slider-glucose-min-value').textContent = newMinValue.toFixed(2);
    
    thumbMin.style.left = `${pos}px`;
    updateGlucosePrediction();
  }
  
  function onMouseUpMin(e) {
    isDraggingMin = false;
    document.removeEventListener('mousemove', onMouseMoveMin);
    document.removeEventListener('mouseup', onMouseUpMin);
  }
  
  // --- For the maximum slider thumb ---
  const thumbMax = document.getElementById('thumb-max');
  let isDraggingMax = false;
  
  thumbMax.addEventListener('mousedown', function(e) {
    isDraggingMax = true;
    document.addEventListener('mousemove', onMouseMoveMax);
    document.addEventListener('mouseup', onMouseUpMax);
  });
  
  function onMouseMoveMax(e) {
    if (!isDraggingMax) return;
    const sliderRect = slider.getBoundingClientRect();
    let pos = e.clientX - sliderRect.left;
    
    // Use getComputedStyle to reliably get thumbMin's left position
    const thumbMinPos = parseFloat(window.getComputedStyle(thumbMin).left) || 0;
    
    // Constrain pos so that max thumb cannot go left of the min thumb.
    pos = Math.max(pos, thumbMinPos);
    pos = Math.min(pos, sliderRect.width);
    
    const newMaxValue = minValue + (pos / sliderRect.width) * (maxValue - minValue);
    document.getElementById('slider-glucose-max-value').textContent = newMaxValue.toFixed(2);
    
    // Update the max thumb's position.
    thumbMax.style.left = `${pos}px`;
    updateGlucosePrediction();
  }
  
  function onMouseUpMax(e) {
    isDraggingMax = false;
    document.removeEventListener('mousemove', onMouseMoveMax);
    document.removeEventListener('mouseup', onMouseUpMax);
  }
}

// Ensure that the slider is set up after the DOM has loaded.
document.addEventListener("DOMContentLoaded", function() {
  setupGlucoseSlider();
});


// Create the nutrition label element from data.
function createNutritionFactsLabel(data, macronutrients = ["fat", "carbs", "protein", "fiber"]) {
  const label = document.createElement('div');
  label.classList.add('nutrition-label');

  const baseHTML = `
    <style>
      .nutrition-label {
        border: 1px solid black;
        width: 300px;
        font-family: Arial, sans-serif;
        padding: 10px;
        background: white;
        margin: 20px auto;
      }
      .nutrition-label h1 {
        font-size: 24px;
        margin: 0;
        border-bottom: 10px solid black;
        padding-bottom: 5px;
      }
      /* Removed the Day header styling */
      .nutrition-label .section {
        border-bottom: 1px dashed black;
        padding: 5px 0;
        margin-bottom: 5px;
      }
      .flex-section {
        display: flex;
        justify-content: space-between;
      }
      .nutrition-label .small {
        font-size: 10px;
      }
      /* Style for clickable labels */
      .clickable-label {
        text-decoration: underline;
        cursor: pointer;
      }
    </style>
    <h1>${data.subject ? "Subject " + data.subject + "'s Nutrition Facts" : "Nutrition Facts"}</h1>
    <div class="section" style="font-size: 32px; font-weight: bold;">
      <span class="clickable-label" data-key="calories">Calories:</span> ${data.calories || 0}
    </div>
    <div class="section small"><div>% Daily Value*</div></div>
  `;

  // Mapping for the macronutrients.
  const nutrientMapping = {
    fat: { name: "Total Fat", unit: "g", value: data.fat || 0, daily: data.dailyFat || 0 },
    carbs: { name: "Total Carbohydrate", unit: "g", value: data.carbs || 0, daily: data.dailyCarbs || 0 },
    protein: { name: "Protein", unit: "g", value: data.protein || 0, daily: data.dailyProtein || 0 },
    fiber: { name: "Dietary Fiber", unit: "g", value: data.fiber || 0, daily: data.dailyFiber || 0 }
  };
  let nutrientHTML = '';
  macronutrients.forEach(key => {
    if (nutrientMapping[key]) {
      const nutrient = nutrientMapping[key];
      nutrientHTML += `
        <div class="section flex-section">
          <div>
            <span class="clickable-label" data-key="${key}">${nutrient.name}:</span> ${nutrient.value}${nutrient.unit}
          </div>
          <div class="daily-value">${nutrient.daily}%</div>
        </div>
      `;
    }
  });

  const footnoteHTML = `
    <div class="small">
      *Percent Daily Values are based on a 2,000 calorie diet.
    </div>
  `;
  label.innerHTML = baseHTML + nutrientHTML + footnoteHTML;
  return label;
}


// function plotSubjectLabel(subjectNum, diabetesGroup) {
//   // Create or retrieve the main details container.
//   let container = d3.select("#subject-details-container");
//   if (container.empty()) {
//     container = d3.select("#visualization")
//       .append("div")
//       .attr("id", "subject-details-container")
//       .style("padding", "20px")
//       .style("background-color", "white");
//   }

//   // Create or retrieve the header container.
//   let headerContainer = container.select("#header-container");
//   if (headerContainer.empty()) {
//     headerContainer = container.insert("div", ":first-child")
//       .attr("id", "header-container")
//       .style("position", "relative")
//       .style("margin-bottom", "20px");
//     // Create the header h1 with initial text that includes the subject and its group.
//     headerContainer.append("h1")
//       .attr("id", "subject-header")
//       .text(`Subject ${subjectNum} - ${diabetesGroup} | Day 1`)
//       .style("margin", "0")
//       .style("text-align", "center");
//   } else {
//     // If header already exists (perhaps created earlier), update its text.
//     d3.select("#subject-header")
//       .text(`Subject ${subjectNum} - ${diabetesGroup} | Day 1`);
//   }

//   // Create or retrieve the top bar for slider controls.
//   let topBar = container.select("#top-bar");
//   if (topBar.empty()) {
//     topBar = container.append("div")
//       .attr("id", "top-bar")
//       .style("display", "flex")
//       .style("justify-content", "space-between")
//       .style("align-items", "center")
//       .style("background", "#f0f0f0")
//       .style("padding", "10px")
//       .style("border", "1px solid #ccc")
//       .style("margin-bottom", "10px");
//   }
//   // Remove any existing slider to avoid duplicates.
//   topBar.select("#day-slider").remove();

//   // Append the day slider.
//   const slider = topBar.append("input")
//     .attr("type", "range")
//     .attr("id", "day-slider")
//     .style("width", "150px")
//     .style("margin-right", "10px");

//   // Create or retrieve the label container for nutrition info.
//   let labelContainer = container.select("#subject-label-container");
//   if (labelContainer.empty()) {
//     labelContainer = container.append("div")
//       .attr("id", "subject-label-container")
//       .style("padding", "10px")
//       .style("background-color", "white");
//   } else {
//     labelContainer.html("");
//   }

//   // Build CSV path using subjectNum padded to three digits.
//   const subjectStr = subjectNum.toString().padStart(3, '0');
//   const csvPath = `data/CGMacros-${subjectStr}/CGMacros-${subjectStr}.csv`;
//   console.log("DEBUG: Loading CSV from:", csvPath);

//   d3.csv(csvPath).then(function(csvData) {
//     const parseTime = d3.timeParse("%Y-%m-%d %H:%M:%S");
//     const formatDay = d3.timeFormat("%Y-%m-%d");

//     // Filter rows with a valid "Meal Type".
//     const filteredCSV = csvData.filter(d => d["Meal Type"] && d["Meal Type"].trim() !== "");
//     if (filteredCSV.length === 0) {
//       console.error("DEBUG: No valid rows after filtering 'Meal Type'.");
//       return;
//     }

//     // Convert fields.
//     filteredCSV.forEach(d => {
//       d.timestamp = parseTime(d.Timestamp);
//       d.day = formatDay(d.timestamp);
//       d.Calories = +d.Calories;
//       d.Carbs = +d.Carbs;
//       d.Protein = +d.Protein;
//       d.Fat = +d.Fat;
//       d.Fiber = +d.Fiber;
//       d["Libre GL"] = +d["Libre GL"];
//     });

//     // Group data by day.
//     const dailyData = Array.from(
//       d3.group(filteredCSV, d => d.day),
//       ([day, values]) => ({
//         day,
//         totalCalories: d3.sum(values, d => d.Calories),
//         totalCarbs: d3.sum(values, d => d.Carbs),
//         totalProtein: d3.sum(values, d => d.Protein),
//         totalFat: d3.sum(values, d => d.Fat),
//         totalFiber: d3.sum(values, d => d.Fiber)
//       })
//     );
//     dailyData.sort((a, b) => new Date(a.day) - new Date(b.day));
//     console.log("DEBUG: Computed dailyData:", dailyData);

//     // Define recommended nutritional values.
//     const recommendedValues = {
//       avgCarbs: 300,
//       avgProtein: 50,
//       avgFat: 70,
//       avgFiber: 30
//     };

//     // Set slider attributes (slider is 1-indexed).
//     slider.attr("min", 1)
//       .attr("max", dailyData.length)
//       .attr("value", 1);

//     // Function to update both the nutrition label and header text.
//     function updateLabel(dayIndex) {
//       const d0 = dailyData[dayIndex - 1];
//       if (!d0) return;
//       const nfData = {
//         day: dayIndex,
//         calories: +d0.totalCalories.toFixed(1),
//         fat: +d0.totalFat.toFixed(1),
//         dailyFat: ((+d0.totalFat / recommendedValues.avgFat) * 100).toFixed(1),
//         carbs: +d0.totalCarbs.toFixed(1),
//         dailyCarbs: ((+d0.totalCarbs / recommendedValues.avgCarbs) * 100).toFixed(1),
//         protein: +d0.totalProtein.toFixed(1),
//         dailyProtein: ((+d0.totalProtein / recommendedValues.avgProtein) * 100).toFixed(1),
//         fiber: +d0.totalFiber.toFixed(1),
//         dailyFiber: ((+d0.totalFiber / recommendedValues.avgFiber) * 100).toFixed(1)
//       };

//       // Update the nutrition label.
//       labelContainer.html("");
//       labelContainer.node().appendChild(createNutritionFactsLabel(nfData));

//       // Update header text to reflect the current day while keeping subject and group.
//       d3.select("#subject-header")
//         .text(`Subject ${subjectNum} - ${diabetesGroup} | Day ${dayIndex}`);

//       // Optionally: update timeline filtering based on d0.day.
//       loadAndRenderTimeline(subjectNum, d0.day);
//     }

//     // Listen for slider events.
//     slider.on("input", function() {
//       const val = parseInt(this.value);
//       console.log("Slider value changed to:", val);
//       updateLabel(val);
//     });

//     // Initial update for day 1.
//     updateLabel(1);
//   }).catch(function(error) {
//     console.error(`DEBUG: Error loading subject ${subjectNum} CSV:`, error);
//   });
// }

function plotSubjectLabel(subjectNum, diabetesGroup, containerSelector = "#subject-details-container") {
  let container = d3.select(containerSelector);
  if (container.empty()) {
    container = d3.select("#visualization")
      .append("div")
      .attr("id", containerSelector.replace("#", ""))
      .style("padding", "20px")
      .style("background-color", "white");
  }

  // Remove any existing header to force re-creation.
  container.select("#header-container").remove();

  // Create a new header container and h1.
  const headerContainer = container.append("div")
    .attr("id", "header-container")
    .style("position", "relative")
    .style("margin-bottom", "20px");

  headerContainer.append("h1")
    .attr("id", "subject-header")
    .text(`Subject ${subjectNum} - ${diabetesGroup} | Day 1`)
    .style("margin", "0")
    .style("text-align", "center");

  // Update the header text to reflect the current day while keeping subject and group.
  d3.select("#subject-header")
    .text(`Subject ${subjectNum} - ${diabetesGroup} | Day 1`);

  // Create or retrieve the top bar for slider controls.
  let topBar = container.select("#top-bar");
  if (topBar.empty()) {
    topBar = container.append("div")
      .attr("id", "top-bar")
      .style("display", "flex")
      .style("justify-content", "space-between")
      .style("align-items", "center")
      .style("background", "#f0f0f0")
      .style("padding", "10px")
      .style("border", "1px solid #ccc")
      .style("margin-bottom", "10px");
  }
  // Remove any existing slider to avoid duplicates.
  topBar.select("#day-slider").remove();

  // Append the day slider.
  const slider = topBar.append("input")
    .attr("type", "range")
    .attr("id", "day-slider")
    .style("width", "150px")
    .style("margin-right", "10px");

  // Create or retrieve the label container for nutrition info.
  let labelContainer = container.select("#subject-label-container");
  if (labelContainer.empty()) {
    labelContainer = container.append("div")
      .attr("id", "subject-label-container")
      .style("padding", "10px")
      .style("background-color", "white");
  } else {
    labelContainer.html("");
  }

  // Build CSV path using subjectNum padded to three digits.
  const subjectStr = subjectNum.toString().padStart(3, '0');
  const csvPath = `data/CGMacros-${subjectStr}/CGMacros-${subjectStr}.csv`;
  console.log("DEBUG: Loading CSV from:", csvPath);

  d3.csv(csvPath).then(function(csvData) {
    const parseTime = d3.timeParse("%Y-%m-%d %H:%M:%S");
    const formatDay = d3.timeFormat("%Y-%m-%d");

    // Filter rows with a valid "Meal Type".
    const filteredCSV = csvData.filter(d => d["Meal Type"] && d["Meal Type"].trim() !== "");
    if (filteredCSV.length === 0) {
      console.error("DEBUG: No valid rows after filtering 'Meal Type'.");
      return;
    }

    // Convert fields.
    filteredCSV.forEach(d => {
      d.timestamp = parseTime(d.Timestamp);
      d.day = formatDay(d.timestamp);
      d.Calories = +d.Calories;
      d.Carbs = +d.Carbs;
      d.Protein = +d.Protein;
      d.Fat = +d.Fat;
      d.Fiber = +d.Fiber;
      d["Libre GL"] = +d["Libre GL"];
    });

    // Group data by day.
    const dailyData = Array.from(
      d3.group(filteredCSV, d => d.day),
      ([day, values]) => ({
        day,
        totalCalories: d3.sum(values, d => d.Calories),
        totalCarbs: d3.sum(values, d => d.Carbs),
        totalProtein: d3.sum(values, d => d.Protein),
        totalFat: d3.sum(values, d => d.Fat),
        totalFiber: d3.sum(values, d => d.Fiber)
      })
    );
    dailyData.sort((a, b) => new Date(a.day) - new Date(b.day));
    console.log("DEBUG: Computed dailyData:", dailyData);

    // Define recommended nutritional values.
    const recommendedValues = {
      avgCarbs: 300,
      avgProtein: 50,
      avgFat: 70,
      avgFiber: 30
    };

    // Set slider attributes (slider is 1-indexed).
    slider.attr("min", 1)
      .attr("max", dailyData.length)
      .attr("value", 1);

    // Function to update both the nutrition label and header text.
    function updateLabel(dayIndex) {
      const d0 = dailyData[dayIndex - 1];
      if (!d0) return;
      const nfData = {
        day: dayIndex,
        calories: +d0.totalCalories.toFixed(1),
        fat: +d0.totalFat.toFixed(1),
        dailyFat: ((+d0.totalFat / recommendedValues.avgFat) * 100).toFixed(1),
        carbs: +d0.totalCarbs.toFixed(1),
        dailyCarbs: ((+d0.totalCarbs / recommendedValues.avgCarbs) * 100).toFixed(1),
        protein: +d0.totalProtein.toFixed(1),
        dailyProtein: ((+d0.totalProtein / recommendedValues.avgProtein) * 100).toFixed(1),
        fiber: +d0.totalFiber.toFixed(1),
        dailyFiber: ((+d0.totalFiber / recommendedValues.avgFiber) * 100).toFixed(1)
      };

      // Update the nutrition label.
      labelContainer.html("");
      labelContainer.node().appendChild(createNutritionFactsLabel(nfData));

      // Update header text to reflect the current day while keeping subject and group.
      d3.select("#subject-header")
        .text(`Subject ${subjectNum} - ${diabetesGroup} | Day ${dayIndex}`);

      // Optionally: update timeline filtering based on d0.day.
      loadAndRenderTimeline(subjectNum, d0.day);
    }

    // Listen for slider events.
    slider.on("input", function() {
      const val = parseInt(this.value);
      console.log("Slider value changed to:", val);
      updateLabel(val);
    });

    // Initial update for day 1.
    updateLabel(1);
  }).catch(function(error) {
    console.error(`DEBUG: Error loading subject ${subjectNum} CSV:`, error);
  });
}

// function plotSubjectLabel(subjectNum, diabetesGroup) {
//   // Create or retrieve the main details container.
//   let container = d3.select("#subject-details-container");
//   if (container.empty()) {
//     container = d3.select("#visualization")
//       .append("div")
//       .attr("id", "subject-details-container")
//       .style("padding", "20px")
//       .style("background-color", "white");
//   }

//   // Create or retrieve the header container.
//   let headerContainer = container.select("#header-container");
//   if (headerContainer.empty()) {
//     headerContainer = container.insert("div", ":first-child")
//       .attr("id", "header-container")
//       .style("position", "relative")
//       .style("margin-bottom", "20px");
//     // Create the header h1 with initial text that includes the subject and its group.
//     headerContainer.append("h1")
//       .attr("id", "subject-header")
//       .text(`Subject ${subjectNum} - ${diabetesGroup} | Day 1`)
//       .style("margin", "0")
//       .style("text-align", "center");
//   } else {
//     // If header already exists (perhaps created earlier), update its text.
//     d3.select("#subject-header")
//       .text(`Subject ${subjectNum} - ${diabetesGroup} | Day 1`);
//   }

//   // Create or retrieve the top bar for slider controls.
//   let topBar = container.select("#top-bar");
//   if (topBar.empty()) {
//     topBar = container.append("div")
//       .attr("id", "top-bar")
//       .style("display", "flex")
//       .style("justify-content", "space-between")
//       .style("align-items", "center")
//       .style("background", "#f0f0f0")
//       .style("padding", "10px")
//       .style("border", "1px solid #ccc")
//       .style("margin-bottom", "10px");
//   }
//   // Remove any existing slider to avoid duplicates.
//   topBar.select("#day-slider").remove();

//   // Append the day slider.
//   const slider = topBar.append("input")
//     .attr("type", "range")
//     .attr("id", "day-slider")
//     .style("width", "150px")
//     .style("margin-right", "10px");

//   // Create or retrieve the label container for nutrition info.
//   let labelContainer = container.select("#subject-label-container");
//   if (labelContainer.empty()) {
//     labelContainer = container.append("div")
//       .attr("id", "subject-label-container")
//       .style("padding", "10px")
//       .style("background-color", "white");
//   } else {
//     labelContainer.html("");
//   }

//   // Build CSV path using subjectNum padded to three digits.
//   const subjectStr = subjectNum.toString().padStart(3, '0');
//   const csvPath = `data/CGMacros-${subjectStr}/CGMacros-${subjectStr}.csv`;
//   console.log("DEBUG: Loading CSV from:", csvPath);

//   d3.csv(csvPath).then(function(csvData) {
//     const parseTime = d3.timeParse("%Y-%m-%d %H:%M:%S");
//     const formatDay = d3.timeFormat("%Y-%m-%d");

//     // Filter rows with a valid "Meal Type".
//     const filteredCSV = csvData.filter(d => d["Meal Type"] && d["Meal Type"].trim() !== "");
//     if (filteredCSV.length === 0) {
//       console.error("DEBUG: No valid rows after filtering 'Meal Type'.");
//       return;
//     }

//     // Convert fields.
//     filteredCSV.forEach(d => {
//       d.timestamp = parseTime(d.Timestamp);
//       d.day = formatDay(d.timestamp);
//       d.Calories = +d.Calories;
//       d.Carbs = +d.Carbs;
//       d.Protein = +d.Protein;
//       d.Fat = +d.Fat;
//       d.Fiber = +d.Fiber;
//       d["Libre GL"] = +d["Libre GL"];
//     });

//     // Group data by day.
//     const dailyData = Array.from(
//       d3.group(filteredCSV, d => d.day),
//       ([day, values]) => ({
//         day,
//         totalCalories: d3.sum(values, d => d.Calories),
//         totalCarbs: d3.sum(values, d => d.Carbs),
//         totalProtein: d3.sum(values, d => d.Protein),
//         totalFat: d3.sum(values, d => d.Fat),
//         totalFiber: d3.sum(values, d => d.Fiber)
//       })
//     );
//     dailyData.sort((a, b) => new Date(a.day) - new Date(b.day));
//     console.log("DEBUG: Computed dailyData:", dailyData);

//     // Define recommended nutritional values.
//     const recommendedValues = {
//       avgCarbs: 300,
//       avgProtein: 50,
//       avgFat: 70,
//       avgFiber: 30
//     };

//     // Set slider attributes (slider is 1-indexed).
//     slider.attr("min", 1)
//       .attr("max", dailyData.length)
//       .attr("value", 1);

//     // Function to update both the nutrition label and header text.
//     function updateLabel(dayIndex) {
//       const d0 = dailyData[dayIndex - 1];
//       if (!d0) return;
//       const nfData = {
//         day: dayIndex,
//         calories: +d0.totalCalories.toFixed(1),
//         fat: +d0.totalFat.toFixed(1),
//         dailyFat: ((+d0.totalFat / recommendedValues.avgFat) * 100).toFixed(1),
//         carbs: +d0.totalCarbs.toFixed(1),
//         dailyCarbs: ((+d0.totalCarbs / recommendedValues.avgCarbs) * 100).toFixed(1),
//         protein: +d0.totalProtein.toFixed(1),
//         dailyProtein: ((+d0.totalProtein / recommendedValues.avgProtein) * 100).toFixed(1),
//         fiber: +d0.totalFiber.toFixed(1),
//         dailyFiber: ((+d0.totalFiber / recommendedValues.avgFiber) * 100).toFixed(1)
//       };

//       // Update the nutrition label.
//       labelContainer.html("");
//       labelContainer.node().appendChild(createNutritionFactsLabel(nfData));

//       // Update header text to reflect the current day while keeping subject and group.
//       d3.select("#subject-header")
//         .text(`Subject ${subjectNum} - ${diabetesGroup} | Day ${dayIndex}`);

//       // Optionally: update timeline filtering based on d0.day.
//       loadAndRenderTimeline(subjectNum, d0.day);
//     }

//     // Listen for slider events.
//     slider.on("input", function() {
//       const val = parseInt(this.value);
//       console.log("Slider value changed to:", val);
//       updateLabel(val);
//     });

//     // Initial update for day 1.
//     updateLabel(1);
//   }).catch(function(error) {
//     console.error(`DEBUG: Error loading subject ${subjectNum} CSV:`, error);
//   });
// }

// function plotSubjectLabel(subjectNum, diabetesGroup, containerSelector = "#visualization") {
//   // Select the container passed in.
//   const container = d3.select(containerSelector);
//   if (container.empty()) {
//     console.error(`Container ${containerSelector} not found.`);
//     return;
//   }

//   // Clear any existing content in the container.
//   container.html("");

//   // Append a header showing subject number and diabetes group.
//   container.append("h1")
//     .text(`Subject ${subjectNum} - ${diabetesGroup}`)
//     .style("text-align", "center");

//   // Append a slider for day selection.
//   container.append("input")
//     .attr("type", "range")
//     .attr("id", "day-slider")
//     .attr("min", 1)
//     .attr("max", 10)
//     .attr("value", 1)
//     .style("width", "100%");

//   // Append a container for the nutrition label.
//   container.append("div")
//     .attr("id", "nutrition-label-container")
//     .style("border", "1px solid #ccc")
//     .style("padding", "10px")
//     .style("margin-top", "10px")
//     .node()
//     .appendChild(createNutritionFactsLabel({ subject: subjectNum, calories: 200 }));
// }

const parseTime = d3.timeParse("%Y-%m-%d %H:%M:%S");
const formatTime = d3.timeFormat("%Y-%m-%d %H:%M:%S");
const formatTimeToHoursMinutes = d3.timeFormat("%H:%M");

d3.csv("data/CGMacros-032/CGMacros-032.csv").then(function (csvData) {
 
  // Parse timestamps and filter rows with valid image paths
  const parseTime = d3.timeParse("%Y-%m-%d %H:%M:%S");

  // Filter rows with valid image paths and parse timestamps
  const imageData = csvData
    .filter(d => d["Image path"] && d["Image path"].trim() !== "")
    .map(d => ({
      timestamp: parseTime(d.Timestamp),
      imagePath: `data/CGMacros-032/${d["Image path"].trim()}`
    }));

  // Call the function to render the timeline
  renderTimeline(imageData);
}).catch(function (error) {
  console.error("Error loading or processing CSV file:", error);
});

function renderTimeline(imageData) {
  d3.select("#timeline-container").remove();
  
  const container = d3.select("#subject-details-container")
    .append("div")
    .attr("id", "timeline-container")
    .style("width", "100%")
    .style("overflow-x", "auto")
    .style("white-space", "nowrap")
    .style("margin-top", "20px");


  // If there are less than 5 images, center them.
  if (imageData.length < 5) {
    container.style("display", "flex")
             .style("justify-content", "center");
  }
  
  // Nutrition tooltip element
  const tooltip = d3.select("body")
    .append("div")
    .attr("class", "image-tooltip")
    .style("position", "absolute")
    .style("background", "rgba(255, 255, 255, 0.95)")
    .style("border", "1px solid #ddd")
    .style("pointer-events", "none")
    .style("opacity", 0);

  container.selectAll(".timeline-image")
    .data(imageData)
    .enter()
    .append("div")
    .attr("class", "timeline-image")
    .style("display", "inline-block")
    .style("margin-right", "15px")
    .style("vertical-align", "top")
    .on("mouseover", function(event, d) {
      if (!isNaN(d.Carbs) && !isNaN(d.Protein) && !isNaN(d.Fat) && !isNaN(d.Fiber)) {
        tooltip.html(`
          <div class="nutrition-tooltip">
            <strong>${d['Meal Type'] || 'Meal'}</strong>
            <div>Calories: ${d.Calories.toFixed(1)} kcal</div>
            <div>Carbs: ${d.Carbs.toFixed(1)}g</div>
            <div>Protein: ${d.Protein.toFixed(1)}g</div>
            <div>Fat: ${d.Fat.toFixed(1)}g</div>
            <div>Fiber: ${d.Fiber.toFixed(1)}g</div>
          </div>
        `)
        .style("left", (event.pageX + 15) + "px")
        .style("top", (event.pageY - 28) + "px")
        .style("opacity", 1);
      }
    })
    .on("mouseout", () => tooltip.style("opacity", 0))
    .each(function(d) {
      const div = d3.select(this);
      div.append("img")
        .attr("src", d.imagePath)
        .attr("alt", `Meal at ${d.timestamp.toLocaleTimeString()}`)
        .style("width", "180px")
        .style("height", "180px")
        .style("object-fit", "cover")
        .style("border-radius", "4px");
      
        div.append("div")
        .style("font-size", "16px")
        .style("margin-top", "6px")
        .style("color", "#666")
        .style("font-weight", "bold")
        .text(d.timestamp.toLocaleTimeString([], {hour: '2-digit', minute: '2-digit'}));
    });
}

// function renderTimeline(imageData) {
//   // Remove any previous timeline container.
//   d3.select("#timeline-container").remove();

//   // Create a new timeline container with forced horizontal scrolling.
//   const container = d3.select("#subject-details-container")
//     .append("div")
//     .attr("id", "timeline-container")
//     .style("width", "100%")
//     .style("overflow-x", "auto")    // Enable horizontal scrolling
//     .style("overflow-y", "hidden")  // Disable vertical scrolling if not needed
//     .style("white-space", "nowrap"); // Keep images on one line

//   // If there are more than 5 images, force the container to be wider than its parent.
//   if (imageData.length > 5) {
//     const imageWidth = 180;
//     const marginRight = 15;
//     const totalWidth = imageData.length * (imageWidth + marginRight);
//     container.style("min-width", totalWidth + "px");
//   } else {
//     // Otherwise, center the images.
//     container.style("display", "flex")
//              .style("justify-content", "center");
//   }

//   // Append each image item into the container.
//   container.selectAll(".timeline-image")
//     .data(imageData)
//     .enter()
//     .append("div")
//     .attr("class", "timeline-image")
//     .style("display", "inline-block")
//     .style("margin-right", "15px")
//     .style("vertical-align", "top")
//     .on("mouseover", function(event, d) {
//         // Optional: show a tooltip.
//     })
//     .on("mouseout", function() {
//         // Optional: hide the tooltip.
//     })
//     .each(function(d) {
//         const div = d3.select(this);
//         div.append("img")
//            .attr("src", d.imagePath)
//            .attr("alt", `Meal at ${d.timestamp.toLocaleTimeString()}`)
//            .style("width", "180px")
//            .style("height", "180px")
//            .style("object-fit", "cover")
//            .style("border-radius", "4px");
//         div.append("div")
//            .style("font-size", "12px")
//            .style("margin-top", "6px")
//            .style("color", "#666")
//            .text(d.timestamp.toLocaleTimeString());
//     });
// }
// function renderTimeline(imageData) {
//   // Remove any previous timeline container.
//   d3.select("#timeline-container").remove();

//   // Create a new timeline container.
//   const container = d3.select("#subject-details-container")
//   .append("div")
//   .attr("id", "timeline-container")
//   .style("width", "100%")
//   .style("overflow-x", "auto")   // Enable horizontal scrolling
//   .style("overflow-y", "hidden") // Disable vertical scrolling if not needed
//   .style("white-space", "nowrap") // Keep images in a single line

//   // If more than 5 images, calculate the needed width:
//   if (imageData.length > 5) {
//     const imageWidth = 180;    // the width of each image
//     const marginRight = 15;    // right margin for each image
//     const totalWidth = imageData.length * (imageWidth + marginRight);
//     container.style("min-width", totalWidth + "px");
//   } else {
//     // For fewer images, center them.
//     container.style("display", "flex")
//              .style("justify-content", "center");
//   }

//   // Append configuration for each timeline image.
//   container.selectAll(".timeline-image")
//     .data(imageData)
//     .enter()
//     .append("div")
//     .attr("class", "timeline-image")
//     .style("display", "inline-block")
//     .style("margin-right", "15px")
//     .style("vertical-align", "top")
//     .on("mouseover", function(event, d) {
//       // (Optional) Code to show a tooltip.
//     })
//     .on("mouseout", () => {
//       // (Optional) Code to hide the tooltip.
//     })
//     .each(function(d) {
//       const div = d3.select(this);
//       div.append("img")
//          .attr("src", d.imagePath)
//          .attr("alt", `Meal at ${d.timestamp.toLocaleTimeString()}`)
//          .style("width", "180px")
//          .style("height", "180px")
//          .style("object-fit", "cover")
//          .style("border-radius", "4px");
//       div.append("div")
//          .style("font-size", "12px")
//          .style("margin-top", "6px")
//          .style("color", "#666")
//          .text(d.timestamp.toLocaleTimeString());
//     });
// }
// function renderTimeline(imageData) {
//   // Remove any previous timeline container.
//   d3.select("#timeline-container").remove();

//   // Create a new timeline container.
//   const container = d3.select("#subject-details-container")
//     .append("div")
//     .attr("id", "timeline-container")
//     .style("width", "100%")
//     .style("overflow-x", "auto")  // allow horizontal scrolling
//     .style("white-space", "nowrap")
//     .style("margin-top", "20px")
//     .style("padding-bottom", "20px");

//   // If more than 5 images, calculate the needed width:
//   if (imageData.length > 5) {
//     const imageWidth = 180;    // the width of each image
//     const marginRight = 15;    // right margin for each image
//     const totalWidth = imageData.length * (imageWidth + marginRight);
//     container.style("min-width", totalWidth + "px");
//   } else {
//     // For fewer images, center them.
//     container.style("display", "flex")
//              .style("justify-content", "center");
//   }

//   // Append configuration for each timeline image.
//   container.selectAll(".timeline-image")
//     .data(imageData)
//     .enter()
//     .append("div")
//     .attr("class", "timeline-image")
//     .style("display", "inline-block")
//     .style("margin-right", "15px")
//     .style("vertical-align", "top")
//     .on("mouseover", function(event, d) {
//       // Tooltip setup would go here.
//     })
//     .on("mouseout", () => {
//       // Hide tooltip code.
//     })
//     .each(function(d) {
//       const div = d3.select(this);
//       div.append("img")
//          .attr("src", d.imagePath)
//          .attr("alt", `Meal at ${d.timestamp.toLocaleTimeString()}`)
//          .style("width", "180px")
//          .style("height", "180px")
//          .style("object-fit", "cover")
//          .style("border-radius", "4px");
//       div.append("div")
//          .style("font-size", "12px")
//          .style("margin-top", "6px")
//          .style("color", "#666")
//          .text(d.timestamp.toLocaleTimeString());
//     });
// }

async function loadAndRenderTimeline(subjectNumber, dayFilter) {
  const subjectStr = subjectNumber.toString().padStart(3, '0');
  const csvPath = `data/CGMacros-${subjectStr}/CGMacros-${subjectStr}.csv`;
  const formatDay = d3.timeFormat("%Y-%m-%d");

  try {
    const csvData = await d3.csv(csvPath);

    // Process timeline data with proper error handling
    const imageData = csvData
    .filter(d => d["Image path"] && d["Image path"].trim() !== "")
    .map(d => {
      const timestamp = parseTime(d.Timestamp);
      if (!timestamp) {
        console.warn("Invalid timestamp:", d.Timestamp);
        return null;
      }
      if (!d["Meal Type"] || d["Meal Type"].trim().toLowerCase() === "unspecified meal") {
        return null;
      }
      // Compute day property
      const day = formatDay(timestamp);
      const safeNumber = (val, fallback = 0) =>
        isNaN(parseFloat(val)) ? fallback : parseFloat(val);
  
      return {
        subject: subjectNumber, // Add the subject property
        timestamp: timestamp,
        day: day,
        imagePath: `data/CGMacros-${subjectNumber.toString().padStart(3, '0')}/${d["Image path"].trim()}`,
        Carbs: safeNumber(d.Carbs),
        Protein: safeNumber(d.Protein),
        Fat: safeNumber(d.Fat),
        Fiber: safeNumber(d.Fiber),
        Calories: safeNumber(d.Calories),
        'Meal Type': d['Meal Type'].trim(),
        'Amount Consumed': d['Amount Consumed']
      };
    })
    .filter(d => d !== null)
    .filter(d => !dayFilter || d.day === dayFilter);

    renderTimeline(imageData);
  } catch (error) {
    console.error(`Error loading timeline for subject ${subjectNumber}:`, error);
    d3.select("#timeline-container").html(`
      <div class="error-message">
        Could not load meal history for subject ${subjectNumber}
      </div>
    `);
  }
}

// NEW: Helper function to update the tooltip for nutrition labels.
function updateTooltipNutritionLabel(event, d) {
  // Ensure the tooltip is a D3 selection.
  const tooltip = d3.select("#tooltip");
  tooltip
    .style("display", "block")
    .transition()
      .duration(200)
      .style("opacity", 1);
  
  // Clear previous content.
  tooltip.html("");
  
  // Build CSV path using subject padded to three digits.
  const subjectStr = d.subject.toString().padStart(3, '0');
  const csvPath = `data/CGMacros-${subjectStr}/CGMacros-${subjectStr}.csv`;
  console.log("DEBUG: Loading CSV for tooltip nutrition label from:", csvPath);

  d3.csv(csvPath).then(function(csvData) {
    const parseTime = d3.timeParse("%Y-%m-%d %H:%M:%S");
    const formatDay = d3.timeFormat("%Y-%m-%d");

    // Filter rows with valid "Meal Type".
    const filteredCSV = csvData.filter(row => row["Meal Type"] && row["Meal Type"].trim() !== "");
    if (filteredCSV.length === 0) {
      console.error("DEBUG: No valid rows after filtering 'Meal Type'.");
      return;
    }

    // Convert fields.
    filteredCSV.forEach(row => {
      row.timestamp = parseTime(row.Timestamp);
      row.day = formatDay(row.timestamp);
      row.Calories = +row.Calories;
      row.Carbs = +row.Carbs;
      row.Protein = +row.Protein;
      row.Fat = +row.Fat;
      row.Fiber = +row.Fiber;
      row["Libre GL"] = +row["Libre GL"];
    });

    // Group data by day.
    const dailyData = Array.from(d3.group(filteredCSV, row => row.day), ([day, values]) => ({
      day,
      totalCalories: d3.sum(values, row => row.Calories),
      totalCarbs: d3.sum(values, row => row.Carbs),
      totalProtein: d3.sum(values, row => row.Protein),
      totalFat: d3.sum(values, row => row.Fat),
      totalFiber: d3.sum(values, row => row.Fiber)
    }));
    dailyData.sort((a, b) => new Date(a.day) - new Date(b.day));
    console.log("DEBUG: Computed dailyData for tooltip label:", dailyData);

    // Aggregate averages.
    const aggregated_nfData = {
      calories: +(d3.mean(dailyData, d => d.totalCalories)).toFixed(1),
      carbs: +(d3.mean(dailyData, d => d.totalCarbs)).toFixed(1),
      protein: +(d3.mean(dailyData, d => d.totalProtein)).toFixed(1),
      fat: +(d3.mean(dailyData, d => d.totalFat)).toFixed(1),
      fiber: +(d3.mean(dailyData, d => d.totalFiber)).toFixed(1)
    };

    // Recommended values.
    const recommendedValues = {
      avgCarbs: 300,
      avgProtein: 50,
      avgFat: 70,
      avgFiber: 30
    };

    // Calculate percentages.
    aggregated_nfData.dailyCarbs = ((aggregated_nfData.carbs / recommendedValues.avgCarbs) * 100).toFixed(1);
    aggregated_nfData.dailyProtein = ((aggregated_nfData.protein / recommendedValues.avgProtein) * 100).toFixed(1);
    aggregated_nfData.dailyFat = ((aggregated_nfData.fat / recommendedValues.avgFat) * 100).toFixed(1);
    aggregated_nfData.dailyFiber = ((aggregated_nfData.fiber / recommendedValues.avgFiber) * 100).toFixed(1);
    aggregated_nfData.subject = d.subject;

    // Create the nutrition facts label using your helper.
    const labelElement = createNutritionFactsLabel(aggregated_nfData);
    tooltip.node().appendChild(labelElement);

    // Get tooltip dimensions
const tooltipWidth = tooltip.node().offsetWidth;
const tooltipHeight = tooltip.node().offsetHeight;

// Get the current page dimensions
const pageWidth = window.innerWidth;
const pageHeight = window.innerHeight;

// Default tooltip position: near the mouse
let xPos = event.pageX + 10; // Adjust for a slight offset from the cursor
let yPos = event.pageY - 28;

// Prevent tooltip from going off the right side of the page
if (xPos + tooltipWidth > pageWidth) {
  xPos = event.pageX - tooltipWidth - 10; // Move it left if it's about to overflow
}

// Prevent tooltip from going off the bottom of the page
if (yPos + tooltipHeight > pageHeight) {
  yPos = event.pageY - tooltipHeight - 10; // Move it up if it's about to overflow
}

// Prevent tooltip from going off the top of the page (especially if it has no space below)
if (yPos < 0) {
  yPos = event.pageY + 10; // If not enough space at the top, move it below
}

// Prevent tooltip from going off the left side of the page
if (xPos < 0) {
  xPos = 10; // Prevent left overflow, ensure it's always visible
}

// Apply the calculated position to the tooltip
tooltip
  .style("left", `${xPos}px`)
  .style("top", `${yPos}px`)
  .style("opacity", 1); // Make tooltip visible

// Optionally, add transition for smooth positioning:
tooltip.transition().duration(200).ease(d3.easeCubicOut);

  }).catch(function(error) {
    console.error("DEBUG: Error loading CSV for tooltip nutrition label:", error);
  });
}

// function createSingleColumnNutritionLabel(data) {
//   // 1) Set up an info dictionary to map each key to an explanation.
//   //    You can customize the text for each nutrient.
//   const nutrientInfo = {
//     totalFat: "Total Fat includes all types of fat in one serving. Excess fat intake can contribute to weight gain.",
//     saturatedFat: "Saturated Fat is often found in animal products; high amounts may raise cholesterol.",
//     transFat: "Trans Fat (partially hydrogenated oils) can increase risk of heart disease.",
//     cholesterol: "Cholesterol is a waxy substance found in animal products; keep intake in check for heart health.",
//     sodium: "Sodium (salt) is an essential electrolyte, but too much can lead to high blood pressure.",
//     totalCarb: "Total Carbohydrate includes sugars, starches, and fiber. The body uses carbs for energy.",
//     fiber: "Dietary Fiber aids digestion, helps control blood sugar, and can lower cholesterol.",
//     totalSugars: "Total Sugars includes both natural sugars (found naturally in foods) and added sugars.",
//     naturalSugars: "Natural Sugars are those that occur naturally in foods, like fruit or milk.",
//     addedSugars: "Added Sugars are sugars added during processing (e.g., table sugar, syrups).",
//     protein: "Protein is essential for building and repairing tissues throughout the body.",
//     vitaminD: "Vitamin D helps the body absorb calcium and supports bone health.",
//     calcium: "Calcium is crucial for healthy bones and teeth.",
//     iron: "Iron is necessary for oxygen transport in the blood.",
//     potassium: "Potassium helps regulate fluid balance, muscle contractions, and nerve signals."
//   };

//   // 2) Create or clear the label container on the left
//   const container = document.getElementById('label-svg-container');
//   container.innerHTML = '';

//   // 3) Create a wrapper for the label
//   const label = document.createElement('div');
//   label.classList.add('nutrition-label');
//   label.style.border = '1px solid black';
//   label.style.width = '280px';
//   label.style.fontFamily = 'Arial, sans-serif';
//   label.style.background = '#fff';
//   label.style.margin = '0 auto';
//   label.style.padding = '10px';
//   label.style.position = 'relative';

//   // 4) Inline CSS for headings, spacing, etc.
//   const style = document.createElement('style');
//   style.textContent = `
//     .nutrition-label h1 {
//       font-size: 22px;
//       margin: 0;
//       border-bottom: 10px solid black;
//       padding-bottom: 5px;
//       text-transform: uppercase;
//     }
//     .nutrition-label .subheader {
//       font-size: 14px;
//       margin: 6px 0;
//     }
//     .bold-line {
//       font-weight: bold;
//       font-size: 14px;
//       border-bottom: 1px solid #000;
//       padding-bottom: 4px;
//       margin-bottom: 4px;
//     }
//     .calories-line {
//       display: flex;
//       justify-content: space-between;
//       font-size: 22px;
//       font-weight: bold;
//       margin: 8px 0;
//     }
//     .daily-value-text {
//       font-size: 12px;
//       font-weight: bold;
//       border-bottom: 1px solid #000;
//       padding-bottom: 3px;
//       margin-bottom: 5px;
//     }
//     .line-item {
//       display: flex;
//       justify-content: space-between;
//       font-size: 14px;
//       margin-bottom: 2px;
//       cursor: pointer; /* Make it clickable */
//     }
//     .line-item span:last-child {
//       margin-left: 10px;
//     }
//     .indent {
//       margin-left: 10px;
//     }
//     .thick-bar {
//       border-bottom: 10px solid black;
//       margin: 6px 0;
//     }
//     .footnote {
//       font-size: 10px;
//       border-top: 1px solid #000;
//       margin-top: 6px;
//       padding-top: 6px;
//     }
//   `;
//   label.appendChild(style);

//   // 5) Create a helper to build a line item with optional bold label
//   //    We also attach a "data-key" attribute so we know which nutrient was clicked.
//   function createLineItem(nutrientKey, labelText, valueText, isBold = false) {
//     const row = document.createElement('div');
//     row.classList.add('line-item');
//     row.setAttribute('data-key', nutrientKey); // so we can identify which row was clicked

//     const labelPart = isBold
//       ? `<strong>${labelText}</strong>`
//       : labelText;

//     row.innerHTML = `
//       <span>${labelPart}</span>
//       <span>${valueText}</span>
//     `;

//     // Add click event listener to show info in the #label-info panel
//     row.addEventListener('click', () => {
//       const infoContainer = document.getElementById('label-info');
//       const infoText = nutrientInfo[nutrientKey] || "No additional information available.";
//       infoContainer.innerHTML = `
//         <h3>${labelText}</h3>
//         <p>${infoText}</p>
//       `;
//     });

//     return row;
//   }

//   // 6) Build the label structure

//   // Header: "Nutrition Facts"
//   const header = document.createElement('h1');
//   header.textContent = 'Nutrition Facts';
//   label.appendChild(header);

//   // Subheader: servings info
//   const servingsInfo = document.createElement('div');
//   servingsInfo.classList.add('subheader');
//   servingsInfo.innerHTML = `
//     ${data.servingsPerContainer || ''}<br>
//     Serving size <strong>${data.servingSize || ''}</strong>
//   `;
//   label.appendChild(servingsInfo);

//   // Bold line: "Amount per serving"
//   const amountPerServing = document.createElement('div');
//   amountPerServing.classList.add('bold-line');
//   amountPerServing.textContent = 'Amount per serving';
//   label.appendChild(amountPerServing);

//   // Calories (on one line)
//   const caloriesLine = document.createElement('div');
//   caloriesLine.classList.add('calories-line');
//   caloriesLine.innerHTML = `
//     <span>Calories</span>
//     <span>${data.calories || 0}</span>
//   `;
//   label.appendChild(caloriesLine);

//   // % Daily Value
//   const dailyValueText = document.createElement('div');
//   dailyValueText.classList.add('daily-value-text');
//   dailyValueText.textContent = '% Daily Value*';
//   label.appendChild(dailyValueText);

//   // Add each nutrient row, specifying the key for the click event
//   // Bolding certain nutrients, italicizing "trans" for Trans Fat
//   // 1) Total Fat
//   label.appendChild(createLineItem(
//     'totalFat',
//     `Total Fat ${data.totalFat || 0}g`,
//     `${data.totalFatDV || 0}%`,
//     true
//   ));
//   // 1a) Saturated Fat (indented)
//   const satFat = createLineItem(
//     'saturatedFat',
//     `Saturated Fat ${data.saturatedFat || 0}g`,
//     `${data.saturatedFatDV || 0}%`
//   );
//   satFat.classList.add('indent');
//   label.appendChild(satFat);

//   // 1b) Trans Fat (italicize "trans")
//   const transFat = createLineItem(
//     'transFat',
//     `<i>Trans</i> Fat ${data.transFat || 0}g`,
//     ''
//   );
//   transFat.classList.add('indent');
//   label.appendChild(transFat);

//   // 2) Cholesterol
//   label.appendChild(createLineItem(
//     'cholesterol',
//     `Cholesterol ${data.cholesterol || 0}mg`,
//     `${data.cholesterolDV || 0}%`,
//     true
//   ));

//   // 3) Sodium
//   label.appendChild(createLineItem(
//     'sodium',
//     `Sodium ${data.sodium || 0}mg`,
//     `${data.sodiumDV || 0}%`,
//     true
//   ));

//   // 4) Total Carbohydrate
//   label.appendChild(createLineItem(
//     'totalCarb',
//     `Total Carbohydrate ${data.totalCarb || 0}g`,
//     `${data.totalCarbDV || 0}%`,
//     true
//   ));
//   // 4a) Dietary Fiber (indented)
//   const fiber = createLineItem(
//     'fiber',
//     `Dietary Fiber ${data.fiber || 0}g`,
//     `${data.fiberDV || 0}%`
//   );
//   fiber.classList.add('indent');
//   label.appendChild(fiber);

//   // 4b) Total Sugars
//   label.appendChild(createLineItem(
//     'totalSugars',
//     `Total Sugars ${data.totalSugars || 0}g`,
//     ''
//   ));

//   // 4c) Natural Sugars (new line)
//   const naturalSugars = createLineItem(
//     'naturalSugars',
//     `Natural Sugars ${data.naturalSugars || 0}g`,
//     ''
//   );
//   naturalSugars.classList.add('indent');
//   label.appendChild(naturalSugars);

//   // 4d) Includes Added Sugars (indented)
//   const addedSugars = createLineItem(
//     'addedSugars',
//     `Includes ${data.addedSugars || 0}g Added Sugars`,
//     `${data.addedSugarsDV || 0}%`
//   );
//   addedSugars.classList.add('indent');
//   label.appendChild(addedSugars);

//   // 5) Protein
//   label.appendChild(createLineItem(
//     'protein',
//     `Protein ${data.protein || 0}g`,
//     '',
//     true
//   ));

//   // Thick black bar after Protein
//   const thickBar = document.createElement('div');
//   thickBar.classList.add('thick-bar');
//   label.appendChild(thickBar);

//   // Vitamins & Minerals (below thick bar)
//   label.appendChild(createLineItem(
//     'vitaminD',
//     `Vitamin D ${data.vitaminD || 0}mcg`,
//     `${data.vitaminDDV || 0}%`
//   ));
//   label.appendChild(createLineItem(
//     'calcium',
//     `Calcium ${data.calcium || 0}mg`,
//     `${data.calciumDV || 0}%`
//   ));
//   label.appendChild(createLineItem(
//     'iron',
//     `Iron ${data.iron || 0}mg`,
//     `${data.ironDV || 0}%`
//   ));
//   label.appendChild(createLineItem(
//     'potassium',
//     `Potassium ${data.potassium || 0}mg`,
//     `${data.potassiumDV || 0}%`
//   ));

//   // Footnote
//   const footnote = document.createElement('div');
//   footnote.classList.add('footnote');
//   footnote.innerHTML = `
//     * The % Daily Value (DV) tells you how much a nutrient in a serving of food 
//     contributes to a daily diet. 2,000 calories a day is used for general nutrition advice.
//   `;
//   label.appendChild(footnote);

//   // Append the final label to the container.
//   container.appendChild(label);
// }
// function createSingleColumnNutritionLabel(data) {
//   // A dictionary mapping each nutrient key to explanatory text for the click interaction.
//   const nutrientInfo = {
//     totalFat: "Total Fat includes all types of fat. Excess fat intake can contribute to weight gain.",
//     saturatedFat: "Saturated Fat is often found in animal products; high amounts may raise cholesterol.",
//     transFat: "Trans Fat can increase risk of heart disease.",
//     cholesterol: "Cholesterol is a waxy substance found in animal products; keep intake moderate for heart health.",
//     sodium: "Sodium (salt) is essential, but too much can lead to high blood pressure.",
//     totalCarb: "Total Carbohydrate includes sugars, starches, and fiber. The body uses carbs for energy.",
//     fiber: "Dietary Fiber aids digestion, helps control blood sugar, and can lower cholesterol.",
//     totalSugars: "Total Sugars includes both natural sugars and added sugars.",
//     naturalSugars: "Natural Sugars occur naturally in foods (e.g., fruit, dairy).",
//     addedSugars: "Added Sugars are introduced during processing (e.g., table sugar, syrups).",
//     protein: "Protein is essential for building and repairing tissues in the body.",
//     vitaminD: "Vitamin D helps the body absorb calcium for bone health.",
//     calcium: "Calcium is crucial for strong bones and teeth.",
//     iron: "Iron is necessary for oxygen transport in the blood.",
//     potassium: "Potassium helps regulate fluid balance and muscle contractions."
//   };

//   // 1) Clear any existing content in the left column (#label-svg-container).
//   const container = document.getElementById('label-svg-container');
//   container.innerHTML = '';

//   // 2) Create the main label wrapper.
//   const label = document.createElement('div');
//   label.classList.add('nutrition-label');
//   label.style.border = '1px solid black';
//   label.style.width = '280px';
//   label.style.fontFamily = 'Arial, sans-serif';
//   label.style.background = '#fff';
//   label.style.margin = '0 auto';
//   label.style.padding = '10px';
//   label.style.position = 'relative';

//   // 3) Inline CSS for headings, spacing, colors, etc.
//   const style = document.createElement('style');
//   style.textContent = `
//     .nutrition-label h1 {
//       font-size: 22px;
//       margin: 0;
//       border-bottom: 10px solid black;
//       padding-bottom: 5px;
//       text-transform: uppercase;
//     }

//     /* Serving size area background: light green */
//     .serving-size-area {
//       background-color: lightgreen;
//       display: inline-block;
//       width: 100%;
//       padding: 4px 0;
//       margin-bottom: 4px;
//     }

//     .bold-line {
//       font-weight: bold;
//       font-size: 14px;
//       border-bottom: 1px solid #000;
//       padding-bottom: 4px;
//       margin-bottom: 4px;
//     }

//     /* Calories row background: light pink */
//     .calories-line {
//       display: flex;
//       justify-content: space-between;
//       font-size: 22px;
//       font-weight: bold;
//       margin: 8px 0;
//       background-color: lightpink;
//       padding: 2px 4px;
//     }

//     .daily-value-text {
//       font-size: 12px;
//       font-weight: bold;
//       border-bottom: 1px solid #000;
//       padding-bottom: 3px;
//       margin-bottom: 5px;
//     }

//     /* Each nutrient row is clickable, with separate label/value spans */
//     .line-item {
//       display: flex;
//       margin-bottom: 2px;
//       cursor: pointer;
//     }
//     .line-item .nutrient-label {
//       /* Left portion: highlight yellow if there's a label */
//       background-color: yellow;
//       flex: 1;
//       padding: 2px 4px;
//       font-size: 14px;
//       display: inline-block;
//     }
//     .line-item .nutrient-value {
//       /* Right portion: if DV is present, purple; otherwise also yellow */
//       flex: 0;
//       padding: 2px 4px;
//       font-size: 14px;
//       display: inline-block;
//     }

//     /* Indent sub-items (e.g., Saturated Fat under Total Fat) */
//     .indent {
//       margin-left: 10px;
//     }

//     /* Thick black bar for separation */
//     .thick-bar {
//       border-bottom: 10px solid black;
//       margin: 6px 0;
//     }

//     .footnote {
//       font-size: 10px;
//       border-top: 1px solid #000;
//       margin-top: 6px;
//       padding-top: 6px;
//     }
//   `;
//   label.appendChild(style);

//   // 4) Utility function to create a clickable line item with two spans:
//   //    - .nutrient-label (left)
//   //    - .nutrient-value (right)
//   //    The background color logic:
//   //      - left portion (label): always highlight yellow
//   //      - right portion (DV): purple if there's a DV, otherwise yellow
//   function createLineItem(nutrientKey, labelText, dvText, isBold = false) {
//     // Container for the entire row
//     const row = document.createElement('div');
//     row.classList.add('line-item');
//     row.setAttribute('data-key', nutrientKey);

//     // Left portion: the label
//     const labelSpan = document.createElement('span');
//     labelSpan.classList.add('nutrient-label');
//     if (isBold) {
//       labelSpan.innerHTML = `<strong>${labelText}</strong>`;
//     } else {
//       labelSpan.innerHTML = labelText;
//     }

//     // Right portion: the DV or numeric value
//     const valueSpan = document.createElement('span');
//     valueSpan.classList.add('nutrient-value');

//     // If we have a DV text (not empty), background is purple; otherwise remain yellow
//     if (dvText && dvText.trim() !== '') {
//       valueSpan.style.backgroundColor = 'purple';
//       valueSpan.style.color = '#fff'; // White text for contrast
//       valueSpan.innerHTML = dvText;
//     } else {
//       // no DV => keep it yellow, same as label
//       valueSpan.innerHTML = dvText; // might be empty
//     }

//     // Append the two spans to the row
//     row.appendChild(labelSpan);
//     row.appendChild(valueSpan);

//     // On click, show info text in #label-info
//     row.addEventListener('click', () => {
//       const infoContainer = document.getElementById('label-info');
//       const infoText = nutrientInfo[nutrientKey] || "No additional information available.";
//       infoContainer.innerHTML = `
//         <h3>${labelText}</h3>
//         <p>${infoText}</p>
//       `;
//     });

//     return row;
//   }

//   //
//   // BUILD THE LABEL SECTIONS
//   //

//   // Header: "Nutrition Facts"
//   const header = document.createElement('h1');
//   header.textContent = 'Nutrition Facts';
//   label.appendChild(header);

//   // Serving size area (light green background)
//   const servingSizeArea = document.createElement('div');
//   servingSizeArea.classList.add('serving-size-area');
//   servingSizeArea.innerHTML = `
//     ${data.servingsPerContainer || ''}<br>
//     Serving size <strong>${data.servingSize || ''}</strong>
//   `;
//   label.appendChild(servingSizeArea);

//   // Bold line: "Amount per serving"
//   const amountPerServing = document.createElement('div');
//   amountPerServing.classList.add('bold-line');
//   amountPerServing.textContent = 'Amount per serving';
//   label.appendChild(amountPerServing);

//   // Calories line (light pink background)
//   const caloriesLine = document.createElement('div');
//   caloriesLine.classList.add('calories-line');
//   caloriesLine.innerHTML = `
//     <span>Calories</span>
//     <span>${data.calories || 0}</span>
//   `;
//   label.appendChild(caloriesLine);

//   // % Daily Value
//   const dailyValueText = document.createElement('div');
//   dailyValueText.classList.add('daily-value-text');
//   dailyValueText.textContent = '% Daily Value*';
//   label.appendChild(dailyValueText);

//   // MACROS & NUTRIENTS
//   // 1) Total Fat
//   label.appendChild(
//     createLineItem(
//       'totalFat',
//       `Total Fat ${data.totalFat || 0}g`,
//       `${data.totalFatDV || ''}%`,
//       true
//     )
//   );

//   // 1a) Saturated Fat (indented)
//   const satFat = createLineItem(
//     'saturatedFat',
//     `Saturated Fat ${data.saturatedFat || 0}g`,
//     `${data.saturatedFatDV || ''}%`
//   );
//   satFat.classList.add('indent');
//   label.appendChild(satFat);

//   // 1b) Trans Fat (italicize "trans")
//   const transFat = createLineItem(
//     'transFat',
//     `<i>Trans</i> Fat ${data.transFat || 0}g`,
//     '' // no DV
//   );
//   transFat.classList.add('indent');
//   label.appendChild(transFat);

//   // 2) Cholesterol
//   label.appendChild(
//     createLineItem(
//       'cholesterol',
//       `Cholesterol ${data.cholesterol || 0}mg`,
//       `${data.cholesterolDV || ''}%`,
//       true
//     )
//   );

//   // 3) Sodium
//   label.appendChild(
//     createLineItem(
//       'sodium',
//       `Sodium ${data.sodium || 0}mg`,
//       `${data.sodiumDV || ''}%`,
//       true
//     )
//   );

//   // 4) Total Carbohydrate
//   label.appendChild(
//     createLineItem(
//       'totalCarb',
//       `Total Carbohydrate ${data.totalCarb || 0}g`,
//       `${data.totalCarbDV || ''}%`,
//       true
//     )
//   );

//   // 4a) Dietary Fiber (indented)
//   const fiber = createLineItem(
//     'fiber',
//     `Dietary Fiber ${data.fiber || 0}g`,
//     `${data.fiberDV || ''}%`
//   );
//   fiber.classList.add('indent');
//   label.appendChild(fiber);

//   // 4b) Total Sugars
//   label.appendChild(
//     createLineItem(
//       'totalSugars',
//       `Total Sugars ${data.totalSugars || 0}g`,
//       '' // no DV for total sugars
//     )
//   );

//   // 4c) Natural Sugars (indented)
//   const naturalSugars = createLineItem(
//     'naturalSugars',
//     `Natural Sugars ${data.naturalSugars || 0}g`,
//     ''
//   );
//   naturalSugars.classList.add('indent');
//   label.appendChild(naturalSugars);

//   // 4d) Added Sugars (indented)
//   const addedSugars = createLineItem(
//     'addedSugars',
//     `Includes ${data.addedSugars || 0}g Added Sugars`,
//     `${data.addedSugarsDV || ''}%`
//   );
//   addedSugars.classList.add('indent');
//   label.appendChild(addedSugars);

//   // 5) Protein
//   label.appendChild(
//     createLineItem(
//       'protein',
//       `Protein ${data.protein || 0}g`,
//       '', // no DV
//       true
//     )
//   );

//   // Thick black bar
//   const thickBar = document.createElement('div');
//   thickBar.classList.add('thick-bar');
//   label.appendChild(thickBar);

//   // Vitamins & Minerals (below thick bar)
//   label.appendChild(
//     createLineItem(
//       'vitaminD',
//       `Vitamin D ${data.vitaminD || 0}mcg`,
//       `${data.vitaminDDV || ''}%`
//     )
//   );
//   label.appendChild(
//     createLineItem(
//       'calcium',
//       `Calcium ${data.calcium || 0}mg`,
//       `${data.calciumDV || ''}%`
//     )
//   );
//   label.appendChild(
//     createLineItem(
//       'iron',
//       `Iron ${data.iron || 0}mg`,
//       `${data.ironDV || ''}%`
//     )
//   );
//   label.appendChild(
//     createLineItem(
//       'potassium',
//       `Potassium ${data.potassium || 0}mg`,
//       `${data.potassiumDV || ''}%`
//     )
//   );

//   // Footnote
//   const footnote = document.createElement('div');
//   footnote.classList.add('footnote');
//   footnote.innerHTML = `
//     * The % Daily Value (DV) tells you how much a nutrient in a serving of food 
//     contributes to a daily diet. 2,000 calories a day is used for general nutrition advice.
//   `;
//   label.appendChild(footnote);

//   // Finally, append the label to the container (left column).
//   container.appendChild(label);
// }
// function createSingleColumnNutritionLabel(data) {
//   // A dictionary mapping each key to explanatory text for the click interaction.
//   // Now includes "servingSize" and "calories" keys for those areas.
//   const nutrientInfo = {
//     servingSize: "Serving Size includes the amount typically consumed at one time and servings per container.",
//     calories: "Calories measure the energy from one serving of this food. Balancing calorie intake is key.",
//     totalFat: "Total Fat includes all types of fat. Excess fat intake can contribute to weight gain.",
//     saturatedFat: "Saturated Fat is often found in animal products; high amounts may raise cholesterol.",
//     transFat: "Trans Fat can increase risk of heart disease.",
//     cholesterol: "Cholesterol is a waxy substance found in animal products; keep intake moderate for heart health.",
//     sodium: "Sodium (salt) is essential, but too much can lead to high blood pressure.",
//     totalCarb: "Total Carbohydrate includes sugars, starches, and fiber. The body uses carbs for energy.",
//     fiber: "Dietary Fiber aids digestion, helps control blood sugar, and can lower cholesterol.",
//     totalSugars: "Total Sugars includes both natural sugars and added sugars.",
//     naturalSugars: "Natural Sugars occur naturally in foods (e.g., fruit, dairy).",
//     addedSugars: "Added Sugars are introduced during processing (e.g., table sugar, syrups).",
//     protein: "Protein is essential for building and repairing tissues in the body.",
//     vitaminD: "Vitamin D helps the body absorb calcium for bone health.",
//     calcium: "Calcium is crucial for strong bones and teeth.",
//     iron: "Iron is necessary for oxygen transport in the blood.",
//     potassium: "Potassium helps regulate fluid balance and muscle contractions."
//   };

//   // 1) Clear any existing content in the left column (#label-svg-container).
//   const container = document.getElementById('label-svg-container');
//   container.innerHTML = '';

//   // 2) Create the main label wrapper.
//   const label = document.createElement('div');
//   label.classList.add('nutrition-label');
//   label.style.border = '1px solid black';
//   label.style.width = '280px';
//   label.style.fontFamily = 'Arial, sans-serif';
//   label.style.background = '#fff';
//   label.style.margin = '0 auto';
//   label.style.padding = '10px';
//   label.style.position = 'relative';

//   // 3) Inline CSS for headings, spacing, colors, etc.
//   const style = document.createElement('style');
//   style.textContent = `
//     .nutrition-label h1 {
//       font-size: 22px;
//       margin: 0;
//       border-bottom: 10px solid black;
//       padding-bottom: 5px;
//       text-transform: uppercase;
//     }

//     /* Serving size area background: light green, clickable */
//     .serving-size-area {
//       background-color: lightgreen;
//       display: inline-block;
//       width: 100%;
//       padding: 4px 0;
//       margin-bottom: 4px;
//       cursor: pointer; /* Make it clickable */
//     }

//     .bold-line {
//       font-weight: bold;
//       font-size: 14px;
//       border-bottom: 1px solid #000;
//       padding-bottom: 4px;
//       margin-bottom: 4px;
//     }

//     /* Calories row background: light pink, clickable */
//     .calories-line {
//       display: flex;
//       justify-content: space-between;
//       font-size: 22px;
//       font-weight: bold;
//       margin: 8px 0;
//       background-color: lightpink;
//       padding: 2px 4px;
//       cursor: pointer; /* Make it clickable */
//     }

//     /* Highlight the "% Daily Value" line with a pastel color */
//     .daily-value-text {
//       font-size: 12px;
//       font-weight: bold;
//       border-bottom: 1px solid #000;
//       padding-bottom: 3px;
//       margin-bottom: 5px;
//       background-color: #f2e6ff; /* Pastel purple for highlight */
//       display: inline-block;
//       width: 100%;
//       padding: 5px;
//     }

//     /* Each nutrient row is clickable, with separate label/value spans */
//     .line-item {
//       display: flex;
//       margin-bottom: 2px;
//       cursor: pointer;
//     }
//     .line-item .nutrient-label {
//       /* Left portion: pastel yellow */
//       background-color: #fff9c4; /* Pastel yellow */
//       flex: 1;
//       padding: 2px 4px;
//       font-size: 14px;
//       display: inline-block;
//     }
//     .line-item .nutrient-value {
//       /* If DV is present, we make it purple; otherwise pastel yellow */
//       flex: 0;
//       padding: 2px 4px;
//       font-size: 14px;
//       display: inline-block;
//     }

//     /* Indent sub-items (e.g., Saturated Fat under Total Fat) */
//     .indent {
//       margin-left: 10px;
//     }

//     /* Thick black bar for separation */
//     .thick-bar {
//       border-bottom: 10px solid black;
//       margin: 6px 0;
//     }

//     .footnote {
//       font-size: 10px;
//       border-top: 1px solid #000;
//       margin-top: 6px;
//       padding-top: 6px;
//     }
//   `;
//   label.appendChild(style);

//   // 4) Utility to create a clickable line item with two spans:
//   //    - .nutrient-label (left, pastel yellow)
//   //    - .nutrient-value (right, pastel yellow or purple if DV present)
//   function createLineItem(nutrientKey, labelText, dvText, isBold = false) {
//     // Container for the entire row
//     const row = document.createElement('div');
//     row.classList.add('line-item');
//     row.setAttribute('data-key', nutrientKey);

//     // Left portion: the label
//     const labelSpan = document.createElement('span');
//     labelSpan.classList.add('nutrient-label');
//     if (isBold) {
//       labelSpan.innerHTML = `<strong>${labelText}</strong>`;
//     } else {
//       labelSpan.innerHTML = labelText;
//     }

//     // Right portion: the DV or numeric value
//     const valueSpan = document.createElement('span');
//     valueSpan.classList.add('nutrient-value');

//     const dv = dvText !== undefined && dvText !== null 
//     ? String(dvText).trim() 
//     : '';
  
//     if (dv !== '') {
//       valueSpan.style.backgroundColor = 'purple';
//       valueSpan.style.color = '#fff';
//       valueSpan.innerHTML = dv + '%';
//     } else {
//       // no DV => keep it pastel yellow
//       valueSpan.style.backgroundColor = '#fff9c4';
//       valueSpan.innerHTML = dv; // might be empty
//     }

//     // Append the two spans to the row
//     row.appendChild(labelSpan);
//     row.appendChild(valueSpan);

//     // On click, show info text in #label-info
//     row.addEventListener('click', () => {
//       const infoContainer = document.getElementById('label-info');
//       const infoText = nutrientInfo[nutrientKey] || "No additional information available.";
//       infoContainer.innerHTML = `
//         <h3>${labelText}</h3>
//         <p>${infoText}</p>
//       `;
//     });

//     return row;
//   }

//   //
//   // BUILD THE LABEL SECTIONS
//   //

//   // Header: "Nutrition Facts"
//   const header = document.createElement('h1');
//   header.textContent = 'Nutrition Facts';
//   label.appendChild(header);

//   // Serving size area (light green background, clickable)
//   const servingSizeArea = document.createElement('div');
//   servingSizeArea.classList.add('serving-size-area');
//   servingSizeArea.setAttribute('data-key', 'servingSize');
//   servingSizeArea.innerHTML = `
//     ${data.servingsPerContainer || ''}<br>
//     Serving size <strong>${data.servingSize || ''}</strong>
//   `;
//   // Add click event for serving size
//   servingSizeArea.addEventListener('click', () => {
//     const infoContainer = document.getElementById('label-info');
//     const infoText = nutrientInfo['servingSize'] || "No additional information available.";
//     infoContainer.innerHTML = `
//       <h3>Serving Size</h3>
//       <p>${infoText}</p>
//     `;
//   });
//   label.appendChild(servingSizeArea);

//   // Bold line: "Amount per serving"
//   const amountPerServing = document.createElement('div');
//   amountPerServing.classList.add('bold-line');
//   amountPerServing.textContent = 'Amount per serving';
//   label.appendChild(amountPerServing);

//   // Calories line (light pink background, clickable)
//   const caloriesLine = document.createElement('div');
//   caloriesLine.classList.add('calories-line');
//   caloriesLine.setAttribute('data-key', 'calories');
//   caloriesLine.innerHTML = `
//     <span>Calories</span>
//     <span>${data.calories || 0}</span>
//   `;
//   // Add click event for calories
//   caloriesLine.addEventListener('click', () => {
//     const infoContainer = document.getElementById('label-info');
//     const infoText = nutrientInfo['calories'] || "No additional information available.";
//     infoContainer.innerHTML = `
//       <h3>Calories</h3>
//       <p>${infoText}</p>
//     `;
//   });
//   label.appendChild(caloriesLine);

//   // % Daily Value (highlighted)
//   const dailyValueText = document.createElement('div');
//   dailyValueText.classList.add('daily-value-text');
//   dailyValueText.textContent = '% Daily Value*';
//   label.appendChild(dailyValueText);

//   // MACROS & NUTRIENTS
//   // 1) Total Fat
//   label.appendChild(
//     createLineItem(
//       'totalFat',
//       `Total Fat ${data.totalFat || 0}g`,
//       data.totalFatDV || '', // omit '%' here, code appends it if not empty
//       true
//     )
//   );

//   // 1a) Saturated Fat (indented)
//   const satFat = createLineItem(
//     'saturatedFat',
//     `Saturated Fat ${data.saturatedFat || 0}g`,
//     data.saturatedFatDV || ''
//   );
//   satFat.classList.add('indent');
//   label.appendChild(satFat);

//   // 1b) Trans Fat (italicize "trans")
//   const transFat = createLineItem(
//     'transFat',
//     `<i>Trans</i> Fat ${data.transFat || 0}g`,
//     '' // no DV
//   );
//   transFat.classList.add('indent');
//   label.appendChild(transFat);

//   // 2) Cholesterol
//   label.appendChild(
//     createLineItem(
//       'cholesterol',
//       `Cholesterol ${data.cholesterol || 0}mg`,
//       data.cholesterolDV || '',
//       true
//     )
//   );

//   // 3) Sodium
//   label.appendChild(
//     createLineItem(
//       'sodium',
//       `Sodium ${data.sodium || 0}mg`,
//       data.sodiumDV || '',
//       true
//     )
//   );

//   // 4) Total Carbohydrate
//   label.appendChild(
//     createLineItem(
//       'totalCarb',
//       `Total Carbohydrate ${data.totalCarb || 0}g`,
//       data.totalCarbDV || '',
//       true
//     )
//   );

//   // 4a) Dietary Fiber (indented)
//   const fiber = createLineItem(
//     'fiber',
//     `Dietary Fiber ${data.fiber || 0}g`,
//     data.fiberDV || ''
//   );
//   fiber.classList.add('indent');
//   label.appendChild(fiber);

//   // 4b) Total Sugars
//   label.appendChild(
//     createLineItem(
//       'totalSugars',
//       `Total Sugars ${data.totalSugars || 0}g`,
//       '' // no DV for total sugars
//     )
//   );

//   // 4c) Natural Sugars (indented)
//   const naturalSugars = createLineItem(
//     'naturalSugars',
//     `Natural Sugars ${data.naturalSugars || 0}g`,
//     ''
//   );
//   naturalSugars.classList.add('indent');
//   label.appendChild(naturalSugars);

//   // 4d) Added Sugars (indented)
//   const addedSugars = createLineItem(
//     'addedSugars',
//     `Includes ${data.addedSugars || 0}g Added Sugars`,
//     data.addedSugarsDV || ''
//   );
//   addedSugars.classList.add('indent');
//   label.appendChild(addedSugars);

//   // 5) Protein
//   label.appendChild(
//     createLineItem(
//       'protein',
//       `Protein ${data.protein || 0}g`,
//       '', // no DV
//       true
//     )
//   );

//   // Thick black bar
//   const thickBar = document.createElement('div');
//   thickBar.classList.add('thick-bar');
//   label.appendChild(thickBar);

//   // Vitamins & Minerals (below thick bar)
//   label.appendChild(
//     createLineItem(
//       'vitaminD',
//       `Vitamin D ${data.vitaminD || 0}mcg`,
//       data.vitaminDDV || ''
//     )
//   );
//   label.appendChild(
//     createLineItem(
//       'calcium',
//       `Calcium ${data.calcium || 0}mg`,
//       data.calciumDV || ''
//     )
//   );
//   label.appendChild(
//     createLineItem(
//       'iron',
//       `Iron ${data.iron || 0}mg`,
//       data.ironDV || ''
//     )
//   );
//   label.appendChild(
//     createLineItem(
//       'potassium',
//       `Potassium ${data.potassium || 0}mg`,
//       data.potassiumDV || ''
//     )
//   );

//   // Footnote
//   const footnote = document.createElement('div');
//   footnote.classList.add('footnote');
//   footnote.innerHTML = `
//     * The % Daily Value (DV) tells you how much a nutrient in a serving of food 
//     contributes to a daily diet. 2,000 calories a day is used for general nutrition advice.
//   `;
//   label.appendChild(footnote);

//   // Finally, append the label to the container (left column).
//   container.appendChild(label);
// }
function createSingleColumnNutritionLabel(data) {
  // A dictionary mapping each key to explanatory text for the click interaction.
  // Added "dailyValue" for the % Daily Value line.
  const nutrientInfo = {
    servingSize: "Serving Size represents the typical amount consumed at one time. Pay attention to the number of servings per container, as all nutrient values are based on a single serving.",
    calories: "Calories measure the energy from one serving. Balance calorie intake with expenditure to maintain a healthy weight. The general guide is 2,000 calories per day, but individual needs vary.",
    totalFat: "Total Fat includes all types of fat. It is essential for energy and cell function, but excess intake can contribute to weight gain.",
    saturatedFat: "Saturated Fat is found in animal products and some oils. Excessive consumption may raise bad cholesterol (LDL) and increase the risk of heart disease. Limit to less than 10% of total daily calories.",
    transFat: "Trans Fat is associated with increased LDL cholesterol and heart disease risk. Avoid foods with partially hydrogenated oils.",
    cholesterol: "Cholesterol is found in animal products. Dietary intake should be limited to maintain heart health. The general recommendation is less than 300mg per day.",
    sodium: "Sodium (salt) is necessary for body functions, but excessive intake can lead to high blood pressure. Limit to less than 2,300mg per day.",
    totalCarb: "Total Carbohydrate includes sugars, starches, and fiber. Carbs provide energy, but refined carbs and added sugars should be limited.",
    fiber: "Dietary Fiber aids digestion, helps control blood sugar, and can lower cholesterol. Aim for at least 28g per day.",
    totalSugars: "Total Sugars include both natural and added sugars. Reducing added sugars can help prevent weight gain and chronic diseases.",
    naturalSugars: "Natural Sugars occur naturally in foods like fruit and dairy. These sources also provide essential nutrients.",
    addedSugars: "Added Sugars are introduced during food processing (e.g., table sugar, syrups). The FDA recommends keeping added sugars below 50g per day (10% of total calories).",
    protein: "Protein is essential for building and repairing tissues. Most Americans meet their protein needs, so focus on variety (lean meats, fish, beans, nuts).",
    vitaminD: "Vitamin D supports calcium absorption and bone health. The recommended daily value is at least 20mcg.",
    calcium: "Calcium is crucial for strong bones and teeth. The daily goal is at least 1,300mg.",
    iron: "Iron helps transport oxygen in the blood. The daily goal is at least 18mg to prevent anemia.",
    potassium: "Potassium helps regulate fluid balance and muscle function. Aim for at least 4,700mg per day.",
    dailyValue: "The % Daily Value (%DV) shows how much a nutrient contributes to a daily diet. 5% DV or less is low, 20% DV or more is high. Use it to compare foods and make informed choices."
  };
  

  // 1) Clear any existing content in the left column (#label-svg-container).
  const container = document.getElementById('label-svg-container');
  container.innerHTML = '';

  // 2) Create the main label wrapper.
  const label = document.createElement('div');
  label.classList.add('nutrition-label');
  label.style.border = '1px solid black';
  label.style.width = '280px';
  label.style.fontFamily = 'Arial, sans-serif';
  label.style.background = '#fff';
  label.style.margin = '0 auto';
  label.style.padding = '10px';
  label.style.position = 'relative';

  // 3) Inline CSS for headings, spacing, colors, etc.
  const style = document.createElement('style');
  style.textContent = `
    .nutrition-label h1 {
      font-size: 22px;
      margin: 0;
      border-bottom: 10px solid black;
      padding-bottom: 5px;
      text-transform: uppercase;
    }

    /* Serving size area background: light green, clickable */
    .serving-size-area {
      background-color: lightgreen;
      display: inline-block;
      width: 100%;
      padding: 4px 0;
      margin-bottom: 4px;
      cursor: pointer; /* Make it clickable */
    }

    .bold-line {
      font-weight: bold;
      font-size: 14px;
      border-bottom: 1px solid #000;
      padding-bottom: 4px;
      margin-bottom: 4px;
    }

    /* Calories row background: light pink, clickable */
    .calories-line {
      display: flex;
      justify-content: space-between;
      font-size: 22px;
      font-weight: bold;
      margin: 8px 0;
      background-color: lightpink;
      padding: 2px 4px;
      cursor: pointer; /* Make it clickable */
    }

    /* Highlight the "% Daily Value" line with a pastel color, left-aligned */
    .daily-value-text {
      font-size: 12px;
      font-weight: bold;
      border-bottom: 1px solid #000;
      padding-bottom: 3px;
      margin-bottom: 5px;
      background-color: #f2e6ff; /* Pastel purple for highlight */
      display: inline-block;
      width: 100%;
      padding: 5px;
      cursor: pointer; /* Make it clickable */
      text-align: left; /* Left align text */
    }

    /* Each nutrient row is clickable, with separate label/value spans */
    .line-item {
      display: flex;
      margin-bottom: 2px;
      cursor: pointer;
    }
    .line-item .nutrient-label {
      /* Left portion: pastel yellow */
      background-color: #fff9c4; /* Pastel yellow */
      flex: 1;
      padding: 2px 4px;
      font-size: 14px;
      display: inline-block;
    }
    .line-item .nutrient-value {
      /* If DV is present, we make it purple; otherwise pastel yellow */
      flex: 0;
      padding: 2px 4px;
      font-size: 14px;
      display: inline-block;
    }

    /* Indent sub-items (e.g., Saturated Fat under Total Fat) */
    .indent {
      margin-left: 10px;
    }

    /* Thick black bar for separation */
    .thick-bar {
      border-bottom: 10px solid black;
      margin: 6px 0;
    }

    .footnote {
      font-size: 10px;
      border-top: 1px solid #000;
      margin-top: 6px;
      padding-top: 6px;
    }
  `;
  label.appendChild(style);

  // 4) Utility to create a clickable line item with two spans:
  //    - .nutrient-label (left, pastel yellow)
  //    - .nutrient-value (right, pastel yellow or purple if DV present)
  function createLineItem(nutrientKey, labelText, dvText, isBold = false) {
    // Container for the entire row
    const row = document.createElement('div');
    row.classList.add('line-item');
    row.setAttribute('data-key', nutrientKey);

    // Left portion: the label
    const labelSpan = document.createElement('span');
    labelSpan.classList.add('nutrient-label');
    if (isBold) {
      labelSpan.innerHTML = `<strong>${labelText}</strong>`;
    } else {
      labelSpan.innerHTML = labelText;
    }

    // Right portion: the DV or numeric value
    const valueSpan = document.createElement('span');
    valueSpan.classList.add('nutrient-value');

    // Convert dvText to string safely
    const dv = dvText !== undefined && dvText !== null 
      ? String(dvText).trim() 
      : '';
  
    if (dv !== '') {
      valueSpan.style.backgroundColor = 'purple';
      valueSpan.style.color = '#fff';
      valueSpan.innerHTML = dv + '%';
    } else {
      // no DV => keep it pastel yellow
      valueSpan.style.backgroundColor = '#fff9c4';
      valueSpan.innerHTML = dv; // might be empty
    }

    // Append the two spans to the row
    row.appendChild(labelSpan);
    row.appendChild(valueSpan);

    // On click, show info text in #label-info
    row.addEventListener('click', () => {
      const infoContainer = document.getElementById('label-info');
      const infoText = nutrientInfo[nutrientKey] || "No additional information available.";
      infoContainer.innerHTML = `
        <h3>${labelText}</h3>
        <p>${infoText}</p>
      `;
    });

    return row;
  }

  //
  // BUILD THE LABEL SECTIONS
  //

  // Header: "Nutrition Facts"
  const header = document.createElement('h1');
  header.textContent = 'Nutrition Facts';
  label.appendChild(header);

  // Serving size area (light green background, clickable)
  const servingSizeArea = document.createElement('div');
  servingSizeArea.classList.add('serving-size-area');
  servingSizeArea.setAttribute('data-key', 'servingSize');
  servingSizeArea.innerHTML = `
    ${data.servingsPerContainer || ''}<br>
    Serving size <strong>${data.servingSize || ''}</strong>
  `;
  // Add click event for serving size
  servingSizeArea.addEventListener('click', () => {
    const infoContainer = document.getElementById('label-info');
    const infoText = nutrientInfo['servingSize'] || "No additional information available.";
    infoContainer.innerHTML = `
      <h3>Serving Size</h3>
      <p>${infoText}</p>
    `;
  });
  label.appendChild(servingSizeArea);

  // Bold line: "Amount per serving"
  const amountPerServing = document.createElement('div');
  amountPerServing.classList.add('bold-line');
  amountPerServing.textContent = 'Amount per serving';
  label.appendChild(amountPerServing);

  // Calories line (light pink background, clickable)
  const caloriesLine = document.createElement('div');
  caloriesLine.classList.add('calories-line');
  caloriesLine.setAttribute('data-key', 'calories');
  caloriesLine.innerHTML = `
    <span>Calories</span>
    <span>${data.calories || 0}</span>
  `;
  // Add click event for calories
  caloriesLine.addEventListener('click', () => {
    const infoContainer = document.getElementById('label-info');
    const infoText = nutrientInfo['calories'] || "No additional information available.";
    infoContainer.innerHTML = `
      <h3>Calories</h3>
      <p>${infoText}</p>
    `;
  });
  label.appendChild(caloriesLine);

  // % Daily Value (highlighted, left-aligned, clickable)
  const dailyValueText = document.createElement('div');
  dailyValueText.classList.add('daily-value-text');
  dailyValueText.setAttribute('data-key', 'dailyValue');
  dailyValueText.textContent = '% Daily Value*';
  // Click event for daily value line
  dailyValueText.addEventListener('click', () => {
    const infoContainer = document.getElementById('label-info');
    const infoText = nutrientInfo['dailyValue'] || "No additional information available.";
    infoContainer.innerHTML = `
      <h3>% Daily Value</h3>
      <p>${infoText}</p>
    `;
  });
  label.appendChild(dailyValueText);

  // MACROS & NUTRIENTS
  // 1) Total Fat
  label.appendChild(
    createLineItem(
      'totalFat',
      `Total Fat ${data.totalFat || 0}g`,
      data.totalFatDV || '',
      true
    )
  );

  // 1a) Saturated Fat (indented)
  const satFat = createLineItem(
    'saturatedFat',
    `Saturated Fat ${data.saturatedFat || 0}g`,
    data.saturatedFatDV || ''
  );
  satFat.classList.add('indent');
  label.appendChild(satFat);

  // 1b) Trans Fat (italicize "trans")
  const transFat = createLineItem(
    'transFat',
    `<i>Trans</i> Fat ${data.transFat || 0}g`,
    '' // no DV
  );
  transFat.classList.add('indent');
  label.appendChild(transFat);

  // 2) Cholesterol
  label.appendChild(
    createLineItem(
      'cholesterol',
      `Cholesterol ${data.cholesterol || 0}mg`,
      data.cholesterolDV || '',
      true
    )
  );

  // 3) Sodium
  label.appendChild(
    createLineItem(
      'sodium',
      `Sodium ${data.sodium || 0}mg`,
      data.sodiumDV || '',
      true
    )
  );

  // 4) Total Carbohydrate
  label.appendChild(
    createLineItem(
      'totalCarb',
      `Total Carbohydrate ${data.totalCarb || 0}g`,
      data.totalCarbDV || '',
      true
    )
  );

  // 4a) Dietary Fiber (indented)
  const fiber = createLineItem(
    'fiber',
    `Dietary Fiber ${data.fiber || 0}g`,
    data.fiberDV || ''
  );
  fiber.classList.add('indent');
  label.appendChild(fiber);

  // 4b) Total Sugars
  label.appendChild(
    createLineItem(
      'totalSugars',
      `Total Sugars ${data.totalSugars || 0}g`,
      '' // no DV for total sugars
    )
  );

  // 4c) Natural Sugars (indented)
  const naturalSugars = createLineItem(
    'naturalSugars',
    `Natural Sugars ${data.naturalSugars || 0}g`,
    ''
  );
  naturalSugars.classList.add('indent');
  label.appendChild(naturalSugars);

  // 4d) Added Sugars (indented)
  const addedSugars = createLineItem(
    'addedSugars',
    `Includes ${data.addedSugars || 0}g Added Sugars`,
    data.addedSugarsDV || ''
  );
  addedSugars.classList.add('indent');
  label.appendChild(addedSugars);

  // 5) Protein
  label.appendChild(
    createLineItem(
      'protein',
      `Protein ${data.protein || 0}g`,
      '', // no DV
      true
    )
  );

  // Thick black bar
  const thickBar = document.createElement('div');
  thickBar.classList.add('thick-bar');
  label.appendChild(thickBar);

  // Vitamins & Minerals (below thick bar)
  label.appendChild(
    createLineItem(
      'vitaminD',
      `Vitamin D ${data.vitaminD || 0}mcg`,
      data.vitaminDDV || ''
    )
  );
  label.appendChild(
    createLineItem(
      'calcium',
      `Calcium ${data.calcium || 0}mg`,
      data.calciumDV || ''
    )
  );
  label.appendChild(
    createLineItem(
      'iron',
      `Iron ${data.iron || 0}mg`,
      data.ironDV || ''
    )
  );
  label.appendChild(
    createLineItem(
      'potassium',
      `Potassium ${data.potassium || 0}mg`,
      data.potassiumDV || ''
    )
  );

  // Footnote
  const footnote = document.createElement('div');
  footnote.classList.add('footnote');
  footnote.innerHTML = `
    * The % Daily Value (DV) tells you how much a nutrient in a serving of food 
    contributes to a daily diet. 2,000 calories a day is used for general nutrition advice.
  `;
  label.appendChild(footnote);

  // Finally, append the label to the container (left column).
  container.appendChild(label);
}





const chipotleBowlData = {
  servingsPerContainer: "1 serving per container",
  servingSize: "1 bowl (approx. 600g)",
  calories: 850,

  totalFat: 35,        // grams
  totalFatDV: 45,      // % DV
  saturatedFat: 10,    // grams
  saturatedFatDV: 50,  // % DV
  transFat: 0,         // grams

  cholesterol: 75,     // mg
  cholesterolDV: 25,   // % DV
  sodium: 1500,        // mg
  sodiumDV: 65,        // % DV

  totalCarb: 90,       // grams
  totalCarbDV: 33,     // % DV
  fiber: 15,           // grams
  fiberDV: 54,         // % DV
  totalSugars: 4,      // grams
  addedSugars: 1,      // grams
  addedSugarsDV: 2,    // % DV

  protein: 50,         // grams

  vitaminD: 2,         // mcg
  vitaminDDV: 10,      // % DV
  calcium: 200,        // mg
  calciumDV: 15,       // % DV
  iron: 5,             // mg
  ironDV: 28,          // % DV
  potassium: 900,      // mg
  potassiumDV: 19      // % DV
};

createSingleColumnNutritionLabel(chipotleBowlData);

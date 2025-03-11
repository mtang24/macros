let data = [];
let subjectData = {};
const subjectToDiabetesGroup = {};

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

  // Build a mapping from subject number to metrics (including minGL and maxGL)
  const subjectMetricsMap = {};
  subjectsResults.forEach(({ subject, totalCalories, avgMETs, avgHR, minGL, maxGL }) => {
    subjectMetricsMap[subject] = { totalCalories, avgMETs, avgHR, minGL, maxGL };
  });

  // Determine the min and max total Calories for scaling dot sizes
  const totalCaloriesValues = subjectsResults.map(d => d.totalCalories);
  const minCalories = d3.min(totalCaloriesValues);
  const maxCalories = d3.max(totalCaloriesValues);

  // Create a scale to map total Calories to a dot radius (adjust range as needed)
  const sizeScale = d3.scalePow()
    .exponent(2)
    .domain([minCalories, maxCalories])
    .range([20, 55]);

  // Update each dot in the merged data and attach new metrics:
  data.forEach(d => {
    const subj = +d.subject; // ensure subject is numeric
    if (subjectMetricsMap[subj] !== undefined) {
      d.totalCalories = subjectMetricsMap[subj].totalCalories;
      d.avgMETs = subjectMetricsMap[subj].avgMETs;
      d.avgHR = subjectMetricsMap[subj].avgHR;
      d.minGL = subjectMetricsMap[subj].minGL;
      d.maxGL = subjectMetricsMap[subj].maxGL;
      d.size = sizeScale(d.totalCalories);
    } else {
      d.totalCalories = 0;
      d.avgMETs = undefined;
      d.avgHR = undefined;
      d.minGL = undefined;
      d.maxGL = undefined;
      d.size = 10; // fallback size
    }
  });

  plotData();
  plotBMIDots();
}

const sliderValues = {
  totalCalories: 0.00,
  avgMETs: 0.00,
  avgHR: 40.00,
  avgGlucose: 0.00,
  bmi: 0.00
};


// Add event listeners to update both the display and our global values


document.getElementById('slider-mets').addEventListener('input', function() {
  sliderValues.avgMETs = parseFloat(this.value);
  this.parentElement.querySelector('.slider-value').textContent = sliderValues.avgMETs.toFixed(2);
});

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
  console.log("Selected Diabetes Group:", window.selectedDiabetesGroup);
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
  console.log("Page Indicator Container:", indicatorContainer);
  
  // Create one dot per section and add a click event
  sections.forEach((section) => {
    const dot = document.createElement('div');
    dot.classList.add('indicator-dot');
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
  
  // After loadData, if on Page 5, plot the GL range.
  if (document.getElementById("page-5")) {
    // Store the subjectsResults globally so we can use them in plotGLRange.
    window.subjectMetricsResults = await loadAllSubjects(Array.from({ length: 49 }, (_, i) => i + 1));
    plotGLRange();
  }

  if (document.getElementById("page-6")) {
    // Store the subjectsResults globally so we can use them in plotGLRange.
    window.subjectMetricsResults = await loadAllSubjects(Array.from({ length: 49 }, (_, i) => i + 1));
    plotAvgHRBoxPlot();
  }
  const subjectNumbers = Array.from({ length: 49 }, (_, i) => i + 1);
  const subjectsResults = await loadAllSubjects(subjectNumbers);
 
  if (document.getElementById("page-3")) {
    const macroAverages = computeMacroAverages(subjectsResults);
  
    // Append Pie Chart to Page 3
    const page3 = document.getElementById("page-3");
    page3.innerHTML = '<div id="macroPieChartContainer"></div>'; // Clear and add a container
    renderMacroPieChart(macroAverages);
  }

// Helper function to lighten colors for tooltips
function lightenColor2(col, factor = 0.7) {
  let c = d3.rgb(col);
  c.r = Math.round(c.r + (255 - c.r) * factor);
  c.g = Math.round(c.g + (255 - c.g) * factor);
  c.b = Math.round(c.b + (255 - c.b) * factor);
  return c.toString();
}

function drawPage2Axes() {
  d3.select("#axes-container").select("svg").remove();

  const margin = { top: 60, right: 200, bottom: 60, left: 100 };
  const width = 850 - margin.left - margin.right;
  window.page2ChartWidth = width; // Save for later use in positioning the label
  const height = 500 - margin.top - margin.bottom;
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
    .text(`Your total calories consumed: ${sliderValues.totalCalories}`);

    

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
  console.log("Slider Value Updated:", sliderValues.totalCalories);
  
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
    .text(`Your total calories consumed: ${(sliderValues.totalCalories / 10).toFixed(2)}`)
    .raise();
});



});


document.querySelectorAll('#slider-container input[type="range"]').forEach(slider => {
slider.addEventListener('input', function() {
  const valueDisplay = this.parentElement.querySelector('.slider-value');
  valueDisplay.textContent = parseFloat(this.value).toFixed(2);
});
});


  // const simulation = d3.forceSimulation(nodes)
  //                      .force("x", d3.forceX(d => xScale(d.group) + xScale.bandwidth() / 2).strength(1))
  //                      .force("y", d3.forceY(d => yScale(d.totalCalories)).strength(1))
  //                      .force("collide", d3.forceCollide(dotRadius + 1))
  //                      .stop();
  // for (let i = 0; i < 120; ++i) simulation.tick();

  // const dots = dataGroup.selectAll(".dot")
  //     .data(nodes)
  //     .enter()
  //     .append("circle")
  //     .attr("class", "dot")
  //     .attr("cx", d => d.x)
  //     .attr("cy", d => d.y)
  //     .attr("r", dotRadius)
  //     .attr("fill", d => groupColor[d.group])
  //     .style("opacity", 0);

  // dots.transition().duration(500).style("opacity", 1);

  // const tooltip = d3.select("body").select("#swarm-tooltip");
  // dots.on("mouseover", function(event, d) {
  //      const fillColor = d3.select(this).attr("fill");
  //      const lightFill = lightenColor(fillColor, 0.7);
  //      tooltip.html(`<strong>Subject ${d.subject}</strong><br/>Total Calories: ${d.totalCalories}`)
  //             .style("background", lightFill)
  //             .style("opacity", 1);
  // })
  // .on("mousemove", function(event) {
  //      tooltip.style("left", (event.pageX + 10) + "px")
  //             .style("top", (event.pageY - 20) + "px");
  // })
  // .on("mouseout", function() {
  //      tooltip.style("opacity", 0);
  // });


function plotData() {
  const width = 1000;
  const height = 500;
  const centerX = width / 2;
  const centerY = height / 2;
  const svg = d3.select("#grid")
                .attr("width", width)
                .attr("height", height);

  // Define a color scale for the Diabetes values
  const color = d3.scaleOrdinal()
    .domain(["Healthy", "Pre-Diabetes", "Type 2 Diabetes"])
    .range(["#2C7BB6", "#FDB863", "#D7191C"]);

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
      .on("click", function() {
        document.getElementById("info-section").scrollIntoView({ behavior: "smooth", block: "start" });
      });
  }

  // Get references to the info section and scroll arrow.
  const infoSection = document.getElementById("info-section");
  const scrollArrow = document.getElementById("scroll-down-arrow");

  // Create an observer to monitor when the info section enters the viewport within #snap-container.
  const snapContainer = document.getElementById("snap-container");
  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      scrollArrow.style.display = entry.isIntersecting ? "none" : "block";
    });
  }, { 
    root: snapContainer,  // Use snap-container as the scrolling area
    threshold: 0.1 
  });

  // Observe the info section.
  observer.observe(infoSection);

  // Re-create tooltip if it doesn't exist.
  if (d3.select("#tooltip").empty()) {
    d3.select("body")
      .append("div")
      .attr("id", "tooltip")
      .style("position", "absolute")
      .style("opacity", 0)
      .style("pointer-events", "none");
  }

function handleDotClick(event, d) {
  // Clean up any previous details view.
  d3.selectAll("#subject-details").remove();
  d3.selectAll("#go-back-arrow").remove();
  d3.selectAll("#scroll-down-arrow").remove();
  window.removeEventListener("wheel", backScrollHandler);

  d3.select("#tooltip")
  .interrupt()
  .style("opacity", 0)
  .style("display", "none");
  
  // Hide the info section so it doesn’t affect scrolling.
  d3.select("#info-section").style("display", "none");
  
  // Get the dot's base color and compute a lighter version.
  const dotColor = color(d.Diabetes);
  const lighterColor = lightenColor(dotColor, 0.5); // adjust factor as needed

  // Transition the page background to the lighter color.
  d3.select("body")
    .transition()
    .duration(500)
    .style("background-color", lighterColor);

  // Fade out the main visualization elements (grid and header),
  // then hide them so they can be restored later by resetMainView().
  d3.select("#grid")
    .transition()
    .duration(500)
    .style("opacity", 0)
    .on("end", () => {
      d3.select("#grid").style("display", "none");
      d3.select("h1").style("display", "none");

      // Inject bounce animation CSS if not already injected.
      if (d3.select("#bounce-style").empty()) {
        d3.select("head")
          .append("style")
          .attr("id", "bounce-style")
          .html(`
            @keyframes bounce {
              0%, 20%, 50%, 80%, 100% { transform: translateY(0); }
              40% { transform: translateY(-10px); }
              60% { transform: translateY(-5px); }
            }
          `);
      }

      // Append the details container with initial opacity 0.
      const details = d3.select("body")
        .append("div")
        .attr("id", "subject-details")
        .html(`
          <h1>Subject ${d.subject}</h1>
          <div>
            <p>Diabetes: ${d.Diabetes}</p>
            <p>Total Calories: ${d.totalCalories}</p>
            <p>Average METs: ${d.avgMETs !== undefined ? d.avgMETs.toFixed(2) : 'N/A'}</p>
            <p>Average HR: ${d.avgHR !== undefined ? d.avgHR.toFixed(2) : 'N/A'}</p>
            <!-- Add more subject-specific content here -->
          </div>
        `)
        .style("position", "absolute")
        .style("top", "50%")
        .style("left", "50%")
        .style("transform", "translate(-50%, -50%)")
        .style("color", "black")
        .style("font-size", "1em")
        .style("text-align", "center")
        .style("opacity", 0);

      // Fade in the details.
      details.transition()
        .duration(1000)
        .style("opacity", 1);

      // Append the back arrow with bounce animation and tooltip.
      d3.select("body")
        .append("div")
        .attr("id", "go-back-arrow")
        .style("position", "fixed")
        .style("bottom", "20px")
        .style("left", "50%")
        .style("transform", "translateX(-50%)")
        .style("text-align", "center")
        .html(`
          <div style="font-size: 32px; animation: bounce 1s infinite;">&#8595;</div>
          <div id="arrow-tooltip" style="font-size: 14px; opacity: 0;">Scroll down to go back</div>
        `);

      // Fade the arrow tooltip in then out.
      d3.select("#arrow-tooltip")
        .transition()
        .duration(1000)
        .style("opacity", 1)
        .transition()
        .delay(3000)
        .duration(1000)
        .style("opacity", 0);

      // Add the global wheel event listener for going back.
      window.addEventListener("wheel", backScrollHandler);
    });
}

  // Healthy circles click handler.
  // Example update for healthy circles tooltip:
healthyCircles
.on("mouseover", (event, d) => {
  d3.select("#tooltip")
    .style("display", "block")
    .transition()
      .duration(200)
      .style("opacity", 0.9);
  d3.select("#tooltip")
    .html(
      `<div style="text-align: center; font-weight: bold;">Subject: ${d.subject}</div>
       <div style="text-align: left;">Diabetes: ${d.Diabetes}</div>
       <div style="text-align: left;">Total Calories: ${d.totalCalories}</div>
       <div style="text-align: left;">Average METs: ${d.avgMETs !== undefined ? d.avgMETs.toFixed(2) : 'N/A'}</div>
       <div style="text-align: left;">Average HR: ${d.avgHR !== undefined ? d.avgHR.toFixed(2) : 'N/A'}</div>
       <div style="text-align: left;">Glucose range: ${d.minGL !== undefined ? d.minGL : 'N/A'}-${d.maxGL !== undefined ? d.maxGL : 'N/A'}</div>`
    )
    .style("left", (event.pageX + 5) + "px")
    .style("top", (event.pageY - 28) + "px");
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
  d3.select("#tooltip")
    .style("display", "block")
    .transition()
      .duration(200)
      .style("opacity", 0.9);
  d3.select("#tooltip")
    .html(
      `<div style="text-align: center; font-weight: bold;">Subject: ${d.subject}</div>
       <div style="text-align: left;">Diabetes: ${d.Diabetes}</div>
       <div style="text-align: left;">Total Calories: ${d.totalCalories}</div>
       <div style="text-align: left;">Average METs: ${d.avgMETs !== undefined ? d.avgMETs.toFixed(2) : 'N/A'}</div>
       <div style="text-align: left;">Average HR: ${d.avgHR !== undefined ? d.avgHR.toFixed(2) : 'N/A'}</div>
       <div style="text-align: left;">Glucose range: ${d.minGL !== undefined ? d.minGL : 'N/A'}-${d.maxGL !== undefined ? d.maxGL : 'N/A'}</div>`
    )
    .style("left", (event.pageX + 5) + "px")
    .style("top", (event.pageY - 28) + "px");
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
  d3.select("#tooltip")
    .style("display", "block")
    .transition()
      .duration(200)
      .style("opacity", 0.9);
  d3.select("#tooltip")
    .html(
      `<div style="text-align: center; font-weight: bold;">Subject: ${d.subject}</div>
       <div style="text-align: left;">Diabetes: ${d.Diabetes}</div>
       <div style="text-align: left;">Total Calories: ${d.totalCalories}</div>
       <div style="text-align: left;">Average METs: ${d.avgMETs !== undefined ? d.avgMETs.toFixed(2) : 'N/A'}</div>
       <div style="text-align: left;">Average HR: ${d.avgHR !== undefined ? d.avgHR.toFixed(2) : 'N/A'}</div>
       <div style="text-align: left;">Glucose range: ${d.minGL !== undefined ? d.minGL : 'N/A'}-${d.maxGL !== undefined ? d.maxGL : 'N/A'}</div>`
    )
    .style("left", (event.pageX + 5) + "px")
    .style("top", (event.pageY - 28) + "px");
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

function lightenColor(col, factor = 0.5) {
  // Convert the color to an RGB object.
  let c = d3.rgb(col);
  // Increase each channel based on the difference to 255.
  c.r = Math.round(c.r + (255 - c.r) * factor);
  c.g = Math.round(c.g + (255 - c.g) * factor);
  c.b = Math.round(c.b + (255 - c.b) * factor);
  return c.toString();
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
      d.METs = +d.METs;
      d.HR = +d.HR;
      d["Libre GL"] = +d["Libre GL"];
    });
    // Compute total Calories.
    const totalCalories = d3.sum(csvData, d => d.Calories);
    const avgDailyCalories = totalCalories / 10;
    // Filter valid METs and HR values before computing averages.
    const validMETs = csvData.filter(d => !isNaN(d.METs));
    const avgMETs = d3.mean(validMETs, d => d.METs);
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
      avgMETs, 
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

async function loadAllCSVSubjects(subjectNumbers) {
  const missingSubjectIDs = [24, 25, 37, 40];
  const validSubjects = subjectNumbers.filter(subject => !missingSubjectIDs.includes(subject));
  const subjectPromises = validSubjects.map(subject => loadcsvData(subject));
  const results = await Promise.all(subjectPromises);
  const filteredResults = results.filter(result => result !== null);
  console.log("Metrics per subject:", filteredResults);
  return filteredResults;
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
  d3.select("#info-section").style("display", "block");
  
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
    .on("click", function() {
      document.getElementById("info-section").scrollIntoView({
        behavior: "smooth",
        block: "start"
      });
    });
  
  // Re-attach the IntersectionObserver to the new arrow so it hides on page2.
  const infoSection = document.getElementById("info-section");
  const scrollArrow = document.getElementById("scroll-down-arrow");
  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      scrollArrow.style.display = entry.isIntersecting ? "none" : "block";
    });
  }, { 
    root: snapContainer,
    threshold: 0.1
  });
  observer.observe(infoSection);
  
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



function plotBMIDots() {
  // Ensure BMI values are numeric.
  data.forEach(d => { d.BMI = +d.BMI; });
  
  const width = 800, height = 400;
  const margin = { top: 40, right: 40, bottom: 40, left: 40 };
  const innerWidth = width - margin.left - margin.right;
  const innerHeight = height - margin.top - margin.bottom;
  
  // Determine the min/max BMI.
  const minBMI = d3.min(data, d => d.BMI);
  const maxBMI = d3.max(data, d => d.BMI);
  
  // Use BMI to determine vertical positions.
  const yScale = d3.scaleLinear()
                   .domain([minBMI, maxBMI])
                   .range([innerHeight, 0])
                   .nice();
  
  // Create an x-scale for horizontal jitter.
  const xScale = d3.scaleLinear()
                   .domain([0, 1])
                   .range([0, innerWidth]);
  
  // Define a color scale based on diabetes status.
  const colorScale = d3.scaleOrdinal()
                       .domain(["Healthy", "Pre-Diabetes", "Type 2 Diabetes"])
                       .range(["#2C7BB6", "#FDB863", "#D7191C"]);
  
  // Append the SVG to page-4.
  const svg = d3.select("#page-4")
                .append("svg")
                .attr("id", "bmi-chart")
                .attr("width", width)
                .attr("height", height);
                        
  const g = svg.append("g")
               .attr("transform", `translate(${margin.left},${margin.top})`);
  
  // Plot circles for each subject with horizontal jitter.
  g.selectAll("circle")
    .data(data)
    .enter()
    .append("circle")
    // Use random jitter for x and map BMI for the y position.
    .attr("cx", d => xScale(Math.random()))
    .attr("cy", d => yScale(d.BMI))
    .attr("r", 5)
    .attr("fill", d => colorScale(d.Diabetes))
    .on("mouseover", function(event, d) {
      d3.select("#tooltip")
        .style("display", "block")
        .html(
          `<div style="text-align: center; font-weight: bold;">Subject: ${d.subject}</div>
           <div>Diabetes: ${d.Diabetes}</div>
           <div>BMI: ${d.BMI}</div>`
        )
        .style("left", (event.pageX + 5) + "px")
        .style("top", (event.pageY - 28) + "px")
        .transition().duration(200)
        .style("opacity", 0.9);
    })
    .on("mouseout", function() {
      d3.select("#tooltip")
        .transition()
        .duration(500)
        .style("opacity", 0)
        .on("end", function() {
           d3.select(this).style("display", "none");
        });
    });
  
  // Optional: add a y-axis for BMI.
  const yAxis = d3.axisLeft(yScale);
  g.append("g")
   .call(yAxis);
}



function plotGLRange() {
  if (!window.subjectMetricsResults) {
    console.error("Subject metrics not loaded yet.");
    return;
}
  // Re-read slider values (with defaults)
  const userMinGL = window.userGlucoseMin ? window.userGlucoseMin() : 40;
  const userMaxGL = window.userGlucoseMax ? window.userGlucoseMax() : 500;

  // Define the diabetes groups (must match your data grouping)
  const groups = ["Healthy", "Pre-Diabetes", "Type 2 Diabetes"];

  // Obtain sorted subjects from your global subject metrics.
  // (Assumes window.subjectMetricsResults has been set previously.)
  const sortedSubjects = window.subjectMetricsResults.slice().sort((a, b) => {
    if (a.Diabetes !== b.Diabetes) {
      return groups.indexOf(a.Diabetes) - groups.indexOf(b.Diabetes);
    }
    return +a.subject - +b.subject;
  });
  window.sortedSubjects = sortedSubjects;

  // Create a responsive SVG (assumes createResponsiveSVG exists)
  const { svg, width, height, margin } = createResponsiveSVG("#glrange-container", { top: 40, right: 30, bottom: 40, left: 100 });
  window.svg = svg;

  const newDomain = [];

  window.newDomain = newDomain;
  
  // Build a new y-scale domain that interleaves gap markers between groups
  for (let i = 0; i < sortedSubjects.length; i++) {
    // If this is the first subject or a new group, add a gap marker first.
    if (i === 0 || sortedSubjects[i].Diabetes !== sortedSubjects[i - 1].Diabetes) {
      newDomain.push(`gap-${sortedSubjects[i].Diabetes}`);
    }
    newDomain.push(sortedSubjects[i].subject);
  }

  // Create scales using the new domain.
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

  // For the y-axis, filter out gap markers in the tick format.
  svg.append("g")
    .call(d3.axisLeft(yScale)
      .tickFormat(d => d.toString().startsWith("gap-") ? "" : d));

  // Compute each group's average min and max.
  const groupAverageGL = groups.map(group => {
    const groupData = sortedSubjects.filter(d => d.Diabetes === group);
    const avgMin = d3.mean(groupData, d => +d.minGL);
    const avgMax = d3.mean(groupData, d => +d.maxGL);
    return { group, avgMin, avgMax };
  });

  // Determine the predicted group (smallest total distance).
  let bestGroup = groupAverageGL[0];
  let bestDiff = Infinity;
  groupAverageGL.forEach(g => {
    const diff = Math.abs(g.avgMin - userMinGL) + Math.abs(g.avgMax - userMaxGL);
    if (diff < bestDiff) {
      bestDiff = diff;
      bestGroup = g;
    }
  });

  // Draw background highlighting for the predicted group.
  const backgroundGroup = svg.insert("g", ":first-child").attr("class", "background");
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

  // Create a foreground group for subjects and overlays.
  const foregroundGroup = svg.append("g").attr("class", "foreground");
  window.foregroundGroup = foregroundGroup;

  // Draw subject glucose range lines.
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
    .attr("stroke-width", 2);

  // Draw subject dots.
  foregroundGroup.selectAll("circle.min-gl")
    .data(sortedSubjects)
    .enter()
    .append("circle")
    .attr("class", "min-gl")
    .attr("cx", d => xScale(Math.max(d.minGL, 40)))
    .attr("cy", d => yScale(d.subject) + yScale.bandwidth() / 2)
    .attr("r", 5)
    .attr("fill", d => color(d.Diabetes));

  foregroundGroup.selectAll("circle.max-gl")
    .data(sortedSubjects)
    .enter()
    .append("circle")
    .attr("class", "max-gl")
    .attr("cx", d => xScale(d.maxGL))
    .attr("cy", d => yScale(d.subject) + yScale.bandwidth() / 2)
    .attr("r", 5)
    .attr("fill", d => color(d.Diabetes));

  // Update the predicted group title (assumes an element with id "predicted-group-title" exists).
  // Instead of inserting into the container normally, use absolute positioning.
  let container = d3.select("#glrange-container");

  // Check if the predicted group title already exists.
  let titleEl = container.select("#predicted-group-title");
  if (titleEl.empty()) {
    // Append the title element inside the container
    titleEl = container.append("div")
      .attr("id", "predicted-group-title")
      .style("position", "absolute")
      .style("top", "10px")        // Adjust top as needed
      .style("left", "50%")
      .style("transform", "translateX(-50%)")
      .style("text-align", "center")
      .style("font-size", "16px")
      .style("font-weight", "bold")
      .style("pointer-events", "none"); // So it doesn't block interactions
  }
  titleEl.text(`Your predicted group: ${bestGroup.group}`);


  // Determine vertical position for the overlay – use the center of subjects in the predicted group.
  const groupDataForOverlay = sortedSubjects.filter(d => d.Diabetes === bestGroup.group);
  const overlayY = groupDataForOverlay.length
    ? d3.mean(groupDataForOverlay, d => yScale(d.subject) + yScale.bandwidth() / 2)
    : d3.max(sortedSubjects, d => yScale(d.subject)) + yScale.bandwidth() + 30;

  // Prepare overlay data.
  const overlayData = [{ min: userMinGL, max: userMaxGL, y: overlayY }];
  // Draw overlay line.
  const line = foregroundGroup.selectAll("line.user-glucose-line").data(overlayData);
  line.enter()
    .append("line")
    .attr("class", "user-glucose-line")
    .merge(line)
    .transition().duration(300)
    .attr("x1", d => xScale(d.min))
    .attr("x2", d => xScale(d.max))
    .attr("y1", d => d.y)
    .attr("y2", d => d.y)
    .attr("stroke", "black")
    .attr("stroke-width", 2);
  line.exit().remove();

  // Draw overlay dots.
  const dotsData = [
    { cx: userMinGL, y: overlayY },
    { cx: userMaxGL, y: overlayY }
  ];
  const dots = foregroundGroup.selectAll("circle.user-glucose-dot").data(dotsData);
  dots.enter()
    .append("circle")
    .attr("class", "user-glucose-dot")
    .merge(dots)
    .transition().duration(300)
    .attr("cx", d => xScale(d.cx))
    .attr("cy", d => d.y)
    .attr("r", 5)
    .attr("fill", "black");
  dots.exit().remove();

  // Draw overlay label.
  const label = foregroundGroup.selectAll("text.user-input-label").data(overlayData);
  label.enter()
    .append("text")
    .attr("class", "user-input-label")
    .merge(label)
    .transition().duration(300)
    .attr("x", -10)
    .attr("y", d => d.y + 5)
    .attr("text-anchor", "end")
    .style("font-size", "12px")
    .text("Your input");
  label.exit().remove();
}


function updateUserGlucoseRange() {
  // Ensure global SVG and newDomain exist.
  if (!window.svg || !window.newDomain) {
    console.warn("SVG or newDomain not defined. Calling plotGLRange() to create them.");
    plotGLRange();
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
    .text("Your input");
  label.exit().remove();
}

window.updateUserGlucoseRange = updateUserGlucoseRange;



// function updateUserGlucoseRange() {
//   // Ensure global SVG exists.
//   if (!window.svg) {
//     console.warn("SVG not defined. Calling plotGLRange() to create it.");
//     plotGLRange();
//     if (!window.svg) return;
//   }
  
//   // Get slider values (use defaults if not defined)
//   const userMinGL = window.userGlucoseMin ? window.userGlucoseMin() : 40;
//   const userMaxGL = window.userGlucoseMax ? window.userGlucoseMax() : 410;
  
//   // Define diabetes groups.
//   const groups = ["Healthy", "Pre-Diabetes", "Type 2 Diabetes"];
  
//   // Sort subjects using our global subjectMetricsResults.
//   const sortedSubjects = window.subjectMetricsResults.slice().sort((a, b) => {
//     if (a.Diabetes !== b.Diabetes) {
//       return groups.indexOf(a.Diabetes) - groups.indexOf(b.Diabetes);
//     }
//     return +a.subject - +b.subject;
//   });
//   window.sortedSubjects = sortedSubjects;
  
//   // Compute average GL per group.
//   const groupAverageGL = groups.map(group => {
//     const groupData = sortedSubjects.filter(d => d.Diabetes === group);
//     return {
//       group,
//       avgMin: d3.mean(groupData, d => +d.minGL),
//       avgMax: d3.mean(groupData, d => +d.maxGL)
//     };
//   });
  
//   // Determine the predicted group based on closest averages.
//   let bestGroup = groupAverageGL[0];
//   let bestDiff = Infinity;
//   groupAverageGL.forEach(g => {
//     const diff = Math.abs(g.avgMin - userMinGL) + Math.abs(g.avgMax - userMaxGL);
//     if (diff < bestDiff) {
//       bestDiff = diff;
//       bestGroup = g;
//     }
//   });
  
//   // Update predicted group title.
//   let container = d3.select("#glrange-container");
//   let titleEl = container.select("#predicted-group-title");
//   if (titleEl.empty()) {
//     titleEl = container.insert("div", ":first-child")
//       .attr("id", "predicted-group-title")
//       .style("text-align", "center")
//       .style("font-size", "16px")
//       .style("font-weight", "bold")
//       .style("margin", "10px 0");
//   }
//   titleEl.text(`Your predicted group: ${bestGroup.group}`);
  
//   // -------- Background Rectangle Update --------
//   // Reuse the background group if it exists or insert a new one.
//   let backgroundGroup = d3.select("g.background");
//   if (backgroundGroup.empty()) {
//     backgroundGroup = window.svg.insert("g", ":first-child")
//       .attr("class", "background")
//       .style("pointer-events", "none");
//   } else {
//     // Remove any existing rect inside backgroundGroup so we can re-draw.
//     backgroundGroup.selectAll("rect").remove();
//   }
  
//   // Define a color scale and a helper to lighten colors.
//   const color = d3.scaleOrdinal()
//       .domain(groups)
//       .range(["#2C7BB6", "#FDB863", "#D7191C"]);
//   function lightenColor2(col, factor = 0.7) {
//     let c = d3.rgb(col);
//     c.r = Math.round(c.r + (255 - c.r) * factor);
//     c.g = Math.round(c.g + (255 - c.g) * factor);
//     c.b = Math.round(c.b + (255 - c.b) * factor);
//     return c.toString();
//   }
  
//   // Get the subjects for the predicted group.
//   const bestGroupData = sortedSubjects.filter(d => d.Diabetes === bestGroup.group);
//   if (bestGroupData.length > 0) {
//     const yVals = bestGroupData.map(d => window.yScale(d.subject));
//     const yMinRect = d3.min(yVals);
//     const yMaxRect = d3.max(yVals) + window.yScale.bandwidth();
    
//     // Compute overlay center based on group data.
//     const groupDataForOverlay = sortedSubjects.filter(d => d.Diabetes === bestGroup.group);
//     const baseOverlayY = groupDataForOverlay.length > 0
//       ? d3.mean(groupDataForOverlay, d => window.yScale(d.subject) + window.yScale.bandwidth()/2)
//       : d3.max(sortedSubjects, d => window.yScale(d.subject)) + window.yScale.bandwidth() + 30;
      
//     // Use fixed offsets: 110 for Healthy, 95 for Type 2 Diabetes, 105 for Pre-Diabetes.
//     const offset = bestGroup.group === "Healthy" ? 110
//                  : bestGroup.group === "Type 2 Diabetes" ? 95
//                  : 105;
//     const overlayY = baseOverlayY - offset;
    
//     // Extend upward if overlayY minus some extension is above yMinRect.
//     const extension = 10; // adjust padding as needed
//     const adjustedYMinRect = Math.min(yMinRect, overlayY - extension);
    
//     // Draw the background rectangle.
//     backgroundGroup.append("rect")
//       .attr("x", 0)
//       .attr("y", adjustedYMinRect)
//       .attr("width", window.xScale.range()[1])
//       .attr("height", yMaxRect - adjustedYMinRect)
//       .attr("fill", lightenColor2(color(bestGroup.group), 0.3))
//       .attr("opacity", 0.5);
//   }
  
//   // Make sure the background stays behind everything.
//   backgroundGroup.lower();
  
//   // -------- Overlay Elements Update --------
//   const fg = window.foregroundGroup;
//   const t = d3.transition().duration(500).ease(d3.easeCubic);
  
//   // Recompute overlayY (if needed, identical to above).
//   const groupDataForOverlay = sortedSubjects.filter(d => d.Diabetes === bestGroup.group);
//   const baseOverlayY = groupDataForOverlay.length > 0
//     ? d3.mean(groupDataForOverlay, d => window.yScale(d.subject) + window.yScale.bandwidth()/2)
//     : d3.max(sortedSubjects, d => window.yScale(d.subject)) + window.yScale.bandwidth() + 30;
//   const offsetOverlay = bestGroup.group === "Healthy" ? 110 
//                        : bestGroup.group === "Type 2 Diabetes" ? 95 
//                        : 105;
//   const overlayY = baseOverlayY - offsetOverlay;
//   const overlayData = [{ min: userMinGL, max: userMaxGL, y: overlayY }];
  
//   // Update (or add) the overlay line.
//   const line = fg.selectAll("line.user-glucose-line").data(overlayData);
//   line.enter()
//     .append("line")
//     .attr("class", "user-glucose-line")
//     .merge(line)
//     .transition(t)
//     .attr("x1", d => window.xScale(d.min))
//     .attr("x2", d => window.xScale(d.max))
//     .attr("y1", d => d.y)
//     .attr("y2", d => d.y)
//     .attr("stroke", "black")
//     .attr("stroke-width", 2);
//   line.exit().remove();
  
//   // Update overlay dots.
//   const dotsData = [
//     { cx: userMinGL, y: overlayY },
//     { cx: userMaxGL, y: overlayY }
//   ];
//   const dots = fg.selectAll("circle.user-glucose-dot").data(dotsData);
//   dots.enter()
//     .append("circle")
//     .attr("class", "user-glucose-dot")
//     .merge(dots)
//     .transition(t)
//     .attr("cx", d => window.xScale(d.cx))
//     .attr("cy", d => d.y)
//     .attr("r", 5)
//     .attr("fill", "black");
//   dots.exit().remove();
  
//   // Update overlay label.
//   const label = fg.selectAll("text.user-input-label").data(overlayData);
//   label.enter()
//     .append("text")
//     .attr("class", "user-input-label")
//     .merge(label)
//     .transition().duration(300)
//     .attr("x", -10)
//     .attr("y", d => d.y + 5)
//     .attr("text-anchor", "end")
//     .style("font-size", "12px")
//     .text("Your input");
//   label.exit().remove();
// }

// window.updateUserGlucoseRange = updateUserGlucoseRange;

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
  const width = 450, height = 450, radius = Math.min(width, height) / 2.5;

  // Clear previous content
  d3.select("#macroPieChartContainer").html("");

  // Add Title - Styled professionally
  const title = d3.select("#macroPieChartContainer")
    .append("h2")
    .attr("id", "macroPieChartTitle")
    .style("text-align", "left")
    .style("margin-bottom", "12px")
    .style("font-size", "22px")
    .style("color", "#333")
    .style("font-weight", "600")
    .text("Comparing Macronutrient Distributions");

  // SVG Container
  const svg = d3.select("#macroPieChartContainer")
    .append("svg")
    .attr("width", width)
    .attr("height", height)
    .append("g")
    .attr("transform", `translate(${width / 2}, ${height / 2})`);

  // Color Scale with Transparency
  const color = d3.scaleOrdinal(["rgba(179, 158, 181, 0.7)",   // Mauve for Carbs
    "rgba(136, 176, 75, 0.7)",    // Sage Green for Protein
    "rgba(224, 122, 95, 0.7)",    
    "rgba(152, 176, 243, 0.7)" ]); 

  // Tooltip
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
    const formatMacroName = (macro) => {
      return macro.replace("avg", "").toLowerCase();
    };
    function updateChart(selectedGroup) {
      const data = macroAverages.find(d => d.group === selectedGroup)?.macroAverages || [];
      const pie = d3.pie().value(d => d.average)(data);
      const arc = d3.arc().innerRadius(50).outerRadius(radius);
    
      // Bind data to path elements
      const path = svg.selectAll("path").data(pie);
    
      // Enter + Update paths
      const pathEnter = path.enter().append("path")
        .attr("d", arc) // set initial shape
        .attr("fill", (d, i) => color(i))
        .attr("stroke", "#fff")
        .style("stroke-width", "2px")
        .style("opacity", 0.9);
    
      // Merge new and existing paths
      const allPaths = pathEnter.merge(path);
    
      // Bind event listeners to the DOM elements (not the transition).
      allPaths
        .on("mouseover", function (event, d) {
          // Highlight the segment by increasing its size (pop-out effect)
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
              Group: ${selectedGroup}
            `)
            .style("left", (event.pageX + 10) + "px")
            .style("top", (event.pageY - 28) + "px");
        })
        .on("mouseout", function (event, d) {
          // Return the segment to its original size.
          d3.select(this)
            .transition()
            .duration(200)
            .attr("d", arc);
          // Hide tooltip.
          tooltip.style("opacity", 0);
        });
    
      // Now, apply the smooth transition to update attributes.
      allPaths.transition().duration(700)
        .attr("d", arc)
        .attr("fill", (d, i) => color(i))
        .attr("stroke", "#fff")
        .style("stroke-width", "2px")
        .style("opacity", 0.9);
    
      // Remove any old elements.
      path.exit().remove();
    
      // Update text labels.
      const text = svg.selectAll("text").data(pie);
    
      // Enter + Update text labels
      const textEnter = text.enter().append("text")
        .attr("text-anchor", "middle")
        .attr("font-size", "14px")
        .attr("font-weight", "bold")
        .attr("fill", "white");
    
      // Merge new and existing text labels
      textEnter.merge(text)
        .text(d => `${formatMacroName(d.data.macro)}: (${d.data.average.toFixed(1)}g)`)
        .transition().duration(500)
        .attr("transform", d => `translate(${arc.centroid(d)})`);
    
      // Remove any old text elements.
      text.exit().remove();
    
      // Update Title Based on Selected Group.
      title.text(`Comparing Daily Macronutrient Distribution: ${selectedGroup}`)
        .style("font-weight", "bold");
    }
    svg.append("defs")
    .append("filter")
    .attr("id", "shadow")
    .append("feDropShadow")
    .attr("dx", 2)
    .attr("dy", 2)
    .attr("stdDeviation", 3)
    .attr("flood-color", "rgba(0, 0, 0, 0.5)");

  // Listen for changes in diabetes group selector
  document.getElementById('slider-group').addEventListener('change', function() {
    window.selectedDiabetesGroup = this.value;
    updateChart(window.selectedDiabetesGroup);
  });

  // Initialize with default selection
  updateChart(document.getElementById('slider-group').value);
}



function plotAvgHRBoxPlot() {
  if (!window.subjectMetricsResults) return;
  const data = window.subjectMetricsResults;

  // Set dimensions and margins for the chart.
  const margin = { top: 5, right: 30, bottom: 70, left: 100 },
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
    .attr("text-anchor", "end")
    .attr("x", width)
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


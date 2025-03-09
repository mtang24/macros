let data = [];
let subjectData = {};

async function loadData() {
  // Load the merged CSV data
  data = await d3.csv("merged.csv");

  // Group data by subject (each row should have a 'subject' field)
  data.forEach(d => {
    const subject = d.subject;
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
  avgHR: 0.00,
  avgGlucose: 0.00,
  bmi: 0.00
};

// Add event listeners to update both the display and our global values
document.getElementById('slider-calories').addEventListener('input', function() {
  sliderValues.totalCalories = parseFloat(this.value);
  this.parentElement.querySelector('.slider-value').textContent = sliderValues.totalCalories.toFixed(2);
  updateCaloriesIndicator();
});


document.getElementById('slider-mets').addEventListener('input', function() {
  sliderValues.avgMETs = parseFloat(this.value);
  this.parentElement.querySelector('.slider-value').textContent = sliderValues.avgMETs.toFixed(2);
});

document.getElementById('slider-hr').addEventListener('input', function() {
  sliderValues.avgHR = parseFloat(this.value);
  this.parentElement.querySelector('.slider-value').textContent = sliderValues.avgHR.toFixed(2);
});

document.getElementById('slider-glucose').addEventListener('input', function() {
  sliderValues.avgGlucose = parseFloat(this.value);
  this.parentElement.querySelector('.slider-value').textContent = sliderValues.avgGlucose.toFixed(2);
});

document.getElementById('slider-bmi').addEventListener('input', function() {
  sliderValues.bmi = parseFloat(this.value);
  this.parentElement.querySelector('.slider-value').textContent = sliderValues.bmi.toFixed(2);
});


document.addEventListener("DOMContentLoaded", async () => {
  await loadData();

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
    console.log(macroAverages);
  }

  // If on Page 2, set up the view toggle for the bar chart vs. swarm plot
  const page2 = document.getElementById("page-2");
// --- Page 2 chart block (working version) ---
if (document.getElementById("page-2")) {
  const svgWidth = 800,
        svgHeight = 600,
        margin = { top: 60, right: 30, bottom: 60, left: 60 },
        width = svgWidth - margin.left - margin.right,
        height = svgHeight - margin.top - margin.bottom;

  // Clear container and create SVG
  const container = d3.select("#axes-container");
  container.selectAll("*").remove();
  const svg = container.append("svg")
    .attr("width", svgWidth)
    .attr("height", svgHeight);
  window.page2SVG = svg;

  // Create one group for the entire chart (axes and data)
  const axesGroup = svg.append("g")
    .attr("transform", `translate(${margin.left}, ${margin.top})`);
  window.page2DataGroup = axesGroup;

  // Define scales
  const groups = ["Healthy", "Pre-Diabetes", "Type 2 Diabetes"];
  const xScale = d3.scaleBand()
    .domain(groups)
    .range([0, width])
    .padding(0.4);
  const yScale = d3.scaleLinear()
    .domain([0, 36000])
    .range([height, 0]);
  window.page2YScale = yScale;
  window.page2Dimensions = { width, height, margin, svgHeight };

  // Append axes
  axesGroup.append("g")
    .attr("class", "y-axis")
    .call(d3.axisLeft(yScale));
  axesGroup.append("g")
    .attr("class", "x-axis")
    .attr("transform", `translate(0, ${height})`)
    .call(d3.axisBottom(xScale));

  // Append static titles/labels to the SVG
  svg.append("text")
    .attr("x", svgWidth / 2)
    .attr("y", margin.top / 2)
    .attr("text-anchor", "middle")
    .style("font-size", "16px")
    .text("Total Calories");
  svg.append("text")
    .attr("x", svgWidth / 2)
    .attr("y", svgHeight - 10)
    .attr("text-anchor", "middle")
    .style("font-size", "14px")
    .text("Group");
  svg.append("text")
    .attr("transform", "rotate(-90)")
    .attr("x", -svgHeight / 2)
    .attr("y", 10)
    .attr("text-anchor", "middle")
    .style("font-size", "14px")
    .text("Total Calories Over 10-Day Observational Period");

  // Initially render the chart view
  updateDataView("grouped", axesGroup, xScale, yScale, width, height);
}

// --- updateCaloriesIndicator (working version) ---
function updateCaloriesIndicator() {
  // Only run on Page 2 if our global SVG exists
  if (!document.getElementById("page-2") || !window.page2SVG || !window.page2YScale) return;

  const svg = window.page2SVG;
  const yScale = window.page2YScale;
  const sliderValue = sliderValues.totalCalories;
  const yPos = yScale(sliderValue);

  // Look for the indicator group directly on the SVG
  let indicator = svg.select("#calories-indicator");
  if (indicator.empty()) {
    indicator = svg.append("g").attr("id", "calories-indicator");
    indicator.append("line")
      .attr("id", "calories-line")
      .attr("stroke", "green")
      .attr("stroke-width", 2);
    indicator.append("text")
      .attr("id", "calories-label")
      .attr("font-size", "12px")
      .attr("text-anchor", "start")
      .attr("fill", "black");
  }

  // Update the line to span from 0 to the inner width of the chart
  indicator.select("#calories-line")
    .attr("x1", 0)
    .attr("x2", window.page2Dimensions.width)
    .attr("y1", yPos)
    .attr("y2", yPos);

  // Position the label 10px to the right of the chart
  indicator.select("#calories-label")
    .attr("x", window.page2Dimensions.width + 10)
    .attr("y", yPos + 4)
    .html("")  // Clear previous content
    .append("tspan").text("Your Total Calories Consumed: ");
  indicator.select("#calories-label")
    .append("tspan")
      .attr("font-weight", "bold")
      .text(sliderValue.toFixed(2));

  // Bring the indicator group to the front
  indicator.raise();
}



  
});
document.querySelectorAll('#slider-container input[type="range"]').forEach(slider => {
  slider.addEventListener('input', function() {
    const valueDisplay = this.parentElement.querySelector('.slider-value');
    valueDisplay.textContent = parseFloat(this.value).toFixed(2);
  });
});

function updateCaloriesIndicator() {
  // Only run on Page 2 if our global SVG exists
  if (!document.getElementById("page-2") || !window.page2SVG || !window.page2YScale) return;
  
  const svg = window.page2SVG;
  const { width } = window.page2Dimensions;
  const yScale = window.page2YScale;
  const sliderValue = sliderValues.totalCalories;
  const yPos = yScale(sliderValue);
  
  // In the original version, we appended the line and label directly to the axesGroup
  let indicator = svg.select("#calories-indicator");
  if (indicator.empty()) {
    indicator = svg.append("g")
      .attr("id", "calories-indicator");
    indicator.append("line")
      .attr("id", "calories-line")
      .attr("stroke", "green")
      .attr("stroke-width", 2);
    indicator.append("text")
      .attr("id", "calories-label")
      .attr("font-size", "12px")
      .attr("text-anchor", "start")
      .attr("fill", "black");
  }
  
  indicator.select("#calories-line")
    .attr("x1", margin.left + extraOffset)  // if the axesGroup translation was applied
    .attr("x2", margin.left + extraOffset + width)
    .attr("y1", yPos + margin.top)
    .attr("y2", yPos + margin.top);
  
  indicator.select("#calories-label")
    .attr("x", margin.left + extraOffset + width + 10)
    .attr("y", yPos + margin.top + 4)
    .html(""); // Clear previous content
  indicator.select("#calories-label")
    .append("tspan").text("Your Total Calories Cosumed: ");
  indicator.select("#calories-label")
    .append("tspan")
      .style("font-weight", "bold")
      .text(sliderValue.toFixed(2));
}


function updateDataView(view, dataGroup, xScale, yScale, width, height) {
  // Fade out and remove existing elements in dataGroup
  dataGroup.selectAll("*")
    .transition()
    .duration(500)
    .style("opacity", 0)
    .remove();

  // After fade-out, render new view
  setTimeout(() => {
    if (view === "grouped") {
      renderGrouped(dataGroup, xScale, yScale, width, height);
    } else if (view === "swarm") {
      renderSwarm(dataGroup, xScale, yScale, width, height);
    }
  }, 500);
}

function renderGrouped(dataGroup, xScale, yScale, width, height) {
  const groups = ["Healthy", "Pre-Diabetes", "Type 2 Diabetes"];
  const aggregatedData = groups.map(gp => {
    const groupData = data.filter(d => d.Diabetes === gp);
    const avgCalories = d3.mean(groupData, d => +d.totalCalories);
    return { group: gp, avgCalories: avgCalories };
  });

  const bars = dataGroup.selectAll(".bar")
      .data(aggregatedData)
      .enter()
      .append("rect")
      .attr("class", "bar")
      .attr("x", d => xScale(d.group))
      .attr("y", d => yScale(d.avgCalories))
      .attr("width", xScale.bandwidth())
      .attr("height", d => height - yScale(d.avgCalories))
      .attr("fill", d => {
         if(d.group === "Healthy") return "#2C7BB6";
         else if(d.group === "Pre-Diabetes") return "#FDB863";
         else if(d.group === "Type 2 Diabetes") return "#D7191C";
         else return "gray";
      })
      .style("opacity", 0);

  bars.transition().duration(500).style("opacity", 1);

  const tooltip = d3.select("body").select("#bar-tooltip");
  bars.on("mouseover", function(event, d) {
       const fillColor = d3.select(this).attr("fill");
       const lightFill = lightenColor(fillColor, 0.7);
       tooltip.html(`<strong>${d.group}</strong><br/>Avg Calories: ${d.avgCalories.toFixed(0)}`)
              .style("background", lightFill)
              .style("opacity", 1);
  })
  .on("mousemove", function(event) {
       tooltip.style("left", (event.pageX + 10) + "px")
              .style("top", (event.pageY - 20) + "px");
  })
  .on("mouseout", function() {
       tooltip.style("opacity", 0);
  });
}

function renderSwarm(dataGroup, xScale, yScale, width, height) {
  const groups = ["Healthy", "Pre-Diabetes", "Type 2 Diabetes"];
  const groupColor = {
    "Healthy": "#2C7BB6",
    "Pre-Diabetes": "#FDB863",
    "Type 2 Diabetes": "#D7191C"
  };

  const dotRadius = 6;
  const nodes = data.map(d => ({
      subject: d.subject,
      group: d.Diabetes,
      totalCalories: +d.totalCalories,
      x: xScale(d.Diabetes) + xScale.bandwidth() / 2 + (Math.random() - 0.5) * 10,
      y: yScale(+d.totalCalories)
  }));

  const simulation = d3.forceSimulation(nodes)
                       .force("x", d3.forceX(d => xScale(d.group) + xScale.bandwidth() / 2).strength(1))
                       .force("y", d3.forceY(d => yScale(d.totalCalories)).strength(1))
                       .force("collide", d3.forceCollide(dotRadius + 1))
                       .stop();
  for (let i = 0; i < 120; ++i) simulation.tick();

  const dots = dataGroup.selectAll(".dot")
      .data(nodes)
      .enter()
      .append("circle")
      .attr("class", "dot")
      .attr("cx", d => d.x)
      .attr("cy", d => d.y)
      .attr("r", dotRadius)
      .attr("fill", d => groupColor[d.group])
      .style("opacity", 0);

  dots.transition().duration(500).style("opacity", 1);

  const tooltip = d3.select("body").select("#swarm-tooltip");
  dots.on("mouseover", function(event, d) {
       const fillColor = d3.select(this).attr("fill");
       const lightFill = lightenColor(fillColor, 0.7);
       tooltip.html(`<strong>Subject ${d.subject}</strong><br/>Total Calories: ${d.totalCalories}`)
              .style("background", lightFill)
              .style("opacity", 1);
  })
  .on("mousemove", function(event) {
       tooltip.style("left", (event.pageX + 10) + "px")
              .style("top", (event.pageY - 20) + "px");
  })
  .on("mouseout", function() {
       tooltip.style("opacity", 0);
  });
}


// Function to render the grouped bar chart view
function renderGroupedView() {
  // Set up SVG dimensions and margins
  const svgWidth = 800, svgHeight = 600,
        margin = { top: 60, right: 30, bottom: 60, left: 60 },
        width = svgWidth - margin.left - margin.right,
        height = svgHeight - margin.top - margin.bottom;
  
  // Create the SVG container inside #axes-container
  const svg = d3.select("#axes-container")
                .append("svg")
                .attr("width", svgWidth)
                .attr("height", svgHeight);
  
  // Group element to respect margins
  const g = svg.append("g")
               .attr("transform", `translate(${margin.left},${margin.top})`);
  
  // Define the groups in the desired order:
  const groups = ["Healthy", "Pre-Diabetes", "Type 2 Diabetes"];
  
  // Compute aggregated data (calculating the average total calories for each group)
  const aggregatedData = groups.map(gp => {
    const groupData = data.filter(d => d.Diabetes === gp);
    const avgCalories = d3.mean(groupData, d => +d.totalCalories);
    return { group: gp, avgCalories: avgCalories };
  });
  
  // Create a band scale for the x-axis using the groups
  const xScale = d3.scaleBand()
                   .domain(groups)
                   .range([0, width])
                   .padding(0.4);
  
  // Create a linear scale for the y-axis based on the aggregated average calories
  const maxCalories = d3.max(aggregatedData, d => d.avgCalories);
  const yScale = d3.scaleLinear()
                   .domain([0, 36000])
                   .range([height, 0]);
  
  // Draw the x-axis
  const xAxis = d3.axisBottom(xScale);
  g.append("g")
   .attr("transform", `translate(0,${height})`)
   .call(xAxis);
  
  // Draw the y-axis
  const yAxis = d3.axisLeft(yScale);
  g.append("g")
   .call(yAxis);
  
  // Add a title above the chart
  svg.append("text")
     .attr("x", svgWidth / 2)
     .attr("y", margin.top / 2)
     .attr("text-anchor", "middle")
     .style("font-size", "16px")
     .text("Average Total Calories by Group");
  
  // Draw bars for each group representing the aggregated average total calories
  g.selectAll(".bar")
   .data(aggregatedData)
   .enter()
   .append("rect")
   .attr("class", "bar")
   .attr("x", d => xScale(d.group))
   .attr("y", d => yScale(d.avgCalories))
   .attr("width", xScale.bandwidth())
   .attr("height", d => height - yScale(d.avgCalories))
   .attr("fill", d => {
       if(d.group === "Healthy") return "#2C7BB6";
       else if(d.group === "Pre-Diabetes") return "#FDB863";
       else if(d.group === "Type 2 Diabetes") return "#D7191C";
       else return "gray";
   });
  
  // Create a tooltip for the grouped view
  const tooltip = d3.select("body")
                    .append("div")
                    .attr("id", "bar-tooltip")
                    .style("position", "absolute")
                    .style("padding", "8px")
                    .style("background", "lightgrey")
                    .style("border-radius", "4px")
                    .style("pointer-events", "none")
                    .style("font-size", "12px")
                    .style("opacity", 0);
  
  // Add tooltip event handlers to the bars
  g.selectAll(".bar")
   .on("mouseover", function(event, d) {
       const fillColor = d3.select(this).attr("fill");
       const lightFill = lightenColor(fillColor, 0.7); // using your existing lightenColor function
       tooltip.html(`<strong>${d.group}</strong><br/>Avg Calories: ${d.avgCalories.toFixed(0)}`)
              .style("background", lightFill)
              .style("opacity", 1);
   })
   .on("mousemove", function(event) {
       tooltip.style("left", (event.pageX + 10) + "px")
              .style("top", (event.pageY - 20) + "px");
   })
   .on("mouseout", function() {
       tooltip.style("opacity", 0);
   });
  
  // Add axis labels
  svg.append("text")
     .attr("x", svgWidth / 2)
     .attr("y", svgHeight - 10)
     .attr("text-anchor", "middle")
     .style("font-size", "14px")
     .text("Group");
  
  svg.append("text")
     .attr("transform", "rotate(-90)")
     .attr("x", -svgHeight / 2)
     .attr("y", 20)
     .attr("text-anchor", "middle")
     .style("font-size", "14px")
     .text("Total Calories");
}


// Function to render the swarm plot (individual view) 
function renderSwarmPlot() {
  // Clear any existing chart in the axes container
  d3.select("#axes-container").selectAll("*").remove();

  // Set up SVG dimensions and margins
  const svgWidth = 800, svgHeight = 600,
        margin = { top: 60, right: 30, bottom: 60, left: 60 },
        width = svgWidth - margin.left - margin.right,
        height = svgHeight - margin.top - margin.bottom;

  // Create the SVG container
  const svg = d3.select("#axes-container")
                .append("svg")
                .attr("width", svgWidth)
                .attr("height", svgHeight);

  // Append a group element to respect margins
  const g = svg.append("g")
               .attr("transform", `translate(${margin.left},${margin.top})`);

  // Define the groups and a mapping for their colors
  const groups = ["Healthy", "Pre-Diabetes", "Type 2 Diabetes"];
  const groupColor = {
    "Healthy": "#2C7BB6",
    "Pre-Diabetes": "#FDB863",
    "Type 2 Diabetes": "#D7191C"
  };

  // Create an x-axis using a band scale for the groups
  const xScale = d3.scaleBand()
                   .domain(groups)
                   .range([0, width])
                   .padding(0.4);

  // Create a y-axis scale based on the overall min/max of totalCalories
  const minCal = d3.min(data, d => +d.totalCalories);
  const maxCal = d3.max(data, d => +d.totalCalories);
  const yScale = d3.scaleLinear()
                   .domain([0, 36000])
                   .range([height, 0]);

  // Draw the axes
  const xAxis = d3.axisBottom(xScale);
  g.append("g")
   .attr("transform", `translate(0, ${height})`)
   .call(xAxis);

  const yAxis = d3.axisLeft(yScale);
  g.append("g")
   .call(yAxis);

  // Add a title to the chart
  svg.append("text")
     .attr("x", svgWidth / 2)
     .attr("y", margin.top / 2)
     .attr("text-anchor", "middle")
     .style("font-size", "16px")
     .text("Individual Total Calories (Swarm Plot)");

  // Prepare the nodes: each subject gets an initial x based on its group's center
  const dotRadius = 6;
  const nodes = data.map(d => ({
      subject: d.subject,
      group: d.Diabetes,
      totalCalories: +d.totalCalories,
      // Initial x: center of the corresponding group's band with a slight random offset
      x: xScale(d.Diabetes) + xScale.bandwidth() / 2 + (Math.random() - 0.5) * 10,
      // y position based on total calories
      y: yScale(+d.totalCalories)
  }));

  // Use a force simulation to avoid overlapping dots
  const simulation = d3.forceSimulation(nodes)
                       .force("x", d3.forceX(d => xScale(d.group) + xScale.bandwidth() / 2).strength(1))
                       .force("y", d3.forceY(d => yScale(d.totalCalories)).strength(1))
                       .force("collide", d3.forceCollide(dotRadius + 1))
                       .stop();

  // Run the simulation a fixed number of iterations
  for (let i = 0; i < 120; ++i) simulation.tick();

  // Create a tooltip for the dots
  const tooltip = d3.select("body")
                    .append("div")
                    .attr("id", "swarm-tooltip")
                    .style("position", "absolute")
                    .style("padding", "8px")
                    .style("background", "lightgrey") // default background; will update on hover
                    .style("border-radius", "4px")
                    .style("pointer-events", "none")
                    .style("font-size", "12px")
                    .style("opacity", 0);

  // Draw the dots (subjects)
  g.selectAll(".dot")
   .data(nodes)
   .enter()
   .append("circle")
   .attr("class", "dot")
   .attr("cx", d => d.x)
   .attr("cy", d => d.y)
   .attr("r", dotRadius)
   .attr("fill", d => groupColor[d.group])
   // Tooltip event handlers for dots
   .on("mouseover", function(event, d) {
       const fillColor = d3.select(this).attr("fill");
       const lightFill = lightenColor(fillColor, 0.7); // using your existing lightenColor function
       tooltip.html(`<strong>Subject ${d.subject}</strong><br/>Total Calories: ${d.totalCalories}`)
              .style("background", lightFill)
              .style("opacity", 1);
   })
   .on("mousemove", function(event) {
       tooltip.style("left", (event.pageX + 10) + "px")
              .style("top", (event.pageY - 20) + "px");
   })
   .on("mouseout", function() {
       tooltip.style("opacity", 0);
   });

  // Add axis labels
  svg.append("text")
     .attr("x", svgWidth / 2)
     .attr("y", svgHeight - 10)
     .attr("text-anchor", "middle")
     .style("font-size", "14px")
     .text("Group");

  svg.append("text")
     .attr("transform", "rotate(-90)")
     .attr("x", -svgHeight / 2)
     .attr("y", 20)
     .attr("text-anchor", "middle")
     .style("font-size", "14px")
     .text("Total Calories");
}


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

  console.log("Healthy subjects:", healthysubjects.length);
  console.log("Pre-diabetic subjects:", presubjects.length);
  console.log("Type2 diabetic subjects:", type2subjects.length);

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
    // Increase extra padding and iterations to reduce overlapping:
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

  // Get references to the info section and scroll arrow.

  // Create an observer to monitor when the info section enters the viewport within #snap-container.
  // const snapContainer = document.getElementById("snap-container");
  // const observer = new IntersectionObserver((entries) => {
  //   entries.forEach(entry => {
  //     scrollArrow.style.display = entry.isIntersecting ? "none" : "block";
  //   });
  // }, { 
  //   root: snapContainer,  // Use snap-container as the scrolling area
  //   threshold: 0.1 
  // });

  // // Observe the info section.
  // observer.observe(infoSection);

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

const labelY = centerY - rectHeight / 2 - 75; // Adjust as needed
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
    .attr("dy", "0.35em")
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

    return { 
      subject: subjectNumber, 
      totalCalories, 
      avgMETs, 
      avgHR, 
      minGL, 
      maxGL, 
      avgCarbs, 
      avgProtein, 
      avgFat, 
      avgFiber
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
  if (!window.subjectMetricsResults) return;

  // Use the new helper to create a responsive SVG inside #glrange-container.
  const { svg, width, height, margin } = createResponsiveSVG("#glrange-container", { top: 40, right: 30, bottom: 40, left: 100 });
  
  // Define your color scale.
  const color = d3.scaleOrdinal()
    .domain(["Healthy", "Pre-Diabetes", "Type 2 Diabetes"])
    .range(["#2C7BB6", "#FDB863", "#D7191C"]);

  const groupOrder = { "Healthy": 0, "Pre-Diabetes": 1, "Type 2 Diabetes": 2 };

  // Sort subjects based on diabetes classification.
  const subjectsData = window.subjectMetricsResults.sort((a, b) => {
    const dA = (subjectData[a.subject] && subjectData[a.subject][0].Diabetes) || "Healthy";
    const dB = (subjectData[b.subject] && subjectData[b.subject][0].Diabetes) || "Healthy";
    if (groupOrder[dA] !== groupOrder[dB]) {
      return groupOrder[dA] - groupOrder[dB];
    }
    return a.subject - b.subject;
  });

  // Create your scales.
  const yScale = d3.scaleBand()
                   .domain(subjectsData.map(d => d.subject))
                   .range([0, height])
                   .padding(0.5);

  const rawMin = d3.min(subjectsData, d => d.minGL);
  const xMin = rawMin < 40 ? 40 : rawMin;  // Ensure the lowest value is 40
  const xMax = d3.max(subjectsData, d => d.maxGL);
  
  const xScale = d3.scaleLinear()
                  .domain([xMin, xMax])
                  .range([0, width])
                  .nice();

  // Draw axes.
  svg.append("g")
     .attr("transform", `translate(0, ${height})`)
     .call(d3.axisBottom(xScale));
  
  svg.append("g")
     .call(d3.axisLeft(yScale));
     let glTooltip = d3.select("body").select("#gl-tooltip");
     if (glTooltip.empty()) {
       glTooltip = d3.select("body")
         .append("div")
         .attr("id", "gl-tooltip")
         .style("position", "absolute")
         .style("padding", "8px")
         .style("background", "lightgrey")
         .style("border-radius", "4px")
         .style("pointer-events", "none")
         .style("font-size", "12px")
         .style("opacity", 0);
     }
   
// Define legend constants.
const squareSize = 14, gap = 5;
// Place the legend above the plot: adjust the x and y offsets as needed.
const legendX = width/2 - 150; // shift left to center the legend horizontally
const legendY = -margin.top/2; // place it above the plot

// Create a legend group.
const legend = svg.append("g")
  .attr("class", "gl-range-legend")
  .attr("transform", `translate(${legendX}, ${legendY})`);

// Define the groups in the desired order.
const groups = ["Healthy", "Pre-Diabetes", "Type 2 Diabetes"];

// Append a legend item for each group.
groups.forEach((grp, i) => {
  const legendItem = legend.append("g")
    // Space items horizontally: adjust multiplier (here, 150) as needed.
    .attr("transform", `translate(${i * 150}, 0)`);
    
  // Append a rectangle (square) positioned just to the left of the text.
  legendItem.append("rect")
    .attr("x", -squareSize - gap)
    .attr("y", -squareSize / 2)
    .attr("width", squareSize)
    .attr("height", squareSize)
    .attr("fill", color(grp));

  // Append the text label, starting at x = 0.
  legendItem.append("text")
    .attr("x", 0)
    .attr("y", 0)
    .attr("text-anchor", "start")
    .attr("dy", "0.35em")
    .style("font-size", "16px")
    .attr("fill", "black")
    .text(grp);
});
    
  // Draw lines for each subject.
  svg.selectAll("line.gl-range")
    .data(subjectsData)
    .enter()
    .append("line")
    .attr("class", "gl-range")
    .attr("x1", d => xScale(Math.max(d.minGL, 40)))
    .attr("x2", d => xScale(d.maxGL))
    .attr("y1", d => yScale(d.subject) + yScale.bandwidth() / 2)
    .attr("y2", d => yScale(d.subject) + yScale.bandwidth() / 2)
    .attr("stroke", "gray")
    .attr("stroke-width", 2);

  svg.selectAll("circle.min-gl")
  .data(subjectsData)
  .enter()
  .append("circle")
  .attr("class", "min-gl")
  .attr("cx", d => xScale(Math.max(d.minGL, 40)))
  .attr("cy", d => yScale(d.subject) + yScale.bandwidth()/2)
  .attr("r", 5)
  .attr("fill", d => {
    const group = (subjectData[d.subject] && subjectData[d.subject][0].Diabetes) || "Healthy";
    return color(group);
  })
  .on("mouseover", (event, d) => {
    const group = (subjectData[d.subject] && subjectData[d.subject][0].Diabetes) || "Healthy";
    glTooltip
      .style("display", "block")
      .html(`<div>
                <strong>Subject: ${d.subject}</strong><br/>
                Diabetes status: ${group}<br/>
                Minimum recorded glucose: ${Math.max(d.minGL, 40)} mg/dL<br/>
                Maximum recorded glucose: ${d.maxGL} mg/dL
              </div>`)
      .style("left", (event.pageX + 5) + "px")
      .style("top", (event.pageY - 28) + "px")
      .transition().duration(200)
      .style("opacity", 0.9);
  })
  .on("mouseout", () => {
    glTooltip.transition().duration(500)
      .style("opacity", 0)
      .on("end", () => glTooltip.style("display", "none"));
  });

svg.selectAll("circle.max-gl")
  .data(subjectsData)
  .enter()
  .append("circle")
  .attr("class", "max-gl")
  .attr("cx", d => xScale(d.maxGL))
  .attr("cy", d => yScale(d.subject) + yScale.bandwidth()/2)
  .attr("r", 5)
  .attr("fill", d => {
    const group = (subjectData[d.subject] && subjectData[d.subject][0].Diabetes) || "Healthy";
    return color(group);
  })
  .on("mouseover", (event, d) => {
    const group = (subjectData[d.subject] && subjectData[d.subject][0].Diabetes) || "Healthy";
    glTooltip
      .style("display", "block")
      .html(`<div>
                <strong>Subject: ${d.subject}</strong><br/>
                Diabetes status: ${group}<br/>
                Minimum recorded glucose: ${d.minGL} mg/dL<br/>
                Maximum recorded glucose: ${d.maxGL} mg/dL
              </div>`)
      .style("left", (event.pageX + 5) + "px")
      .style("top", (event.pageY - 28) + "px")
      .transition().duration(200)
      .style("opacity", 0.9);
  })
  .on("mouseout", () => {
    glTooltip.transition().duration(500)
      .style("opacity", 0)
      .on("end", () => glTooltip.style("display", "none"));
  });
  
  // Optionally, add axis labels.
  svg.append("text")
     .attr("x", width / 2)
     .attr("y", -10)
     .attr("text-anchor", "middle")
     .style("font-size", "16px")

  svg.append("text")
     .attr("x", width / 2)
     .attr("y", height + margin.bottom - 5)
     .attr("text-anchor", "middle")
     .style("font-size", "12px")
     .text("Libre Glucose Value");

  svg.append("text")
     .attr("text-anchor", "middle")
     .attr("transform", "rotate(-90)")
     .attr("x", -height / 2)
     .attr("y", -margin.left + 20)
     .style("font-size", "12px")
     .text("Subject");
}

function computeMacroAverages(data) {
  const groups = ["Healthy", "Pre-Diabetes", "Type 2 Diabetes"];
  const macros = ["Carbs", "Fat", "Protein", "Fiber"];
  console.log("Input data for computeMacroAverages:", data);

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
  console.log(averages);
  return averages;
  
}
function renderMacronutrientChart(data, containerId) {
  const width = 800;
  const height = 500;
  const margin = { top: 50, right: 50, bottom: 50, left: 50 };
  const innerWidth = width - margin.left - margin.right;
  const innerHeight = height - margin.top - margin.bottom;

  const svg = d3.select(containerId)
    .append("svg")
    .attr("width", width)
    .attr("height", height)
    .append("g")
    .attr("transform", `translate(${margin.left},${margin.top})`);

  const groups = data.map(d => d.group);
  const macros = data[0].macroAverages.map(d => d.macro);

  const x0 = d3.scaleBand()
    .domain(groups)
    .range([0, innerWidth])
    .padding(0.2);

  const x1 = d3.scaleBand()
    .domain(macros)
    .range([0, x0.bandwidth()])
    .padding(0.1);

  const y = d3.scaleLinear()
    .domain([0, d3.max(data, d => d3.max(d.macroAverages, m => m.average))])
    .range([innerHeight, 0]);

  const color = d3.scaleOrdinal()
    .domain(macros)
    .range(d3.schemeCategory10);

  // Draw bars
  svg.selectAll(".group")
    .data(data)
    .enter()
    .append("g")
    .attr("class", "group")
    .attr("transform", d => `translate(${x0(d.group)},0)`)
    .selectAll("rect")
    .data(d => d.macroAverages)
    .enter()
    .append("rect")
    .attr("x", d => x1(d.macro))
    .attr("y", d => y(d.average))
    .attr("width", x1.bandwidth())
    .attr("height", d => innerHeight - y(d.average))
    .attr("fill", d => color(d.macro));

  // Add axes
  svg.append("g")
    .attr("transform", `translate(0,${innerHeight})`)
    .call(d3.axisBottom(x0));

  svg.append("g")
    .call(d3.axisLeft(y));

  // Add labels
  svg.append("text")
    .attr("x", innerWidth / 2)
    .attr("y", -10)
    .attr("text-anchor", "middle")
    .text("Average Macronutrient Intake by Group");

  // Add legend
  const legend = svg.selectAll(".legend")
    .data(macros)
    .enter()
    .append("g")
    .attr("class", "legend")
    .attr("transform", (d, i) => `translate(0,${i * 20})`);

  legend.append("rect")
    .attr("x", innerWidth - 18)
    .attr("width", 18)
    .attr("height", 18)
    .attr("fill", color);

  legend.append("text")
    .attr("x", innerWidth - 24)
    .attr("y", 9)
    .attr("dy", ".35em")
    .style("text-anchor", "end")
    .text(d => d);
}

function plotAvgHRBoxPlot() {
  if (!window.subjectMetricsResults) return;
  const data = window.subjectMetricsResults;

  console.log("Average HR values for each subject:", data.map(d => d.avgHR));

  // set dimensions and margins for the chart
  const margin = { top: 10, right: 30, bottom: 50, left: 100 }, // increased from 70 to 100
  width = 560 - margin.left - margin.right,
  height = 800 - margin.top - margin.bottom;

  // Append the SVG to the container.
  const svg = d3.select("#hr-container")
    .append("svg")
      .attr("width", width + margin.left + margin.right)
      .attr("height", height + margin.top + margin.bottom)
    .append("g")
      .attr("transform", `translate(${margin.left},${margin.top})`);

  // Define the same color scale as in the first plot.
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
      // Compute the actual minimum in the group:
      const actualMin = d3.min(values);
      // Use the larger (i.e. less extreme) value:
      const min = Math.max(computedMin, actualMin);
      const max = q3 + 1.5 * interQuantileRange;
      return { q1, median, q3, interQuantileRange, min, max };
    },
    d => (subjectData[d.subject] && subjectData[d.subject][0].Diabetes) || "Healthy"
  );
  
  // Convert the Map to an array of objects.
  const sumstat = Array.from(sumstatMap, ([key, value]) => ({ key, value }));

  // Set up the Y scale with the three metabolic groups.
  const groups = ["Healthy", "Pre-Diabetes", "Type 2 Diabetes"];
  const y = d3.scaleBand()
    .range([ height, 0 ])
    .domain(groups)
    .padding(0.4);
  svg.append("g")
    .call(d3.axisLeft(y).tickSize(0))
    .select(".domain").remove();

  // Set up the X scale for Average HR.
  const minHR = d3.min(data, d => +d.avgHR),
        maxHR = d3.max(data, d => +d.avgHR);
  const x = d3.scaleLinear()
    .domain([minHR - 5, maxHR + 5])
    .range([0, width]);
  svg.append("g")
    .attr("transform", `translate(0, ${height})`)
    .call(d3.axisBottom(x).ticks(5))
    .select(".domain").remove();

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
      .attr("stroke", "black")
      .style("width", 40);

  // Draw the main boxes for each group using the group's corresponding color (with opacity).
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
      .on("mousemove", function(event, d) {
        tooltip.style("left", (event.pageX + 10) + "px")
               .style("top", (event.pageY + 10) + "px");
      })
      .on("mouseleave", function(event, d) {
        tooltip.transition().duration(200).style("opacity", 0);
      });

  // Draw lines for the median.
  svg.selectAll("medianLines")
    .data(sumstat)
    .enter()
    .append("line")
      .attr("x1", d => x(d.value.median))
      .attr("x2", d => x(d.value.median))
      .attr("y1", d => y(d.key))
      .attr("y2", d => y(d.key) + y.bandwidth())
      .attr("stroke", "black")
      .style("width", 80);

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

  // Add individual points (with jitter) representing each subject’s avgHR,
  // and color them using the group color.
  const jitterWidth = 50;
  svg.selectAll("indPoints")
    .data(data)
    .enter()
    .append("circle")
      .attr("cx", d => x(d.avgHR))
      .attr("cy", d => {
         // Get diabetes group from subjectData; default to "Healthy" if missing.
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
      .on("mousemove", function(event, d) {
          tooltip.style("left", (event.pageX + 30) + "px")
                 .style("top", (event.pageY + 30) + "px");
      })
      .on("mouseleave", function(event, d) {
          tooltip.transition().duration(200).style("opacity", 0);
      });
}

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







// Initialize graphScroll
d3.graphScroll()
  .container(d3.select("#container"))
  .graph(d3.select("#axes-container"))
  .offset(30)


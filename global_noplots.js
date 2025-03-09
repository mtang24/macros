let data = [];
let subjectData = {};

// ──────────────────────────────
// DATA LOADING & PROCESSING
// ──────────────────────────────

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

// ──────────────────────────────
// PAGE-SPECIFIC PLOT FUNCTIONS
// ──────────────────────────────

// Page 1: Main grid visualization
function plotPage1() {
  // Use the existing grid plot code in plotData()
  const width = 1000, height = 500;
  const svg = d3.select("#plot-page-1")
                .append("svg")
                .attr("id", "grid")
                .attr("width", width)
                .attr("height", height);

  // Define a color scale for Diabetes groups
  const color = d3.scaleOrdinal()
      .domain(["Healthy", "Pre-Diabetes", "Type 2 Diabetes"])
      .range(["#2C7BB6", "#FDB863", "#D7191C"]);

  const centerX = width / 2;
  const centerY = height / 2;
  const healthyCenter = { x: centerX - 300, y: centerY };
  const preCenter     = { x: centerX,       y: centerY };
  const type2Center   = { x: centerX + 300, y: centerY };

  const rectWidth = 100, rectHeight = 300;
  // Set bounds for each group
  const healthyBounds = {
    x0: healthyCenter.x - rectWidth / 2, x1: healthyCenter.x + rectWidth / 2,
    y0: healthyCenter.y - rectHeight / 2, y1: healthyCenter.y + rectHeight / 2
  };
  const preBounds = {
    x0: preCenter.x - rectWidth / 2, x1: preCenter.x + rectWidth / 2,
    y0: preCenter.y - rectHeight / 2, y1: preCenter.y + rectHeight / 2
  };
  const type2Bounds = {
    x0: type2Center.x - rectWidth / 2, x1: type2Center.x + rectWidth / 2,
    y0: type2Center.y - rectHeight / 2, y1: type2Center.y + rectHeight / 2
  };

  // Assign initial positions based on group bounds
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

  // Separate subjects by group:
  const healthySubjects = data.filter(d => d.Diabetes === "Healthy");
  const preSubjects     = data.filter(d => d.Diabetes === "Pre-Diabetes");
  const type2Subjects   = data.filter(d => d.Diabetes === "Type 2 Diabetes");

  const colorGroup = color; // alias

  // Append circles per group
  const healthyCircles = svg.selectAll("circle.healthy")
      .data(healthySubjects)
      .join("circle")
      .attr("class", "healthy")
      .attr("cx", d => d.x)
      .attr("cy", d => d.y)
      .attr("r", d => d.size)
      .attr("fill", d => colorGroup(d.Diabetes));

  const preCircles = svg.selectAll("circle.pre")
      .data(preSubjects)
      .join("circle")
      .attr("class", "pre")
      .attr("cx", d => d.x)
      .attr("cy", d => d.y)
      .attr("r", d => d.size)
      .attr("fill", d => colorGroup(d.Diabetes));

  const type2Circles = svg.selectAll("circle.type2")
      .data(type2Subjects)
      .join("circle")
      .attr("class", "type2")
      .attr("cx", d => d.x)
      .attr("cy", d => d.y)
      .attr("r", d => d.size)
      .attr("fill", d => colorGroup(d.Diabetes));

  // (Optionally add force simulations and tooltips as in your existing code.)
  // For brevity, the tooltip and force simulation code is preserved as is.
  // …
  
  // Append scroll arrow if not already present (to move to next page)
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
        document.getElementById("page-2").scrollIntoView({ behavior: "smooth", block: "start" });
      });
  }

  // (Additional tooltip handlers and label creation code can be inserted here.)

  // Define labels for each group using the group centers.
  const groupLabels = [
    { label: "Healthy", center: healthyCenter },
    { label: "Pre-Diabetes", center: preCenter },
    { label: "Type 2 Diabetes", center: type2Center }
  ];

  // Vertical position for the label should be relative to a common baseline.
  const labelY = centerY - rectHeight / 2 - 75; // Adjust as needed
  const dotRadius = 7;           // Use radius instead of width/height
  const offset = 30;             // Horizontal distance from the group's center to put the dot

  // Create a group for each label and dot, and center it.
  const gap = 5; // gap between dot and text
  groupLabels.forEach(g => {
    // Append a group element and place its origin at the group's center.x and at labelY.
    const labelGroup = svg.append("g")
      .attr("transform", `translate(${g.center.x}, ${labelY})`);

    // Append the text label with text-anchor "middle" so that its center is at x=0.
    const textElement = labelGroup.append("text")
      .attr("text-anchor", "middle")
      .attr("fill", "black")
      .style("font-size", "16px")
      .attr("dy", "0.35em") // vertical centering relative to font
      .text(g.label);

    // After the text is appended, measure its width.
    const textWidth = textElement.node().getBBox().width;

    // Append the colored dot to the left of the text.
    labelGroup.append("circle")
      .attr("cx", -textWidth / 2 - gap - dotRadius)
      .attr("cy", 0)     // vertically centered with the text
      .attr("r", dotRadius)
      .attr("fill", color(g.label));
  });
}

// Page 2: About the visualization (static info or an infographic)
function plotPage2() {
  const container = d3.select("#plot-page-2");
  container.html(`
    <div style="padding:1rem; font-size: calc(1rem + 0.5vw);">
      <p>The visualization shows aggregate data for individual subjects across three diabetes groups.</p>
      <p>Each dot’s size is based on the total calories consumed, and colors represent health status.</p>
      <p>This page describes the visualization and interaction methods.</p>
    </div>
  `);
}

// Page 3: Grouped / Individual View with toggle functionality
function plotPage3() {
  const container = d3.select("#plot-page-3");
  container.selectAll("*").remove();
  // Set up dimensions and margins for this plot:
  const svgWidth = 800, svgHeight = 600,
    margin = { top: 60, right: 30, bottom: 60, left: 60 },
    width = svgWidth - margin.left - margin.right,
    height = svgHeight - margin.top - margin.bottom;
  
  // Create a static SVG inside the container
  const svg = container.append("svg")
      .attr("width", svgWidth)
      .attr("height", svgHeight);
  
  const g = svg.append("g")
      .attr("transform", `translate(${margin.left},${margin.top})`);
  
  // Define groups and scales:
  const groups = ["Healthy", "Pre-Diabetes", "Type 2 Diabetes"];
  const xScale = d3.scaleBand()
      .domain(groups)
      .range([0, width])
      .padding(0.4);
  const maxCal = d3.max(data, d => +d.totalCalories);
  const yScale = d3.scaleLinear()
      .domain([0, maxCal * 1.1])
      .range([height, 0]);
  
  // Draw axes:
  g.append("g")
    .attr("transform", `translate(0,${height})`)
    .call(d3.axisBottom(xScale));
  g.append("g")
    .call(d3.axisLeft(yScale));
  
  // Add static labels:
  svg.append("text")
    .attr("x", svgWidth / 2)
    .attr("y", margin.top / 2)
    .attr("text-anchor", "middle")
    .style("font-size", "16px")
    .text("Total Calories by Group");
  
  // Create a dynamic data group for bars/dots:
  const dataGroup = g.append("g").attr("class", "data-group");
  
  // Initially render the grouped view:
  updateDataView("grouped", dataGroup, xScale, yScale, width, height);
  
  // Handle view-toggle (if you have input elements on the page)
  d3.selectAll('input[name="view"]').on("change", function() {
    const selected = d3.select(this).property("value");
    updateDataView(selected, dataGroup, xScale, yScale, width, height);
  });
}

// Page 4: BMI Dots Plot
function plotPage4() {
  const width = 800, height = 400;
  const margin = { top: 40, right: 40, bottom: 40, left: 40 };
  const innerWidth = width - margin.left - margin.right;
  const innerHeight = height - margin.top - margin.bottom;
  
  // Ensure BMI values are numeric.
  data.forEach(d => { d.BMI = +d.BMI; });
  const minBMI = d3.min(data, d => d.BMI);
  const maxBMI = d3.max(data, d => d.BMI);
  
  const yScale = d3.scaleLinear()
      .domain([minBMI, maxBMI])
      .range([innerHeight, 0])
      .nice();
  const xScale = d3.scaleLinear()
      .domain([0, 1])
      .range([0, innerWidth]);
  
  const colorScale = d3.scaleOrdinal()
      .domain(["Healthy", "Pre-Diabetes", "Type 2 Diabetes"])
      .range(["#2C7BB6", "#FDB863", "#D7191C"]);
  
  // Append the SVG to #plot-page-4 (clear any previous content)
  const container = d3.select("#plot-page-4");
  container.selectAll("*").remove();
  const svg = container.append("svg")
      .attr("id", "bmi-chart")
      .attr("width", width)
      .attr("height", height);
  const g = svg.append("g")
      .attr("transform", `translate(${margin.left},${margin.top})`);
  
  // Plot circles with horizontal jitter
  g.selectAll("circle")
    .data(data)
    .enter()
    .append("circle")
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
        .on("end", function() { d3.select(this).style("display", "none"); });
    });
  
  const yAxis = d3.axisLeft(yScale);
  g.append("g").call(yAxis);
}

// Page 5: Glucose Range Plot
function plotPage5() {
  // Use the helper function to create a responsive SVG in the container
  const responsive = createResponsiveSVG("#plot-page-5", { top: 40, right: 30, bottom: 40, left: 100 });
  if (!responsive) return;
  const { svg, width, height, margin } = responsive;
  
  const color = d3.scaleOrdinal()
    .domain(["Healthy", "Pre-Diabetes", "Type 2 Diabetes"])
    .range(["#2C7BB6", "#FDB863", "#D7191C"]);
  const groupOrder = { "Healthy": 0, "Pre-Diabetes": 1, "Type 2 Diabetes": 2 };
  
  // Sort subjects based on Diabetes
  const subjectsData = (window.subjectMetricsResults || [])
      .sort((a, b) => {
        const dA = (subjectData[a.subject] && subjectData[a.subject][0].Diabetes) || "Healthy";
        const dB = (subjectData[b.subject] && subjectData[b.subject][0].Diabetes) || "Healthy";
        return groupOrder[dA] - groupOrder[dB] || a.subject - b.subject;
      });
  
  const yScale = d3.scaleBand()
      .domain(subjectsData.map(d => d.subject))
      .range([0, height])
      .padding(0.5);
  const xMin = d3.min(subjectsData, d => d.minGL);
  const xMax = d3.max(subjectsData, d => d.maxGL);
  
  const xScale = d3.scaleLinear()
      .domain([xMin, xMax])
      .range([0, width])
      .nice();
  
  svg.append("g")
     .attr("transform", `translate(0, ${height})`)
     .call(d3.axisBottom(xScale));
  svg.append("g")
     .call(d3.axisLeft(yScale));
  
  svg.selectAll("line.gl-range")
     .data(subjectsData)
     .enter()
     .append("line")
     .attr("class", "gl-range")
     .attr("x1", d => xScale(d.minGL))
     .attr("x2", d => xScale(d.maxGL))
     .attr("y1", d => yScale(d.subject) + yScale.bandwidth()/2)
     .attr("y2", d => yScale(d.subject) + yScale.bandwidth()/2)
     .attr("stroke", "gray")
     .attr("stroke-width", 2);
  
  svg.selectAll("circle.min-gl")
     .data(subjectsData)
     .enter()
     .append("circle")
     .attr("class", "min-gl")
     .attr("cx", d => xScale(d.minGL))
     .attr("cy", d => yScale(d.subject) + yScale.bandwidth()/2)
     .attr("r", 5)
     .attr("fill", d => {
       const group = (subjectData[d.subject] && subjectData[d.subject][0].Diabetic) || "Healthy";
       return color(group);
     })
     .on("mouseover", (event, d) => {
       d3.select("#tooltip")
         .style("display", "block")
         .transition().duration(200).style("opacity", 0.9)
         .html(`<div style="text-align: center; font-weight: bold;">Subject: ${d.subject}</div>
                <div style="text-align: left;">Glucose range: ${d.minGL}-${d.maxGL}</div>`)
         .style("left", (event.pageX + 5) + "px")
         .style("top", (event.pageY - 28) + "px");
     })
     .on("mouseout", () => {
       d3.select("#tooltip")
         .transition()
         .duration(500).style("opacity", 0)
         .on("end", () => { d3.select("#tooltip").style("display", "none"); });
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
       const group = (subjectData[d.subject] && subjectData[d.subject][0].Diabetic) || "Healthy";
       return color(group);
     })
     .on("mouseover", (event, d) => {
       d3.select("#tooltip")
         .style("display", "block")
         .transition().duration(200).style("opacity", 0.9)
         .html(`<div style="text-align: center; font-weight: bold;">Subject: ${d.subject}</div>
                <div style="text-align: left;">Glucose range: ${d.minGL}-${d.maxGL}</div>`)
         .style("left", (event.pageX + 5) + "px")
         .style("top", (event.pageY - 28) + "px");
     })
     .on("mouseout", () => {
       d3.select("#tooltip")
         .transition().duration(500).style("opacity", 0)
         .on("end", () => { d3.select("#tooltip").style("display", "none"); });
     });
  
  svg.append("text")
     .attr("x", width / 2)
     .attr("y", height + margin.bottom - 5)
     .attr("text-anchor", "middle")
     .style("font-size", "12px")
     .text("Libre GL Value");
  svg.append("text")
     .attr("transform", "rotate(-90)")
     .attr("x", -height / 2)
     .attr("y", -margin.left + 20)
     .attr("text-anchor", "middle")
     .style("font-size", "12px")
     .text("Subject");
}

// Page 6: Reserved for additional content (or leave empty)
function plotPage6() {
  const container = d3.select("#plot-page-6");
  container.html(`
    <div style="padding:1rem; font-size: calc(1rem + 0.5vw);">
      <p>Additional visualizations or content can go here.</p>
    </div>
  `);
}

// ──────────────────────────────
// HELPER FUNCTIONS
// ──────────────────────────────

function updateDataView(view, dataGroup, xScale, yScale, width, height) {
  dataGroup.selectAll("*")
    .transition().duration(500)
    .style("opacity", 0)
    .remove();
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
    return { group: gp, avgCalories: d3.mean(groupData, d => +d.totalCalories) };
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
  const groupColor = { "Healthy": "#2C7BB6", "Pre-Diabetes": "#FDB863", "Type 2 Diabetes": "#D7191C" };
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

function lightenColor(col, factor = 0.5) {
  let c = d3.rgb(col);
  c.r = Math.round(c.r + (255 - c.r) * factor);
  c.g = Math.round(c.g + (255 - c.g) * factor);
  c.b = Math.round(c.b + (255 - c.b) * factor);
  return c.toString();
}

async function loadSubjectData(subjectNumber) {
  const subjectStr = subjectNumber.toString().padStart(3, '0');
  const csvPath = `data/CGMacros-${subjectStr}/CGMacros-${subjectStr}.csv`;
  try {
    const csvData = await d3.csv(csvPath);
    csvData.forEach(d => {
      d.Calories = +d.Calories;
      d.METs = +d.METs;
      d.HR = +d.HR;
      d["Libre GL"] = +d["Libre GL"];
    });
    const totalCalories = d3.sum(csvData, d => d.Calories);
    const validMETs = csvData.filter(d => !isNaN(d.METs));
    const avgMETs = d3.mean(validMETs, d => d.METs);
    const validHR = csvData.filter(d => !isNaN(d.HR));
    const avgHR = d3.mean(validHR, d => d.HR);
    const validLibreGl = csvData.filter(d => !isNaN(d["Libre GL"]));
    const minGL = validLibreGl.length ? d3.min(validLibreGl, d => d["Libre GL"]) : undefined;
    const maxGL = validLibreGl.length ? d3.max(validLibreGl, d => d["Libre GL"]) : undefined;

    return { subject: subjectNumber, totalCalories, avgMETs, avgHR, minGL, maxGL };
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
  e.preventDefault();
  if (e.deltaY > 0) {
    window.removeEventListener("wheel", backScrollHandler);
    const snapContainer = document.getElementById("snap-container");
    snapContainer.scrollTop = 0;
    d3.select("#subject-details")
      .transition().duration(500)
      .style("opacity", 0);
    d3.select("#go-back-arrow")
      .transition().duration(500)
      .style("opacity", 0)
      .on("end", () => { resetMainView(); });
  }
}

function handleDotClick(event, d) {
  // Remove any previous details, back arrow, and scroll arrow.
  d3.selectAll("#subject-details").remove();
  d3.selectAll("#go-back-arrow").remove();
  d3.selectAll("#scroll-down-arrow").remove();
  window.removeEventListener("wheel", backScrollHandler);

  // Hide and clear the tooltip.
  d3.select("#tooltip")
    .interrupt()
    .style("opacity", 0)
    .style("display", "none");
  
  // Hide the info section so it doesn't affect scrolling.
  d3.select("#info-section").style("display", "none");
  
  // Get the dot's color and compute a lighter version.
  const dotColor = color(d.Diabetes);
  const lighterColor = lightenColor(dotColor, 0.5); // adjust factor as needed
  
  // Transition the page background to the lighter color.
  d3.select("body")
    .transition().duration(500)
    .style("background-color", lighterColor);
  
  // Fade out the main visualization elements.
  d3.select("#grid")
    .transition().duration(500)
    .style("opacity", 0)
    .on("end", () => {
      d3.select("#grid").style("display", "none");
      d3.select("h1").style("display", "none");
  
      // Inject bounce animation CSS if missing.
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
  
      // Append the subject details container.
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
  
      details.transition().duration(1000).style("opacity", 1);
  
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
  
      d3.select("#arrow-tooltip")
        .transition().duration(1000)
        .style("opacity", 1)
        .transition().delay(3000).duration(1000)
        .style("opacity", 0);
  
      // Register the global wheel event for back navigation.
      window.addEventListener("wheel", backScrollHandler);
    });
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

  const xMin = d3.min(subjectsData, d => d.minGL);
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

  // Draw lines for each subject.
  svg.selectAll("line.gl-range")
     .data(subjectsData)
     .enter()
     .append("line")
     .attr("class", "gl-range")
     .attr("x1", d => xScale(d.minGL))
     .attr("x2", d => xScale(d.maxGL))
     .attr("y1", d => yScale(d.subject) + yScale.bandwidth()/2)
     .attr("y2", d => yScale(d.subject) + yScale.bandwidth()/2)
     .attr("stroke", "gray")
     .attr("stroke-width", 2);

  // Draw circles for minGL with tooltip events.
  svg.selectAll("circle.min-gl")
     .data(subjectsData)
     .enter()
     .append("circle")
     .attr("class", "min-gl")
     .attr("cx", d => xScale(d.minGL))
     .attr("cy", d => yScale(d.subject) + yScale.bandwidth()/2)
     .attr("r", 5)
     .attr("fill", d => {
       const group = (subjectData[d.subject] && subjectData[d.subject][0].Diabetes) || "Healthy";
       return color(group);
     })
     .on("mouseover", (event, d) => {
       d3.select("#tooltip")
         .style("display", "block")
         .transition()
           .duration(200)
           .style("opacity", 0.9)
         .html(
           `<div style="text-align: center; font-weight: bold;">Subject: ${d.subject}</div>
            <div style="text-align: left;">Glucose range: ${d.minGL}-${d.maxGL}</div>`
         )
         .style("left", (event.pageX + 5) + "px")
         .style("top", (event.pageY - 28) + "px");
     })
     .on("mouseout", () => {
       d3.select("#tooltip")
         .transition()
         .duration(500)
         .style("opacity", 0)
         .on("end", () => { d3.select("#tooltip").style("display", "none"); });
     });

  // Draw circles for maxGL with tooltip events.
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
       d3.select("#tooltip")
         .style("display", "block")
         .transition()
           .duration(200)
           .style("opacity", 0.9)
         .html(
           `<div style="text-align: center; font-weight: bold;">Subject: ${d.subject}</div>
            <div style="text-align: left;">Glucose range: ${d.minGL}-${d.maxGL}</div>`
         )
         .style("left", (event.pageX + 5) + "px")
         .style("top", (event.pageY - 28) + "px");
     })
     .on("mouseout", () => {
       d3.select("#tooltip")
         .transition().duration(500).style("opacity", 0)
         .on("end", () => { d3.select("#tooltip").style("display", "none"); });
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
     .text("Libre GL Value");

  svg.append("text")
     .attr("text-anchor", "middle")
     .attr("transform", "rotate(-90)")
     .attr("x", -height / 2)
     .attr("y", -margin.left + 20)
     .style("font-size", "12px")
     .text("Subject");
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

document.addEventListener("DOMContentLoaded", async () => {
  await loadData();

  // Call each page-specific plot function so all pages are populated.
  plotPage1();
  plotPage2();
  plotPage3();
  plotPage4();
  plotPage5();
  plotPage6();
  
  // Optionally, set up a global resize handler to re-render charts as needed.
  window.addEventListener("resize", () => {
    // You might re-run each plot function or a dedicated resize function.
    // For example re-render GL Range plot:
    plotGLRange();
    // Add similar calls for other pages if needed.
  });
});

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

  // Create a legend group at desired position (e.g., top-right corner)
  // const legend = svg.append("g")
  //                   .attr("class", "legend")
  //                   .attr("transform", `translate(${width - 150},10)`);

  // // For each group add a colored rectangle and label
  // const groups = color.domain();
  // groups.forEach((group, i) => {
  //   const legendItem = legend.append("g")
  //                            .attr("class", "legend-item")
  //                            .attr("transform", `translate(0, ${i * 25})`);
  //   legendItem.append("rect")
  //             .attr("width", 18)
  //             .attr("height", 18)
  //             .attr("fill", color(group));
  //   legendItem.append("text")
  //             .attr("x", 24)
  //             .attr("y", 9)
  //             .attr("dy", "0.35em")
  //             .text(group);
  // })

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

  // Define labels for each group using the group centers.
  const groupLabels = [
    { label: "Healthy", center: healthyCenter },
    { label: "Pre-Diabetes", center: preCenter },
    { label: "Type 2 Diabetes", center: type2Center }
  ];

  // Vertical position for the label should be relative to a common baseline.
  const labelY = centerY - rectHeight / 2 - 75; // Adjust as needed
  const dotRadius = 7;           // Use radius instead of width/height
  const offset = 30;             // Horizontal distance from the group's center to put the dot

  // Create a group for each label and dot, and center it.
  const gap = 5; // gap between dot and text
  groupLabels.forEach(g => {
    // Append a group element and place its origin at the group's center.x and at labelY.
    const labelGroup = svg.append("g")
      .attr("transform", `translate(${g.center.x}, ${labelY})`);

    // Append the text label with text-anchor "middle" so that its center is at x=0.
    const textElement = labelGroup.append("text")
      .attr("text-anchor", "middle")
      .attr("fill", "black")
      .style("font-size", "16px")
      .attr("dy", "0.35em") // vertical centering relative to font
      .text(g.label);

    // After the text is appended, measure its width.
    // Using getBBox gives dimensions of the text element.
    const textWidth = textElement.node().getBBox().width;

    // Append the colored dot to the left of the text.
    // Position it so that the gap plus the dot's radius is to the left of the text's left edge.
    labelGroup.append("circle")
      .attr("cx", -textWidth / 2 - gap - dotRadius)
      .attr("cy", 0)     // vertically centered with the text (0 because group is already translated)
      .attr("r", dotRadius)
      .attr("fill", color(g.label));
  });

  // Append scroll arrow if not already present.
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
      .on("click", () => {
        document.getElementById("info-section").scrollIntoView({
          behavior: "smooth",
          block: "start"
        });
      });
  }

  // Set up an IntersectionObserver on the info section to hide/show the arrow.
  const infoSection = document.getElementById("info-section");
  const snapContainer = document.getElementById("snap-container");
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

  // Re-create tooltip if it doesn't exist.
  if (d3.select("#tooltip").empty()) {
    d3.select("body")
      .append("div")
      .attr("id", "tooltip")
      .style("position", "absolute")
      .style("opacity", 0)
      .style("pointer-events", "none");
  }

  // Attach tooltip event handlers for healthyCircles:
  healthyCircles
    .on("mouseover", (event, d) => {
      d3.select("#tooltip")
        .style("display", "block")
        .transition().duration(200)
        .style("opacity", 0.9)
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
        .transition().duration(500)
        .style("opacity", 0)
        .on("end", function() {
           d3.select(this).style("display", "none");
        });
    })
    .on("click", handleDotClick);

  // Repeat similar tooltip event handler assignments for preCircles and type2Circles.
  // (If you already have similar code elsewhere, ensure it’s in place.)

  // Create group labels (with colored dots) above the visualization.
  const groupLabels = [
    { label: "Healthy", center: healthyCenter },
    { label: "Pre-Diabetes", center: preCenter },
    { label: "Type 2 Diabetes", center: type2Center }
  ];
  const labelY = centerY - rectHeight / 2 - 75; // Adjust vertical position as needed.
  const dotRadius = 7; // Dot size.
  const gap = 5;       // Gap between dot and text.
  groupLabels.forEach(g => {
    // Append a group element positioned at the group's center.x and labelY.
    const labelGroup = svg.append("g")
      .attr("transform", `translate(${g.center.x}, ${labelY})`);

    // Append the text label (centered).
    const textElement = labelGroup.append("text")
      .attr("text-anchor", "middle")
      .attr("fill", "black")
      .style("font-size", "16px")
      .attr("dy", "0.35em")
      .text(g.label);

    // Measure the text width.
    const textWidth = textElement.node().getBBox().width;

    // Append the colored dot to the left of the text.
    labelGroup.append("circle")
      .attr("cx", -textWidth / 2 - gap - dotRadius)
      .attr("cy", 0)
      .attr("r", dotRadius)
      .attr("fill", color(g.label));
  });
}
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

  // Load each subject’s CSV to compute total Calories, avg METs and avg HR
  const subjectNumbers = Array.from({ length: 49 }, (_, i) => i + 1);
  const subjectsResults = await loadAllSubjects(subjectNumbers);

  // Build a mapping from subject number to metrics (totalCalories, avgMETs, avgHR)
  const subjectMetricsMap = {};
  subjectsResults.forEach(({ subject, totalCalories, avgMETs, avgHR }) => {
    subjectMetricsMap[subject] = { totalCalories, avgMETs, avgHR };
  });

  // Determine the min and max total Calories for scaling dot sizes
  const totalCaloriesValues = subjectsResults.map(d => d.totalCalories);
  const minCalories = d3.min(totalCaloriesValues);
  const maxCalories = d3.max(totalCaloriesValues);

  // Create a scale to map total Calories to a dot radius (adjust range as needed)
  const sizeScale = d3.scalePow()
  .exponent(2) // try changing this value (e.g., 1.5, 2, 3) for different exaggeration levels
  .domain([minCalories, maxCalories])
  .range([20, 55]);

  // Update each dot in the merged data:
  // • Attach the subject’s totalCalories, avgMETs, and avgHR.
  // • Set the dot’s size based on totalCalories.
  data.forEach(d => {
    const subj = +d.subject; // ensure subject is numeric
    if (subjectMetricsMap[subj] !== undefined) {
      d.totalCalories = subjectMetricsMap[subj].totalCalories;
      d.avgMETs = subjectMetricsMap[subj].avgMETs;
      d.avgHR = subjectMetricsMap[subj].avgHR;
      d.size = sizeScale(d.totalCalories);
    } else {
      d.totalCalories = 0;
      d.avgMETs = undefined;
      d.avgHR = undefined;
      d.size = 10; // fallback size
    }
  });

  plotData();
}

document.addEventListener("DOMContentLoaded", async () => {
  await loadData();
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

  // Click handler function for all groups
  function handleDotClick(event, d) {
    // Immediately hide the tooltip.
    d3.select("#tooltip").style("display", "none");

    // Get the dot's base color and compute a lighter version using the custom function.
    const dotColor = color(d.Diabetes);
    const lighterColor = lightenColor(dotColor, 0.5); // adjust factor as needed

    // Transition the page background to the lighter color.
    d3.select("body")
      .transition()
      .duration(500)
      .style("background-color", lighterColor);

    // Fade out the chart container.
    d3.select("#grid")
      .transition()
      .duration(500)
      .style("opacity", 0)
      .on("end", () => {
        // Remove the chart container and title.
        d3.select("#grid").remove();
        d3.select("h1").remove();

        // Append new content for the selected subject.
        d3.select("body")
          .append("div")
          .attr("id", "subject-details")
          .style("position", "absolute")
          .style("top", "50%")
          .style("left", "50%")
          .style("transform", "translate(-50%, -50%)")
          .style("color", "black")
          .style("font-size", "1em")
          .style("text-align", "center")
          .html(`
            <h1>Subject ${d.subject}</h1>
            <div>
              <p>Diabetes: ${d.Diabetes}</p>
              <p>Total Calories: ${d.totalCalories}</p>
              <p>Average METs: ${d.avgMETs !== undefined ? d.avgMETs.toFixed(2) : 'N/A'}</p>
              <p>Average HR: ${d.avgHR !== undefined ? d.avgHR.toFixed(2) : 'N/A'}</p>
              <!-- Add more subject-specific content here -->
            </div>
            <button id="back-btn" style="margin-top:20px; padding: 5px 10px; font-size:14px;">Back</button>
          `);

        // Add a click listener to the back button:
        d3.select("#back-btn").on("click", () => {
          // Option 1: Reload the page to reset everything.
          location.reload();

          // Option 2: Alternatively, you can write custom code to remove the
          // subject details, reset the background color, and re-render the chart.
        });
      });
  }

  // Healthy circles click handler.
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
           <div style="text-align: left;">Average HR: ${d.avgHR !== undefined ? d.avgHR.toFixed(2) : 'N/A'}</div>`
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

  // Pre-diabetic circles click handler.
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
           <div style="text-align: left;">Average HR: ${d.avgHR !== undefined ? d.avgHR.toFixed(2) : 'N/A'}</div>`
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

  // Type2 diabetic circles click handler.
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
           <div style="text-align: left;">Average HR: ${d.avgHR !== undefined ? d.avgHR.toFixed(2) : 'N/A'}</div>`
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
    // Convert Calories, METs, and HR to numbers.
    csvData.forEach(d => {
      d.Calories = +d.Calories;
      d.METs = +d.METs;
      d.HR = +d.HR;
    });
    // Compute total Calories.
    const totalCalories = d3.sum(csvData, d => d.Calories);

    // Filter out invalid METs and HR values (i.e. NaN) before computing averages.
    const validMETs = csvData.filter(d => !isNaN(d.METs));
    const avgMETs = d3.mean(validMETs, d => d.METs);
    const validHR = csvData.filter(d => !isNaN(d.HR));
    const avgHR = d3.mean(validHR, d => d.HR);

    return { subject: subjectNumber, totalCalories, avgMETs, avgHR };
  } catch (error) {
    console.error(`Error loading subject ${subjectNumber} from ${csvPath}:`, error);
    return null;
  }
}

// Load multiple subjects (e.g., subjects 1 to 49)
async function loadAllSubjects(subjectNumbers) {
  const results = [];
  const missingSubjectIDs = [24, 25, 37, 40]; // Skip these subjects
  for (const subject of subjectNumbers) {
    if (missingSubjectIDs.includes(subject)) {
      console.log(`Skipping subject ${subject} (file missing).`);
      continue;
    }
    const result = await loadSubjectData(subject);
    if (result) {
      results.push(result);
    }
  }
  console.log("Metrics per subject:", results);
  return results;
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

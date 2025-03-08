let data = [];
let subjectData = {};

async function loadData() {
  // Load the merged CSV data
  data = await d3.csv("merged.csv");
  console.log("CSV Columns:", Object.keys(data[0]));

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
  
  plotBMIDots();

  plotClevelandPlot();
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
    console.error(`Error loaading subject ${subjectNumber} from ${csvPath}:`, error);
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

function plotClevelandPlot() {
  const width = 1000, height = 600;
  const margin = { top: 50, right: 50, bottom: 50, left: 150 };
  const innerWidth = width - margin.left - margin.right;
  const innerHeight = height - margin.top - margin.bottom;
  
  // Get sorted subject IDs.
  const subjects = Object.keys(subjectData).sort((a, b) => +a - +b);
  console.log("Cleveland plot subjects:", subjects);
  
  // For each subject compute the [min, max] for Libre GL.
  const subjectExtents = subjects.map(subject => {
    const values = subjectData[subject]
      .map(d => +d["Libre GL"])
      .filter(v => !isNaN(v));
    if (values.length === 0) {
      console.warn(`Subject ${subject} has no valid Libre GL values.`);
      return null;
    }
    return [d3.min(values), d3.max(values)];
  }).filter(extent => extent !== null);
  
  if (subjectExtents.length === 0) {
    console.error("No subject contained valid Libre GL values.");
    return;
  }
  
  // Compute the overall min and max based on each subject’s [min, max].
  const overallMin = d3.min(subjectExtents, d => d[0]);
  const overallMax = d3.max(subjectExtents, d => d[1]);
  console.log("Overall Libre GL range:", overallMin, overallMax);
  
  // Create an x-scale spanning from the overall min to max.
  const xScale = d3.scaleLinear()
                   .domain([overallMin, overallMax])
                   .range([0, innerWidth])
                   .nice();
  
  // Build an ordinal y-scale for subjects.
  const yScale = d3.scaleBand()
                   .domain(subjects)
                   .range([0, innerHeight])
                   .padding(0.5);
  
  const svg = d3.select("#page-5")
                .append("svg")
                .attr("width", width)
                .attr("height", height);
                
  const g = svg.append("g")
               .attr("transform", `translate(${margin.left},${margin.top})`);
  
  // Add x-axis.
  const xAxis = d3.axisBottom(xScale);
  g.append("g")
   .attr("transform", `translate(0, ${innerHeight})`)
   .call(xAxis)
   .append("text")
   .attr("x", innerWidth / 2)
   .attr("y", 40)
   .attr("fill", "black")
   .style("text-anchor", "middle")
   .text("Libre GL Glucose Value");
  
  // Add y-axis.
  const yAxis = d3.axisLeft(yScale);
  g.append("g")
   .call(yAxis)
   .append("text")
   .attr("transform", "rotate(-90)")
   .attr("x", -innerHeight / 2)
   .attr("y", -margin.left + 20)
   .attr("fill", "black")
   .style("text-anchor", "middle")
   .text("Subject");
  
  // For each subject, draw a line connecting its min and max values and plot dots.
  subjects.forEach(subject => {
    const subjectRows = subjectData[subject];
    const glucoseValues = subjectRows
      .map(d => +d["Libre GL"])
      .filter(v => !isNaN(v));
    
    if (glucoseValues.length === 0) return; // Skip if no valid values
    
    const subjectMin = d3.min(glucoseValues);
    const subjectMax = d3.max(glucoseValues);
    const yPos = yScale(subject) + yScale.bandwidth() / 2;
    
    // Draw line connecting min and max.
    g.append("line")
     .attr("x1", xScale(subjectMin))
     .attr("x2", xScale(subjectMax))
     .attr("y1", yPos)
     .attr("y2", yPos)
     .attr("stroke", "gray")
     .attr("stroke-width", 2);
    
    // Draw the min dot (blue).
    g.append("circle")
     .attr("cx", xScale(subjectMin))
     .attr("cy", yPos)
     .attr("r", 6)
     .attr("fill", "#2C7BB6");
    
    // Draw the max dot (red).
    g.append("circle")
     .attr("cx", xScale(subjectMax))
     .attr("cy", yPos)
     .attr("r", 6)
     .attr("fill", "#D7191C");
  });
}


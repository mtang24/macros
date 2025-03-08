let data = [];
let subjectData = {};

// Load merged CSV data and individual subject CSVs, then plot.
async function loadData() {
  data = await d3.csv("merged.csv");

  // Group data by subject.
  data.forEach(d => {
    const subject = d.subject;
    if (!subjectData[subject]) {
      subjectData[subject] = [];
    }
    subjectData[subject].push(d);
  });

  // Load individual subject CSVs.
  const subjectNumbers = Array.from({ length: 49 }, (_, i) => i + 1);
  const subjectsResults = await loadAllSubjects(subjectNumbers);

  const subjectMetricsMap = {};
  subjectsResults.forEach(({ subject, totalCalories, avgMETs, avgHR }) => {
    subjectMetricsMap[subject] = { totalCalories, avgMETs, avgHR };
  });

  const totalCaloriesValues = subjectsResults.map(d => d.totalCalories);
  const minCalories = d3.min(totalCaloriesValues);
  const maxCalories = d3.max(totalCaloriesValues);

  const sizeScale = d3.scalePow()
    .exponent(2)
    .domain([minCalories, maxCalories])
    .range([20, 55]);

  // Map the metrics to the merged data.
  data.forEach(d => {
    const subj = +d.subject;
    if (subjectMetricsMap[subj] !== undefined) {
      d.totalCalories = subjectMetricsMap[subj].totalCalories;
      d.avgMETs = subjectMetricsMap[subj].avgMETs;
      d.avgHR = subjectMetricsMap[subj].avgHR;
      d.size = sizeScale(d.totalCalories);
    } else {
      d.totalCalories = 0;
      d.avgMETs = undefined;
      d.avgHR = undefined;
      d.size = 10;
    }
  });

  plotData();
}

document.addEventListener("DOMContentLoaded", async () => {
  await loadData();

  // Initialize global user metrics.
  window.userMetrics = { totalCalories: 0, avgMETs: 0, avgHR: 0 };

  // Set up slider event listeners.
  const totalCaloriesSlider = document.getElementById('userTotalCalories');
  const avgMETsSlider = document.getElementById('userAvgMETs');
  const avgHRSlider = document.getElementById('userAvgHR');

  totalCaloriesSlider.addEventListener('input', (e) => {
    const value = parseFloat(e.target.value).toFixed(2);
    document.getElementById('totalCaloriesValue').textContent = value;
    window.userMetrics.totalCalories = parseFloat(value);
  });

  avgMETsSlider.addEventListener('input', (e) => {
    const value = parseFloat(e.target.value).toFixed(2);
    document.getElementById('avgMETsValue').textContent = value;
    window.userMetrics.avgMETs = parseFloat(value);
  });

  avgHRSlider.addEventListener('input', (e) => {
    const value = parseFloat(e.target.value).toFixed(2);
    document.getElementById('avgHRValue').textContent = value;
    window.userMetrics.avgHR = parseFloat(value);
  });

  // Scroll arrow behavior: hide while scrolling and reappear when idle.
  const snapContainer = document.getElementById("snap-container");
  let scrollTimeout;
  snapContainer.addEventListener("scroll", function() {
    d3.select("#scroll-down-arrow").style("display", "none");
    clearTimeout(scrollTimeout);
    scrollTimeout = setTimeout(() => {
      d3.select("#scroll-down-arrow").style("display", "block");
    }, 150);
  });
});

function plotData() {
  const width = 1000, height = 500;
  const centerX = width / 2, centerY = height / 2;
  const svg = d3.select("#grid")
                .attr("width", width)
                .attr("height", height);

  // Color scale for Diabetes values.
  const color = d3.scaleOrdinal()
    .domain(["Healthy", "Pre-Diabetes", "Type 2 Diabetes"])
    .range(["#2C7BB6", "#FDB863", "#D7191C"]);

  const healthyCenter = { x: centerX - 300, y: centerY };
  const preCenter     = { x: centerX,       y: centerY };
  const type2Center   = { x: centerX + 300, y: centerY };

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

  const healthysubjects = data.filter(d => d.Diabetes === "Healthy");
  const presubjects = data.filter(d => d.Diabetes === "Pre-Diabetes");
  const type2subjects = data.filter(d => d.Diabetes === "Type 2 Diabetes");

  console.log("Healthy subjects:", healthysubjects.length);
  console.log("Pre-diabetic subjects:", presubjects.length);
  console.log("Type2 diabetic subjects:", type2subjects.length);

  const healthyCircles = svg.selectAll("circle.healthy")
      .data(healthysubjects)
      .join("circle")
      .attr("class", "healthy")
      .attr("cx", d => d.x)
      .attr("cy", d => d.y)
      .attr("r", d => d.size)
      .attr("fill", d => color(d.Diabetes));

  const preCircles = svg.selectAll("circle.pre")
      .data(presubjects)
      .join("circle")
      .attr("class", "pre")
      .attr("cx", d => d.x)
      .attr("cy", d => d.y)
      .attr("r", d => d.size)
      .attr("fill", d => color(d.Diabetes));

  const type2Circles = svg.selectAll("circle.type2")
      .data(type2subjects)
      .join("circle")
      .attr("class", "type2")
      .attr("cx", d => d.x)
      .attr("cy", d => d.y)
      .attr("r", d => d.size)
      .attr("fill", d => color(d.Diabetes));

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

  // Append the scroll-down arrow if not already present.
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
        // Scroll from the title page to Page 1.
        document.querySelector("#snap-container section:nth-child(2)").scrollIntoView({ behavior: "smooth", block: "start" });
      });
  }

  // Monitor the info section so the arrow hides when in view.
  const infoSection = document.getElementById("info-section");
  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      d3.select("#scroll-down-arrow").style("display", entry.isIntersecting ? "none" : "block");
    });
  }, { 
    root: document.getElementById("snap-container"),
    threshold: 0.1 
  });
  observer.observe(infoSection);

  // Ensure tooltip exists.
  if (d3.select("#tooltip").empty()) {
    d3.select("body")
      .append("div")
      .attr("id", "tooltip")
      .style("position", "absolute")
      .style("opacity", 0)
      .style("pointer-events", "none");
  }

  // --- Handle dot click events for detailed subject view ---
  function handleDotClick(event, d) {
    // Remove any previous details view.
    d3.selectAll("#subject-details").remove();
    d3.selectAll("#go-back-arrow").remove();
    d3.selectAll("#scroll-down-arrow").remove();
    window.removeEventListener("wheel", backScrollHandler);

    d3.select("#tooltip")
      .interrupt()
      .style("opacity", 0)
      .style("display", "none");

    // Hide the info section.
    d3.select("#info-section").style("display", "none");

    const dotColor = color(d.Diabetes);
    const lighterColor = lightenColor(dotColor, 0.5);

    d3.select("body")
      .transition().duration(500)
      .style("background-color", lighterColor);

    d3.select("#grid")
      .transition().duration(500)
      .style("opacity", 0)
      .on("end", () => {
        d3.select("#grid").style("display", "none");
        d3.select("h1").style("display", "none");

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

        // Attach wheel listener to trigger back-scroll.
        window.addEventListener("wheel", backScrollHandler);
      });
  }

  healthyCircles
    .on("mouseover", (event, d) => {
      d3.select("#tooltip")
        .style("display", "block")
        .transition().duration(200).style("opacity", 0.9);
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
        .transition().duration(500).style("opacity", 0)
        .on("end", function() { d3.select(this).style("display", "none"); });
    })
    .on("click", handleDotClick);

  preCircles
    .on("mouseover", (event, d) => {
      d3.select("#tooltip")
        .style("display", "block")
        .transition().duration(200).style("opacity", 0.9);
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
        .transition().duration(500).style("opacity", 0)
        .on("end", function() { d3.select(this).style("display", "none"); });
    })
    .on("click", handleDotClick);

  type2Circles
    .on("mouseover", (event, d) => {
      d3.select("#tooltip")
        .style("display", "block")
        .transition().duration(200).style("opacity", 0.9);
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
        .transition().duration(500).style("opacity", 0)
        .on("end", function() { d3.select(this).style("display", "none"); });
    })
    .on("click", handleDotClick);

  // Append group labels.
  const groupLabels = [
    { label: "Healthy", center: healthyCenter },
    { label: "Pre-Diabetes", center: preCenter },
    { label: "Type 2 Diabetes", center: type2Center }
  ];
  const labelY = centerY - rectHeight / 2 - 75;
  const dotRadius = 7, gap = 5;
  groupLabels.forEach(g => {
    const labelGroup = svg.append("g")
      .attr("transform", `translate(${g.center.x}, ${labelY})`);
    const textElement = labelGroup.append("text")
      .attr("text-anchor", "middle")
      .attr("fill", "black")
      .style("font-size", "16px")
      .attr("dy", "0.35em")
      .text(g.label);
    const textWidth = textElement.node().getBBox().width;
    labelGroup.append("circle")
      .attr("cx", -textWidth / 2 - gap - dotRadius)
      .attr("cy", 0)
      .attr("r", dotRadius)
      .attr("fill", color(g.label));
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
    });
    const totalCalories = d3.sum(csvData, d => d.Calories);
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

async function loadAllSubjects(subjectNumbers) {
  const missingSubjectIDs = [24, 25, 37, 40];
  const validSubjects = subjectNumbers.filter(subject => !missingSubjectIDs.includes(subject));
  const subjectPromises = validSubjects.map(subject => loadSubjectData(subject));
  const results = await Promise.all(subjectPromises);
  return results.filter(result => result !== null);
}

function forceBoundingBox(bounds, strength = 0.1) {
  let nodes;
  function force(alpha) {
    for (const node of nodes) {
      if (node.x - node.size < bounds.x0) {
        let diff = bounds.x0 - (node.x - node.size);
        node.vx += diff * strength;
      } else if (node.x + node.size > bounds.x1) {
        let diff = (node.x + node.size) - bounds.x1;
        node.vx -= diff * strength;
      }
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

// When scrolling down from the details view, return to the title (home) page.
function backScrollHandler(e) {
  e.preventDefault();
  if (e.deltaY > 0) {
    window.removeEventListener("wheel", backScrollHandler);
    // Fade out and remove the details view and go-back arrow.
    d3.select("#subject-details")
      .transition().duration(300)
      .style("opacity", 0)
      .on("end", function() {
        d3.select(this).remove();
        d3.select("#go-back-arrow").remove();
        // Then scroll the snap container to the title page.
        document.getElementById("title-page").scrollIntoView({ behavior: "smooth", block: "start" });
        // Finally, reset the main view.
        resetMainView();
      });
  }
}

function resetMainView() {
  d3.selectAll("#subject-details").remove();
  d3.selectAll("#go-back-arrow").remove();
  // Explicitly scroll the snap container to the title page.
  document.getElementById("title-page").scrollIntoView({ behavior: "smooth", block: "start" });

  d3.select("body")
    .transition().duration(500)
    .style("background-color", "#ffffff");

  d3.select("#grid")
    .style("display", "block")
    .transition().duration(500)
      .style("opacity", 1);
  d3.select("h1")
    .style("display", "block")
    .transition().duration(500)
      .style("opacity", 1);

  d3.select("#info-section").style("display", "block");

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

  const infoSection = document.getElementById("info-section");
  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      d3.select("#scroll-down-arrow").style("display", entry.isIntersecting ? "none" : "block");
    });
  }, { 
    root: document.getElementById("snap-container"),
    threshold: 0.1 
  });
  observer.observe(infoSection);

  setTimeout(() => {
    const snapContainer = document.getElementById("snap-container");
    snapContainer.style.overflowY = "scroll";
    snapContainer.style.scrollSnapType = "y mandatory";
  }, 1000);
}

window.addEventListener("wheel", function handleScroll(e) {
  if (e.deltaY > 0) {
    window.removeEventListener("wheel", handleScroll);
    d3.select("#subject-details")
      .transition().duration(500)
      .style("opacity", 0);
    d3.select("#go-back-arrow")
      .transition().duration(500)
      .style("opacity", 0)
      .on("end", () => { resetMainView(); });
  }
});

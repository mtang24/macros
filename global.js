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
  const sizeScale = d3.scaleLinear()
    .domain([minCalories, maxCalories])
    .range([10, 30]);

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
  const width = 700;
  const height = 650;
  const centerX = width / 2;
  const centerY = height / 2;
  const svg = d3.select("#grid")
                .attr("width", width)
                .attr("height", height);

  // Define a color scale for the Diabetes values
  const color = d3.scaleOrdinal()
      .domain(["Non-Diabetic", "Pre-Diabetic", "Diabetic"])
      .range(["#D7191C", "#FDB863", "#2C7BB6"]);

  // Constrain initial positions to a smaller circle (here, max radius 100)
  data.forEach(d => {
    let angle = Math.random() * 2 * Math.PI;
    let maxR = 100; // initial cluster radius
    let r = Math.random() * (maxR - d.size);
    d.x = centerX + r * Math.cos(angle);
    d.y = centerY + r * Math.sin(angle);
  });

  // Create circles for each dot.
  const circles = svg.selectAll("circle")
      .data(data)
      .join("circle")
      .attr("cx", d => d.x)
      .attr("cy", d => d.y)
      .attr("r", d => d.size)
      .attr("fill", d => color(d.Diabetes))
      .on("mouseover", (event, d) => {
        d3.select("#tooltip").transition()
           .duration(200)
           .style("opacity", 0.9);
        // Tooltip with the subject line centered and bold, other lines left-aligned.
        d3.select("#tooltip").html(
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
        d3.select("#tooltip").transition()
           .duration(500)
           .style("opacity", 0);
      });

  // Use a force simulation so that dots pack together within a tight circle.
  const simulation = d3.forceSimulation(data)
        .force("center", d3.forceCenter(centerX, centerY))
        .force("x", d3.forceX(centerX).strength(0.3))
        .force("y", d3.forceY(centerY).strength(0.3))
        .force("collide", d3.forceCollide().radius(d => d.size + 1).iterations(3))
        .on("tick", () => {
          circles
              .attr("cx", d => d.x)
              .attr("cy", d => d.y)
              .attr("r", d => d.size);
        });
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
  for (const subject of subjectNumbers) {
    const result = await loadSubjectData(subject);
    if (result) {
      results.push(result);
    }
  }
  console.log("Metrics per subject:", results);
  return results;
}

// Example: load subjects 1 through 49.
const subjectNumbers = Array.from({ length: 49 }, (_, i) => i + 1);
loadAllSubjects(subjectNumbers);

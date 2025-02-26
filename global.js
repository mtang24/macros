let data = [];
let selectedMouseID = "f1_act"; // Default selected mouse ID
let dailyMeans = [];

async function loadData() {
    data = await d3.csv("mouse.csv", (row, index) => {
        return {
            // Minute index across 14 days
            Minute: index, // Use the row index as the minute index
            Day: +row.Day, // Assuming there is a Day column in the CSV
        
            // Female Temperatures
            // f1_temp: +row.f1_temp, f2_temp: +row.f2_temp, f3_temp: +row.f3_temp,
            // f4_temp: +row.f4_temp, f5_temp: +row.f5_temp, f6_temp: +row.f6_temp,
            // f7_temp: +row.f7_temp, f8_temp: +row.f8_temp, f9_temp: +row.f9_temp,
            // f10_temp: +row.f10_temp, f11_temp: +row.f11_temp, f12_temp: +row.f12_temp,
            // f13_temp: +row.f13_temp,
        
            // Female Activity
            f1_act: +row.f1_act, f2_act: +row.f2_act, f3_act: +row.f3_act,
            f4_act: +row.f4_act, f5_act: +row.f5_act, f6_act: +row.f6_act,
            f7_act: +row.f7_act, f8_act: +row.f8_act, f9_act: +row.f9_act,
            f10_act: +row.f10_act, f11_act: +row.f11_act, f12_act: +row.f12_act,
            f13_act: +row.f13_act,
        
            // Male Activity
            m1_act: +row.m1_act, m2_act: +row.m2_act, m3_act: +row.m3_act,
            m4_act: +row.m4_act, m5_act: +row.m5_act, m6_act: +row.m6_act,
            m7_act: +row.m7_act, m8_act: +row.m8_act, m9_act: +row.m9_act,
            m10_act: +row.m10_act, m11_act: +row.m11_act, m12_act: +row.m12_act,
            m13_act: +row.m13_act,
        };
    });

    updateDailyMeans();
    plotData();
}

document.addEventListener('DOMContentLoaded', async () => {
    await loadData();

    // Add event listener for dropdown change
    d3.select("#mouse-select").on("change", function() {
        selectedMouseID = d3.select(this).property("value");
        updateDailyMeans();
        plotData();
    });
});

function updateDailyMeans() {
    dailyMeans = [];
    const groupedData = d3.group(data, d => d.Day);
    groupedData.forEach((values, key) => {
        const meanAct = d3.mean(values, d => d[selectedMouseID]);
        dailyMeans.push({ Day: key, MeanAct: meanAct });
    });
}

function plotData() {
    const width = 800;
    const height = 500;
    const margin = { top: 10, right: 10, bottom: 50, left: 40 };

    const usableArea = {
      top: margin.top,
      right: width - margin.right,
      bottom: height - margin.bottom,
      left: margin.left,
      width: width - margin.left - margin.right,
      height: height - margin.top - margin.bottom,
    };

    d3.select("#chart").selectAll("*").remove(); // Clear previous chart

    const svg = d3.select("#chart").append("svg")
        .attr('viewBox', `0 0 ${width} ${height}`)
        .style('overflow', 'visible')
        .append("g")
        .attr("transform", `translate(${margin.left},${margin.top})`);

    const x = d3.scaleLinear()
        .domain([0, 14]) // Domain starts at 0 to include all 14 days
        .range([0, usableArea.width]);

    const y = d3.scaleLinear()
        .domain([0, 55])
        .range([usableArea.height, 0]);

    svg.append("g")
        .attr("transform", `translate(0,${usableArea.height})`)
        .call(d3.axisBottom(x).ticks(14));

    svg.append("g")
        .call(d3.axisLeft(y));
    
    // Add gridlines BEFORE the axes
    const gridlines = svg
        .append('g')
        .attr('class', 'gridlines');

    // Create gridlines as an axis with no labels and full-width ticks
    gridlines.call(d3.axisLeft(y).tickFormat('').tickSize(-usableArea.width));

    const dots = svg.append('g').attr('class', 'dots');

    dots.selectAll("circle")
        .data(dailyMeans)
        .enter()
        .append("circle")
        .attr("cx", d => x(d.Day))
        .attr("cy", d => y(d.MeanAct))
        .attr("r", 5)
        .attr('fill', 'steelblue');

    let tooltipTimeout; // Declare timeout variable

    dots.selectAll('circle')
        .on('mouseenter', function (event) {
            const mean = this.__data__; // Get bound mean data
            updateTooltipContent(mean);
            updateTooltipVisibility(true);
            updateTooltipPosition(event);
            d3.select(event.currentTarget).style('fill-opacity', 1); // Full opacity on hover
            
            clearTimeout(tooltipTimeout); // Cancel any pending hide action
        })
        .on('mousemove', (event) => {
            updateTooltipPosition(event);
        })
        .on('mouseleave', (event) => {
            tooltipTimeout = setTimeout(() => {
                updateTooltipVisibility(false); // Hide tooltip entirely in one step
            }, 200); // Short delay to allow movement to the tooltip
            d3.select(event.currentTarget).style('fill-opacity', 0.7); // Restore transparency
        })
        .attr('r', 5)
        .style('fill-opacity', 0.7); // Add transparency for overlapping dots;
        
    // Prevent tooltip from disappearing when hovered over
    const tooltip = document.getElementById('mean-tooltip');
    
    tooltip.addEventListener('mouseenter', () => {
        clearTimeout(tooltipTimeout); // Cancel hiding when user enters tooltip
    });
    
    tooltip.addEventListener('mouseleave', () => {
        updateTooltipVisibility(false); // Hide tooltip when mouse leaves tooltip
    });
}

function updateTooltipContent(mean) {
    const day = document.getElementById('day-number');
    const mean_activity = document.getElementById('mean-activity');

    if (!mean || !mean.Day) {
        day.textContent = '';
        mean_activity.textContent = '';
        return;
    }   

    day.textContent = mean.Day;
    mean_activity.textContent = mean.MeanAct;
}

function updateTooltipVisibility(isVisible) {
    const tooltip = document.getElementById('mean-tooltip');
    tooltip.hidden = !isVisible;
}

function updateTooltipPosition(event) {
    const tooltip = document.getElementById('mean-tooltip');
    tooltip.style.left = `${event.clientX + 10}px`; // Offset to avoid cursor overlap
    tooltip.style.top = `${event.clientY + 10}px`; // Offset to avoid cursor overlap
}
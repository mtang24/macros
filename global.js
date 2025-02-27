let data = [];
let subjectData = {};

async function loadData() {
    // Load the CSV data
    data = await d3.csv("merged.csv");

    // Group data by subject value assuming each row has a 'subject' field
    data.forEach(d => {
        const subject = d.subject;
        if (!subjectData[subject]) {
            subjectData[subject] = [];
        }
        subjectData[subject].push(d);
    });

    plotData();
}

document.addEventListener("DOMContentLoaded", async () => {
    await loadData();
});

function plotData() {
    const width = 700;
    const height = 650;
    const svg = d3.select("#grid")
                  .attr("width", width)
                  .attr("height", height);

    // Define a color scale for the Diabetes values
    const color = d3.scaleOrdinal()
        .domain(["Non-Diabetic", "Pre-Diabetic", "Diabetic"])
        .range([" #D7191C", " #FDB863", " #2C7BB6"]); // Blue, Muted Orange, Strong Red

    const centerX = width / 2;
    const centerY = height / 2;
    const ringSpacing = 60; // Adjust as needed

    // Example ring sizes that add up to 45: [1, 4, 8, 12, 20]
    const ringSizes = [1, 4, 8, 12, 20];
    let offset = 0; // Keeps track of where we are in the data array

    const tooltip = d3.select("#tooltip");

    ringSizes.forEach((size, ringIndex) => {
        const ringData = data.slice(offset, offset + size);
        offset += size;

        // Radius for this ring
        const radius = ringIndex * ringSpacing; 

        // Place each point evenly around the ring (except ring 0 = center)
        ringData.forEach((d, i) => {
            if (ringIndex === 0) {
                // Single center dot
                d.cx = centerX;
                d.cy = centerY;
            } else {
                const angleStep = (2 * Math.PI) / size;
                d.cx = centerX + radius * Math.cos(i * angleStep);
                d.cy = centerY + radius * Math.sin(i * angleStep);
            }
        });

        svg.selectAll(`.dot-ring${ringIndex}`)
           .data(ringData)
           .enter()
           .append("circle")
           .attr("class", `dot-ring${ringIndex}`)
           .attr("cx", d => d.cx)
           .attr("cy", d => d.cy)
           .attr("r", 10)
           .attr("fill", d => color(d.Diabetes)) // Use the color scale for the fill color
           .on("mouseover", (event, d) => {
               tooltip.transition()
                      .duration(200)
                      .style("opacity", .9);
               tooltip.html(`Diabetes: ${d.Diabetes}`)
                      .style("left", (event.pageX + 5) + "px")
                      .style("top", (event.pageY - 28) + "px");
           })
           .on("mouseout", (d) => {
               tooltip.transition()
                      .duration(500)
                      .style("opacity", 0);
           });
    });
}
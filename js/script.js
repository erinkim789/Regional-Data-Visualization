// Setting margins and dimensions of svg
const margin = { top: 10, right: 10, bottom: 10, left: 10 };
const vwidth = 850;
const vheight = 850;

// This function finds the maximum value for a given metric across all regions
function findMax(data, key) {
    // Initilalizing maxVal to null
    let maxVal = null;

    // Iterating through each region for the specified metric
    for (const region in data) {
        const val = data[region][key];

        // Checking if val is a valid number and updating maxVal if val is greater
        if (typeof val === "number" && !isNaN(val) && (!val || val > maxVal)) {
            maxVal = val;
        }
    }

    // returning maxVal
    return maxVal;
}

// This function determines how many metrics a given region is best in compared to other regions
// and addtionally returns a list reordered so that the metrics where the given region is best in come first
function findBest(data, regionName) {
    // Defining the list of metrics to evaluate
    const keyAxis = [
        { key: "gini", axis: "GINI Index" },
        { key: "hdi", axis: "Human Development Index" },
        { key: "seda", axis: "SEDA" },
        { key: "economic_growth", axis: "Economic Growth" },
        { key: "infant_mortality", axis: "Infant Mortality" },
        { key: "maternal_mortality", axis: "Maternal Mortality" },
        { key: "primary_out_school", axis: "Children Out of School (%)" },
        { key: "unemployment", axis: "Unemployment (%)" },
        { key: "extreme_poverty", axis: "Extreme Poverty (%)" },
        { key: "electricity_access", axis: "Access to Electricity (%)" }
    ];

    // extracting data for the specified region
    const regionData = data[regionName];
    const regions = Object.values(data).filter(d => d != regionData);

    // if region data does not exist, we return 0 and the list as it is
    if (!regionData) return { bestCount: 0, reordered: keyAxis };

    // Reordering the metrics based on whether the specified region is best in them
    const reordered = keyAxis.sort((a, b) => {
        // Checking if region is the better than every other region for the given metric
        const aIsBest = regions.every(d => regionData[a.key] >= d[a.key]);
        const bIsBest = regions.every(d => regionData[b.key] >= d[b.key]);

        // Sorting logic
        if (aIsBest && !bIsBest) return -1;
        if (!aIsBest && bIsBest) return 1;
        return 0;
    });

    // Counting how many metrics the specified region is best in
    const bestCount = keyAxis.filter(d => regions.every(r => regionData[d.key] >= r[d.key])).length;

    // DEBUG
    console.log(`Region ${regionName} is best in ${bestCount} metrics.`);

    // Returning the count and reordered list
    return { bestCount, reordered };
}

// This function actually creates the chart in the provided assignment. It takes data and a d3 group element g to draw into
function createVis(data, g) {
    // Getting the selected region from the dropdown
    let region = document.getElementById("regionSelect").value;
    const ret = findBest(data, region);

    // Extracting the reordered metrics list and bestCount from our findBest function
    const keyAxis = ret.reordered;
    const bestCount = ret.bestCount;

    // Calculating the angle slice for each axis in our visualization
    const angleSlice = Math.PI * 2 / keyAxis.length;

    // Defining the radius and inner radius for our chart (in terms of the axes lines)
    const radius = 400;
    const innerRadius = 125;

    // Creating a list of scales for each axis based on the maximum value for that metric across all regions
    const axisScales = keyAxis.map(i => {
        // Using the findMax function to get the maximum value for the current metric
        const key = i.key;
        const maxVal = findMax(data, key);

        // DEBUG
        console.log(`Max for ${key}: ${maxVal}`);

        // Creating and returning a linear scale for the current axis
        return d3.scaleLinear()
            .range([innerRadius, radius])
            .domain([0, maxVal * 1.1]);
    });

    // Creating the axis grid group
    var axisGrid = g.append("g").attr("class", "axisWrapper");

    // Creating the axes
	var axis = axisGrid.selectAll(".axis")
        .data(keyAxis)
        .enter()
        .append("g")
        .attr("class", "axis");

    // We want our axes line to be in the center of each slice, so we rotate it by half of the angle slice
    let angleOffset = angleSlice / 2;

    // We draw the outer circle that our purple arc will sit on top of
    g.lower().append("circle")
                .attr("cx", 0)
                .attr("cy", 0)
                .attr("r", radius + 5) // We are going to make our arc 10px thick, so we add 5px to center it
                .attr("stroke", "#d6d6d6")
                .attr("fill", "none")
                .attr("stroke-width", "10px")
                .style("pointer-events", "none");

    // Our angle slices so that they turn gray when hovered over
    // We invoke .lower() so that our slices sit below all of our other elements
    const slices = g.append("g").attr("class", "hoverSlices").lower();

    // Append the slice paths
    slices.selectAll("path")
        .data(keyAxis)
        .enter()
        .append("path")
        .attr("d", (d, i) => {
            const arcGen = d3.arc()
                .innerRadius(innerRadius)
                .outerRadius(radius)
                .startAngle(angleSlice * (i-1))
                .endAngle(angleSlice * i);
            return arcGen();
        })
        // We have it transparent by default
        .attr("fill", "transparent")
        .attr("pointer-events", "all")
        // Turns the slice gray when hovered over
        .on("mouseover", function() {
            d3.select(this).attr("fill", "#e8e8e8");
        })
        // Turns back to transparent when not hovered over
        .on("mouseout", function() {
            d3.select(this).attr("fill", "transparent");
        });

	// Drawing the axis lines
	axis.append("line")
        .attr("x1", function(d, i){ 
            return innerRadius * Math.cos(angleSlice*i + angleOffset - Math.PI/2); 
        })
        .attr("y1", function(d, i){ 
            return innerRadius * Math.sin(angleSlice*i + angleOffset - Math.PI/2); 
        })
        .attr("x2", function(d, i){ 
            return axisScales[i](findMax(data, d.key)) * Math.cos(angleSlice*i + angleOffset - Math.PI/2); 
        })
        .attr("y2", function(d, i){ 
            return axisScales[i](findMax(data, d.key)) * Math.sin(angleSlice*i + angleOffset - Math.PI/2); 
        })
        .attr("class", "line")
        .style("stroke", "#a3a3a3")
        .style("stroke-width", "2px");

	// Adding the axis labels with a tangential offset and fliped rotation for the left half
	axis.append("text")
        .attr("class", "legend")
        .style("font-size", "15px")
        .style("font-weight", "semi-bold")
        .style("fill", "#7f7f7fff")
        .attr("dy", "0.35em")
        .attr("x", 0)
        .attr("y", 0)
        .attr("text-anchor", function(d, i){
            // Because we need to flip for the left half, we adjust text anchor
            return i >= keyAxis.length/2 ? "end" : "start";
        })
        .attr("transform", function(d, i){
            // Angle for the axis
            const angle = angleOffset + angleSlice * i - Math.PI/2;
            // Starting distance from the center. Slight offset from innerRadius for aesthetics
            const axisStart = innerRadius + 10;
            // The tangential offset
            const push = 20;

            // Base position for our axis Label
            let x = (axisStart * Math.cos(angle)) + push * -Math.sin(angle);
            let y = (axisStart * Math.sin(angle)) + push * Math.cos(angle);

            // If the label is on the left half, we flip it for better readability
            let angleDeg = angle * 180 / Math.PI;
            if (i >= keyAxis.length/2) angleDeg += 180;

            return `translate(${x}, ${y}) rotate(${angleDeg})`;
        })
        .text(d => d.axis.toUpperCase());


    // Percetage summary in the center
    g.append("text")
        .attr("text-anchor", "middle")
        .attr("dominant-baseline", "middle")
        .attr("transform", "translate(0, -10)")
        .style("font-size", "30px")
        .style("font-weight", "bold")
        .text(`${(bestCount/keyAxis.length * 100).toFixed(1)}%`);

    // Description below percentage. We want this in two lines, like the example in the assignment
    const descriptionLines = [
        "of metrics are stronger than",
        "the average of other regions"
    ];

    const lineHeight = 14; // vertical spacing
    const startY = 20; // offset below the percentage

    g.append("text")
        .attr("text-anchor", "middle")
        .attr("y", startY)
        .style("font-size", "13px")
        .selectAll("tspan")
        .data(descriptionLines)
        .enter()
        .append("tspan")
        .text(d => d)
        .style("fill", "#8f8f8fff")
        .style("font-weight", "bold")
        .attr("x", 0)
        .attr("dy", (d,i) => i === 0 ? 0 : lineHeight);

    // Creating the purple arc that indicates how many metrics the selected region is best in
    const arc = d3.arc()
        .innerRadius(radius)
        .outerRadius(radius + 10)
        .startAngle(0)
        .endAngle(() =>{
            if (bestCount == 0) return 0;
            else return bestCount * angleSlice;
        });

    g.append("path")
        .attr("d", arc())
        .style("fill", "#8c00ff");

    // list of all regions
    const allRegions = Object.keys(data);

    // radius for circular points that are not the selected region
    const smallR = 5;
    // radius for the selected region's circular points on the axes
    const largeR = 10;
    // offset used to shift points when points overlap
    const offset_point = .2;

    // For each axis, we will place our circles
    keyAxis.forEach((axisObj, i) => {
        // key for the current metric
        const key = axisObj.key;
        // axis scale for the current metric
        const scale = axisScales[i];

        // angle is the angle of our current axis
        const angle = angleOffset + angleSlice * i - Math.PI/2;
        const dx = Math.cos(angle);
        const dy = Math.sin(angle);

        // angle for the tangential direction, which we will use to shift points
        const tx = -dy;
        const ty = dx;

        // creating a sorted list of regions based on their value for the current metric, removing invalid values, 
        // and ensuring the selected region's points get placed first
        const sorted = allRegions
            .map(r => ({region: r, value: data[r][key]}))
            .filter(v => v.value != null && !isNaN(v.value))
            .sort((a,b) => {
                if (b.region == region) return 1;
                if (a.region == region) return -1;
                return b.value - a.value;
            });

        // list of circles already placed
        let placed = [];

        // placing each point in our list sorted
        sorted.forEach(point => {
            // checking if the current point we are placing is for the selected region
            const isSelected = point.region == region;
            // radius for the current point
            const r = isSelected ? largeR : smallR;
            // using our axis scale to get the distance from the center for our current point
            const dist = scale(point.value);

            // Accurate initial position along the axis
            let ax = dist * dx;
            let ay = dist * dy;

            // Function for checking for overlap. If any of the already placed points overlap with our current point, returns true
            function overlaps(x, y) {
                return placed.some(p => {
                    // distance between the two points squared
                    const dx = x - p.x;
                    const dy = y - p.y;
                    const d2 = dx*dx + dy*dy;
                    // checking if the distance squared is less than the sum of the radius sum squared
                    return d2 < (r + p.r)**2;
                });
            }

            // Function that shifts the point along the tangential offset direction (given by sign) until there is no overlap
            function shift(sign) {
                let total_offset = 0;

                // Keep shifting in one direction until there are no overlaps
                while (overlaps(ax + total_offset * tx * sign, ay + total_offset * ty * sign)) {
                    total_offset += offset_point;
                }
                return total_offset * sign;
            }

            // We try to shift in both positive and negative tangential directions
            const shiftPos = shift(+1);
            const shiftNeg = shift(-1);

            // we pick the direction with the smallest shift so that it looks the most natural
            const bestShift = Math.abs(shiftNeg) < Math.abs(shiftPos) ? shiftNeg : shiftPos;

            // final position after applying the offset needed to avoid overlaps
            ax += bestShift * tx;
            ay += bestShift * ty;

            // we add our newly placed point to our list placed
            placed.push({x: ax, y: ay, r, isSelected, region: point.region});
        });

        // Drawing all of our placed points for the current axis
        placed.forEach(p => {
            g.append("circle")
                .attr("cx", p.x)
                .attr("cy", p.y)
                .attr("r", p.r)
                // If is the selected region, we use purple to fill and stroke, otherwise we use gray and white
                .attr("fill", p.isSelected ? "#eedaffff" : "white")
                .attr("stroke", p.isSelected ? "#8c00ff" : "gray")
                .attr("stroke-width", 2)
                .style("fill-opacity", 0.7)
                .attr("pointer-events", "all")
                // tooltip functionality when the mouse hovers over a point
                .on("mouseover", function(event) {
                    // accessing tooltip div and making it visible
                    const tooltip = document.getElementById("tooltip");
                    tooltip.style.opacity = 1;

                    // getting the DOM position of the mouse to position the tooltip and offsetting slightly
                    tooltip.style.left = (event.pageX + 10) + "px";
                    tooltip.style.top  = (event.pageY + 10) + "px";

                    // setting tooltip content and adding a % if needed
                    document.getElementById("tooltip-title").innerHTML = `${data[p.region][key].toFixed(2) + (axisObj["axis"].includes("%") ? "%" : "")}`;
                    document.getElementById("tooltip-region").innerHTML = p.region;
                    document.getElementById("tooltip-metric").innerHTML = axisObj.axis;
                })
                // hiding tooltip when mouse leaves point
                .on("mouseout", function() {
                    document.getElementById("tooltip").style.opacity = 0;
                });
        });
    });
}

// This function parses a number from a string and returns null for invalid inputs
function parseNumber(str) {
    // Checking for invalid inputs
    if (!str || str === "-" || str.trim() === "") return null; 
    // removing commas and converting to number
    const n = +str.replace(/,/g, "");
    // returning null for NaN values
    return isNaN(n) ? null : n;
}

// This function computes the average value for each metric across all countries in each region
function computeRegionAverages(data) {
    // Object to hold region data
    const regions = {};

    // For each country in our csv data, we add its values to the corresponding region totals
    data.forEach(row => {
        // region name
        const r = row.region;
        // if region does not exist in our regions object, we initialize it
        if (!regions[r]) regions[r] = { count: 0 };

        // incrementing the country count for the region
        regions[r].count++;

        // For each metric in the country row, we add its value to the region total
        Object.keys(row).forEach(key => {
            // skipping keys that are not metrics
            if (key == "country" || key == "region") return;

            // value for the current metric
            const val = row[key];
            // if value is valid, we add it to the region total for that metric
            if (val && !isNaN(val)) {
                if (!regions[r][key]) regions[r][key] = 0;
                regions[r][key] += val;
            }
        });
    });

    // We compute the average for each metric by dividing the total by that region's country count
    for (const region in regions) {
        const entry = regions[region];
        for (const key in entry) {
            if (key != "count" && typeof entry[key] === "number") {
                entry[key] = entry[key] / entry.count;
            }
        }
    }

    // We return the computed region averages
    return regions;
}

// This function initializes the visualization by loading data and creating the chart. It takes a d3 group element g for createVis to draw into
async function init(g) {
    // loads and parses csv data
    d3.csv("data/data.csv", d => ({
        country: d.indicator,
        region: d.Region,

        gini: parseNumber(d["GINI index"]),
        hdi: parseNumber(d["human development index_2021"]),
        seda: parseNumber(d["sustainable economic development assessment (SEDA)"]),
        gdp_growth: parseNumber(d['"GDP growth\n(annual %)_2021"']), 
        economic_growth: parseNumber(d["Economic Growth_2021"]),
        health_gdp: parseNumber(d["health expenditure \n% of GDP_2021"]),
        infant_mortality: parseNumber(d["infant mortality"]),
        maternal_mortality: parseNumber(d["maternal mortality per 100,000 live births"]),
        education_gdp: parseNumber(d["education expenditure\n% of GDP"]),
        primary_out_school: parseNumber(d["% of primary school aged kids out of school"]),
        unemployment: parseNumber(d["unemployment (%)"]),
        extreme_poverty: parseNumber(d["% of population in extreme poverty"]),
        electricity_access: parseNumber(d["% of population with access to electricity"]),
        political_rights: parseNumber(d["political rights score"]),
        civil_liberties: parseNumber(d["civil liberties score"]),
    }))
    .then(data => {
        // DEBUG
        console.log("Raw parsed data:", data);
        // computing region averages
        const regionAvg = computeRegionAverages(data);
        // DEBUG
        console.log("Region averages:", regionAvg);
        // creating the visualization
        createVis(regionAvg, g);
    });
}

window.addEventListener('load', () => {
    // When the window loads, we create our initil svg and group elements
    const svg = d3.select('#vis')
        .append("svg")
        .attr("width", vwidth + margin.left + margin.right)
        .attr("height", vheight + margin.top + margin.bottom)
        .append("g")
        .attr("transform","translate(" + margin.left + "," + margin.top + ")");
    // centering g
    const g = svg.append("g")
        .attr("transform", `translate(${(vwidth + margin.left + margin.right)/2}, ${(vheight + margin.top + margin.bottom)/2})`);
                                    
    init(g);
});

document.getElementById("regionSelect").addEventListener("change", () => {
    // We are removing the old svg and recreating it to create a new visualization when the selected region changes
    d3.select("#vis").select("svg").remove();

    const svg = d3.select('#vis')
        .append("svg")
        .attr("width", vwidth + margin.left + margin.right)
        .attr("height", vheight + margin.top + margin.bottom)
        .append("g")
        .attr("transform","translate(" + margin.left + "," + margin.top + ")");

    const g = svg.append("g")
        .attr("transform", `translate(${(vwidth + margin.left + margin.right)/2}, ${(vheight + margin.top + margin.bottom)/2})`);

    init(g);
});
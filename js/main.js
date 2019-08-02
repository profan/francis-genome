"use strict";

document.addEventListener("DOMContentLoaded", function(event) {

    let margins = {
        top: 16, left: 128, right: 128, bottom: 96
    };

    let dims = {
        width: 320,
        height: 320
    };

    function set_of_property(arr, property) {
        return d3.set(arr.flatMap(x => x[property]).filter(x => typeof x === 'string'));
    }
    
    d3.json("data/proteins.json").then(function(data) {

        for (let key in data) {
            data[key].fig = key;
        }

        let sliced_arr = Object.values(data).sort((a, b) => d3.ascending(a.fig, b.fig)).slice(0, 50);
        let categories = set_of_property(sliced_arr, 'category');
        let subcategories = set_of_property(sliced_arr, 'subcategory');
        let subsystems = set_of_property(sliced_arr, 'subsystem');
        let roles = set_of_property(sliced_arr, 'role');

        let genes = set_of_property(sliced_arr, 'contig_ids');
        let figfams = set_of_property(sliced_arr, 'fig');

        let label_font_size = 12
        let necessary_height = figfams.size() * label_font_size
        let necessary_width = genes.size() * label_font_size

        dims.height = necessary_height
        dims.width = necessary_width

        margins.left = figfams.values().reduce((a, c) => (c.length > a.length) ? c : a).length * (label_font_size*0.65);
        let start_x = 0;
        console.log("got start_x: " + start_x);

        let svg = d3.select("#data-graph")
            .append("svg")
                .attr("width", dims.width + margins.left + margins.right)
                .attr("height", dims.height + margins.top + margins.bottom)
            .append("g")
                .attr("transform", "translate(" + margins.left + "," + margins.top + ")");

        let genes_sorted = genes.values().sort(d3.descending)
        let x = d3.scaleBand()
            .range([0, dims.width])
            .domain(genes_sorted)
            .padding(0.05); /* is this good? */

        svg.append("g")
            .style("font-size", label_font_size)
            .attr("transform", "translate(" + start_x + "," + dims.height + ")")
            .call(d3.axisBottom(x).tickSize(0))
            .selectAll("text")
                .attr("transform", "rotate(90) translate(5, -6)") /* necessary for text to not overlap with edge of axis line */
                .style("text-anchor", "start")
                .attr("class", "x-axis")
            .select(".domain").remove();
        
        let figfams_sorted = figfams.values().sort(d3.descending)
        let y = d3.scaleBand()
            .range([dims.height, 0])
            .domain(figfams_sorted)
            .padding(0.05);
        
        svg.append("g")
            .style("font-size", label_font_size)
            .attr("transform", "translate(" + start_x + ", 0)")
            .call(d3.axisLeft(y).tickSize(0))
            .selectAll("text")
                .attr("class", "y-axis")
            .select(".domain").remove();

        // create a tooltip
        let tooltip = d3.select("#data-graph")
            .append("div")
            .style("opacity", 0)
            .attr("class", "tooltip")
            .style("background-color", "white")
            .style("border", "solid")
            .style("border-width", "2px")
            .style("border-radius", "5px")
            .style("padding", "5px");

        // Three function that change the tooltip when user hover / move / leave a cell
        let mouseover = function (d) {
            tooltip
                .style("opacity", 1)
            d3.select(this)
                .style("stroke", "black")
                .style("opacity", 1)
        }
        
        let mousemove = function (d) {
            tooltip
                .html("The exact value of<br>this cell is: " + d.fig + ":" + d.contig_id)
                .style("left", (d3.mouse(this)[0] + 70) + "px")
                .style("top", (d3.mouse(this)[1]) + "px")
        }

        let mouseleave = function (d) {
            tooltip
                .style("opacity", 0)
            d3.select(this)
                .style("stroke", "none")
                .style("opacity", 0.8)
        }

        let protein_belongs_to_genome = function (p, contig_id) {
            return p.contig_ids.includes(contig_id);
        }

        let deduplicate_data = function(slice) {

            let augmented_data = slice.flatMap(function(e) {
                return e.contig_ids.map(function (c) {
                    return {
                        fig: e.fig, contig_id: c
                    };
                });
            });
    
            let deduplicated_data = {};
            augmented_data.forEach(function (e) {
                if (e.fig in deduplicated_data) {
                    deduplicated_data[e.fig].contig_ids.add(e.contig_id);
                } else {
                    deduplicated_data[e.fig] = {
                        fig: e.fig,
                        contig_ids : new Set([e.contig_id])
                    };
                }
            });
    
            return Object.values(deduplicated_data).flatMap(function(e) {
                return Array.from(e.contig_ids.values()).map(function (c) {
                    return {
                        fig: e.fig, contig_id: c
                    };
                });
            });
            
        }

        let plot_data = deduplicate_data(sliced_arr);

        console.log("number of datapoints: " + plot_data.length);
        console.log("necessary height: " + necessary_height);

        // add the squares
        svg.selectAll()
            .data(plot_data, function (d) { return d.fig; })
            .enter()
            .append("rect")
                .attr("x", function (d) { return x(d.contig_id) })
                .attr("y", function (d) { return y(d.fig) })
                .attr("rx", 4)
                .attr("ry", 4)
                .attr("width", x.bandwidth())
                .attr("height", y.bandwidth())
                .style("fill", function (d) { return 1; })
                .style("stroke-width", 4)
                .style("stroke", "none")
                .style("opacity", 0.8)
            .on("mouseover", mouseover)
            .on("mousemove", mousemove)
            .on("mouseleave", mouseleave);

        console.log("number of genes: " + genes.size());
        console.log("number of figfams: " + figfams.size());
        console.log("number of categories: " + categories.size());
        console.log("number of subcategories: " + subcategories.size());
        console.log("number of subsystems: " + subsystems.size());
        console.log("number of roles: " + roles.size());

    });

});
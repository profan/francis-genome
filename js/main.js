"use strict";

document.addEventListener("DOMContentLoaded", function(event) {

    let label_font_size = 12;

    let margins = {
        top: 16, left: 128, right: 128, bottom: 96
    };

    let dims = {
        width: 320,
        height: 320
    };
    
    let active_filters = {
        categories : d3.set(),
        subcategories : d3.set(),
        subsystems : d3.set(),
        roles : d3.set()
    };

    function set_of_property(arr, property) {
        return d3.set(arr.flatMap(x => x[property]).filter(x => typeof x === 'string'));
    }

    let on_mouse_over = function (d) {
        // tooltip
        //     .style("opacity", 1)
        d3.select(this)
            .style("stroke", "black")
            .style("opacity", 1)
    }
    
    let on_mouse_move = function (d) {
        /*
        tooltip
            .html("The exact value of<br>this cell is: " + d.fig + ":" + d.contig_id)
            .style("left", (d3.mouse(this)[0] + 70) + "px")
            .style("top", (d3.mouse(this)[1]) + "px")
            */
    }

    let on_mouse_leave = function (d) {
        // tooltip
        //    .style("opacity", 0)
        d3.select(this)
            .style("stroke", "none")
            .style("opacity", 0.8)
    }

    let protein_belongs_to_genome = function (p, contig_id) {
        return p.contig_ids.includes(contig_id);
    }

    let deduplicate_data = function(slice) {

        let augmented_data = slice.flatMap(function (e) {
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

        return Object.values(deduplicated_data).flatMap(function (e) {
            return Array.from(e.contig_ids.values()).map(function (c) {
                return {
                    fig: e.fig, contig_id: c
                };
            });
        });
        
    }

    function recalculate_dimensions(xs, ys) {

        let necessary_height = ys.size() * label_font_size;
        let necessary_width = xs.size() * label_font_size;

        dims.height = necessary_height;
        dims.width = necessary_width;

    }

    function canvas_render(x, y, array) {

        let cvs = document.getElementById('canvas');
        let ctx = cvs.getContext('2d');

        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.fillStyle = 'rgba(0, 0, 0, 0.7)'

        array.forEach(function(e) {

            let c_x = x(e.contig_id);
            let c_y = y(e.fig);

            ctx.fillRect(c_x+1, c_y+1, 10, 10);

        });

    }

    function create_from_data(array) {

        let genes = set_of_property(array, 'contig_ids');
        let figfams = set_of_property(array, 'fig');
        recalculate_dimensions(genes, figfams);

        margins.left = figfams.values().reduce((a, c) => (c.length > a.length) ? c : a).length * (label_font_size*0.65);
                
        let custom = d3.select("#data-graph").append("custom")
            .style("position", "absolute")
            .style("margin-left", margins.left+"px")
            .style("margin-top", margins.top+"px")
            .attr("id", "custom");
        
        let cvs = document.createElement("canvas");
        cvs.width = dims.width + margins.left + margins.right;
        cvs.height = dims.height + margins.top + margins.bottom;
        cvs.id = "canvas";

        document.getElementById("custom").append(cvs);

        let svg = d3.select("#data-graph")
            .append("svg")
                .attr("width", dims.width + margins.left + margins.right)
                .attr("height", dims.height + margins.top + margins.bottom)
            .append("g")
                .attr("transform", "translate(" + margins.left + "," + margins.top + ")");

        let genes_sorted = genes.values().sort(d3.descending);
        let x = d3.scaleBand()
            .range([0, dims.width])
            .domain(genes_sorted)
            .padding(0.05); /* is this good? */

        svg.append("g")
            .attr("class", "x axis")
            .style("font-size", label_font_size)
            .attr("transform", "translate(0," + dims.height + ")")
            .call(d3.axisBottom(x).tickSize(0))
            .selectAll("text")
                .attr("transform", "rotate(90) translate(5, -6)") /* necessary for text to not overlap with edge of axis line */
                .style("text-anchor", "start")
                .attr("class", "x-axis")
            .select(".domain").remove();
        
        let figfams_sorted = figfams.values().sort(d3.descending);
        let y = d3.scaleBand()
            .range([dims.height, 0])
            .domain(figfams_sorted)
            .padding(0.05);
        
        svg.append("g")
            .attr("class", "y axis")
            .style("font-size", label_font_size)
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

        let plot_data = deduplicate_data(array);

        console.log("number of genes: " + genes.size());
        console.log("number of figfams: " + figfams.size());
        console.log("number of datapoints: " + plot_data.length);
        console.log("necessary height: " + dims.height);

        /* canvas stuff here? */
        canvas_render(x, y, plot_data);

        return [svg, x, y];

    }

    function update_from_data(svg, x, y, array) {

        let genes = set_of_property(array, 'contig_ids');
        let figfams = set_of_property(array, 'fig');
        recalculate_dimensions(genes, figfams);

        // update canvas size
        let canvas = document.getElementById('canvas');
        canvas.width = dims.width;
        canvas.height = dims.height;

        // update svg size
        let top_level_svg = d3.select("#data-graph").select("svg");
        top_level_svg.attr("width", dims.width + margins.left + margins.right)
                .attr("height", dims.height + margins.top + margins.bottom)
            .select("g")
                .attr("transform", "translate(" + margins.left + "," + margins.top + ")");

        // update axes

        /*
        let genes_sorted = genes.values().sort(d3.descending);
        x.domain(genes_sorted)
            .range([0, dims.width]);
        */

        svg.select(".x")
            .attr("transform", "translate(0," + dims.height + ")")
            .transition().duration(100)
            .call(d3.axisBottom(x));

        let figfams_sorted = figfams.values().sort(d3.descending);
        y.domain(figfams_sorted)
            .range([dims.height, 0]);
        
        svg.select(".y")
            .transition().duration(100)
            .call(d3.axisLeft(y));

        let plot_data = deduplicate_data(array);

        /* canvas stuff here? */
        canvas_render(x, y, plot_data);

        return plot_data.length;

    }

    function update_ranges(new_start, new_end, num_entries) {
        d3.select("#data-range-start").text(new_start);
        d3.select("#data-range-end").text(new_end);
        d3.select("#data-total-entries").text(num_entries);
    }
    
    d3.json("data/proteins.json").then(function(data) {

        for (let key in data) {
            data[key].fig = key;
        }

        let initial_start_offset = +d3.select("#data-range-start-input").property("value");
        let initial_end_offset = +d3.select("#data-range-end-input").property("value");
        let initial_offset = +d3.select("#data-range-offset-input").property("value");
        
        let all_data_arr = Object.values(data).sort((a, b) => d3.ascending(a.fig, b.fig));
        all_data_arr.map((e) => ({fig: e.fig, contig_id: e.contig_id}));

        let sliced_arr = all_data_arr.slice(initial_start_offset + initial_offset, initial_end_offset + initial_offset);

        let categories = set_of_property(all_data_arr, 'category');
        let subcategories = set_of_property(all_data_arr, 'subcategory');
        let subsystems = set_of_property(all_data_arr, 'subsystem');
        let roles = set_of_property(all_data_arr, 'role');

        let [svg, x, y] = create_from_data(sliced_arr);
        update_ranges(initial_start_offset + initial_offset, initial_end_offset + initial_offset, sliced_arr.length);

        // populate filters...
        let data_category = d3.select("#data-category")
        let data_subcategory = d3.select("#data-subcategory");
        let data_subsystem = d3.select("#data-subsystem");
        let data_role = d3.select("#data-role");

        categories.values().sort(d3.ascending).forEach(function(c) {
            data_category.append("li")
                .append("button")
                    .text(c);
        });

        subcategories.values().sort(d3.ascending).forEach(function(c) {
            data_subcategory.append("li")
                .append("button")
                    .text(c);
        });

        subsystems.values().sort(d3.ascending).forEach(function(s) {
            data_subsystem.append("li")
                .append("button")
                    .text(s);
        });

        roles.values().sort(d3.ascending).forEach(function(r) {
            data_role.append("li")
                .append("button")
                    .on("click", function(e) { 
                        if (active_filters.has(r)) {
                            active_filters.roles.remove(r);
                        } else {
                            active_filters.roles.add(r);
                        }
                    })
                    .text(r);
        });

        d3.select("#data-range-offset-input").on("input", function() {

            if (this.value < 0) { this.value = 0; }

            let start_input = d3.select("#data-range-start-input");
            let cur_start = +start_input.property("value");

            let end_input = d3.select("#data-range-end-input");
            let cur_end = +end_input.property("value");

            let start_offset = cur_start + (+this.value);
            let end_offset = cur_end + (+this.value);
            let fresh_slice = all_data_arr.slice(start_offset, end_offset);
            let num_entries = update_from_data(svg, x, y, fresh_slice);

            update_ranges(start_offset, end_offset, num_entries);

        });

        d3.select("#data-range-start-input").on("input", function() {

            if (this.value < 0) { this.value = 0; }

            let start_offset = +this.value;
            let end_offset = d3.select("#data-range-end-input").property("value");
            if (start_offset > end_offset) {
                d3.select("#data-range-start-input").property("value", end_offset);
            }

            let fresh_slice = all_data_arr.slice(start_offset, end_offset);
            let num_entries = update_from_data(svg, x, y, fresh_slice);

            update_ranges(start_offset, end_offset, num_entries);

        });

        d3.select("#data-range-end-input").on("input", function() {

            if (this.value < 0) { this.value = 0; }

            let start_offset = d3.select("#data-range-start-input").property("value");
            let end_offset = +this.value;
            if (end_offset < start_offset) {
                d3.select("#data-range-end-input").property("value", start_offset);
            }
            
            let fresh_slice = all_data_arr.slice(start_offset, end_offset);
            let num_entries = update_from_data(svg, x, y, fresh_slice);

            update_ranges(start_offset, end_offset, num_entries);

        });
        
        const filters = [
            {searchbox: "#data-category-search", container: "#data-category"},
            {searchbox: "#data-subcategory-search", container: "#data-subcategory"},
            {searchbox: "#data-subsystem-search", container: "#data-subsystem"},
            {searchbox: "#data-role-search", container: "#data-role"}
        ];

        for (let criteria of filters) {
            d3.select(criteria.searchbox).on("input", function() {
                let search_value = this.value;
                d3.select(criteria.container).selectAll("li button").each(function(_, i) {
                    let e = this;
                    let new_value = e.innerText.search(search_value) !== -1;
                    e.parentElement.style.display = new_value ? "block" : "none";
                });
            });
        }

        console.log("number of categories: " + categories.size());
        console.log("number of subcategories: " + subcategories.size());
        console.log("number of subsystems: " + subsystems.size());
        console.log("number of roles: " + roles.size());

    });

});
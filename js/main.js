"use strict";

document.addEventListener("DOMContentLoaded", function(event) {

    let axis_swapped = false;
    let should_filter_the_filters = false;
    let label_font_size = 12;

    let margins = {
        top: 16, left: 128, right: 128, bottom: 96
    };

    let dims = {
        width: 320,
        height: 320
    };
    
    let active_filters = {
        category : d3.set(),
        subcategory : d3.set(),
        subsystem : d3.set(),
        role : d3.set()
    };

    /* maps filter names to metadata */
    let active_filter_properties = {
        colours : d3.map()
    };

    function set_of_property(arr, property) {
        return d3.set(arr.flatMap(x => x[property]).filter(x => typeof x === 'string'));
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

    /* match by most specific first, if a role matches but also a subsystem, role takes priority */
    let protein_to_colour = function(all_data, fig) {

        let category = all_data[fig].category;
        let subcategory = all_data[fig].subcategory;
        let subsystem = all_data[fig].subsystem;
        let role = all_data[fig].role;

        let has_category_colour = active_filter_properties.colours.has(category);
        let has_subcategory_colour = active_filter_properties.colours.has(subcategory);
        let has_subsystem_colour = active_filter_properties.colours.has(subsystem);
        let has_role_colour = active_filter_properties.colours.has(role);

        if (has_role_colour) {
            return active_filter_properties.colours.get(role);
        }

        if (has_subsystem_colour) {
            return active_filter_properties.colours.get(subsystem);
        }

        if (has_subcategory_colour) {
            return active_filter_properties.colours.get(subcategory);
        }

        if (has_category_colour) {
            return active_filter_properties.colours.get(category);
        }

        return false;

    }

    let clamp_offset_to_range = function(offset) {

        let cur_start_range = +d3.select("#data-range-start-input").property("value");
        let cur_end_range = +d3.select("#data-range-end-input").property("value");
        let cur_offset = +d3.select("#data-range-offset-input").property("value");

        let filtered_entries = +d3.select("#data-filtered-entries").text();
        let total_entries = +d3.select("#data-total-entries").text();

        let start_offset = cur_start_range + offset;
        let end_offset = cur_end_range + offset;
        let diff = end_offset - start_offset;

        if (filtered_entries === total_entries) return cur_offset;

        return (start_offset < 0) ? 0 : ((end_offset > total_entries) ? Math.max(0, total_entries - diff) : offset);

    }

    function canvas_render(x, y, array, all_data) {

        let cvs = document.getElementById('canvas');
        let ctx = cvs.getContext('2d');

        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.fillStyle = 'rgba(0, 0, 0, 0.7)'

        array.forEach(function(e) {

            let colour = protein_to_colour(all_data, e.fig);
            ctx.fillStyle = (colour !== false) ? colour : 'rgba(0, 0, 0, 0.7)';

            let c_x = axis_swapped ? y(e.contig_id) : x(e.contig_id);
            let c_y = axis_swapped ? x(e.fig) : y(e.fig);

            ctx.fillRect(c_x+1, c_y+1, 10, 10);

        });

    }

    function create_from_data(array, all_data) {

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
        let figfams_sorted = figfams.values().sort(d3.descending);

        let x = d3.scaleBand()
            .range([0, dims.width])
            .domain(axis_swapped ? figfams_sorted : genes_sorted)
            .padding(0.05); /* is this good? */

        let y = d3.scaleBand()
            .range([dims.height, 0])
            .domain(axis_swapped ? genes_sorted : figfams_sorted)
            .padding(0.05);

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
        canvas_render(x, y, plot_data, all_data);

        return [svg, x, y];

    }

    let for_each_filter = function(fn) {

        for (let type in active_filters) {

            let filters = active_filters[type];

            filters.each(function(filter) {
                let ret_val = fn(filter, type);
                if (ret_val === false) return;
            });
            
        }

    }

    function update_with_filters(svg, x, y, array, all_data) {

        let offset = +d3.select("#data-range-offset-input").property("value");
        let start_offset = +d3.select("#data-range-start-input").property("value") + offset;
        let end_offset = +d3.select("#data-range-end-input").property("value") + offset;
        
        let filtered_data = array.filter(function (e) {

            let all_filters_empty = true;
            let didnt_match_one = false;

            for (let type in active_filters) {

                let filters = active_filters[type];

                filters.each(function(filter) {
                    all_filters_empty = false;
                    if (filter != e[type]) {
                        didnt_match_one = true;
                    }
                });
                
            }

            /* in case we had no filters, return all the things */
            return all_filters_empty || (!didnt_match_one);

        });

        let fresh_slice = filtered_data.slice(start_offset, end_offset);
        // let total_num_entries = deduplicate_data(filtered_data).length;

        let num_entries = update_from_data(svg, x, y, fresh_slice, all_data);
        update_ranges(start_offset, end_offset, fresh_slice.length, filtered_data.length);

        return fresh_slice.length;

    }

    function update_from_data(svg, x, y, array, all_data) {

        let genes = set_of_property(array, 'contig_ids');
        let figfams = set_of_property(array, 'fig');
        recalculate_dimensions(axis_swapped ? figfams : genes, axis_swapped ? genes : figfams);

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

        let genes_sorted = genes.values().sort(d3.descending);
        let figfams_sorted = figfams.values().sort(d3.descending);

        x.domain(axis_swapped ? figfams_sorted : genes_sorted)
            .range([0, dims.width]);

        y.domain(axis_swapped ? genes_sorted : figfams_sorted)
            .range([dims.height, 0]);

        let on_click_fig = function(e) {

            let text = d3.select(this).select("text").text();
            let category = all_data[text].category;
            let subcategory = all_data[text].subcategory;
            let subsystem = all_data[text].subsystem;
            let role = all_data[text].role;

            let is_hidden = d3.select("#data-fig-info").style("visibility") == "hidden";
            if (is_hidden) {
                d3.select("#data-fig-info").style("visibility", "visible");
            }

            d3.select("#data-fig-info-id").text(text);
            d3.select("#data-fig-info-category").text(category);
            d3.select("#data-fig-info-subcategory").text(subcategory);
            d3.select("#data-fig-info-subsystem").text(subsystem);
            d3.select("#data-fig-info-role").text(role);

            console.log("KLAK");
            
        }

        svg.select(".x")
            .attr("transform", "translate(0," + dims.height + ")")
            .transition().duration(100)
            .call(d3.axisBottom(x).tickSize(0))
                .selectAll("text")
                .attr("transform", "rotate(90) translate(5, -6)") /* necessary for text to not overlap with edge of axis line */
                .style("text-anchor", "start")
                .attr("class", "x-axis")
            .select(".domain").remove();
        
        svg.select(".y")
            .transition().duration(100)
            .call(d3.axisLeft(y).tickSize(0))
                .selectAll("text")
                .attr("class", "y-axis")
            .select(".domain").remove();

        svg.selectAll("g .y.axis .tick")
            .on("click", on_click_fig);

        let plot_data = deduplicate_data(array);

        /* canvas stuff here? */
        canvas_render(x, y, plot_data, all_data);

        return plot_data.length;

    }

    function update_ranges(new_start, new_end, num_entries, total_num_entries) {
        d3.select("#data-range-start").text(new_start);
        d3.select("#data-range-end").text(new_end);
        d3.select("#data-filtered-entries").text(num_entries);
        d3.select("#data-total-entries").text(total_num_entries);
    }

    let filter_the_filters = function(do_filter, category_mapping) {

        let any_filters = false;

        let matches_any_mapping = function(value, target, mappings) {

            let cur_item = mappings[value];
            while (cur_item != target) {
                let new_item = mappings[cur_item];
                if (!new_item || mappings[new_item] == mappings[cur_item]) {
                    break;
                } else {
                    cur_item = new_item;
                }
            }

            return cur_item;

        }

        let show_matching_mappings = function(_, i) {

            let self = this;
            let matched_any = false;

            for_each_filter(function(filter_name, filter_type) {

                any_filters = true; /* HACK */
                // if (matched_any) return; /* ALREADY MATCHED, behaviour now matches other search.. */

                let found_match = matches_any_mapping(self.innerText, filter_name, category_mapping);
                let has_match = (found_match == filter_name);

                self.style.display = has_match ? "inline-block" : "none";
                if (has_match) {
                    matched_any = true;
                    return false;
                }

            });

        }

        if (do_filter) {

            d3.select("#data-category").selectAll("li button").each(show_matching_mappings);

            d3.select("#data-subcategory").selectAll("li button").each(show_matching_mappings);

            d3.select("#data-subsystem").selectAll("li button").each(show_matching_mappings);

            d3.select("#data-role").selectAll("li button").each(show_matching_mappings);

        }

        if (!any_filters) {

            d3.select("#data-category").selectAll("li button").each(function(_, i) {
                this.style.display = "inline-block";
            });

            d3.select("#data-subcategory").selectAll("li button").each(function(_, i) {
                this.style.display = "inline-block";
            });

            d3.select("#data-subsystem").selectAll("li button").each(function(_, i) {
                this.style.display = "inline-block";
            });

            d3.select("#data-role").selectAll("li button").each(function(_, i) {
                this.style.display = "inline-block";
            });

        }

    }

    Promise.all([
        d3.json("deps/colours.json"),
        d3.json("data/categories.json"),
        d3.json("data/proteins.json")
    ]).then(function([colour_data, category_data, protein_data]) {

        let colours = Object.values(colour_data);
        let category_mapping = category_data;
        let data = protein_data;
        
        for (let key in data) {
            data[key].fig = key;
        }

        let original_data = data;

        let initial_start_offset = +d3.select("#data-range-start-input").property("value");
        let initial_end_offset = +d3.select("#data-range-end-input").property("value");
        let initial_offset = +d3.select("#data-range-offset-input").property("value");
        
        let all_data_arr = Object.values(data).sort((a, b) => d3.ascending(a.fig, b.fig));
        let original_array = all_data_arr;

        let sliced_arr = all_data_arr.slice(initial_start_offset + initial_offset, initial_end_offset + initial_offset);

        let categories = set_of_property(all_data_arr, 'category');
        let subcategories = set_of_property(all_data_arr, 'subcategory');
        let subsystems = set_of_property(all_data_arr, 'subsystem');
        let roles = set_of_property(all_data_arr, 'role');

        let [svg, x, y] = create_from_data(sliced_arr, data);
        update_with_filters(svg, x, y, all_data_arr, data); /* HACK */

        // populate filters...
        let data_category = d3.select("#data-category");
        let data_subcategory = d3.select("#data-subcategory");
        let data_subsystem = d3.select("#data-subsystem");
        let data_role = d3.select("#data-role");

        let data_category_searchbox = d3.select("#data-category-search");
        let data_subcategory_searchbox = d3.select("#data-subcategory-search");
        let data_subsystem_searchbox = d3.select("#data-subsystem-search");
        let data_role_searchbox = d3.select("#data-role-search");
        
        let data_active_filters = d3.select("#data-active-filters");

        let on_new_scroll_delta = function(delta) {
            let element = d3.select("#data-range-offset-input");
            let cur_offset = +element.property("value");
            element.property("value", clamp_offset_to_range(cur_offset + delta));
            let bound_func = on_range_offset_input_changed.bind(element);
            bound_func();
        }

        /* query related functions */
        let protein_belongs_to_genome = function (p, contig_id) {
            return p.contig_ids.includes(contig_id);
        }

        let and_func = function(...args) {
            let cur_protein = this.cur_protein;
            return args.every((current) => protein_belongs_to_genome(cur_protein, current));
        }

        let or_func = function(...args) {
            let cur_protein = this.cur_protein;
            return args.some((current) =>  protein_belongs_to_genome(cur_protein, current));
        }

        let sub_func = function(a, b) {
            let cur_protein = this.cur_protein;
            return protein_belongs_to_genome(cur_protein, a) && !protein_belongs_to_genome(cur_protein, b);
        }

        let add_func = function(a, b) {
            let cur_protein = this.cur_protein;
            return protein_belongs_to_genome(cur_protein, a) && protein_belongs_to_genome(cur_protein, b);
        }

        d3.select("#data-query-reset").on("click", function() {

            all_data_arr = original_array;
            update_with_filters(svg, x, y, all_data_arr, data); /* HACK */

        });

        d3.select("#data-query-submit").on("click", function() {

            let query_text = d3.select("#data-query").property("value");
            let query_context = {
                cur_protein : null
            }
            
            let and = and_func.bind(query_context);
            let or = or_func.bind(query_context);
            let sub = sub_func.bind(query_context);
            let add = add_func.bind(query_context);

            all_data_arr = original_array.filter(function(p) {
                query_context.cur_protein = p;
                let result = eval(query_text);
                if (typeof(result) === 'boolean') {
                    return result;
                } else {
                    return true;
                }
            });

            update_with_filters(svg, x, y, all_data_arr, data); /* HACK */

        });

        /* filter related functions */

        const filters = [
            {
                set: categories,
                prefix: "category",
                container: data_category,
                searchbox: data_category_searchbox,
                active_filters: active_filters.category
            },
            {
                set: subcategories,
                prefix: "subcategory",
                container: data_subcategory,
                searchbox: data_subcategory_searchbox,
                active_filters: active_filters.subcategory
            },
            {
                set: subsystems,
                prefix: "subsystem",
                container: data_subsystem,
                searchbox: data_subsystem_searchbox,
                active_filters: active_filters.subsystem
            },
            {
                set: roles,
                prefix: "role",
                container: data_role,
                searchbox: data_role_searchbox,
                active_filters: active_filters.role
            }
        ];
        
        for (let cur of filters) {

            let i = 0;
            cur.set.values().sort(d3.ascending).forEach(function(v) {
                cur.container.append("li")
                    .attr("id", cur.prefix + i)
                    .style("display", "block")
                .append("button")
                    .attr("which", i)
                    .attr("kind", cur.prefix)
                    .attr("class", "button")
                    .on("click", function(e) { 

                        if (cur.active_filters.has(v)) {
                            let self = this;
                            d3.select(this).remove();
                            d3.select("#" + cur.prefix + self.getAttribute("which")).append(() => self); /* HACK */
                            /* TODO: figure out if this is a good idea, maybe they should stay? */
                            active_filter_properties.colours.remove(this.innerText);
                            cur.active_filters.remove(v);
                        } else {
                            let self = this;
                            d3.select(this).remove();
                            if (this.hasAttribute("colour")) {
                                active_filter_properties.colours.set(this.innerText, this.getAttribute("colour"));
                            }
                            d3.select("#data-active-filters").append(() => self);
                            cur.active_filters.add(v);
                        }

                        filter_the_filters(should_filter_the_filters, category_mapping);
                        update_with_filters(svg, x, y, all_data_arr, data); /* HACK */
                        on_new_scroll_delta(0); /* HACK DELUXE */

                    })
                    .text(v);
                i += 1;
            });

        }

        let on_range_offset_input_changed = function(v) {

            if (this.value < 0) { this.value = 0; }

            let start_input = d3.select("#data-range-start-input");
            let cur_start = +start_input.property("value");

            let end_input = d3.select("#data-range-end-input");
            let cur_end = +end_input.property("value");

            let start_offset = cur_start + (+this.value);
            let end_offset = cur_end + (+this.value);
            // let fresh_slice = all_data_arr.slice(start_offset, end_offset);
            let num_entries = update_with_filters(svg, x, y, all_data_arr, data);

        }

        d3.select("#data-range-offset-input").on("input", on_range_offset_input_changed);

        let on_range_start_input_changed = function(v) {

            if (this.value < 0) { this.value = 0; }

            let start_offset = +this.value;
            let end_offset = d3.select("#data-range-end-input").property("value");
            if (start_offset > end_offset) {
                d3.select("#data-range-start-input").property("value", end_offset);
            }

            // let fresh_slice = all_data_arr.slice(start_offset, end_offset);
            let num_entries = update_with_filters(svg, x, y, all_data_arr, data);

        }

        d3.select("#data-range-start-input").on("input", on_range_start_input_changed);

        let on_range_end_input_changed = function(v) {

            if (this.value < 0) { this.value = 0; }

            let start_offset = d3.select("#data-range-start-input").property("value");
            let end_offset = +this.value;
            if (end_offset < start_offset) {
                d3.select("#data-range-end-input").property("value", start_offset);
            }
            
            // let fresh_slice = all_data_arr.slice(start_offset, end_offset);
            let num_entries = update_with_filters(svg, x, y, all_data_arr, data);

        }

        d3.select("#data-range-end-input").on("input", on_range_end_input_changed);

        d3.select("#data-range-reset").on("click", function(e) {

            d3.select("#data-range-offset-input").property("value", 0);
            d3.select("#data-range-start-input").property("value", 0);
            d3.select("#data-range-end-input").property("value", 25);
            
            let num_entries = update_with_filters(svg, x, y, all_data_arr, data);

        });

        d3.select("#data-filter-the-filters").on("click", function() {
            should_filter_the_filters = this.checked;
            filter_the_filters(should_filter_the_filters, category_mapping);
        });

        /*
        d3.select("#data-swap-axes").on("click", function(e) {

            axis_swapped = !axis_swapped;

            let num_entries = update_with_filters(svg, y, x, all_data_arr, data);

        });
        */

        let get_random_colour = function() {
            let random_index = Math.floor(Math.random() * colours.length);
            return colours[random_index];
        }

        d3.select("#data-assign-random-colours").on("click", function(e) {

            d3.select("#data-active-filters").selectAll("button").each(function(_, i) {
                let filter_name = this.innerText;
                active_filter_properties.colours.set(filter_name, get_random_colour());
                let our_new_colour = active_filter_properties.colours.get(filter_name);
                d3.select(this).style("border", "8px solid " + our_new_colour);
                d3.select(this).attr("colour", our_new_colour);
            });

            update_with_filters(svg, x, y, all_data_arr, data); /* tiny hack */

        });
        
        let mouse_inside_graph = false;
        d3.select("#data-graph").on("mouseenter", function() {
            mouse_inside_graph = true;
        });

        d3.select("#data-graph").on("mouseleave", function() {
            mouse_inside_graph = false;
        });

        window.addEventListener('wheel', function (e) {
            let scroll_increment = 5;
            /* also check if we actually need scrolling atm */
            if (mouse_inside_graph) {
                on_new_scroll_delta((e.deltaY / e.deltaY) * Math.sign(e.deltaY) * scroll_increment);
                e.preventDefault();
            }
        }, {passive: false}); /* fix for chrome */

        for (let criteria of filters) {
            criteria.searchbox.on("input", function() {
                let search_value = this.value;
                criteria.container.selectAll("li button").each(function(_, i) {
                    let e = this;
                    let search_rgx = new RegExp(search_value, 'i');
                    let new_value = e.innerText.search(search_rgx) !== -1;
                    e.parentElement.style.display = new_value ? "inline-block" : "none";
                });
            });
        }

        console.log("number of categories: " + categories.size());
        console.log("number of subcategories: " + subcategories.size());
        console.log("number of subsystems: " + subsystems.size());
        console.log("number of roles: " + roles.size());

        console.log(data["FIG00000075"]);

    });

});
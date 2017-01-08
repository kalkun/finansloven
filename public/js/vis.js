function init(expenses, year) {

    var margin = {
            top: 280,
            right: 400,
            bottom: 280,
            left: 400
        },
        radius = Math.min(margin.top, margin.right, margin.bottom, margin.left) - 100;

    var hue = d3.scale.category10();

    var luminance = d3.scale.sqrt()
        .domain([0, 1e6])
        .clamp(true)
        .range([90, 20]);

    var tip = d3.tip().attr("class", "d3-tip").html(function(d) {
        return getMeta(d)[0].value;
    })
    .direction('e');

    var svg = d3.select("body").select("svg#pie")
        .attr("width", margin.left + margin.right - 150)
        .attr("height", margin.top + margin.bottom)
        .call(tip);

    var zoomscale = d3.scale.linear().range([0.5, 1.5]).domain([-100, 100])

    var piegroup = svg.append("g")
        .attr("class", "pie")
        .attr("transform", "translate(" + margin.left + "," + margin.top + ")");

    var centergroup = svg.append("g")
        .attr("class", "centerpie")
        .attr("transform", "translate(" + margin.left + "," + margin.top + ")");

    var partition = d3.layout.partition()
        .sort(function(a, b) {
            return d3.ascending(a.name, b.name);
        })
        .size([2 * Math.PI, radius]);

    var arc = d3.svg.arc()
        .startAngle(function(d) {
            return d.x;
        })
        .endAngle(function(d) {
            return d.x + d.dx;
        })
        .padAngle(.01)
        .padRadius(radius / 3)
        .innerRadius(function(d) {
            return radius / 3 * d.depth;
        })
        .outerRadius(function(d) {
            return radius / 3 * (d.depth + 1) - 1;
        });


    function onData(aktiver) {
        root = aktiver;
        // Compute the initial layout on the entire tree to sum sizes.
        // Also compute the full name and fill color for each node,
        // and stash the children so they can be restored as we descend.
        partition
            .value(function(d) {
                return d.size;
            })
            .nodes(root)
            .forEach(function(d) {
                d._children = d.children;
                d.sum = d.value;
                d.key = key(d);
                d.fill = fill(d);
            });

        // Now redefine the value function to use the previously-computed sum.
        partition
            .children(function(d, depth) {
                if (currentFocus.key == root.key) return depth < 1 ? d._children : null;
                return depth < 3 ? d._children : null;
            })
            .value(function(d) {
                return d.sum;
            });

        setFocus(root);

        var center = piegroup.append("circle")
            .attr("r", radius / 3)
            .on("click", zoomOut);

        center.append("title")
            .text("zoom out");

        var x = d3.scale.linear()
            .range([0, 2 * Math.PI]);

        var y = d3.scale.linear()
            .domain([0, margin.right])
            .range([0, radius]);

        var path = piegroup.selectAll("path")
            .data(partition.nodes(root).slice(1), function(d) {
                return d.key
            })
            .enter().append("path")
            .attr("d", arc)
            .style("fill", function(d) {
                return d.fill;
            })
            .each(function(d) {
                this._current = updateArc(d);
            })
            .on("click", zoomIn)
            .on("mouseover", mouseover)
            .on("mouseout", mouseout)

        mouseover(root);


        piegroup
            .selectAll("path")
            .data(partition.nodes(root)
                .filter(function(d) {
                    return d.depth == 1;
                }),
                function(d) {
                    return d.key
                })
            .enter()
            .append("path")
            .attr("d", function(d) {
                return "M " + d.x + ((d.dx + d.x) / 2);
            });


        var sum = centergroup.append("text");
        updateText(root);

        var breadcrumbs = d3.select("#breadcrumbs")
            .selectAll("h3");

        updateBreadcrumbs(root);

        function mouseover(d) {
            if (document.documentElement.__transition__) return;
            
            setTable(getMeta(d));           

            d3.selectAll("path").transition().style("opacity", 0.4);
            var descendants = getDescendants(d, true)
            d3.selectAll("path").filter(function(node) {
                return descendants.indexOf(node.key) > -1;
            }).transition().style("opacity", 1);

            // mouseover is also called initially to set the table with
            // meta info about root node, in this case the d3.event is empty.
            if (d3.event) {
                tip.show(d);
            }
        }

        function setTable(data) {
            clearMouseSelection();
            tselect = d3.select("#infobox table")
            var thead = tselect.select("thead").selectAll("tr").data(data.slice(0, 1), function(d) {
                if (!d) return;
                return d.value + d.order;
            });
            var rows = thead.enter().append("tr");
            rows.append("th").text(function(d) {
                return d.value
            });
            rows.append("th");
            var tbody = tselect.select("tbody").selectAll("tr").data(data.slice(1), function(d) {
                if (!d) return;
                return d.value + d.order;
            });
            rows = tbody.enter().append("tr")
            rows.append("td").text(function(d) {
                return d.title
            });
            rows.append("td").text(function(d) {
                return d.value
            });
        }

        function clearMouseSelection() {
            var tselect = d3.select("#infobox table");
            tselect.select("thead").selectAll("tr").data([]).exit().remove();
            tselect.select("tbody").selectAll("tr").data([]).exit().remove();
        }

        function mouseout(d) {
            if (document.documentElement.__transition__) return;
            clearMouseSelection();
            d3.selectAll("path").transition().style("opacity", 1);
            mouseover(currentFocus);
            tip.hide(d);
        }

        function getDescendants(node, onlyNames) {
            var hist = {}
            var descendants = [node.key]

            function _find(d) {
                if (d._children) {
                    for (var i = 0; i < d._children.length; i++) {
                        if (!hist.hasOwnProperty(d._children[i].key)) {
                            hist[d._children[i].key] = "visited";
                            if (onlyNames) {
                                descendants.push(d._children[i].key);
                            } else {
                                descendants.push(d._children[i]);
                            }
                            _find(d._children[i], onlyNames);
                        }
                    }
                }
            }
            _find(node);
            return descendants;
        }

        function updateText(data) {
            sum.data([data])
                .text(function(d) {
                    return d.sum / 10 < 1 ? "< 10 millioner" : d.sum < 1000 ? (Math.round(d.sum / 10) / 100) + " mia" : Math.round(d.sum / 100) /10 + " mia";
                })
                .attr("transform", function(d) {
                    return "translate(-" + this.getBBox().width / 2 + ", 0)";
                })
                .on("click", zoomOut)
                .append("title")
                .text(function(d) {
                    return (Math.round(d.sum) == 0 ? Math.round(d.sum * 100) / 100 : Math.round(d.sum)) + " millioner"
                })

        }

        function getParents(p) {
            ancestors = [p];
            while (p.parent) {
                p = p.parent;
                ancestors.push(p)
            }
            return ancestors;
        }

        function updateBreadcrumbs(p) {
            breadcrumbs = d3.select("#breadcrumbs")
                .selectAll("div")
                .data(getParents(p).reverse(), function(d) {
                    return d.name
                })

            var exiting = breadcrumbs.exit();
            exiting.remove();
            var entering = breadcrumbs
                .enter()
                .append("div")
                .style("display", "inline-block")
                .classed("label label-default", true)
            entering
                .append("h3")
                .text(function(d, i) {
                    return i == 0 ? d.name : d.name
                })
                .on("click", function(d) {
                    if (currentFocus.key == d.key) return;
                    node = currentFocus;
                    while (node.parent.key != d.key) {
                        node = node.parent
                    }
                    zoomOut(node);

                });
        }

        function zoomIn(p) {
            if (!p.children) p.children = p._children;
            if (!p._children) p = p.parent;
            updateBreadcrumbs(p);
            zoom(p, p);
        }

        function zoomOut(p) {
            if (!p || !p.parent) return;
            updateBreadcrumbs(p.parent.name == root.name ? root : p.parent);
            zoom(p.parent, p);
        }

        // Zoom to the specified new root.
        function zoom(root, p) {
            if (document.documentElement.__transition__) return;
            tip.hide();

            if (root.name !== p.name) {
                updateText(root);
                setFocus(root);
                setTable(getMeta(root));
            } else {
                updateText(p);
                setFocus(p);
                setTable(getMeta(p));
            }

            // Rescale outside angles to match the new layout.
            var enterArc,
                exitArc,
                outsideAngle = d3.scale.linear().domain([0, 2 * Math.PI]);

            function insideArc(d) {
                return p.key > d.key ? {
                    depth: d.depth - 1,
                    x: 0,
                    dx: 0
                } : p.key < d.key ? {
                    depth: d.depth - 1,
                    x: 2 * Math.PI,
                    dx: 0
                } : {
                    depth: 0,
                    x: 0,
                    dx: 2 * Math.PI
                };
            }

            function outsideArc(d) {
                return {
                    depth: d.depth + 1,
                    x: outsideAngle(d.x),
                    dx: outsideAngle(d.x + d.dx) - outsideAngle(d.x)
                };
            }

            center.datum(root);

            // When zooming in, arcs enter from the outside and exit to the inside.
            // Entering outside arcs start from the old layout.
            if (root === p) enterArc = outsideArc, exitArc = insideArc, outsideAngle.range([p.x, p.x + p.dx]);

            path = path.data(partition.nodes(root).slice(1), function(d) {
                return d.key;
            });

            // When zooming out, arcs enter from the inside and exit to the outside.
            // Exiting outside arcs transition to the new layout.
            if (root !== p) enterArc = insideArc, exitArc = outsideArc, outsideAngle.range([p.x, p.x + p.dx]);

            d3.transition().duration(750).each(function() {
                path.exit().transition()
                    .style("fill-opacity", function(d) {
                        return d.depth === 1 + (root === p) ? 1 : 0;
                    })
                    .attrTween("d", function(d) {
                        return arcTween.call(this, exitArc(d));
                    })
                    .remove();

                path.enter().append("path")
                    .style("fill-opacity", function(d) {
                        return d.depth === 2 - (root === p) ? 1 : 0;
                    })
                    .style("fill", function(d) {
                        return d.fill;
                    })
                    .on("click", zoomIn)
                    .on("mouseover", mouseover)
                    .on("mouseout", mouseout)
                    .each(function(d) {
                        this._current = enterArc(d);
                    })

                path.transition()
                    .style("fill-opacity", 1)
                    .attrTween("d", function(d) {
                        return arcTween.call(this, updateArc(d));
                    });
            });
        }
        $("#searchbar .form-control").autocomplete({
            source: function(req, res) {
                term = new RegExp($.ui.autocomplete.escapeRegex(req.term), "i");
                hist = {}
                results = []

                var find = function(node) {
                    var index = node.name.toLowerCase().search(term);
                    if (index > -1 && node.name != root.name) {
                        results.splice(index, 0, {
                            "label": node.name,
                            "node": node
                        })
                    } else {
                        if (node._children) {
                            for (var i = 0; i < node._children.length; i++) {
                                if (!hist.hasOwnProperty(node._children[i].name)) {
                                    hist[node._children[i].name] = "visited"
                                    find(node._children[i])
                                }
                            }
                        }
                    }
                }
                find(root);
                res(results.slice(0, 10));
            },
            select: function(event, ui) {
                var node = ui.item.node;
                if (node.name == currentFocus.name) return;
                setFocus(node);
                mouseover(node)
                if (node.depth == 0) {
                    zoomOut(node);
                } else {
                    zoomIn(node);
                }
                $("#searchbar .form-control").data().uiAutocomplete.term = ""
                window.setTimeout(function() {
                    $("#searchbar input").val("");
                }, 40);
            }
        })
    }

    var currentFocus;

    function getMeta(d) {
        data = [{
            "title": "",
            "value": d.name,
            "order": 1
        }, {
            "title": (expenses ? "Bevilget (mia)" : "Indtægter (mia)"),
            "value": (Math.round(d.sum / 100) / 10 > 0 ? (Math.round(d.sum / 100) / 10) : Math.round(d.sum * 10) / 10000) + " milliarder",
            "order": 2
        }, {
            "title": (expenses ? "Bevilget (mio)" : "Indtægter (mio)"),
            "value": d.sum > 10 ? Math.round(d.sum) : Math.round(d.sum * 100) / 100 + " millioner",
            "order": 3
        }, ]
        if (d.parent) {
            data.push({
                "title": "% af " + d.parent.name,
                "value": (Math.round(d.sum / d.parent.sum * 10000) / 100) + "%",
                "order": 4
            })
        }
        if (d.parent && currentFocus && d.parent.name != currentFocus.name && d.name != currentFocus.name) {
            data.push({
                "title": "% af " + currentFocus.name,
                "value": (Math.round(d.sum / currentFocus.sum * 10000) / 100) + "%",
                "order": 5
            })
        }
        if (currentFocus && root.name != currentFocus.name && root.name != d.parent.name) {
            data.push({
                "title": "% af " + root.name,
                "value": (Math.round(d.sum / root.sum * 100000) / 1000 > 0 ? (Math.round(d.sum / root.sum * 100000) / 1000) : "< 0.0005") + "%",
                "order": 6
            })
        }
        return data;

    }
    $(window).on("load", function() {
        $("#searchbar .form-control").focus();
    })

    function setFocus(focus) {
        currentFocus = focus;
        if (document.documentElement.__transition__) return;
        if (currentFocus.key == root.key) {
            var ts = d3.transform(piegroup.attr("transform")).translate
            piegroup.transition().duration(750).attr("transform", function() {
                return "translate(" + ts[0] + "," + ts[1] + ") " +
                    "scale(2,2)";
            });
        } else {
            piegroup.transition().duration(750).attr("transform", "translate(" + margin.left + "," + margin.top + ")");
        }
    }


    function computeTooltip(d) {
        var str = ""
        getMeta(d).forEach(function(item, index) {
            str += (index != 0 ? "\n" : "") + item.title + "   " + item.value;
        })
        return str;
    }

    function checkProperties(obj, properties, value) {
        var previous;
        while (properties.length) {
            current = properties.pop();
            exists = false
            if (current == previous) {
                continue;
            }
            for (var i = 0, len = obj.children.length; i < len; i++) {
                if (obj.children[i] && obj.children[i].name == current) {
                    if (obj.children[i].hasOwnProperty("children")) {
                        obj = obj.children[i];
                        exists = true;
                    } else {
                        return nested;
                    }
                }
            }
            if (!exists) {
                if (!properties.length) {
                    newobj = {
                        name: current,
                        size: value
                    }
                } else {
                    newobj = {
                        name: current,
                        children: []
                    }
                }
                obj.children.push(newobj);
                obj = newobj;
            }
            previous = current;
        }
        return nested;
    }

    var finansloven;

    // if mode is `true` expenses will be fetched
    // otherwise incomes
    function fetchData(mode, year) {
        if (!year) {
            year = "2017";
        }
        d3.tsv("data/finanslov_y" + year + ".tsv", function(err, data) {
            finansloven = data;
            nested = {
                "name": "Finansloven",
                "children": []
            }

            for (var i = 0, len = data.length; i < len; i++) {
                p = data[i]["Paragraf"];
                ha = data[i]["Hovedområde"];
                a = data[i]["Aktivitetsområde"];
                hk = data[i]["Hovedkonto"];
                u = data[i]["Underkonto"];
                s = data[i]["Standardkonto"];
                v = +data[i]["B " + (year-1)];
                if (mode) {
                    if (v > 0) {
                        nested = checkProperties(nested, [s, u, hk, a, ha, p], v);
                    }
                } else {
                    if (v < 0) {
                        nested = checkProperties(nested, [s, u, hk, a, ha, p], Math.abs(v));
                    }
                }
            }
            onData(nested);
        })
    }

    var showingIncome = false;

    (function() {
        fetchData(expenses, year);
        d3.select("#incomevsoutcome")
            .on("click", function() {
                showingIncome = !showingIncome;
                piegroup.selectAll("circle, path").remove();
                fetchData(showingIncome);
            })
    })()


    function key(d) {
        var k = [],
            p = d;
        while (p.depth) k.push(p.name), p = p.parent;
        return k.reverse().join(".");
    }

    function fill(d) {
        var p = d;
        while (p.depth > 1) p = p.parent;
        var c = d3.lab(hue(p.name));
        c.l = luminance(d.sum);
        return c;
    }

    function arcTween(b) {
        var i = d3.interpolate(this._current, b);
        this._current = i(0);
        return function(t) {
            return arc(i(t));
        };
    }

    function updateArc(d) {
        return {
            depth: d.depth,
            x: d.x,
            dx: d.dx
        };
    }

    d3.select(self.frameElement).style("height", margin.top + margin.bottom + "px");
}
expenses = true;
year = 2017;
init(expenses);
$(".title-group button.toggle").on("click", function() {
    expenses = !expenses;
    $(this).html("<h3>" + (expenses ? "Udgifter" : "Indtægter") + "</h3>")
    reset(expenses, year);
});
function reset(expenses, year) {
    $("svg g, #infobox tr, #breadcrumbs div").remove();
    init(expenses, year)
}

$('.dropdown-toggle').click(function(){
  var _this = this;
  var count = 0;    
  var handler = function(e) {
    if (count > 0) {

        if ($(".dropdown-menu").find(e.target).length) {
            // selection made
            $(".dropdown-menu li.active").removeClass("active");
            $(e.target).parent().addClass("active");
            if ($(e.target).text() !== year) {
                year = $(e.target).text();
                $(_this).children("h3").text(year);
                reset(expenses, year);
            }

        }

        $(_this).next(".dropdown-menu").toggle();
        $(document).off("click", handler);

    } else {
        $(_this).next(".dropdown-menu").toggle();
    }
    count += 1;
  }

  if ($(_this).next(".dropdown-menu").css("display") == "none") {
    $(document).on("click", handler);
  }

});
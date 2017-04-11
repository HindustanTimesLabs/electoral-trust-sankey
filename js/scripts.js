var opacity = {mouseover: 1, mouseout: .4}

window.onload = draw;
$(window).smartresize(draw);

function draw(){

  $("#viz").empty();

  // set the dimensions and margins of the graph
  var margin = {top: 10, right: 10, bottom: 10, left: 10},
      width = window.innerWidth - margin.left - margin.right,
      height = window.innerHeight - margin.top - margin.bottom;

  // format variables
  var formatNumber = d3.format(",.0f"),    // zero decimal places
      format = function(d) { return "₹" + formatNumber(d); },
      color = function(name){
        
        if (name == "Bajaj"){
          return "#e23fa7"
        } else if (name == "General"){
          return "#e27a3f"
        } else if (name == "Satya"){
          return "#2980b9"
        } else if (name == "Triumph"){
          return "#df5a49"
        } else if (name == "Janpragati"){
          return "#45b29d"
        } else if (name == "Progressive"){
          return "#efc94c"
        }
      };

  // append the svg object to the body of the page
  var svg = d3.select("#viz").append("svg")
      .attr("width", width + margin.left + margin.right)
      .attr("height", height + margin.top + margin.bottom)
    .append("g")
      .attr("transform", 
            "translate(" + margin.left + "," + margin.top + ")");

  // Set the sankey diagram properties
  var sankey = d3.sankey()
      .nodeWidth(10)
      .nodePadding(10)
      .size([width, height]);

  var path = sankey.link();

  // load the data
  d3.queue()
      .defer(d3.csv, "sankey_14-15.csv")
      .await(ready);

  function ready(error, csv){

    // create an array to push all sources and targets, before making them unique
    var arr = [];
    csv.forEach(function(d){

      arr.push(d.source);
      arr.push(d.target);

    });

    // create nodes array
    var nodes = arr.filter(onlyUnique).map(function(d,i){
      return {
        node: i,
        name: d
      }
    });

    // create links array
    var links = csv.map(function(csv_row){
      return {
        source: getNode("source"),
        target: getNode("target"),
        value: +csv_row.value
      }

      function getNode(type){
        return nodes.filter(function(node_object){ return node_object.name == csv_row[type]; })[0].node;
      }

    });

    sankey
        .nodes(nodes)
        .links(links)
        .layout(32);

    // create types array for colours
    var types = nodes.map(function(node){
      var obj = {};
      obj.name = node.name;

      var t = csv.filter(function(csv_row){
        return csv_row.source == node.name
      })[0];

      if (t === undefined){
        obj.type = "party";
      } else if (t.recipient_type == "party"){
        obj.type = "trust";
      } else if (t.recipient_type == "trust"){
        obj.type = "company";
      }

      return obj;
    });

    // add in the links
    var link = svg.append("g").selectAll(".link")
        .data(links)
      .enter().append("path")
        .attr("class", function(d){
          var type = types.filter(function(type_row){
            return type_row.name == d.source.name
          })[0].type;
          return "link " + slugify(d.source.name) + " " + slugify(d.target.name);
        })
        .attr("d", path)
        .style("stroke-opacity", opacity.mouseout)
        .style("stroke", function(d){
          var type = types.filter(function(type_row){
            return type_row.name == d.source.name
          })[0].type;
          if (type == "trust"){
            return color(d.source.name.replace(/ .*/, ""));  
          } else {
            return color(d.target.name.replace(/ .*/, ""));  
          }
        })
        .style("stroke-width", function(d) { return Math.max(1, d.dy); })
        .sort(function(a, b) { return b.dy - a.dy; });

    link
        .on("mouseover", function(d){
          d3.select(this)
              .style("stroke-opacity", opacity.mouseover)
        })
        .on("mouseout", function(d){
          d3.selectAll(".link")
              .style("stroke-opacity", opacity.mouseout)
        })

    // add the link titles
    link.append("title")
          .text(function(d) {
          return d.source.name + " → " + 
                  d.target.name + "\n" + format(d.value); });

    // add in the nodes
    var node = svg.append("g").selectAll(".node")
        .data(nodes)
      .enter().append("g")
        .attr("class", "node")
        .attr("transform", function(d) { 
          return "translate(" + d.x + "," + d.y + ")"; 
        })
        .call(d3.drag()
          .subject(function(d) {
            return d;
          })
          .on("start", function() {
            this.parentNode.appendChild(this);
          })
          .on("drag", dragmove));

    // add the rectangles for the nodes
    node.append("rect")
        .attr("height", function(d) { return d.dy < 0 ? .1 : d.dy; })
        .attr("width", sankey.nodeWidth())
        .style("fill", function(d) { 
          var type = types.filter(function(type_row){
            return type_row.name == d.name
          })[0].type;
          if (type == "trust"){
            return d.color = color(d.name.replace(/ .*/, ""));   
          } else if (type == "company"){
            return d.color = color(d.sourceLinks[0].target.name.replace(/ .*/, ""));
          } else {
            return d.color = "#ccc"
          }
          
        })
        .style("stroke", function(d) { 
          return d3.rgb(d.color).darker(.3); 
        })
      .append("title")
        .text(function(d) { 
          return d.name + "\n" + format(d.value); 
        });

    // add in the title for the nodes
    node.append("text")
        .attr("x", -6)
        .attr("y", function(d) { return d.dy / 2; })
        .attr("dy", ".35em")
        .attr("text-anchor", "end")
        .attr("transform", null)
        .style("font-size", function(d){
          var type = types.filter(function(type_row){
            return type_row.name == d.name
          })[0].type;

          if (type == "trust"){
            return "1em";
          } else {
            return ".7em";
          }
        })
        .text(function(d) { return d.name; })
      .filter(function(d) { return d.x < width / 2; })
        .attr("x", 6 + sankey.nodeWidth())
        .attr("text-anchor", "start");

    node
      .on("mouseover", function(d){
        var type = types.filter(function(type_row){
          return type_row.name == d.name
        })[0].type;

        d3.selectAll(".link." + slugify(d.name))
            .style("stroke-opacity", opacity.mouseover);
      })
      .on("mouseout", function(d){
        d3.selectAll(".link")
            .style("stroke-opacity", opacity.mouseout);
      });

    // the function for moving the nodes
    function dragmove(d) {
      d3.select(this)
        .attr("transform", 
              "translate(" 
                 + d.x + "," 
                 + (d.y = Math.max(
                    0, Math.min(height - d.dy, d3.event.y))
                   ) + ")");
      sankey.relayout();
      link.attr("d", path);
    }

  }
}

// unique values of an array
function onlyUnique(value, index, self) { 
    return self.indexOf(value) === index;
}

function slugify(text){
  return text.toString().toLowerCase()
    .replace(/\s+/g, '-')           // Replace spaces with -
    .replace(/[^\w\-]+/g, '')       // Remove all non-word chars
    .replace(/\-\-+/g, '-')         // Replace multiple - with single -
    .replace(/^-+/, '')             // Trim - from start of text
    .replace(/-+$/, '');            // Trim - from end of text
}

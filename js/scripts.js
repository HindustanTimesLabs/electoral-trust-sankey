var opacity = {mouseover: 1, mouseout: .4}

window.onload = draw;
$(window).smartresize(draw);

function draw(){

  $(".tip").remove();
  $("body").append("<div class='tip'></div>");
  $(".tip").hide();

  $("#viz").empty();

  // set the dimensions and margins of the graph
  var margin = {top: 50, right: 10, bottom: 10, left: 10},
      width = window.innerWidth - margin.left - margin.right,
      height = 700 - margin.top - margin.bottom;

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
        } else if (name == "Samaj"){
          return "#783fe2"
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
      .nodePadding(8)
      .size([width, height]);

  var path = sankey.link();

  // load the data
  d3.queue()
      .defer(d3.csv, "sankey_13-14.csv")
      .defer(d3.csv, "sankey_14-15.csv")
      .defer(d3.csv, "sankey_15-16.csv")
      .defer(d3.csv, "sankey_all.csv")
      .await(ready);

  // draw the labels on top
  var top_labels = [
    {
      text: "Companies",
      x: 0,
      achor: "start",
      tspan: " give money to..."
    }, {
      text: "...electoral trusts",
      x: width / 2,
      anchor: "middle",
      tspan: ", which give money to..."
    }, {
      text: "...political parties.",
      x: width,
      anchor: "end",
      tspan: ""
    }
  ]

  svg.selectAll(".top-label")
      .data(top_labels)
    .enter()
      .append("text")
      .attr("class", "top-label")
      .attr("x", function(d){ return d.x; })
      .attr("y", 20 - margin.top)
      .attr("text-anchor", function(d){ return d.anchor; })
      .text(function(d){ return d.text; })
    .append("tspan")
      .text(function(d){ return d.tspan; });
      

  function ready(error, csv_13, csv_14, csv_15, csv_all){

    makeChart(csv_all);

    function makeChart(csv){
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
            var type = getType(d.source.name);

            return "link " + slugify(d.source.name) + " " + slugify(d.target.name);
          })
          .attr("d", path)
          .style("stroke-opacity", opacity.mouseout)
          .style("stroke", function(d){
            var type = getType(d.source.name);

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
                .moveToFront();

            
          })
          .on("mousemove", tipShow_link)
          .on("mouseout", function(d){
            d3.selectAll(".link")
                .style("stroke-opacity", opacity.mouseout);

            tipHide();
                
          })

      // add the link titles
      // link.append("title")
      //       .text(function(d) {
      //       return d.source.name + " → " + 
      //               d.target.name + "\n" + format(d.value); });

      // add in the nodes
      var node = svg.append("g").selectAll(".node")
          .data(nodes)
        .enter().append("g")
          .attr("class", function(d){ return "node " + slugify(d.name); })
          .attr("transform", function(d) { 
            return "translate(" + d.x + "," + d.y + ")"; 
          })
          // .call(d3.drag()
          //   .subject(function(d) {
          //     return d;
          //   })
          //   .on("start", function() {
          //     this.parentNode.appendChild(this);
          //   })
          //   .on("drag", dragmove));

      // add the rectangles for the nodes
      node.append("rect")
          .attr("height", function(d) { return d.dy < 0 ? .5 : d.dy; })
          .attr("width", sankey.nodeWidth())
          .style("fill", function(d) { 
            var type = getType(d.name);

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
        // .append("title")
        //   .text(function(d) { 
        //     return d.name + "\n" + format(d.value); 
        //   });

      // add in the title for the nodes
      node.append("text")
          .attr("x", -6)
          .attr("y", function(d) { return d.dy / 2; })
          .attr("dy", ".35em")
          .attr("text-anchor", "end")
          .attr("transform", null)
          .style("font-size", function(d){
            var type = getType(d.name);

            if (type == "trust"){
              return ".9em";
            } else {
              if (d.dy >= 25){
                return ".8em"
              } else {
                return ".6em";  
              }
            }
          })
          .text(function(d) { return d.name; })
        .filter(function(d) { return d.x < width / 2; })
          .attr("x", 6 + sankey.nodeWidth())
          .attr("text-anchor", "start");

      node
        .on("mouseover", function(d){
          var type = getType(d.name);

          d3.selectAll(".link." + slugify(d.name))
              .style("stroke-opacity", opacity.mouseover)
              .moveToFront();

          tipShow_node(d, type);

        })
        .on("mouseout", function(d){
          d3.selectAll(".link")
              .style("stroke-opacity", opacity.mouseout)
          
          tipHide();
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

      // get the type of a an entity
      function getType(name){
        return types.filter(function(type_row){
          return type_row.name == name
        })[0].type;
      }

      // draw the tip
      function tipShow_link(d){
        $(".tip").empty();
        $(".tip").show();
        
        // populate the tip
        $(".tip").append("<div class='row'><b>" + d.source.name + "</b> gave <b>Rs " + numberLakhs(d.value) + "</b> to <b>" + d.target.name + "</b>.</div>");

        // place the tip
        var tip_width = $(".tip").width();
        var tip_height = $(".tip").height();
        // tip_height = tip_height > 90 ? tip_height - 36 : tip_height; // magic number stuff
        var viz_offset = $("#viz").offset().top;

        var coordinates = [0, 0];
        coordinates = d3.mouse(this);
        var x = coordinates[0];
        var y = coordinates[1];

        var tip_left = x - (tip_width / 2);

        // so it doesn't fall off the side
        if (tip_left <= margin.left){
          tip_left = margin.left;
        } else if (tip_left + tip_width >= width - margin.right){
          tip_left = width - margin.right - tip_width;
        }        

        var tip_top = y + viz_offset - tip_height + (margin.top / 2);

        $(".tip").css({
          left: tip_left,
          top: tip_top
        });

      }

      function tipShow_node(d, type){

        $(".tip").show();

        // populate the tip
        $(".tip").append("<div class='title'>" + d.name + "</div>");

        if (type == "trust"){
          var total_raised = d3.sum(d.targetLinks, function(c){ return c.value; });
          var total_spent = d3.sum(d.sourceLinks, function(c){ return c.value; });
          
          if (d.name != "General Electoral Trust"){
            $(".tip").append("<div class='row'>Received <b>Rs " + numberLakhs(total_raised) + "</b> from <b>" + d.targetLinks.length + " " + (d.targetLinks.length == 1 ? "company" : "companies") + "</b>.</div>");
          }
          $(".tip").append("<div class='row'>Gave <b>Rs " + numberLakhs(total_spent) + "</b> to <b>" + d.sourceLinks.length + " political " + (d.sourceLinks.length == 1 ? "party" : "parties") + "</b>.</div>");
        } else if (type == "company"){
          var total_spent = d3.sum(d.sourceLinks, function(c){ return c.value; });
          $(".tip").append("<div class='row'>Gave <b>Rs " + numberLakhs(total_spent) + "</b> to <b>" + d.sourceLinks[0].target.name + "</b>.</div>");
        } else if (type == "party"){
          var total_raised = d3.sum(d.targetLinks, function(c){ return c.value; });
          $(".tip").append("<div class='row'>Received <b>Rs " + numberLakhs(total_raised) + "</b> from <b>" + d.targetLinks.length + " " + (d.targetLinks.length == 1 ? "trust" : "trusts") + "</b>.</div>");
        }
        // place the tip
        var tip_width = $(".tip").width();
        var tip_height = $(".tip").height();
        tip_height = tip_height > 90 ? tip_height - 36 : tip_height; // magic number stuff
        var viz_offset = $("#viz").offset().top;


        var tip_left = type == "trust" ? d.x - (tip_width / 2) : type == "company" ? margin.left : type == "party" ? width - margin.right - tip_width : null;
        
        let tip_top = d.y - tip_height + viz_offset + (margin.top / 2);

        $(".tip").css({
          left: tip_left,
          top: tip_top
        });

      }

      // hide the tip
      function tipHide(){
        $(".tip").empty();
        $(".tip").hide();
      }

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

function numberLakhs(x){
  x = x.toString()
  var afterPoint = x.indexOf(".") > 0 ? x.substring(x.indexOf("."), x.length) : "";
  x = Math.floor(x).toString();
  var lastThree = x.substring(x.length - 3), otherNumbers = x.substring(0, x.length - 3);
  lastThree = otherNumbers != "" ? "," + lastThree : lastThree;
  return otherNumbers.replace(/\B(?=(\d{2})+(?!\d))/g, ",") + lastThree + afterPoint;
};

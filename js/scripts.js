// magic numbers
var opacity = {mouseover: 1, mouseout: .4};

window.onload = draw;
$(window).smartresize(draw);

function draw(){
  var ww = $(window).width();
  var switcher = ww <= 768 ? "mobile" : "desktop";

  // reinitialize the tip
  $(".tip").remove();
  $("body").append("<div class='tip'></div>");
  $(".tip").hide();

  // here are the divs and info about them
  var divs = {
    desktop: [
      {
        name: "viz",
        data: "csv_all",
      }
    ],
    mobile: [
      {
        name: "viz-mob-1",
        data: "mob_1",
      }, {
        name: "viz-mob-2",
        data: "mob_2",
      }
    ]
  };

  var resp_divs = divs[switcher];

  resp_divs.forEach(function(d){
    $("#" + d.name).empty();
  });

  // things that will become object literals
  // * margin?
  // * svg
  // * path

  // set the dimensions and margins of the graph
  var margin = {top: switcher == "desktop" ? 50 : 20, right: 10, bottom: 10, left: 10},
      width = window.innerWidth - margin.left - margin.right,
      height = (switcher == "desktop" ? 700 : 500) - margin.top - margin.bottom;

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
  var svg = {

  };

  resp_divs.forEach(function(d){

    svg[d.name] = d3.select("#" + d.name).append("svg")
      .attr("width", width + margin.left + margin.right)
      .attr("height", height + margin.top + margin.bottom)
    .append("g")
      .attr("transform", 
            "translate(" + margin.left + "," + margin.top + ")");

  });

  // Set the sankey diagram properties
  var sankey = d3.sankey()
      .nodeWidth(10)
      .nodePadding(8)
      .size([width, height]);

  var path = sankey.link();

  // draw the labels on top
  var top_labels = [
    {
      text: "Companies",
      x: 0,
      achor: "start",
      tspan: " gave money to..."
    }, {
      text: "...electoral trusts",
      x: width / 2,
      anchor: "middle",
      tspan: ", which gave money to..."
    }, {
      text: "...political parties.",
      x: width,
      anchor: "end",
      tspan: ""
    }
  ]

  resp_divs.forEach(function(d){
    svg[d.name].selectAll(".top-label")
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
  });


    
  // load the data
  d3.queue()
      .defer(d3.csv, "sankey_all.csv")
      .await(ready);
   

  function ready(error, csv_all){

    var data_wrap = {
      csv_all: csv_all,
      mob_1: csv_all.filter(function(d){
        return d.recipient_type == "trust";
      }),
      mob_2: csv_all.filter(function(d){
        return d.recipient_type == "party";
      })
    }

    resp_divs.forEach(function(d){
      makeChart(d);
    });

    // makeChart(csv_all);

    function makeChart(this_div){

      var csv = data_wrap[this_div.data];

      // create an array to push all sources and targets, before making them unique
      var arr = [];
      csv.forEach(function(d){

        arr.push(d.source);
        arr.push(d.target);

      });

      // create the dropown
      // $("#dropdown").append("<option></option>")

      // arr.filter(onlyUnique).sort().forEach(function(d){
      //   $("#dropdown").append("<option value='" + slugify(d) + "'>" + d + "</option>")  
      // });

      // $("#dropdown").chosen({
      //   allow_single_deselect: true
      // }).change(function(){
      //   var val = $(this).val();

      //   if (val == ""){
      //     d3.selectAll(".link")
      //         .style("stroke-opacity", opacity.mouseout);

      //     tipHide();
      //   } else {
      //     d3.selectAll(".link." + val)
      //         .style("stroke-opacity", opacity.mouseover);
      //   }
        
      // });
      

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
      var link = svg[this_div.name].append("g").selectAll(".link")
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
            if (d.source.name == "Unknown"){
              
            } else {
              d3.select(this)
                .style("stroke-opacity", opacity.mouseover)
                .moveToFront();
            }
            
          })
          .on("mousemove", function(d){

            if (d.source.name == "Unknown"){
              tipHide();
            } else {

              var coordinates = [0, 0];
              coordinates = d3.mouse(this);
              var x = coordinates[0];
              var y = coordinates[1];

              tipShow_link(d, x, y);
            }
            
          })
          .on("mouseout", function(d){
            d3.selectAll(".link")
                .style("stroke-opacity", opacity.mouseout);

            tipHide();
                
          });

      // hide the tip on mobile
      $(document).on("click touchstart", ".tip", function(){
        d3.selectAll(".link")
            .style("stroke-opacity", opacity.mouseout);

        tipHide();
      });
      

      // add in the nodes
      var node = svg[this_div.name].append("g").selectAll(".node")
          .data(nodes)
        .enter().append("g")
          .attr("class", function(d){ return "node " + slugify(d.name); })
          .attr("transform", function(d) { 
            return "translate(" + d.x + "," + d.y + ")"; 
          });

      // add the rectangles for the nodes
      node.append("rect")
          .attr("height", function(d) { return d.dy <= 2 ? 2 : d.dy; })
          .attr("width", sankey.nodeWidth())
          .style("fill", function(d) { 
            var type = getType(d.name);

            if (type == "trust"){
              return d.color = color(d.name.replace(/ .*/, ""));   
            } else if (type == "company"){
              return d.color = color(d.sourceLinks[0].target.name.replace(/ .*/, ""));
            } else {
              if (switcher == "desktop"){
                return d.color = "#ccc"
              } else {
                if (d.name.indexOf("Trust") == -1){
                  return d.color = "#ccc"
                } else {
                  return color(d.name.replace(/ .*/, ""));
                }
              }
            }
            
          })
          .style("stroke", function(d) { 
            return d3.rgb(d.color).darker(.3); 
          })
        

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
              return switcher == "desktop" ? ".9em" : ".7em";
            } else {
              if (d.dy >= 25){
                return ".7em"
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

          if (d.name == "Unknown" && type == "company"){
            tipHide()
          } else {
            tipShow_node(d, type);

            d3.selectAll(".link." + slugify(d.name))
              .style("stroke-opacity", opacity.mouseover)
              .moveToFront();

            d3.selectAll(".link.unknown")
              .style("stroke-opacity", opacity.mouseout);
          }
          
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

      // more magic numbers
      var tip_top_subtract = switcher == "desktop" ? 0 : 10;

      // draw the tip
      function tipShow_link(d, x, y){
        
        $(".tip").empty();
        $(".tip").show();
        
        $(".tip").append("<div class='mobile-only tip-x'><i class='fa fa-times' aria-hidden='true'></i></div>")

        // populate the tip
        $(".tip").append("<div class='tip-row'><b>" + d.source.name + "</b> gave <b>Rs " + numberLakhs(d.value) + "</b> to <b>" + d.target.name + "</b>.</div>");

        // place the tip
        var tip_width = $(".tip").width();
        var tip_height = $(".tip").height();
        // tip_height = tip_height > 90 ? tip_height - 36 : tip_height; // magic number stuff
        var viz_offset = $("#" + this_div.name).offset().top;

        var tip_left = x - (tip_width / 2);

        // so it doesn't fall off the side
        if (tip_left <= margin.left){
          tip_left = margin.left;
        } else if (tip_left + tip_width >= width - margin.right){
          tip_left = width - margin.right - tip_width;
        }        

        var tip_top = y + viz_offset - tip_height + (margin.top / 2) - tip_top_subtract;

        $(".tip").css({
          left: (switcher == "desktop" ? tip_left : 0),
          top: tip_top,
          width: (switcher == "desktop" ? "auto" : ww),
        });


      }

      function tipShow_node(d, type){

        $(".tip").show();

        // populate the tip
        $(".tip").append("<div class='mobile-only tip-x'><i class='fa fa-times' aria-hidden='true'></i></div>")

        $(".tip").append("<div class='title'>" + d.name + "</div>");

        if (type == "trust"){
          var total_raised = d3.sum(d.targetLinks, function(c){ return c.value; });
          var total_spent = d3.sum(d.sourceLinks, function(c){ return c.value; });
          
          if (d.name != "General Electoral Trust" && switcher == "desktop"){
            $(".tip").append("<div class='tip-row'>Received <b>Rs " + numberLakhs(total_raised) + "</b> from <b>" + d.targetLinks.length + " " + (d.targetLinks.length == 1 ? "company" : "companies") + "</b>.</div>");
          }
          $(".tip").append("<div class='tip-row'>Gave <b>Rs " + numberLakhs(total_spent) + "</b> to <b>" + d.sourceLinks.length + " political " + (d.sourceLinks.length == 1 ? "party" : "parties") + "</b>.</div>");
        } else if (type == "company"){
          var total_spent = d3.sum(d.sourceLinks, function(c){ return c.value; });
          $(".tip").append("<div class='tip-row'>Gave <b>Rs " + numberLakhs(total_spent) + "</b> to <b>" + d.sourceLinks[0].target.name + "</b>.</div>");
        } else if (type == "party"){
          var total_raised = d3.sum(d.targetLinks, function(c){ return c.value; });

          if (d.name != "General Electoral Trust"){
            $(".tip").append("<div class='tip-row'>Received <b>Rs " + numberLakhs(total_raised) + "</b> from <b>" + d.targetLinks.length + " " + (d.targetLinks.length == 1 ? switcher == "desktop" ? "trust" : "company" : switcher == "desktop" ? "trusts" : "companies") + "</b>.</div>");
          }
        }
        // place the tip
        var tip_width = $(".tip").width();
        var tip_height = $(".tip").height();
        tip_height = tip_height > 90 ? tip_height - 36 : tip_height; // magic number stuff
        var viz_offset = $("#" + this_div.name).offset().top;


        var tip_left = type == "trust" ? d.x - (tip_width / 2) : type == "company" ? margin.left : type == "party" ? width - margin.right - tip_width : null;
        
        var tip_top = d.y - tip_height + viz_offset + (margin.top / 2) - tip_top_subtract;

        $(".tip").css({
          left: switcher == "desktop" ? tip_left : 0,
          top: tip_top,
          width: switcher == "desktop" ? "auto" : ww,
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

Promise.all([d3.json("data/reformas.json")]).then(function(projects){
  data = projects[0];
  console.log(data)

  var mobile = window.innerWidth < 768;

  var state = {
    data: null,
    filteredData: null,
    status: null,
    author: null,
    height: null,
    label: null
  }

  state.data = data;
  state.filteredData = state.data;
  state.label = "";

  const keys =[['indicaciones', 'indicacion', 'FECHA'],
               ['informes', 'informe', 'FECHAINFORME'],
               ['oficios', 'oficio', 'FECHA'],
               ['tramitacion', 'tramite', 'FECHA'],
               ['urgencias', 'urgencia', 'FECHAINGRESO'],
               ['votaciones', 'votacion', 'FECHA']]

  var parseTime = d3.timeParse("%d/%m/%Y"),
      formatTime = d3.timeFormat("%d de %B de %Y");

  data.forEach(function(d){
    d['camaras'].forEach(function(e){
      e['inicio'] = parseTime(e['inicio']);
      e['termino'] = parseTime(e['termino']);
    })
    for (var i=0; i < keys.length; i++){
      let thisKey = keys[i];
      if (d[thisKey[0]] !== null){
        d[thisKey[0]].forEach(function(e){
          e['FECHA'] = parseTime(e[thisKey[2]])
        })
      }
    }
  })

  var status = new Set(data.map(d => d['descripcion']['estado']));
  status = ["Todos los estados"].concat([...status])
  state.status = "Todos los estados";
  let statusOp = addOptions("estado", status);
  statusOp.on("change", function(d){
    state.status = d3.select(this).node().value;
    filterData();
    updatePlot();
  })

  var authors = data.map(function(d){
    let author = d['autores'];
    if (author != null) {
      if (Array.isArray(author)) {
        return author.map(e => Object.values(e));
      } else {
        return  Object.values(d['autores']);
      }
    } else {
      return null;
    }
  });
  authors = new Set(authors.flat(2).filter(d => d != null))
  authors = ["Todos los autores"].concat([...authors].sort())
  state.author = "Todos los autores";
  let authorsOp = addOptions("autor", authors);
  authorsOp.on("change", function(d){
    state.author = d3.select(this).node().value;
    filterData();
    updatePlot();
  })

  function addOptions(id, values) {
    var element = d3.select("#"+id);
    var options = element.selectAll("option").data(values);

    options.enter().append("option")
      .html(d => d);

    options.exit().remove();

    return element;
  }

  function filterData() {
    if (state.status == 'Todos los estados') {
      state.filteredData = state.data
    } else {
      state.filteredData = state.data.filter(d => d['descripcion']['estado'] == state.status)
    }

    if (state.author != 'Todos los autores') {
      state.filteredData = state.filteredData.filter(function(d){
        let author = d['autores'];
        if (author != null) {
          if (Array.isArray(author)) {
            return author.map(e => Object.values(e)).flat().includes(state.author);
          } else {
            return state.author == Object.values(d['autores'])[0];
          }
        } else {
          return false;
        }
      })
    }

    if (state.label != '') {
      state.filteredData = state.filteredData.filter(function(d){
        let description = d['descripcion']['titulo'];
        return description.toLowerCase().includes(state.label.toLowerCase());
      })
    }
  }

  function updatePlot() {
    svg.attr("viewBox", [0, 0, width + margin.left + margin.right, y(state.filteredData.length) + margin.bottom])
      .attr("width", width + margin.left + margin.right)
      .attr("height", y(state.filteredData.length) + margin.bottom);

    tooltip.style("left", 0)
      .style("top", 0);

    name.call(calloutName, null);

    var gProjects = g.selectAll(".project");

    var notFilteredP = gProjects.filter(d => !state.filteredData.includes(d))
    var filteredP = gProjects.filter(d => state.filteredData.includes(d))

    notFilteredP.transition().duration(500)
      .style("opacity", 0)
    notFilteredP.selectAll("circle")
      .classed("hidden", true)
    filteredP.transition().duration(1000)
      .style("opacity", 1)
      .attr("transform", (d, i) => `translate(0,${y(i)})`)
    filteredP.selectAll("circle")
      .classed("hidden", false);

    d3.selectAll(".axis-line")
      .attr("y2", y(state.filteredData.length) - margin.top)

    d3.select(".bottom-axis").transition().duration(1000)
      .attr("transform", `translate(0,${y(state.filteredData.length)})`)
  }

  const iconHeight = 10,
        circleOpacity = 0.9,
        tooltipOpacity = 1.0;

  let minDate = d3.min(data, d => d3.min(d['tramitacion'], e => e['FECHA'])),
      maxDate = d3.max(data, d => d3.max(d['tramitacion'], e => e['FECHA']));

  var margin, lineHeight;
  if (mobile) {
    lineHeight = 10;
    margin = {top: 30, right: 20, bottom: 20, left: 100};
  } else {
    lineHeight = 12;
    margin = {top: 60, right: 20, bottom: 80, left: 180};
  }

  var tooltip = d3.select("body").append("div")
    .attr("class", "tooltip")
    .style("opacity", 0)
    .style("max-width", margin.left * 4/3 + "px");

  var width = window.innerWidth - margin.left - margin.right;
  state.height = state.data.length * lineHeight;

  var deleteIcon = d3.select(".delete")
    .on("click", function(d){
      searchBox.node().value = '';
      state.label = '';
      d3.select(this).style("opacity", 0);
      filterData();
      updatePlot();
    });

  var searchBox = d3.select("#search-box");
  searchBox.on("change", function(){
    let searchLabel = d3.select(this).node().value;
    state.label = searchLabel;
    if (state.label != ''){
      deleteIcon.style("opacity", 1)
    }
    filterData();
    updatePlot();
  });

  var svg = d3.select("#viz").append("svg")
    .attr("viewBox", [0, 0, width + margin.left + margin.right, state.height + margin.bottom])
    .attr("width", width + margin.left + margin.right)
    .attr("height", state.height + margin.bottom);

  window.onresize = function(d){
    let factor = svg.attr("height") / svg.attr("width");
    let newWidth = window.innerWidth;
    svg.attr("width", newWidth)
      .attr("height", factor * newWidth);
  }

  var colorScale = d3.schemeSpectral[9];

  var x = d3.scaleUtc()
    .domain([minDate, maxDate])
    .range([margin.left, width - margin.right])

  var y = d3.scaleLinear()
    .domain([0, data.length])
    .rangeRound([margin.top + lineHeight/2, state.height])

  var ticks = mobile ? 3 : null;
  var xAxis = g => g
    .attr("transform", `translate(0,${margin.top})`)
    .call(d3.axisTop(x).ticks(ticks))
    .call(g => g.selectAll(".tick line").clone()
              .attr("stroke-opacity", 0.05)
              .attr("class", "axis-line")
              .attr("y2", state.height - margin.top - margin.bottom))
    .call(g => g.selectAll(".domain").remove())

  var xAxisBottom = g => g
    .attr("transform", `translate(0,${state.height})`)
    .attr("class", "bottom-axis")
    .call(d3.axisBottom(x).ticks(ticks))
    .call(g => g.selectAll(".domain").remove())

  svg.append("g")
    .call(xAxis)

  svg.append("g")
    .call(xAxisBottom)

  const g = svg.append("g")
      .style("font", "10px sans-serif")

  var gs = g.selectAll("g")
    .data(data)
    .join("g")
      .attr("class", "project")
      .attr("transform", (d, i) => `translate(0,${y(i)})`);

  gs.append("line")
    .attr("stroke", "#aaa")
    .attr("stroke-width", 1.0)
    .attr("x1", d => x(d3.min(d['tramitacion'], k => k['FECHA'])))
    .attr("x2", d => x(d3.max(d['tramitacion'], k => k['FECHA'])));

  gs.selectAll(".senado")
    .data(d => d['camaras'].filter(e => e['camara'] == 'Senado'))
    .join("line")
      .attr("stroke", "#aaa")
      .attr("stroke-width", 3)
      .attr("x1", d => x(d['inicio']))
      .attr("x2", d => x(d['termino']));

  gs.append("g")
    .selectAll(".tramite")
    .data(d => d['tramitacion'])
    .join("circle")
      .attr("class", "tramite")
      .attr("opacity", circleOpacity)
      .attr("cx", d => x(d['FECHA']))
      .attr("fill", "#225ea8")
      .attr("r", 3.5)
      .on("mouseover", function(event, d){
        let hidden = d3.select(this).classed("hidden");
        if (!hidden) {
          tooltip.html(`<p><strong>Sesion ${d['SESION']}</strong></p>
                <p><strong>Fecha:</strong> ${formatTime(d['FECHA'])}</p>
                <p><strong>Cámara:</strong> ${d['CAMARATRAMITE']}</p>
                <p><strong>Etapa:</strong> ${d['ETAPDESCRIPCION']}</p>
                <p><strong>Descripción:</strong> ${d['DESCRIPCIONTRAMITE']}</p>`)

          var xOffset = tooltip.node().getBoundingClientRect().width / 2.,
              yOffset = tooltip.node().getBoundingClientRect().height;
          let widthFactor = window.innerWidth / (width + margin.left + margin.right);
          tooltip.style("left", x(d['FECHA']) * widthFactor - xOffset + "px")
            .style("top", event.pageY - yOffset - 15 + "px")
            .transition().duration(200).style("opacity", tooltipOpacity);
        }
      })
      .on("mouseleave", function(event, d){
        tooltip.transition().duration(200).style("opacity", 0);
      });;

  gs.append("g")
    .selectAll(".oficio")
    .data(d => d['oficios'] == null ? [] : d['oficios'])
    .join("circle")
      .attr("class", "oficio")
      .attr("opacity", circleOpacity)
      .attr("cx", d => x(d['FECHA']))
      .attr("fill", "#41b6c4")
      .attr("r", 3.5)
      .on("mouseover", function(event, d){
        let hidden = d3.select(this).classed("hidden");
        if (!hidden) {
          tooltip.html(`<p><strong>Oficio número ${d['NUMERO']}</strong></p>
                <p><strong>Detalle:</strong> ${d['DESCRIPCION']}</p>
                <p><strong>Fecha:</strong> ${formatTime(d['FECHA'])}</p>
                <p><strong>Etapa:</strong> ${d['ETAPA']}</p>
                <p><strong>Trámite:</strong> ${d['TRAMITE']}</p>
                <p><strong>Tipo:</strong> ${d['TIPO']}</p>`)

          var xOffset = tooltip.node().getBoundingClientRect().width / 2.,
              yOffset = tooltip.node().getBoundingClientRect().height;
          let widthFactor = window.innerWidth / (width + margin.left + margin.right);
          tooltip.style("left", x(d['FECHA']) * widthFactor - xOffset + "px")
            .style("top", event.pageY - yOffset - 15 + "px")
            .transition().duration(200).style("opacity", tooltipOpacity);
        }
      })
      .on("mouseleave", function(event, d){
        tooltip.transition().duration(200).style("opacity", 0);
      });;

  gs.append("g")
    .selectAll(".informe")
    .data(d => d['informes'] == null ? [] : d['informes'])
    .join("circle")
      .attr("class", "informe")
      .attr("opacity", circleOpacity)
      .attr("cx", d => x(d['FECHA']))
      .attr("fill", "#c7e9b4")
      .attr("r", 3.5)
      .on("mouseover", function(event, d){
        let hidden = d3.select(this).classed("hidden");
        if (!hidden) {
          tooltip.html(`<p><strong>${d['TRAMITE']}</strong></p>
                <p><strong>Fecha:</strong> ${formatTime(d['FECHA'])}</p>
                <p><strong>Etapa:</strong> ${d['ETAPA']}</p>`)

          var xOffset = tooltip.node().getBoundingClientRect().width / 2.,
              yOffset = tooltip.node().getBoundingClientRect().height;
          let widthFactor = window.innerWidth / (width + margin.left + margin.right);
          tooltip.style("left", x(d['FECHA']) * widthFactor - xOffset + "px")
            .style("top", event.pageY - yOffset - 15 + "px")
            .transition().duration(200).style("opacity", tooltipOpacity);
        }
      })
      .on("mouseleave", function(event, d){
        tooltip.transition().duration(200).style("opacity", 0);
      });

  gs.append('svg:image')
    .attr('xlink:href', function(d){
      let icon;
      let status = d['descripcion']['estado'].toLowerCase();
      if (status.includes("publicado")) {
        icon = 'img/checkmark-circle-outline.svg'
      } else if (status.includes("en tramitación")) {
        icon = 'img/refresh-circle-outline.svg'
      } else {
        icon = 'img/close-circle-outline.svg'
      }
      return icon;
    })
    .attr("x", d => x(d['tramitacion'][d['tramitacion'].length-1]['FECHA']) + 10)
    .attr("y", -iconHeight/2)
    .attr("width", iconHeight + "px")
    .attr("height", iconHeight + "px")

  gs.append("a")
    .attr("target", "_blank")
    .attr("href", d => d['descripcion']['link_mensaje_mocion'])
    .append('svg:image')
    .attr('xlink:href', function(d){
      let icon;
      let status = d['descripcion']['estado'].toLowerCase();
      if (status.includes("publicado")) {
        icon = 'img/checkmark-document-outline.svg'
      } else if (status.includes("en tramitación")) {
        icon = 'img/refresh-document-outline.svg'
      } else {
        icon = 'img/close-document-outline.svg'
      }
      return icon;
    })
    .attr("x", d => width + 10)
    .attr("y", -iconHeight/2-1)
    .attr("width", iconHeight + "px")
    .attr("height", iconHeight + "px")

  gs.append('text')
    .attr("x", width + 25)
    .attr("y", lineHeight/4)
    .style("text-anchor", "left")
    .style("vertical-align", "middle")
    .attr('fill', function(d){
      let color;
      let status = d['descripcion']['estado'].toLowerCase();
      if (status.includes("publicado")) {
        color = '#238b45'
      } else if (status.includes("en tramitación")) {
        color = '#ec7014'
      } else {
        color = '#cb181d'
      }
      return color;
    })
    .text(d => d['descripcion']['estado'])

  const name = svg.append("g")

  svg.on("touchmove mousemove", function(event) {
    let thisX = d3.pointer(event, this)[0],
        thisY = d3.pointer(event, this)[1],
        index = Math.floor(y.invert(thisY + lineHeight/2));
    let project = state.filteredData[index];
    let gProjects = g.selectAll(".project");
    var notFilteredP = gProjects.filter(d => !state.filteredData.includes(d));
    var filteredP = gProjects.filter(d => state.filteredData.includes(d));
    if (y(0) - lineHeight/2 < thisY && thisY < y(state.filteredData.length) - lineHeight/2 &&
        margin.left < thisX  && thisX < width + 25){
      name
          .attr("transform", `translate(${x(project['tramitacion'][0]['FECHA'])},${y(index)})`)
          .call(calloutName, `${project['descripcion']['titulo']}`);

      filteredP.style("opacity", 0.2)
      filteredP.filter(d => d == project)
        .style("opacity", 1)

    } else {
      name.call(calloutName, null);
      filteredP.style("opacity", 1);
    }

  });

  calloutName = (g, value) => {
    if (!value) return g.style("display", "none");

    g
        .style("display", null)
        .style("pointer-events", "none")
        .style("font", "10px sans-serif");

    const rect = g.selectAll("rect")
      .data([null])
      .join("rect")
      .attr("fill", "white")

    const text = g.selectAll("text")
      .data([null])
      .join("text")
      .text(value)
      .call(wrap, margin.left - 20);

    function wrap(text, width) {
      text.each(function() {
        var text = d3.select(this),
            words = text.text().split(/\s+/).reverse(),
            word,
            line = [],
            lineNumber = 0,
            lineHeight = 1.1, // ems
            bold = true,
            y = text.attr("y"),
            dy = parseFloat("0"),
            tspan = text.text(null).append("tspan").attr("x", 0).attr("y", y).attr("dy", dy + "em").style("font-weight", "bold");
        while (word = words.pop()) {
          line.push(word);
          tspan.text(line.join(" "));
          if (tspan.node().getComputedTextLength() > width || word[word.length -1] == ':') {
            line.pop();
            tspan.text(line.join(" ")).style("font-weight", "bold");
            line = [word];
            tspan = text.append("tspan").attr("x", 0).attr("y", ++lineNumber * lineHeight + dy + "em").attr("dy", 0).text(word).style("font-weight", "bold");
          }
        }
      });
      }

    const {x, y, width: w, height: h} = text.node().getBBox();

    text.attr("transform", `translate(${-w - 10},0)`);

    rect.attr("x", -w-10)
      .attr("y", y)
      .attr("width", w)
      .attr("height", h)
  }
})

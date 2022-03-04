// Build constants.
let margin = {top: 30, right: 30, bottom: 30, left: 30},
    width = 960,
    height = 700,
    radius = 6,
    duration = 300;

// Build SVG.
let svg = d3.select('.subject-network')
    .append('svg')
        .attr('height', height)
        .attr('width', width)
    .call(d3.zoom()
        .scaleExtent([0.25, 6])
        .on('zoom', function(event) {
            svg.attr('transform', event.transform)
    }))
    .append('g')
    .attr('transform', `translate(${margin.left}, ${margin.top})`);

// Build tooltip.
let tooltip = d3.select('.subject-network')
    .append('div')
        .attr('class', 'tooltip')
        .style('background-color', '#242124')
        .style('opacity', 0)
        .style('display', 'none')
        .style('position', 'fixed')
        .attr('pointer-events', 'none');

    let toolHeader = tooltip
    .append('h3')
    .attr('class', 'toolHeader');

    let toolBody = tooltip
    .append('p')
    .attr('class', 'toolBody');

// Utilities
function formatNumbers(d) {
    return d3.format('.2r')(d);
}

let adjlist = [] // Adjacency list for highlighting connected nodes.

function neigh(a, b) {
    return a == b || adjlist.includes(a + '-' + b) || adjlist.includes(b + '-' + a);
}

// Import data and draw network.
d3.json('data/jqa-subjects-network.json').then(data => {

    // Build first-step for focus/unfocus: adjlist + neigh()
    data.links.forEach(function(d) {
        adjlist.push(d.source + '-' + d.target);
    });

    // Draw initial graph.
    chart(data);
})

// Draw network function.
function chart(dataset) {
    let nodes = dataset.nodes.map(d => Object.create(d));
    let links = dataset.links.map(d => Object.create(d));

    // links = links.filter(function (d) { return d.weight >= 0.7 });
    // nodes = nodes.filter( (d) => links.find( ({source}) => d.id === source));

    // nodes = nodes.filter(function (d) {return d.degree >= 20});
    // links = links.filter( (d) => nodes.find( ({id}) => d.id === id) );
    // console.log(nodes);
    // console.log(links);

    // Build node & font scales.
    let nodeScale = d3.scaleLinear()
        .domain(d3.extent(nodes.map(node => node.degree)))
        .range([25, 50]);
    
    let fontSizeScale = d3.scaleLinear()
        .domain([0, d3.max(nodes.map(node => node.degree))])
        .range([8, 16]);

    // Build simulation.
    let simulation = d3.forceSimulation(nodes)
        .force('charge', d3.forceManyBody()
            .strength(-500)
            .distanceMin(10)
            .distanceMax(1000)
            )
        .force('link', d3.forceLink(links)
            .id(d => d.id)
            .distance(100)
            )
        // .force('gravity', d3.forceManyBody().strength(-1000))
        .force('collide', d3.forceCollide().radius(d => nodeScale(d.degree) + 1))
        .force('center', d3.forceCenter(width / 2, height / 2));

    // Build drag.
    let drag = simulation => {
        let dragStarted = (d, event) => {
            if (!event.active) {
                simulation.alphaTarget(0.3).restart();
            }
            d.fx = d.x;
            d.fy = d.y;
        }
        let dragged = (d, event) => {
            d.fx = event.x;
            d.fy = event.y;
        }
        let dragEnded = (d, event) => {
            if (!event.active) {
                simulation.alphaTarget(0);
            }
            d.fx = null;
            d.fy = null;
        }
        return d3.drag()
            .on('start', dragStarted)
            .on('drag', dragged)
            .on('end', dragEnded);
    };

    // Draw links.
    let link = svg.selectAll('line')
        .data(links)
        .join(
            enter => enter.append('line')
                .attr('class', 'edge'),
            update => update,
            exit => exit.transition().remove()
        );

    // Draw nodes.
    let node = svg.selectAll('cirlce')
        .data(nodes)
        .join(
            enter => enter.append('circle')
                .attr('class', 'node')
                .attr('r', (d) => nodeScale(d.degree))
                .attr('fill', (d) => d.color),
            update => update,
            exit => exit.transition().remove()
        )
        .call(drag(simulation));

    // Write labels.
    let labelContainer = svg.selectAll('text')
        .data(nodes)
        .join(
            enter => enter.append('text')
                    .attr('class', 'label')
                    .attr('pointer-events', 'none')
                .text(d => d.id)
                    .attr('font-size', d => fontSizeScale(d.degree))
                    // .attr('fill', d => nodeColor(d.modularity))
                    .attr('transform', (d) => {
                        let scale = nodeScale(d.degree); // Offset labels from node.
                        let x = scale + 2;
                        let y = scale + 4;
                        return `translate(${d.x}, ${d.y})`
                    }),
            update => update
                .text(d => d.id)
                    .attr('font-size', d => fontSizeScale(d.degree))
                    .attr('transform', (d) => {
                        let scale = nodeScale(d.degree);
                        let x = scale + 2;
                        let y = scale + 4;
                        return `translate(${d.x}, ${d.y})`
                    }),
            exit => exit.transition().remove()
        )

    // Move mouse over/out.
    node.on('mouseover', function(event, d, i) {
        // Focus
        let source = d3.select(event.target).datum().__proto__.id;

        node.style('opacity', function(o) {
            return neigh(source, o.__proto__.id) ? 1: 0.1;
        });

        link.style('opacity', function(o) {
            return o.source.__proto__.id == source || o.target.__proto__.id == source ? 1 : 0.2;
        });

        labelContainer.attr('display', function(o) {
            return neigh(source, o.__proto__.id) ? "block" : "none";
        });

        // Gather tooltip info.
        let nodeInfo = [
            ['Degree', formatNumbers(d.degree, 2)],
            ['Community', formatNumbers(d.modularity, 2)],
            ['Betweenness', formatNumbers(d.betweenness, 3)],
            ['Eigenvector', formatNumbers(d.eigenvector, 3)],
        ];

        tooltip
            .transition(duration)
                .attr('pointer-events', 'none')
                .style('display', 'inline')
                .style('opacity', 0.97)
                .style("left", (event.x + 10) + "px")
                .style("top", (event.y - 15) + "px");
            
        toolHeader
            .html(d.id);

        toolBody
            .selectAll('p')
            .data(nodeInfo)
            .join('p')
                .attr('pointer-events', 'none')
                .html(d => `${d[0]}: ${d[1]}`);

        simulation.alphaTarget(0).restart();
    });

    node.on('mouseout', function (d, i, event) {
        tooltip.transition(duration).style('opacity', 0);

        // Unfocus.
        labelContainer.attr('display', 'block');
        node.style('opacity', 1);
        link.style('opacity', 1);
    })


    // Tick function.
    simulation.on('tick', () => {

        labelContainer
            .attr('transform', (d) => `translate(${d.x}, ${d.y})`);

        link
            .attr('x1', d => d.source.x)
            .attr('y1', d => d.source.y)
            .attr('x2', d => d.target.x)
            .attr('y2', d => d.target.y);

        node
            .attr('cx', d => d.x)
            .attr('cy', d => d.y);
    })

};

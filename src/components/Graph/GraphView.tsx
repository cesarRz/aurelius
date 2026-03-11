import { useEffect, useRef } from 'react'
import * as d3 from 'd3'
import { useStore } from '../../store'

interface GraphNode extends d3.SimulationNodeDatum {
  id: string
  title: string
}

interface GraphLink extends d3.SimulationLinkDatum<GraphNode> {
  source: string | GraphNode
  target: string | GraphNode
}

export function GraphView() {
  const svgRef = useRef<SVGSVGElement>(null)
  const { nodes, navigateTo, currentNodeId } = useStore()

  useEffect(() => {
    if (!svgRef.current) return

    const svg = d3.select(svgRef.current)
    svg.selectAll('*').remove()

    const width = svgRef.current.clientWidth
    const height = svgRef.current.clientHeight

    const graphNodes: GraphNode[] = [...nodes.values()].map(n => ({
      id: n.id,
      title: n.title,
    }))

    const nodeIds = new Set(graphNodes.map(n => n.id))
    const graphLinks: GraphLink[] = []
    for (const node of nodes.values()) {
      for (const linkId of node.links) {
        if (nodeIds.has(linkId)) {
          graphLinks.push({ source: node.id, target: linkId })
        }
      }
    }

    const simulation = d3.forceSimulation(graphNodes)
      .force('link', d3.forceLink<GraphNode, GraphLink>(graphLinks).id(d => d.id).distance(80))
      .force('charge', d3.forceManyBody().strength(-200))
      .force('center', d3.forceCenter(width / 2, height / 2))
      .force('collision', d3.forceCollide().radius(30))

    const g = svg.append('g')

    // Zoom
    const zoom = d3.zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.2, 4])
      .on('zoom', (event) => g.attr('transform', event.transform))
    svg.call(zoom)

    const link = g.append('g')
      .selectAll('line')
      .data(graphLinks)
      .join('line')
      .attr('stroke', '#333')
      .attr('stroke-width', 1)

    const node = g.append('g')
      .selectAll<SVGGElement, GraphNode>('g')
      .data(graphNodes)
      .join('g')
      .style('cursor', 'pointer')
      .on('click', (_event, d) => navigateTo(d.id))
      .call(d3.drag<SVGGElement, GraphNode>()
        .on('start', (event, d) => {
          if (!event.active) simulation.alphaTarget(0.3).restart()
          d.fx = d.x; d.fy = d.y
        })
        .on('drag', (event, d) => {
          d.fx = event.x; d.fy = event.y
        })
        .on('end', (event, d) => {
          if (!event.active) simulation.alphaTarget(0)
          d.fx = null; d.fy = null
        })
      )

    node.append('circle')
      .attr('r', 8)
      .attr('fill', d => d.id === currentNodeId ? '#7c6aef' : '#444')
      .attr('stroke', d => d.id === currentNodeId ? '#a89cf7' : '#555')
      .attr('stroke-width', 2)

    node.append('text')
      .text(d => d.title)
      .attr('dx', 14)
      .attr('dy', 4)
      .attr('fill', '#aaa')
      .attr('font-size', '12px')

    simulation.on('tick', () => {
      link
        .attr('x1', d => (d.source as GraphNode).x!)
        .attr('y1', d => (d.source as GraphNode).y!)
        .attr('x2', d => (d.target as GraphNode).x!)
        .attr('y2', d => (d.target as GraphNode).y!)
      node.attr('transform', d => `translate(${d.x},${d.y})`)
    })

    return () => { simulation.stop() }
  }, [nodes, currentNodeId])

  return (
    <div className="graph-view">
      <svg ref={svgRef} className="graph-svg" />
    </div>
  )
}

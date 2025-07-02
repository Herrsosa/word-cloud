import React, { useState, useMemo, useRef } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, Text, Line } from '@react-three/drei';
import { forceSimulation as d3ForceSimulation, forceLink, forceManyBody, forceCenter } from 'd3-force-3d';

// Helper function to get color based on importance
function getNodeColor(node, hoveredNode) {
  // If something is hovered, use hover logic
  if (hoveredNode) {
    if (hoveredNode.id === node.id) {
      return '#ff6b35'; // Bright orange for hovered node
    } else if (!node.neighbors.has(hoveredNode.id)) {
      return '#cccccc'; // Grey for unrelated nodes
    } else {
      return '#4ecdc4'; // Teal for neighbors
    }
  }
  
  // Default colors based on importance (when nothing is hovered)
  const importance = node.size || 5; // Default to 5 if no size
  if (importance >= 8) return '#e74c3c'; // High importance: red
  if (importance >= 6) return '#f39c12'; // Medium-high importance: orange
  if (importance >= 4) return '#3498db'; // Medium importance: blue
  return '#2ecc71'; // Low importance: green
}

// This component now ONLY handles the visual representation.
// It is "dumb" and simply receives props.
function Word({ node, color, setSelectedNode }) {
  const fontProps = {
    font: '/Inter_18pt-Bold.ttf',
    fontSize: 0.5 + (node.size / 10) * 1.2,
    'material-toneMapped': false,
  };
  return (
    <Text
      {...fontProps}
      color={color}
      children={node.text}
      anchorX="center"
      anchorY="middle"
      onClick={() => setSelectedNode(node)}
    />
  );
}

// This is a new component that manages its own position AND color logic.
function Node({ node, hoveredNode, setSelectedNode }) {
  const ref = useRef();
  
  // On every frame, update the position of this node's group from the simulation
  useFrame(() => {
    if (ref.current) {
      ref.current.position.set(node.x, node.y, node.z);
    }
  });

  const color = getNodeColor(node, hoveredNode);

  return (
    <group ref={ref}>
      <Word node={node} color={color} setSelectedNode={setSelectedNode} />
    </group>
  );
}

// --- Main WordCloud Component ---
function WordCloud({ data, setSelectedNode }) {
  const [hoveredNodeId, setHoveredNodeId] = useState(null);

  const graph = useMemo(() => {
    if (!data?.nodes) return null;

    const nodes = data.nodes.map((node, i) => ({
      id: i,
      x: node.position[0],
      y: node.position[1],
      z: node.position[2],
      ...node
    }));
    const edges = data.edges.map(edge => ({ source: edge.from, target: edge.to, similarity: edge.similarity || 0.5 }));

    nodes.forEach(node => {
      node.neighbors = new Set([node.id]);
    });
    edges.forEach(edge => {
      if (nodes[edge.source] && nodes[edge.target]) {
        nodes[edge.source].neighbors.add(nodes[edge.target].id);
        nodes[edge.target].neighbors.add(nodes[edge.source].id);
      }
    });

    const simulation = d3ForceSimulation(nodes, 3)
      .force('link', forceLink(edges).id(d => d.id).strength(0.4).distance(6))
      .force('charge', forceManyBody().strength(-40))
      .force('center', forceCenter().strength(1.2))
      .alpha(1.5).alphaDecay(0.0228)
      .on('end', () => console.log("Simulation settled."));

    return { nodes, edges, simulation };
  }, [data]);

  const hoveredNode = useMemo(() => {
    return hoveredNodeId !== null ? graph?.nodes.find(n => n.id === hoveredNodeId) : null;
  }, [hoveredNodeId, graph]);

  if (!graph) return null;

  return (
    <Canvas camera={{ position: [0, 0, 35], fov: 75 }}>
      <color attach="background" args={['#ffffff']} />
      <ambientLight intensity={1.0} />
      <directionalLight position={[5, 5, 15]} intensity={0.8} />

      <group onPointerMissed={() => { setHoveredNodeId(null); setSelectedNode(null); }}>
        {graph.nodes.map((node) => (
          <group key={node.id} onPointerOver={() => setHoveredNodeId(node.id)} onPointerOut={() => setHoveredNodeId(null)}>
             <Node node={node} hoveredNode={hoveredNode} setSelectedNode={setSelectedNode} />
          </group>
        ))}
        {graph.edges.map((edge, i) => {
          const startNode = graph.nodes[edge.source];
          const endNode = graph.nodes[edge.target];
          if (!startNode || !endNode) return null;
          
          // Make edges more visible by default
          let edgeColor = '#bdc3c7'; // Default light grey but visible
          let lineWidth = 1.5; // Default line width
          
          // If hovering, highlight connected edges
          if (hoveredNode && (startNode.id === hoveredNode.id || endNode.id === hoveredNode.id)) {
            edgeColor = '#34495e'; // Dark grey for highlighted edges
            lineWidth = 3;
          }
          
          // Optional: Color edges by similarity strength
          if (edge.similarity) {
            const alpha = Math.max(0.3, edge.similarity); // Minimum visibility
            const intensity = Math.floor(255 * alpha);
            edgeColor = `rgb(${160}, ${160}, ${intensity})`; // Blue-ish based on similarity
          }

          return (
            <Line
              key={`line-${i}`}
              points={[[startNode.x, startNode.y, startNode.z], [endNode.x, endNode.y, endNode.z]]}
              color={edgeColor}
              lineWidth={lineWidth}
            />
          );
        })}
      </group>

      <OrbitControls 
        enableZoom={true} 
        enablePan={true} 
        autoRotate={true} 
        autoRotateSpeed={0.3} 
        enableDamping={true} 
        dampingFactor={0.05} 
      />
    </Canvas>
  );
}

export default WordCloud;
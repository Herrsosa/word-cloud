import React, { useState, useMemo, useRef } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, Text, Line } from '@react-three/drei';
import { forceSimulation as d3ForceSimulation, forceLink, forceManyBody, forceCenter } from 'd3-force-3d';

function Word({ node, color, setSelectedNode }) {
  // --- FIX: Adjusted font size for the new, smaller scale ---
  const fontProps = {
    font: '/Inter_18pt-Bold.ttf',
    fontSize: 0.15 + (node.size / 10) * 0.25,
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

function Node({ node, hoveredNode, setSelectedNode }) {
  const ref = useRef();
  useFrame(() => {
    if (ref.current) {
      ref.current.position.set(node.x, node.y, node.z);
    }
  });

  let color = '#000000'; // Default black
  if (hoveredNode) {
    if (hoveredNode.id === node.id) color = '#007bff'; // Highlighted
    else if (!node.neighbors.has(hoveredNode.id)) color = '#e0e0e0'; // Faded
  }

  return (
    <group ref={ref}>
      <Word node={node} color={color} setSelectedNode={setSelectedNode} />
    </group>
  );
}

function WordCloud({ data, setSelectedNode }) {
  const [hoveredNodeId, setHoveredNodeId] = useState(null);

  const graph = useMemo(() => {
    if (!data?.nodes) return null;

    const nodes = data.nodes.map((node, i) => ({
      id: i,
      x: node.position[0], y: node.position[1], z: node.position[2],
      ...node
    }));
    const edges = data.edges.map(edge => ({ source: edge.from, target: edge.to }));

    nodes.forEach(node => { node.neighbors = new Set([node.id]); });
    edges.forEach(edge => {
      if (nodes[edge.source] && nodes[edge.target]) {
        nodes[edge.source].neighbors.add(nodes[edge.target].id);
        nodes[edge.target].neighbors.add(nodes[edge.source].id);
      }
    });

    // --- FIX: Re-tuned forces for a compact layout at a smaller scale ---
    const simulation = d3ForceSimulation(nodes, 3)
      .force('link', forceLink(edges).id(d => d.id).strength(0.5).distance(1.5))
      .force('charge', forceManyBody().strength(-2.5)) // Gentle repulsion
      .force('center', forceCenter().strength(0.8))
      .on('end', () => console.log("Simulation settled."));

    return { nodes, edges, simulation };
  }, [data]);

  const hoveredNode = useMemo(() => {
    return hoveredNodeId !== null ? graph?.nodes.find(n => n.id === hoveredNodeId) : null;
  }, [hoveredNodeId, graph]);

  if (!graph) return null;

  return (
    // --- FIX: Camera moved much closer for the new scale ---
    <Canvas camera={{ position: [0, 0, 12], fov: 50 }}>
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
          
          const isVisible = hoveredNode && (startNode.id === hoveredNode.id || endNode.id === hoveredNode.id);
          
          // --- FIX: Darker default color for visible edges ---
          const color = isVisible ? '#007bff' : '#cccccc';
          const lineWidth = isVisible ? 2 : 1;

          return (
            <Line
              key={`line-${i}`}
              points={[[startNode.x, startNode.y, startNode.z], [endNode.x, endNode.y, endNode.z]]}
              color={color}
              lineWidth={lineWidth}
            />
          );
        })}
      </group>

      <OrbitControls enableZoom={true} enablePan={true} autoRotate={true} autoRotateSpeed={0.4} enableDamping={true} dampingFactor={0.05} />
    </Canvas>
  );
}

export default WordCloud;
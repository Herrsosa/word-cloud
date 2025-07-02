import React, { useState, useMemo, useRef } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, Text, Line } from '@react-three/drei';
import { forceSimulation as d3ForceSimulation, forceLink, forceManyBody, forceCenter } from 'd3-force-3d';

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

  // --- THIS IS THE CORRECTED COLOR LOGIC ---
  let color = '#000000'; // Default to black
  if (hoveredNode) { // Only apply special colors IF something is being hovered
    if (hoveredNode.id === node.id) {
      color = '#007bff'; // The hovered node itself is blue
    } else if (!node.neighbors.has(hoveredNode.id)) {
      color = '#e0e0e0'; // Un-related nodes are faded to grey
    }
    // Otherwise, it's a neighbor, so it stays the default black.
  }

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
    const edges = data.edges.map(edge => ({ source: edge.from, target: edge.to }));

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
          
          const isVisible = hoveredNode && (startNode.id === hoveredNode.id || endNode.id === hoveredNode.id);
          const color = isVisible ? '#007bff' : '#f0f0f0';

          return (
            <Line
              key={`line-${i}`}
              points={[[startNode.x, startNode.y, startNode.z], [endNode.x, endNode.y, endNode.z]]}
              color={color}
              lineWidth={isVisible ? 3.5 : 2}
            />
          );
        })}
      </group>

      <OrbitControls enableZoom={true} enablePan={true} autoRotate={true} autoRotateSpeed={0.3} enableDamping={true} dampingFactor={0.05} />
    </Canvas>
  );
}

export default WordCloud;
import React, { useEffect } from 'react';
import ReactFlow, { Background, Controls, Edge, Node, useNodesState, useEdgesState } from 'reactflow';
import 'reactflow/dist/style.css';

interface Task {
  id: string;
  title: string;
  status: string;
}

interface Dependency {
  id: string;
  task_id: string;
  depends_on_task_id: string;
}

interface Props {
  tasks: Task[];
  dependencies: Dependency[];
}

export default function TaskDependencyGraph({ tasks, dependencies }: Props) {
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);

  useEffect(() => {
    setNodes((nds) => {
      return tasks.map((task, index) => {
        const existingNode = nds.find(n => n.id === task.id);
        return {
          id: task.id,
          data: { label: task.title },
          position: existingNode ? existingNode.position : { x: 250 * (index % 3), y: 100 * Math.floor(index / 3) },
          style: {
            background: task.status === 'Complete' ? '#dcfce7' : task.status === 'In Progress' ? '#fef08a' : task.status === 'Blocked' ? '#fee2e2' : '#f3f4f6',
            color: '#111827',
            border: '1px solid #d1d5db',
            borderRadius: '8px',
            padding: '10px',
            fontSize: '12px',
            width: 150,
          }
        };
      });
    });

    const newEdges: Edge[] = dependencies.map(dep => ({
      id: dep.id,
      source: dep.depends_on_task_id,
      target: dep.task_id,
      animated: true,
      style: { stroke: '#9ca3af' },
    }));

    setEdges(newEdges);
  }, [tasks, dependencies, setNodes, setEdges]);

  return (
    <div style={{ height: 400, width: '100%' }} className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden bg-gray-50 dark:bg-gray-900/50">
      <ReactFlow 
        nodes={nodes} 
        edges={edges} 
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        fitView
      >
        <Background />
        <Controls />
      </ReactFlow>
    </div>
  );
}

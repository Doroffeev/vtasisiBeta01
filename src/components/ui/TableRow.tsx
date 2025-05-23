import React from 'react';

interface TableRowProps {
  name: string;
  client: string;
  status: string;
  statusColor: string;
  completion: number;
}

const TableRow: React.FC<TableRowProps> = ({
  name,
  client,
  status,
  statusColor,
  completion
}) => {
  return (
    <tr className="hover:bg-gray-50 transition-colors">
      <td className="px-6 py-4 whitespace-nowrap">
        <div className="font-medium text-gray-900">{name}</div>
      </td>
      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
        {client}
      </td>
      <td className="px-6 py-4 whitespace-nowrap">
        <span className={`px-2 py-1 text-xs font-medium rounded-full ${statusColor}`}>
          {status}
        </span>
      </td>
      <td className="px-6 py-4 whitespace-nowrap">
        <div className="flex items-center">
          <div className="w-full bg-gray-200 rounded-full h-2.5 mr-2">
            <div 
              className={`h-2.5 rounded-full ${
                completion === 100 
                  ? 'bg-green-500' 
                  : completion > 60 
                    ? 'bg-blue-500' 
                    : 'bg-amber-500'
              }`}
              style={{ width: `${completion}%` }}
            ></div>
          </div>
          <span className="text-xs text-gray-500">{completion}%</span>
        </div>
      </td>
    </tr>
  );
};

export default TableRow;